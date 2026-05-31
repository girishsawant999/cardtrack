import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database";
import { parseEmail } from "./ai-provider";
import { type ParsedStatement } from "./gemini";

export interface ParseInput {
  user_id: string;
  email_body: string;
  gmail_message_id: string;
  subject: string;
  sender: string;
  received_at: string;
  pdfAttachments?: Array<{ filename: string; base64urlData: string }>;
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
  const { user_id, email_body, gmail_message_id, subject, sender, received_at, pdfAttachments } = input;

  const { data: existingLog } = await admin
    .from("email_log")
    .select("id, processing_status")
    .eq("gmail_message_id", gmail_message_id)
    .maybeSingle();

  if (existingLog && (existingLog.processing_status === "processed" || existingLog.processing_status === "ignored")) {
    return { success: true, message: "Already processed", skipped: true };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("pdf_passwords, ai_provider")
    .eq("id", user_id)
    .maybeSingle();

  const pdfPasswords = profile?.pdf_passwords ?? [];
  const aiProvider = (profile as any)?.ai_provider ?? "gemini";

  const parsed = await parseEmail(email_body, pdfAttachments, pdfPasswords, aiProvider);

  // Gemini API call succeeded. Now upsert the email log.
  await admin.from("email_log").upsert(
    {
      user_id,
      gmail_message_id,
      subject,
      sender,
      received_at,
      processing_status: parsed.is_credit_card_statement ? "processed" : "ignored",
      processing_result: parsed as unknown as Json,
      error_message: null,
      retries: 0,
    },
    { onConflict: "gmail_message_id" }
  );

  if (!parsed.is_credit_card_statement) {
    return { success: true, message: "Not a credit card statement", parsed };
  }

  // Normalize bank name & card last four
  const bankName = parsed.bank_name?.trim() || "UNKNOWN";
  const lastFourDigits = parsed.card_last_four?.trim() || "XXXX";

  // Validate and default statement_date
  let statementDate = parsed.statement_date?.trim();
  let usedFallback = false;
  if (!statementDate || isNaN(Date.parse(statementDate))) {
    statementDate = received_at.split("T")[0];
    usedFallback = true;
  } else {
    try {
      statementDate = new Date(statementDate).toISOString().split("T")[0];
    } catch {
      statementDate = received_at.split("T")[0];
      usedFallback = true;
    }
  }

  // Validate and default due_date
  let dueDate = parsed.due_date?.trim();
  if (!dueDate || isNaN(Date.parse(dueDate))) {
    try {
      const date = new Date(statementDate);
      date.setDate(date.getDate() + 20);
      dueDate = date.toISOString().split("T")[0];
    } catch {
      dueDate = statementDate;
    }
    usedFallback = true;
  } else {
    try {
      dueDate = new Date(dueDate).toISOString().split("T")[0];
    } catch {
      try {
        const date = new Date(statementDate);
        date.setDate(date.getDate() + 20);
        dueDate = date.toISOString().split("T")[0];
      } catch {
        dueDate = statementDate;
      }
      usedFallback = true;
    }
  }

  const { data: existingCard } = await admin
    .from("credit_cards")
    .select("id")
    .eq("user_id", user_id)
    .eq("last_four_digits", lastFourDigits)
    .eq("bank_name", bankName)
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
        bank_name: bankName,
        card_network: parsed.card_network,
        last_four_digits: lastFourDigits,
      })
      .select("id")
      .single();

    if (cardError) throw cardError;
    cardId = newCard!.id;
    isNewCard = true;

    await admin.from("notifications").insert({
      user_id,
      title: "New card detected!",
      message: `We found a ${bankName} card (****${lastFourDigits}) from your email statements.`,
      type: "new_card",
      related_card_id: cardId,
    });
  }

  const { error: billError } = await admin.from("bills").upsert(
    {
      card_id: cardId,
      user_id,
      statement_date: statementDate,
      due_date: dueDate,
      total_amount: parsed.total_amount,
      minimum_payment: parsed.minimum_payment,
      previous_balance: parsed.previous_balance,
      payment_link: parsed.payment_link,
      source_email_id: gmail_message_id,
      ai_confidence: parsed.confidence,
      ai_verified: usedFallback ? false : parsed.confidence > 0.8,
      raw_email_snippet: email_body.substring(0, 500),
    },
    { onConflict: "card_id,statement_date" }
  );

  if (billError) throw billError;

  const parsedDueDate = new Date(dueDate);
  if (parsedDueDate < new Date()) {
    await admin.from("notifications").insert({
      user_id,
      title: "Bill overdue!",
      message: `Your ${bankName} (****${lastFourDigits}) bill of ₹${parsed.total_amount.toLocaleString()} is overdue.`,
      type: "warning",
      related_card_id: cardId,
    });
  }

  return {
    success: true,
    message: isNewCard ? "New card created with bill" : "Bill added to existing card",
    parsed: {
      ...parsed,
      bank_name: bankName,
      card_last_four: lastFourDigits,
      statement_date: statementDate,
      due_date: dueDate,
    },
    isNewCard,
  };
}
