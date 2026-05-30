import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NotificationPreferences } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  due_date_reminder: true,
  new_bill: true,
};

function normalizePreferences(input: unknown): NotificationPreferences {
  if (!input || typeof input !== "object") {
    return DEFAULT_PREFERENCES;
  }

  const obj = input as Record<string, unknown>;
  return {
    due_date_reminder:
      typeof obj.due_date_reminder === "boolean"
        ? obj.due_date_reminder
        : DEFAULT_PREFERENCES.due_date_reminder,
    new_bill:
      typeof obj.new_bill === "boolean"
        ? obj.new_bill
        : DEFAULT_PREFERENCES.new_bill,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    preferences: normalizePreferences(data?.notification_preferences),
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | Partial<NotificationPreferences>
    | null;

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const merged = {
    ...normalizePreferences(existing.notification_preferences),
    ...payload,
  };

  const normalizedMerged = normalizePreferences(merged);

  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: normalizedMerged })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: normalizedMerged });
}
