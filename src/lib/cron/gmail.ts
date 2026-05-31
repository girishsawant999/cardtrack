export type GmailTokenRefreshResponse = {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

export type GmailListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
};

export type GmailMessagePayload = {
  mimeType?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  parts?: GmailMessagePayload[];
};

export type GmailMessageResponse = {
  id: string;
  internalDate?: string;
  snippet?: string;
  payload?: GmailMessagePayload;
};

export type GmailAttachment = {
  filename: string;
  mimeType: string;
  data: string; // base64-encoded
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

/**
 * Strip HTML tags and decode common entities to produce readable plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&#8377;/gi, "₹")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract the best text representation from a Gmail message payload.
 * Prefers text/plain, falls back to stripping HTML, then snippet.
 */
export function extractEmailBody(payload: GmailMessagePayload | undefined): string {
  if (!payload) return "";

  // Direct text/plain body
  if (payload.body?.data && payload.mimeType === "text/plain") {
    return decodeBase64Url(payload.body.data);
  }

  // Recurse into multipart parts — prefer text/plain first
  if (payload.parts?.length) {
    // First pass: look for text/plain
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Second pass: recurse into nested multipart
    for (const part of payload.parts) {
      if (part.mimeType?.startsWith("multipart/")) {
        const nested = extractEmailBody(part);
        if (nested.trim()) return nested;
      }
    }
    // Third pass: fall back to text/html → strip tags
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return stripHtml(decodeBase64Url(part.body.data));
      }
    }
  }

  // Single-part HTML body → strip tags
  if (payload.body?.data && payload.mimeType === "text/html") {
    return stripHtml(decodeBase64Url(payload.body.data));
  }

  // Absolute fallback: raw base64 decode
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    // If it looks like HTML, strip it
    if (decoded.includes("<html") || decoded.includes("<body") || decoded.includes("<div")) {
      return stripHtml(decoded);
    }
    return decoded;
  }

  return "";
}

/**
 * Find PDF attachment metadata from a Gmail message payload.
 */
export function findPdfAttachments(
  payload: GmailMessagePayload | undefined
): Array<{ filename: string; attachmentId: string }> {
  if (!payload) return [];

  const results: Array<{ filename: string; attachmentId: string }> = [];

  if (
    payload.mimeType === "application/pdf" &&
    payload.body?.attachmentId &&
    payload.filename
  ) {
    results.push({
      filename: payload.filename,
      attachmentId: payload.body.attachmentId,
    });
  }

  if (payload.parts?.length) {
    for (const part of payload.parts) {
      results.push(...findPdfAttachments(part));
    }
  }

  return results;
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

/**
 * List Gmail messages matching a query. Supports pagination to fetch all
 * matching messages across multiple pages (capped at `maxPages` to avoid
 * runaway loops).
 */
export async function listGmailMessages(
  accessToken: string,
  query: string,
  maxResults = 20,
  fetchAllPages = false,
  maxPages = 10
): Promise<GmailListResponse> {
  const allMessages: Array<{ id: string; threadId: string }> = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(maxResults));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Gmail list API failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as GmailListResponse;
    if (data.messages?.length) {
      allMessages.push(...data.messages);
    }

    pageToken = fetchAllPages ? data.nextPageToken : undefined;
    pages += 1;
  } while (pageToken && pages < maxPages);

  return { messages: allMessages };
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessageResponse | null> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    console.error(`[fetch-emails] Failed to get message ${messageId}: ${res.status}`);
    return null;
  }
  return (await res.json()) as GmailMessageResponse;
}

/**
 * Download a specific attachment from a Gmail message.
 * Returns the raw base64url-encoded data.
 */
export async function getGmailAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<string | null> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    console.error(
      `[fetch-emails] Failed to get attachment ${attachmentId} of message ${messageId}: ${res.status}`
    );
    return null;
  }
  const data = (await res.json()) as { data?: string; size?: number };
  return data.data ?? null;
}
