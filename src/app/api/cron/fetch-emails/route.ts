import { createAdminClient } from "@/lib/cron/admin-client";
import { assertCronAuth, CronAuthError } from "@/lib/cron/auth";
import { listGmailMessages, refreshAccessToken } from "@/lib/cron/gmail";
import { processQueue } from "@/lib/cron/process-queue";
import { after, NextResponse } from "next/server";

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
  // Exclude mutual funds, portfolios, demat/investment statements, and require credit card keywords.
  // We exclude the investment keywords from the subject to avoid matching footer promos in legitimate credit card emails.
  const baseFilter =
    "(subject:(statement OR credit OR due OR bill OR card) " +
    "(card OR credit OR cards) " +
    "-subject:(mutual OR experian OR cibil OR  fund OR funds OR folio OR cas OR demat OR sip OR nps OR investment OR investments OR portfolio OR cams OR kfintech OR stock OR stocks OR dividend))";

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

  console.log(
    `[fetch-emails] Starting run — mode=${cronMode ? "cron" : "user"}, user_id=${body.user_id ?? "all"}`,
  );

  let profilesQuery = admin
    .from("profiles")
    .select("id, email_last_fetched_at")
    .eq("gmail_connected", true);

  if (body.user_id) {
    profilesQuery = profilesQuery.eq("id", body.user_id);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;
  if (profilesError) {
    console.error(
      "[fetch-emails] Failed to query profiles:",
      profilesError.message,
    );
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  console.log(
    `[fetch-emails] Found ${profiles?.length ?? 0} connected profile(s)`,
  );

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

        console.warn(
          `[fetch-emails] User ${profile.id}: No refresh token, disconnecting.`,
        );
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
        Date.now() + tokenData.expires_in * 1000,
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
      console.log(
        `[fetch-emails] User ${profile.id}: Searching Gmail — query="${query}", maxResults=${maxResults}, fetchAllPages=${fetchAllPages}`,
      );

      const listData = await listGmailMessages(
        tokenData.access_token,
        query,
        maxResults,
        fetchAllPages,
      );
      const messages = listData.messages ?? [];
      console.log(
        `[fetch-emails] User ${profile.id}: Found ${messages.length} message(s)`,
      );

      // Get all existing gmail_message_ids in DB for these messages to do a fast check
      const messageIds = messages.map((m) => m.id);
      let existingIds = new Set<string>();

      if (messageIds.length > 0) {
        const { data: existingLogs } = await admin
          .from("email_log")
          .select("gmail_message_id")
          .in("gmail_message_id", messageIds);

        if (existingLogs) {
          existingIds = new Set(existingLogs.map((l) => l.gmail_message_id));
        }
      }

      const newMessages = messages.filter((m) => !existingIds.has(m.id));
      const skippedCount = messages.length - newMessages.length;
      let queuedCount = 0;

      if (newMessages.length > 0) {
        const insertRows = newMessages.map((m) => ({
          user_id: profile.id,
          gmail_message_id: m.id,
          processing_status: "pending",
        }));

        const { error: insertError } = await admin
          .from("email_log")
          .insert(insertRows);
        if (insertError) {
          console.error(
            `[fetch-emails] User ${profile.id}: Failed to queue new messages:`,
            insertError.message,
          );
          throw insertError;
        }
        queuedCount = newMessages.length;
      }

      const summary = `Queued ${queuedCount} new statements, skipped ${skippedCount} duplicates out of ${messages.length} total`;
      console.log(`[fetch-emails] User ${profile.id}: ${summary}`);

      results.push({
        userId: profile.id,
        status: "queued",
        message: summary,
        total_messages: messages.length,
        queued_messages: queuedCount,
        skipped_messages: skippedCount,
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
      const message =
        userErr instanceof Error ? userErr.message : "Unknown error";
      console.error(
        `[fetch-emails] User ${profile.id}: Fatal error — ${message}`,
      );

      if (
        message.includes("invalid_grant") ||
        message.includes("unauthorized") ||
        message.includes("invalid_token")
      ) {
        await admin
          .from("profiles")
          .update({ gmail_connected: false })
          .eq("id", profile.id);
        console.warn(
          `[fetch-emails] User ${profile.id}: OAuth invalid, disconnecting.`,
        );
      }

      results.push({ userId: profile.id, status: "error", message });
    }
  }

  console.log(
    `[fetch-emails] Run complete. ${results.length} user(s) processed.`,
  );

  // Trigger background queue processing after sending response
  after(async () => {
    try {
      console.log(`[fetch-emails] Triggering background queue processing...`);
      await processQueue(admin, body.user_id);
    } catch (bgErr) {
      console.error(
        `[fetch-emails] Error in background queue processing:`,
        bgErr,
      );
    }
  });

  return NextResponse.json({
    success: true,
    mode: cronMode ? "cron" : "user",
    results,
  });
}
