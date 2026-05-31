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

  const { data, error } = await supabase
    .from("profiles")
    .select("ai_provider")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ai_provider: data?.ai_provider ?? "gemini",
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

  const payload = (await request.json().catch(() => null)) as {
    ai_provider?: string;
  } | null;

  if (!payload || typeof payload !== "object" || !payload.ai_provider) {
    return NextResponse.json(
      { error: "Invalid request body: ai_provider is required" },
      { status: 400 }
    );
  }

  const provider = payload.ai_provider.trim().toLowerCase();
  if (provider !== "gemini" && provider !== "grok") {
    return NextResponse.json(
      { error: "Invalid AI provider: must be either 'gemini' or 'grok'" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ ai_provider: provider as "gemini" | "grok" })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ai_provider: provider });
}
