import { GoogleGenAI, Type } from "@google/genai";
import { isEncrypted, decryptPDF } from "@pdfsmaller/pdf-decrypt";

export interface ParsedStatement {
  is_credit_card_statement: boolean;
  confidence: number;
  bank_name: string;
  card_last_four: string;
  card_network: string | null;
  statement_date: string;
  due_date: string;
  total_amount: number;
  minimum_payment: number | null;
  previous_balance: number | null;
  payment_link: string | null;
}

const GEMINI_PROMPT = `You are a financial data extraction assistant. Analyze the following email content (and any attached PDF statement) and determine if it is a credit card statement notification or bill alert.

If it IS a credit card statement/bill notification, extract the following information:
- bank_name: The issuing bank name
- card_last_four: The last 4 digits of the card number
- card_network: The card network (visa, mastercard, rupay, amex) if mentioned
- statement_date: The statement generation date (YYYY-MM-DD format)
- due_date: The payment due date (YYYY-MM-DD format)
- total_amount: The total amount due (number only, no currency symbol)
- minimum_payment: The minimum payment amount if mentioned (number or null)
- previous_balance: Previous outstanding balance if mentioned (number or null)
- payment_link: Any URL for making payment if present (string or null)

Return a JSON object with these fields plus:
- is_credit_card_statement: boolean (true if this is a real credit card bill/statement)
- confidence: number between 0 and 1

If it is NOT a credit card statement, set is_credit_card_statement to false and confidence to your certainty level.

Email content:
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_credit_card_statement: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },
    bank_name: { type: Type.STRING },
    card_last_four: { type: Type.STRING },
    card_network: { type: Type.STRING },
    statement_date: { type: Type.STRING },
    due_date: { type: Type.STRING },
    total_amount: { type: Type.NUMBER },
    minimum_payment: { type: Type.NUMBER },
    previous_balance: { type: Type.NUMBER },
    payment_link: { type: Type.STRING },
  },
  required: ["is_credit_card_statement", "confidence"],
};

/**
 * Convert base64url-encoded data to standard base64 for the Gemini API.
 */
function base64UrlToBase64(base64url: string): string {
  return base64url.replace(/-/g, "+").replace(/_/g, "/");
}

/**
 * Helper to convert base64 to Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const standardBase64 = base64.replace(/-/g, "+").replace(/_/g, "/");
  const buffer = Buffer.from(standardBase64, "base64");
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Helper to convert Uint8Array to base64.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
}

/**
 * Parse an email body (and optional PDF attachments) with Gemini.
 *
 * @param emailBody  The plain-text email body.
 * @param pdfAttachments  Optional array of { filename, base64urlData } for PDF attachments.
 * @param pdfPasswords  Optional array of user-defined PDF passwords to attempt decryption.
 */
export async function parseEmailWithGemini(
  emailBody: string,
  pdfAttachments?: Array<{ filename: string; base64urlData: string }>,
  pdfPasswords?: string[]
): Promise<ParsedStatement> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  // Build the contents array for the request
  const contents: Array<
    | string
    | { inlineData: { mimeType: string; data: string } }
  > = [];

  // Add the text prompt + email body
  contents.push(GEMINI_PROMPT + emailBody.substring(0, 5000));

  // Add PDF attachments as inline data (Gemini supports PDF natively)
  if (pdfAttachments?.length) {
    for (const pdf of pdfAttachments) {
      const pdfBytes = base64ToUint8Array(pdf.base64urlData);
      const encryptionInfo = await isEncrypted(pdfBytes);
      
      let finalBase64 = pdf.base64urlData;

      if (encryptionInfo.encrypted) {
        console.log(`[gemini] PDF "${pdf.filename}" is password-protected. Attempting decryption...`);
        let decryptedBytes: Uint8Array | null = null;
        
        const passwordsToTry = pdfPasswords ?? [];
        for (const pwd of passwordsToTry) {
          try {
            decryptedBytes = await decryptPDF(pdfBytes, pwd);
            console.log(`[gemini] Successfully decrypted PDF "${pdf.filename}" using user-provided password.`);
            break;
          } catch (e) {
            // Password failed, try the next one
          }
        }

        if (!decryptedBytes) {
          console.warn(
            `[gemini] PDF "${pdf.filename}" is password-protected and decryption failed. Skipping attachment, falling back to email body content only.`
          );
          continue;
        }

        finalBase64 = uint8ArrayToBase64(decryptedBytes);
      } else {
        // If not encrypted, standardize the encoding
        finalBase64 = base64UrlToBase64(pdf.base64urlData);
      }

      console.log(
        `[gemini] Attaching PDF: ${pdf.filename} (${Math.round((finalBase64.length * 0.75) / 1024)}KB)`
      );
      
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: finalBase64,
        },
      });
    }
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const parsedText = response.text ?? "{}";
  return JSON.parse(parsedText) as ParsedStatement;
}
