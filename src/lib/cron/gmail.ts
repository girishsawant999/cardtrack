export type GmailTokenRefreshResponse = {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

export type GmailListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
};

export type GmailMessagePayload = {
  mimeType?: string;
  body?: { data?: string };
  headers?: Array<{ name: string; value: string }>;
  parts?: GmailMessagePayload[];
};

export type GmailMessageResponse = {
  id: string;
  internalDate?: string;
  snippet?: string;
  payload?: GmailMessagePayload;
};

export function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

export function extractHeader(
  payload: GmailMessagePayload | undefined,
  name: string
): string {
  const headers = payload?.headers ?? [];
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value ?? "";
}

export function extractEmailBody(payload: GmailMessagePayload | undefined): string {
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

export async function refreshAccessToken(
  refreshToken: string
): Promise<GmailTokenRefreshResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

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

export async function listGmailMessages(
  accessToken: string,
  query: string,
  maxResults = 20
): Promise<GmailListResponse> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
      query
    )}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Gmail list API failed: ${res.status}`);
  return (await res.json()) as GmailListResponse;
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessageResponse | null> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  return (await res.json()) as GmailMessageResponse;
}
