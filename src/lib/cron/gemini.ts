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

const GEMINI_PROMPT = `You are a financial data extraction assistant. Analyze the following email content and determine if it is a credit card statement notification or bill alert.

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

export async function parseEmailWithGemini(emailBody: string): Promise<ParsedStatement> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: GEMINI_PROMPT + emailBody.substring(0, 5000) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              is_credit_card_statement: { type: "boolean" },
              confidence: { type: "number" },
              bank_name: { type: "string" },
              card_last_four: { type: "string" },
              card_network: { type: "string" },
              statement_date: { type: "string" },
              due_date: { type: "string" },
              total_amount: { type: "number" },
              minimum_payment: { type: "number" },
              previous_balance: { type: "number" },
              payment_link: { type: "string" },
            },
            required: ["is_credit_card_statement", "confidence"],
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const parsedText = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return JSON.parse(parsedText) as ParsedStatement;
}
