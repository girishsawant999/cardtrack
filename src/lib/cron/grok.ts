import { Groq } from "groq-sdk";
import { ParsedStatement } from "./gemini";

const GROK_SYSTEM_PROMPT = `You are a financial data extraction assistant. Analyze the email content and determine if it is a credit card statement notification or bill alert.

If it IS a credit card statement/bill notification, extract the following information and return a JSON object with these exact keys:
- is_credit_card_statement: boolean (must be true)
- confidence: number between 0 and 1 (level of certainty)
- bank_name: string (the issuing bank name, e.g., "HDFC", "ICICI", "SBI", "AMEX")
- card_last_four: string (the last 4 digits of the card number)
- card_network: "visa" | "mastercard" | "rupay" | "amex" | null (the card network, lowercase, or null if not found)
- statement_date: string (statement generation date in YYYY-MM-DD format)
- due_date: string (payment due date in YYYY-MM-DD format)
- total_amount: number (total amount due, number only, no currency symbols or commas)
- minimum_payment: number | null (minimum payment amount, number only, or null if not found)
- previous_balance: number | null (previous outstanding balance, number only, or null if not found)
- payment_link: string | null (any URL for making payment, or null if not found)

If it is NOT a credit card statement or bill notification, return a JSON object with:
- is_credit_card_statement: boolean (must be false)
- confidence: number between 0 and 1
- bank_name: ""
- card_last_four: ""
- card_network: null
- statement_date: ""
- due_date: ""
- total_amount: 0
- minimum_payment: null
- previous_balance: null
- payment_link: null

IMPORTANT: Return ONLY the raw JSON object. Do not include markdown formatting or wrapping code blocks.`;

export async function parseEmailWithGrok(
  emailBody: string
): Promise<ParsedStatement> {
  const groqApiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY (or GROK_API_KEY) not configured");
  }

  const groqModel = process.env.GROQ_MODEL || process.env.GROK_MODEL || "llama-3.3-70b-versatile";

  console.log(`[groq] Sending request to Groq Cloud using model "${groqModel}"...`);

  const groq = new Groq({ apiKey: groqApiKey });

  const completion = await groq.chat.completions.create({
    model: groqModel,
    messages: [
      {
        role: "system",
        content: GROK_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Email Content:\n${emailBody.substring(0, 5000)}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const rawText = completion.choices?.[0]?.message?.content ?? "{}";
  console.log(`[groq] Raw response: ${rawText}`);

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch (parseErr) {
    console.error(`[grok] Failed to parse Grok JSON response: ${rawText}`);
    throw new Error(`Failed to parse Grok AI response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
  }

  // Helper function to safely parse numbers
  const parseNum = (val: any): number => {
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const cleaned = val.replace(/[^0-9.]/g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const parseMaybeNum = (val: any): number | null => {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const cleaned = val.replace(/[^0-9.]/g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  // Helper function to normalize card network
  const normalizeNetwork = (val: any): string | null => {
    if (!val || typeof val !== "string") return null;
    const lower = val.toLowerCase().trim();
    if (["visa", "mastercard", "rupay", "amex", "discover"].includes(lower)) {
      return lower;
    }
    return null;
  };

  // Safe normalization into ParsedStatement
  return {
    is_credit_card_statement: Boolean(parsed.is_credit_card_statement),
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    bank_name: typeof parsed.bank_name === "string" ? parsed.bank_name : "",
    card_last_four: typeof parsed.card_last_four === "string" ? parsed.card_last_four : String(parsed.card_last_four ?? ""),
    card_network: normalizeNetwork(parsed.card_network),
    statement_date: typeof parsed.statement_date === "string" ? parsed.statement_date : "",
    due_date: typeof parsed.due_date === "string" ? parsed.due_date : "",
    total_amount: parseNum(parsed.total_amount),
    minimum_payment: parseMaybeNum(parsed.minimum_payment),
    previous_balance: parseMaybeNum(parsed.previous_balance),
    payment_link: typeof parsed.payment_link === "string" ? parsed.payment_link : null,
  };
}
