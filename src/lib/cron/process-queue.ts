import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types/database";
import {
  refreshAccessToken,
  getGmailMessage,
  getGmailAttachment,
  findPdfAttachments,
  extractHeader,
  extractEmailBody,
} from "./gmail";
import { processEmail } from "./parse-statement";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractRetryDelayMs(err: any): number | null {
  try {
    let errorObj = err;
    if (typeof err === "string") {
      try {
        errorObj = JSON.parse(err);
      } catch {
        // Not JSON
      }
    } else if (err instanceof Error) {
      try {
        errorObj = JSON.parse(err.message);
      } catch {
        // Message is not JSON, try regex on message text
        const match = err.message.match(/retry in ([\d.]+)s/i);
        if (match) {
          return Math.ceil(parseFloat(match[1]) * 1000);
        }
      }
    }

    const errorDetails = errorObj?.error?.details || errorObj?.details;
    if (Array.isArray(errorDetails)) {
      const retryInfo = errorDetails.find(
        (d: any) =>
          d["@type"]?.includes("google.rpc.RetryInfo") ||
          d["@type"]?.includes("RetryInfo")
      );
      if (retryInfo && retryInfo.retryDelay) {
        const seconds = parseInt(retryInfo.retryDelay, 10);
        if (!isNaN(seconds)) {
          return seconds * 1000;
        }
      }
    }

    if (errorObj?.error?.message) {
      const match = errorObj.error.message.match(/retry in ([\d.]+)s/i);
      if (match) {
        return Math.ceil(parseFloat(match[1]) * 1000);
      }
    }
  } catch (e) {
    console.error("[process-queue] Error parsing retry delay:", e);
  }
  return null;
}

export async function processQueue(
  admin: SupabaseClient<Database>,
  userId?: string
): Promise<{ processed: number; failed: number; skipped: number }> {
  console.log(`[process-queue] Starting execution — user_id=${userId ?? "all"}`);

  // 1. Fetch pending/failed queue items
  let query = admin
    .from("email_log")
    .select("id, user_id, gmail_message_id, retries, processing_status")
    .or("processing_status.eq.pending,and(processing_status.eq.failed,retries.lt.3)")
    .order("created_at", { ascending: true })
    .limit(10); // Process up to 10 messages per invocation to prevent timeouts

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: queueItems, error: queryError } = await query;

  if (queryError) {
    console.error("[process-queue] Failed to fetch queue items:", queryError.message);
    return { processed: 0, failed: 0, skipped: 0 };
  }

  if (!queueItems || queueItems.length === 0) {
    console.log("[process-queue] No pending items in queue.");
    return { processed: 0, failed: 0, skipped: 0 };
  }

  console.log(`[process-queue] Found ${queueItems.length} item(s) to process.`);

  let processedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const item of queueItems) {
    console.log(`[process-queue] Locking item ${item.id} (message_id=${item.gmail_message_id})`);

    // 2. Lock item to prevent concurrent workers from processing it
    const { data: locked, error: lockError } = await admin
      .from("email_log")
      .update({
        processing_status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("processing_status", item.processing_status)
      .select("id, user_id, gmail_message_id, retries")
      .maybeSingle();

    if (lockError || !locked) {
      console.log(`[process-queue] Item ${item.id} already locked or processed. Skipping.`);
      skippedCount += 1;
      continue;
    }

    // 3. Process item (with rate limit retry loop)
    let pdfAttachments: Array<{ filename: string; base64urlData: string }> = [];
    try {
      let attempts = 0;
      const maxAttempts = 3;
      let success = false;

      while (attempts < maxAttempts && !success) {
        attempts++;
        pdfAttachments.length = 0;

        try {
        // Refresh user token
        const { data: tokenRow, error: tokenError } = await admin
          .from("gmail_oauth_tokens")
          .select("refresh_token")
          .eq("user_id", locked.user_id)
          .maybeSingle();

        if (tokenError || !tokenRow?.refresh_token) {
          throw new Error("No Gmail OAuth refresh token found for this user.");
        }

        const tokenData = await refreshAccessToken(tokenRow.refresh_token);

        // Update token in DB
        const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        await admin
          .from("gmail_oauth_tokens")
          .update({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type ?? "Bearer",
            scope: tokenData.scope ?? null,
            expires_at: tokenExpiresAt,
          })
          .eq("user_id", locked.user_id);

        // Fetch message details
        const messageData = await getGmailMessage(tokenData.access_token, locked.gmail_message_id);
        if (!messageData) {
          throw new Error(`Gmail API returned null for message ${locked.gmail_message_id}`);
        }

        const subject = extractHeader(messageData.payload, "subject");
        const sender = extractHeader(messageData.payload, "from");
        const emailBody = extractEmailBody(messageData.payload) || messageData.snippet || "";
        const receivedAt = messageData.internalDate
          ? new Date(Number(messageData.internalDate)).toISOString()
          : new Date().toISOString();

        // Download PDF attachments
        const pdfMeta = findPdfAttachments(messageData.payload);

        for (const pdf of pdfMeta) {
          const data = await getGmailAttachment(
            tokenData.access_token,
            locked.gmail_message_id,
            pdf.attachmentId
          );
          if (data) {
            pdfAttachments.push({ filename: pdf.filename, base64urlData: data });
          }
        }

        // Run the parsing & database insertions
        await processEmail(admin, {
          user_id: locked.user_id,
          email_body: emailBody,
          gmail_message_id: locked.gmail_message_id,
          subject,
          sender,
          received_at: receivedAt,
          pdfAttachments: pdfAttachments.length > 0 ? pdfAttachments : undefined,
        });

        processedCount += 1;
        success = true;
        console.log(`[process-queue] Successfully processed item ${locked.id} on attempt ${attempts}`);
      } catch (err: any) {
        const delayMs = extractRetryDelayMs(err);
        if (delayMs && attempts < maxAttempts) {
          console.warn(
            `[process-queue] Rate limit (429) hit for item ${locked.id} on attempt ${attempts}/${maxAttempts}. ` +
            `Waiting for retryDelay of ${delayMs}ms before retrying same item...`
          );
          await sleep(delayMs + 1000);
          continue;
        }
        throw err;
      } finally {
        // Proper Memory Management: Explicitly clear buffers to prevent Heap OOM
        pdfAttachments.length = 0;
      }
    }
  } catch (err: any) {
    failedCount += 1;
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[process-queue] Failed processing item ${locked.id} after all attempts:`, errMsg);

    const newRetries = (locked.retries ?? 0) + 1;
    const finalStatus = newRetries >= 3 ? "failed" : "pending";

    await admin
      .from("email_log")
      .update({
        processing_status: finalStatus,
        error_message: errMsg,
        retries: newRetries,
        updated_at: new Date().toISOString(),
      })
      .eq("id", locked.id);
  }

    // Sleep between items to respect API limits
    await sleep(2500);
  }

  console.log(`[process-queue] Run complete. Processed: ${processedCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);
  return { processed: processedCount, failed: failedCount, skipped: skippedCount };
}
