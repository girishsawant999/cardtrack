import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("gmail_connected, email_last_fetched_at, email_last_fetch_source")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { data: tokenRow } = await supabase
    .from("gmail_oauth_tokens")
    .select("expires_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    gmail_connected: profile.gmail_connected,
    email_last_fetched_at: profile.email_last_fetched_at,
    email_last_fetch_source: profile.email_last_fetch_source,
    token_present: Boolean(tokenRow),
    token_expires_at: tokenRow?.expires_at ?? null,
    token_updated_at: tokenRow?.updated_at ?? null,
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

  const body = (await request.json().catch(() => null)) as
    | { action?: "disconnect" }
    | null;

  if (!body || body.action !== "disconnect") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const [{ error: profileError }, { error: tokenError }] = await Promise.all([
    supabase
      .from("profiles")
      .update({ gmail_connected: false })
      .eq("id", user.id),
    supabase.from("gmail_oauth_tokens").delete().eq("user_id", user.id),
  ]);

  if (profileError || tokenError) {
    return NextResponse.json(
      { error: profileError?.message ?? tokenError?.message ?? "Failed to disconnect" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
