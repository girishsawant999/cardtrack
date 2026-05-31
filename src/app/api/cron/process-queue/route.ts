import { NextResponse } from "next/server";
import { assertCronAuth, CronAuthError } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/cron/admin-client";
import { processQueue } from "@/lib/cron/process-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = { user_id?: string };

export async function POST(req: Request) {
  try {
    assertCronAuth(req);
  } catch (err) {
    if (err instanceof CronAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const admin = createAdminClient();

  console.log(`[api/cron/process-queue] Triggered queue processing. user_id=${body.user_id ?? "all"}`);

  try {
    const stats = await processQueue(admin, body.user_id);
    return NextResponse.json({ success: true, ...stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api/cron/process-queue] Fatal error processing queue:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
