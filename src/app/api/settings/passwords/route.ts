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
    .select("pdf_passwords")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    passwords: data?.pdf_passwords ?? [],
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
    passwords?: string[];
  } | null;

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.passwords)) {
    return NextResponse.json({ error: "Invalid request body: passwords must be an array of strings" }, { status: 400 });
  }

  // Clean passwords (trim and filter out empty strings)
  const cleanPasswords = payload.passwords
    .map((pwd) => (typeof pwd === "string" ? pwd.trim() : ""))
    .filter((pwd) => pwd.length > 0);

  const { error } = await supabase
    .from("profiles")
    .update({ pdf_passwords: cleanPasswords })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ passwords: cleanPasswords });
}
