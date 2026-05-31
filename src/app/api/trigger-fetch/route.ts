import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      {
        error:
          "Server is missing CRON_SECRET. Configure it in your hosting environment to enable manual fetches.",
      },
      { status: 500 }
    );
  }

  try {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? (host ? `${proto}://${host}` : null);

    if (!baseUrl) {
      return NextResponse.json(
        { error: "Could not resolve app base URL" },
        { status: 500 }
      );
    }

    const fnUrl = `${baseUrl.replace(/\/$/, "")}/api/cron/fetch-emails`;
    const res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: user.id, source: "user" }),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to trigger fetch-emails",
      },
      { status: 500 }
    );
  }
}
