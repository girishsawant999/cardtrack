// Supabase Edge Function: parse-statement
// Receives email body, uses Gemini API to extract bill details

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedStatement {
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

interface RequestBody {
  user_id: string;
  email_body: string;
  gmail_message_id: string;
  subject: string;
  sender: string;
  received_at: string;
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, email_body, gmail_message_id, subject, sender, received_at } =
      (await req.json()) as RequestBody;

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if already processed
    const { data: existingLog } = await supabaseAdmin
      .from("email_log")
      .select("id")
      .eq("gmail_message_id", gmail_message_id)
      .single();

    if (existingLog) {
      return new Response(
        JSON.stringify({ success: true, message: "Already processed", skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the email
    await supabaseAdmin.from("email_log").insert({
      user_id,
      gmail_message_id,
      subject,
      sender,
      received_at,
      processing_status: "pending",
    });

    // Call Gemini API with structured output
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: GEMINI_PROMPT + email_body.substring(0, 5000) }],
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

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiResult = await geminiResponse.json();
    const parsedText =
      geminiResult.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed: ParsedStatement = JSON.parse(parsedText);

    // Update email log
    await supabaseAdmin
      .from("email_log")
      .update({
        processing_status: parsed.is_credit_card_statement ? "processed" : "ignored",
        processing_result: parsed as unknown as Record<string, unknown>,
      })
      .eq("gmail_message_id", gmail_message_id);

    if (!parsed.is_credit_card_statement) {
      return new Response(
        JSON.stringify({ success: true, message: "Not a credit card statement", parsed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or create the credit card
    const { data: existingCard } = await supabaseAdmin
      .from("credit_cards")
      .select("id")
      .eq("user_id", user_id)
      .eq("last_four_digits", parsed.card_last_four)
      .eq("bank_name", parsed.bank_name)
      .single();

    let cardId: string;
    let isNewCard = false;

    if (existingCard) {
      cardId = existingCard.id;
    } else {
      // Auto-create the card
      const { data: newCard, error: cardError } = await supabaseAdmin
        .from("credit_cards")
        .insert({
          user_id,
          bank_name: parsed.bank_name,
          card_network: parsed.card_network,
          last_four_digits: parsed.card_last_four,
        })
        .select("id")
        .single();

      if (cardError) throw cardError;
      cardId = newCard!.id;
      isNewCard = true;

      // Create notification for new card
      await supabaseAdmin.from("notifications").insert({
        user_id,
        title: "New card detected!",
        message: `We found a ${parsed.bank_name} card (****${parsed.card_last_four}) from your email statements.`,
        type: "new_card",
        related_card_id: cardId,
      });
    }

    // Create the bill record (upsert to handle duplicates)
    const { error: billError } = await supabaseAdmin.from("bills").upsert(
      {
        card_id: cardId,
        user_id,
        statement_date: parsed.statement_date,
        due_date: parsed.due_date,
        total_amount: parsed.total_amount,
        minimum_payment: parsed.minimum_payment,
        previous_balance: parsed.previous_balance,
        payment_link: parsed.payment_link,
        source_email_id: gmail_message_id,
        ai_confidence: parsed.confidence,
        ai_verified: parsed.confidence > 0.8,
        raw_email_snippet: email_body.substring(0, 500),
      },
      { onConflict: "card_id,statement_date" }
    );

    if (billError) throw billError;

    // If overdue, create notification
    const dueDate = new Date(parsed.due_date);
    if (dueDate < new Date()) {
      await supabaseAdmin.from("notifications").insert({
        user_id,
        title: "Bill overdue!",
        message: `Your ${parsed.bank_name} (****${parsed.card_last_four}) bill of ₹${parsed.total_amount.toLocaleString()} is overdue.`,
        type: "warning",
        related_card_id: cardId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isNewCard ? "New card created with bill" : "Bill added to existing card",
        parsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
