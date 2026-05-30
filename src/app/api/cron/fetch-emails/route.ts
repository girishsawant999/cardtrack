import { NextResponse } from "next/server";
import { assertCronAuth, CronAuthError } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/cron/admin-client";
import {
  extractEmailBody,
  extractHeader,
  getGmailMessage,
  listGmailMessages,
  refreshAccessToken,
} from "@/lib/cron/gmail";
import { processEmail } from "@/lib/cron/parse-statement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = { user_id?: string };

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

  let profilesQuery = admin
    .from("profiles")
    .select("id, email_last_fetched_at")
    .eq("gmail_connected", true);

  if (body.user_id) {
    profilesQuery = profilesQuery.eq("id", body.user_id);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;
  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const profile of profiles ?? []) {
    try {
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

        results.push({
          userId: profile.id,
          status: "skipped",
          message: "No refresh token found. User was disconnected.",
        });
        continue;
      }

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

      const query = "(subject:statement OR subject:bill OR subject:due) newer_than:45d";
      const listData = await listGmailMessages(tokenData.access_token, query, 20);
      const messages = listData.messages ?? [];

      let processedCount = 0;
      let skippedCount = 0;

      for (const message of messages) {
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
          skippedCount += 1;
          continue;
        }

        const subject = extractHeader(messageData.payload, "subject");
        const sender = extractHeader(messageData.payload, "from");
        const emailBody = extractEmailBody(messageData.payload) || messageData.snippet || "";
        const receivedAt = messageData.internalDate
          ? new Date(Number(messageData.internalDate)).toISOString()
          : new Date().toISOString();

        try {
          await processEmail(admin, {
            user_id: profile.id,
            email_body: emailBody,
            gmail_message_id: message.id,
            subject,
            sender,
            received_at: receivedAt,
          });
          processedCount += 1;
        } catch {
          skippedCount += 1;
        }
      }

      results.push({
        userId: profile.id,
        status: "processed",
        message: `Processed ${processedCount} messages (${skippedCount} skipped)`,
        total_messages: messages.length,
        processed_messages: processedCount,
        skipped_messages: skippedCount,
      });

      await admin
        .from("profiles")
        .update({
          email_last_fetched_at: new Date().toISOString(),
          gmail_connected: true,
        })
        .eq("id", profile.id);
    } catch (userErr) {
      const message = userErr instanceof Error ? userErr.message : "Unknown error";

      if (
        message.includes("invalid_grant") ||
        message.includes("unauthorized") ||
        message.includes("invalid_token")
      ) {
        await admin
          .from("profiles")
          .update({ gmail_connected: false })
          .eq("id", profile.id);
      }

      results.push({ userId: profile.id, status: "error", message });
    }
  }

  return NextResponse.json({ success: true, results });
}
