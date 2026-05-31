import { NextResponse } from "next/server";
import { assertCronAuth, CronAuthError } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/cron/admin-client";
import {
  extractEmailBody,
  extractHeader,
  findPdfAttachments,
  getGmailAttachment,
  getGmailMessage,
  listGmailMessages,
  refreshAccessToken,
} from "@/lib/cron/gmail";
import { processEmail } from "@/lib/cron/parse-statement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = { user_id?: string; source?: "user" | "cron" };

/**
 * Determines whether the request is user-initiated or cron-initiated.
 * - User trigger: `/api/trigger-fetch` passes `{ source: "user", user_id }`.
 * - Cron trigger: pg_cron POSTs with no body or `{ source: "cron" }`.
 */
function isCronTrigger(body: Body): boolean {
  return body.source !== "user";
}

/**
 * Build the Gmail search query and pagination config based on trigger source.
 *
 * Cron (daily):  last 1 day, statement/bill/due emails with PDF attachment, fetch all pages
 * User (manual): last 45 days, statement/bill/due emails (any), capped at 50
 */
function buildSearchConfig(cron: boolean) {
  const baseFilter = "(subject:statement OR subject:bill OR subject:due)";

  if (cron) {
    return {
      query: `${baseFilter} has:attachment filename:pdf newer_than:1d`,
      maxResults: 50,
      fetchAllPages: true,
    };
  }

  return {
    query: `${baseFilter} has:attachment filename:pdf newer_than:45d`,
    maxResults: 50,
    fetchAllPages: true,
  };
}

export async function POST(req: Request) {
  try {
    assertCronAuth(req);
  } catch (err) {
    if (err instanceof CronAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const admin = createAdminClient();
  const cronMode = isCronTrigger(body);

  console.log(`[fetch-emails] Starting run — mode=${cronMode ? "cron" : "user"}, user_id=${body.user_id ?? "all"}`);

  let profilesQuery = admin
    .from("profiles")
    .select("id, email_last_fetched_at")
    .eq("gmail_connected", true);

  if (body.user_id) {
    profilesQuery = profilesQuery.eq("id", body.user_id);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;
  if (profilesError) {
    console.error("[fetch-emails] Failed to query profiles:", profilesError.message);
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  console.log(`[fetch-emails] Found ${profiles?.length ?? 0} connected profile(s)`);

  const results: Array<Record<string, unknown>> = [];

  for (const profile of profiles ?? []) {
    try {
      // ── Step 1: Get refresh token ──────────────────────────────────────
      const { data: tokenRow, error: tokenError } = await admin
        .from("gmail_oauth_tokens")
        .select("refresh_token")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (tokenError) throw tokenError;

      if (!tokenRow?.refresh_token) {
        await admin
          .from("profiles")
          .update({ gmail_connected: false })
          .eq("id", profile.id);

        console.warn(`[fetch-emails] User ${profile.id}: No refresh token, disconnecting.`);
        results.push({
          userId: profile.id,
          status: "skipped",
          message: "No refresh token found. User was disconnected.",
        });
        continue;
      }

      // ── Step 2: Refresh access token ───────────────────────────────────
      const tokenData = await refreshAccessToken(tokenRow.refresh_token);
      const tokenExpiresAt = new Date(
        Date.now() + tokenData.expires_in * 1000
      ).toISOString();

      await admin
        .from("gmail_oauth_tokens")
        .update({
          access_token: tokenData.access_token,
          token_type: tokenData.token_type ?? "Bearer",
          scope: tokenData.scope ?? null,
          expires_at: tokenExpiresAt,
        })
        .eq("user_id", profile.id);

      // ── Step 3: List messages ──────────────────────────────────────────
      const { query, maxResults, fetchAllPages } = buildSearchConfig(cronMode);
      console.log(`[fetch-emails] User ${profile.id}: Searching Gmail — query="${query}", maxResults=${maxResults}, fetchAllPages=${fetchAllPages}`);

      const listData = await listGmailMessages(
        tokenData.access_token,
        query,
        maxResults,
        fetchAllPages
      );
      const messages = listData.messages ?? [];
      console.log(`[fetch-emails] User ${profile.id}: Found ${messages.length} message(s)`);

      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      // ── Step 4: Process each message ───────────────────────────────────
      for (const message of messages) {
        // De-duplicate against email_log
        const { data: existing } = await admin
          .from("email_log")
          .select("id")
          .eq("gmail_message_id", message.id)
          .maybeSingle();

        if (existing) {
          skippedCount += 1;
          continue;
        }

        const messageData = await getGmailMessage(tokenData.access_token, message.id);
        if (!messageData) {
          console.warn(`[fetch-emails] User ${profile.id}: Could not fetch message ${message.id}, skipping.`);
          skippedCount += 1;
          continue;
        }

        const subject = extractHeader(messageData.payload, "subject");
        const sender = extractHeader(messageData.payload, "from");
        const emailBody = extractEmailBody(messageData.payload) || messageData.snippet || "";
        const receivedAt = messageData.internalDate
          ? new Date(Number(messageData.internalDate)).toISOString()
          : new Date().toISOString();

        // ── Step 4a: Download PDF attachments ────────────────────────────
        const pdfMeta = findPdfAttachments(messageData.payload);
        const pdfAttachments: Array<{ filename: string; base64urlData: string }> = [];

        for (const pdf of pdfMeta) {
          const data = await getGmailAttachment(
            tokenData.access_token,
            message.id,
            pdf.attachmentId
          );
          if (data) {
            pdfAttachments.push({ filename: pdf.filename, base64urlData: data });
            console.log(`[fetch-emails] User ${profile.id}: Downloaded PDF "${pdf.filename}" from message ${message.id}`);
          }
        }

        // ── Step 4b: Process with Gemini ─────────────────────────────────
        try {
          await processEmail(admin, {
            user_id: profile.id,
            email_body: emailBody,
            gmail_message_id: message.id,
            subject,
            sender,
            received_at: receivedAt,
            pdfAttachments: pdfAttachments.length > 0 ? pdfAttachments : undefined,
          });
          processedCount += 1;
        } catch (processErr) {
          errorCount += 1;
          console.error(
            `[fetch-emails] User ${profile.id}: Failed to process message ${message.id} (subject="${subject}"):`,
            processErr instanceof Error ? processErr.message : processErr
          );
        } finally {
          // Explicitly clear references to large PDF base64 buffers to release heap memory immediately
          pdfAttachments.length = 0;
        }
      }

      const summary = `Processed ${processedCount}, skipped ${skippedCount}, errors ${errorCount} out of ${messages.length} total`;
      console.log(`[fetch-emails] User ${profile.id}: ${summary}`);

      results.push({
        userId: profile.id,
        status: "processed",
        message: summary,
        total_messages: messages.length,
        processed_messages: processedCount,
        skipped_messages: skippedCount,
        error_messages: errorCount,
      });

      await admin
        .from("profiles")
        .update({
          email_last_fetched_at: new Date().toISOString(),
          email_last_fetch_source: cronMode ? "cron" : "user",
          gmail_connected: true,
        })
        .eq("id", profile.id);
    } catch (userErr) {
      const message = userErr instanceof Error ? userErr.message : "Unknown error";
      console.error(`[fetch-emails] User ${profile.id}: Fatal error — ${message}`);

      if (
        message.includes("invalid_grant") ||
        message.includes("unauthorized") ||
        message.includes("invalid_token")
      ) {
        await admin
          .from("profiles")
          .update({ gmail_connected: false })
          .eq("id", profile.id);
        console.warn(`[fetch-emails] User ${profile.id}: OAuth invalid, disconnecting.`);
      }

      results.push({ userId: profile.id, status: "error", message });
    }
  }

  console.log(`[fetch-emails] Run complete. ${results.length} user(s) processed.`);
  return NextResponse.json({ success: true, mode: cronMode ? "cron" : "user", results });
}
