import { parseEmailWithGemini, type ParsedStatement } from "./gemini";
import { parseEmailWithGrok } from "./grok";

export async function parseEmail(
  emailBody: string,
  pdfAttachments?: Array<{ filename: string; base64urlData: string }>,
  pdfPasswords?: string[],
  preferredProvider: "gemini" | "grok" = "gemini"
): Promise<ParsedStatement> {
  const provider = preferredProvider;
  console.log(`[ai-provider] Requested provider: "${provider}"`);

  const geminiAvailable = !!process.env.GEMINI_API_KEY;
  const grokAvailable = !!(process.env.GROQ_API_KEY || process.env.GROK_API_KEY);

  if (provider === "grok") {
    // 1. If Grok is requested and Grok key is not configured, fallback to Gemini
    if (!grokAvailable) {
      console.warn("[ai-provider] Preferred provider is grok but GROQ_API_KEY (or GROK_API_KEY) is not configured. Falling back to Gemini.");
      if (geminiAvailable) {
        return await parseEmailWithGemini(emailBody, pdfAttachments, pdfPasswords);
      }
      throw new Error("Neither Groq/Grok nor Gemini provider API keys are configured.");
    }

    // 2. If there are PDF attachments, Grok cannot process them natively.
    // Try Gemini first if it is configured.
    if (pdfAttachments && pdfAttachments.length > 0) {
      if (geminiAvailable) {
        console.log("[ai-provider] Email contains PDF attachments. Routing to Gemini first for native PDF parsing.");
        try {
          return await parseEmailWithGemini(emailBody, pdfAttachments, pdfPasswords);
        } catch (geminiError: any) {
          const isRateLimit =
            geminiError?.status === "RESOURCE_EXHAUSTED" ||
            geminiError?.code === 429 ||
            String(geminiError?.message || "").includes("quota") ||
            String(geminiError?.message || "").includes("429") ||
            String(geminiError || "").includes("RESOURCE_EXHAUSTED");

          if (isRateLimit) {
            console.warn("[ai-provider] Gemini PDF parsing failed due to rate limiting. Propagating error to retry queue.");
            throw geminiError;
          }

          console.warn(
            `[ai-provider] PDF parsing with Gemini failed: ${geminiError instanceof Error ? geminiError.message : geminiError}. ` +
            `Falling back to Grok for email body content only.`
          );
          // Fall through to Grok for text fallback
        }
      } else {
        console.warn("[ai-provider] Email contains PDF attachments, but Gemini API key is not configured. Grok will process the email body only.");
      }
    }

    // 3. Process with Grok
    try {
      return await parseEmailWithGrok(emailBody);
    } catch (grokError: any) {
      console.warn(
        `[ai-provider] Grok parsing failed: ${grokError instanceof Error ? grokError.message : grokError}.`
      );
      if (geminiAvailable) {
        console.log("[ai-provider] Attempting fallback to Gemini...");
        return await parseEmailWithGemini(emailBody, pdfAttachments, pdfPasswords);
      }
      throw grokError;
    }

  } else {
    // Gemini is the preferred provider
    if (!geminiAvailable) {
      console.warn("[ai-provider] Preferred provider is gemini but GEMINI_API_KEY is not configured. Falling back to Grok.");
      if (grokAvailable) {
        return await parseEmailWithGrok(emailBody);
      }
      throw new Error("Neither Gemini nor Grok provider API keys are configured.");
    }

    try {
      return await parseEmailWithGemini(emailBody, pdfAttachments, pdfPasswords);
    } catch (geminiError: any) {
      const isRateLimit =
        geminiError?.status === "RESOURCE_EXHAUSTED" ||
        geminiError?.code === 429 ||
        String(geminiError?.message || "").includes("quota") ||
        String(geminiError?.message || "").includes("429") ||
        String(geminiError || "").includes("RESOURCE_EXHAUSTED");

      console.warn(
        `[ai-provider] Gemini parsing failed (isRateLimit=${isRateLimit}): ${
          geminiError instanceof Error ? geminiError.message : geminiError
        }.`
      );

      if (grokAvailable) {
        console.log("[ai-provider] Attempting fallback to Grok (will parse email body only)...");
        try {
          return await parseEmailWithGrok(emailBody);
        } catch (grokFallbackError: any) {
          console.error(`[ai-provider] Fallback to Grok also failed: ${grokFallbackError.message}`);
          throw geminiError; // throw original Gemini error
        }
      }
      throw geminiError;
    }
  }
}
