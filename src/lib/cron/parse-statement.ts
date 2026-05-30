import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database";
import { parseEmailWithGemini, type ParsedStatement } from "./gemini";

export interface ParseInput {
  user_id: string;
  email_body: string;
  gmail_message_id: string;
  subject: string;
  sender: string;
  received_at: string;
}

export interface ParseResult {
  success: boolean;
  message: string;
  parsed?: ParsedStatement;
  skipped?: boolean;
  isNewCard?: boolean;
}

export async function processEmail(
  admin: SupabaseClient<Database>,
  input: ParseInput
): Promise<ParseResult> {
  const { user_id, email_body, gmail_message_id, subject, sender, received_at } = input;

  const { data: existingLog } = await admin
    .from("email_log")
    .select("id")
    .eq("gmail_message_id", gmail_message_id)
    .maybeSingle();

  if (existingLog) {
    return { success: true, message: "Already processed", skipped: true };
  }

  await admin.from("email_log").insert({
    user_id,
    gmail_message_id,
    subject,
    sender,
    received_at,
    processing_status: "pending",
  });

  const parsed = await parseEmailWithGemini(email_body);

  await admin
    .from("email_log")
    .update({
      processing_status: parsed.is_credit_card_statement ? "processed" : "ignored",
      processing_result: parsed as unknown as Json,
    })
    .eq("gmail_message_id", gmail_message_id);

  if (!parsed.is_credit_card_statement) {
    return { success: true, message: "Not a credit card statement", parsed };
  }

  const { data: existingCard } = await admin
    .from("credit_cards")
    .select("id")
    .eq("user_id", user_id)
    .eq("last_four_digits", parsed.card_last_four)
    .eq("bank_name", parsed.bank_name)
    .maybeSingle();

  let cardId: string;
  let isNewCard = false;

  if (existingCard) {
    cardId = existingCard.id;
  } else {
    const { data: newCard, error: cardError } = await admin
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

    await admin.from("notifications").insert({
      user_id,
      title: "New card detected!",
      message: `We found a ${parsed.bank_name} card (****${parsed.card_last_four}) from your email statements.`,
      type: "new_card",
      related_card_id: cardId,
    });
  }

  const { error: billError } = await admin.from("bills").upsert(
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

  const dueDate = new Date(parsed.due_date);
  if (dueDate < new Date()) {
    await admin.from("notifications").insert({
      user_id,
      title: "Bill overdue!",
      message: `Your ${parsed.bank_name} (****${parsed.card_last_four}) bill of ₹${parsed.total_amount.toLocaleString()} is overdue.`,
      type: "warning",
      related_card_id: cardId,
    });
  }

  return {
    success: true,
    message: isNewCard ? "New card created with bill" : "Bill added to existing card",
    parsed,
    isNewCard,
  };
}
