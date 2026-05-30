import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MOCK_CARDS, MOCK_BILLS, MOCK_NOTIFICATIONS } from "@/lib/mock-data";
import type {
  Bill,
  BillWithCard,
  CreditCard,
  Notification,
  Profile,
} from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type SupabaseUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown> | null;
};

async function getAuthedContext(): Promise<{
  supabase: SupabaseServerClient;
  user: SupabaseUser;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return {
    supabase,
    user: {
      id: user.id,
      email: user.email ?? null,
      user_metadata: (user.user_metadata as Record<string, unknown>) ?? null,
    },
  };
}

function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function maybeNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeCard(card: Record<string, unknown>): CreditCard {
  return {
    ...(card as unknown as CreditCard),
    credit_limit: maybeNum(card.credit_limit),
  };
}

function normalizeBill(bill: Record<string, unknown>): Bill {
  return {
    ...(bill as unknown as Bill),
    total_amount: num(bill.total_amount),
    minimum_payment: maybeNum(bill.minimum_payment),
    previous_balance: maybeNum(bill.previous_balance),
    paid_amount: num(bill.paid_amount),
    ai_confidence: maybeNum(bill.ai_confidence),
  };
}

export async function getCurrentUser(): Promise<SupabaseUser> {
  const { user } = await getAuthedContext();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const { supabase, user } = await getAuthedContext();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (data) return data as Profile;

  // Fallback: profile row missing (e.g. user predates the auth.users trigger).
  // Insert it now using metadata from the auth session.
  const meta = user.user_metadata ?? {};
  const fullName =
    (meta["full_name"] as string | undefined) ??
    (meta["name"] as string | undefined) ??
    null;
  const avatarUrl =
    (meta["avatar_url"] as string | undefined) ??
    (meta["picture"] as string | undefined) ??
    null;

  await supabase
    .from("profiles")
    .insert({ id: user.id, full_name: fullName, avatar_url: avatarUrl });

  const { data: created } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (created as Profile | null) ?? null;
}

export async function getCards(): Promise<CreditCard[]> {
  const { supabase, user } = await getAuthedContext();
  const { data } = await supabase
    .from("credit_cards")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
    
  if (!data || data.length === 0) {
    return MOCK_CARDS;
  }
  
  return (data as Record<string, unknown>[]).map(normalizeCard);
}

export async function getCardById(id: string): Promise<CreditCard | null> {
  const { supabase, user } = await getAuthedContext();
  const { data } = await supabase
    .from("credit_cards")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
    
  if (!data) {
    return MOCK_CARDS.find((c) => c.id === id) || null;
  }
  
  return normalizeCard(data as Record<string, unknown>);
}

export async function getBills(): Promise<BillWithCard[]> {
  const { supabase, user } = await getAuthedContext();
  const { data } = await supabase
    .from("bills")
    .select("*, credit_cards(*)")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true });

  if (!data || data.length === 0) {
    return MOCK_BILLS;
  }

  return (data as Record<string, unknown>[]).map((row) => {
    const normalized = normalizeBill(row);
    const joined = row.credit_cards as Record<string, unknown> | null;
    return {
      ...normalized,
      credit_cards: joined
        ? normalizeCard(joined)
        : ({} as CreditCard),
    } as BillWithCard;
  });
}

export async function getBillsForCard(cardId: string): Promise<Bill[]> {
  const { supabase, user } = await getAuthedContext();
  const { data } = await supabase
    .from("bills")
    .select("*")
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .order("statement_date", { ascending: false });
    
  if (!data || data.length === 0) {
    return MOCK_BILLS.filter((b) => b.card_id === cardId);
  }
  
  return (data as Record<string, unknown>[]).map(normalizeBill);
}

export async function getNotifications(): Promise<Notification[]> {
  const { supabase, user } = await getAuthedContext();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
    
  if (!data || data.length === 0) {
    return MOCK_NOTIFICATIONS;
  }
  
  return data as Notification[];
}
