import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GmailTokenRefreshResponse = {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

type GmailListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
};

type GmailMessagePayload = {
  mimeType?: string;
  body?: { data?: string };
  headers?: Array<{ name: string; value: string }>;
  parts?: GmailMessagePayload[];
};

type GmailMessageResponse = {
  id: string;
  internalDate?: string;
  snippet?: string;
  payload?: GmailMessagePayload;
};

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function extractHeader(payload: GmailMessagePayload | undefined, name: string): string {
  const headers = payload?.headers ?? [];
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value ?? "";
}

function extractEmailBody(payload: GmailMessagePayload | undefined): string {
  if (!payload) return "";

  if (payload.body?.data && payload.mimeType?.startsWith("text/plain")) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      const nested = extractEmailBody(part);
      if (nested.trim()) return nested;
    }
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  return "";
}

async function refreshAccessToken(refreshToken: string): Promise<GmailTokenRefreshResponse> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = (await tokenResponse.json().catch(() => null)) as
    | (GmailTokenRefreshResponse & { error?: string })
    | null;

  if (!tokenResponse.ok || !tokenData?.access_token) {
    throw new Error(tokenData?.error ?? "Failed to refresh Google access token");
  }

  return tokenData;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const requestBody = (await req.json().catch(() => ({}))) as { user_id?: string };

    // Get all users with Gmail connected (or one user when manually triggered)
    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, email_last_fetched_at")
      .eq("gmail_connected", true);

    if (requestBody.user_id) {
      profilesQuery = profilesQuery.eq("id", requestBody.user_id);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) throw profilesError;

    const parseStatementUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/parse-statement`;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    const results: Array<Record<string, unknown>> = [];

    for (const profile of profiles || []) {
      try {
        const { data: tokenRow, error: tokenError } = await supabaseAdmin
          .from("gmail_oauth_tokens")
          .select("refresh_token")
          .eq("user_id", profile.id)
          .maybeSingle();

        if (tokenError) throw tokenError;

        if (!tokenRow?.refresh_token) {
          await supabaseAdmin
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
        const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

        await supabaseAdmin
          .from("gmail_oauth_tokens")
          .update({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type ?? "Bearer",
            scope: tokenData.scope ?? null,
            expires_at: tokenExpiresAt,
          })
          .eq("user_id", profile.id);

        const query = "(subject:statement OR subject:bill OR subject:due) newer_than:45d";
        const listRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
            query
          )}&maxResults=20`,
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          }
        );

        if (!listRes.ok) {
          throw new Error(`Gmail list API failed: ${listRes.status}`);
        }

        const listData = (await listRes.json()) as GmailListResponse;
        const messages = listData.messages ?? [];
        let processedCount = 0;
        let skippedCount = 0;

        for (const message of messages) {
          const { data: existing } = await supabaseAdmin
            .from("email_log")
            .select("id")
            .eq("gmail_message_id", message.id)
            .maybeSingle();

          if (existing) {
            skippedCount += 1;
            continue;
          }

          const messageRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
            {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
              },
            }
          );

          if (!messageRes.ok) {
            skippedCount += 1;
            continue;
          }

          const messageData = (await messageRes.json()) as GmailMessageResponse;
          const subject = extractHeader(messageData.payload, "subject");
          const sender = extractHeader(messageData.payload, "from");
          const emailBody = extractEmailBody(messageData.payload) || messageData.snippet || "";

          const receivedAt = messageData.internalDate
            ? new Date(Number(messageData.internalDate)).toISOString()
            : new Date().toISOString();

          const parseRes = await fetch(parseStatementUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: profile.id,
              email_body: emailBody,
              gmail_message_id: message.id,
              subject,
              sender,
              received_at: receivedAt,
            }),
          });

          if (parseRes.ok) {
            processedCount += 1;
          } else {
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

        // Update last fetched timestamp
        await supabaseAdmin
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
          await supabaseAdmin
            .from("profiles")
            .update({ gmail_connected: false })
            .eq("id", profile.id);
        }

        results.push({
          userId: profile.id,
          status: "error",
          message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
