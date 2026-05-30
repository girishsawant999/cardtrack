import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { getProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { GmailConnectionPanel } from "@/components/settings/gmail-connection-panel";

export const dynamic = "force-dynamic";

export default async function GmailSettingsPage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let tokenPresent = false;
  if (user) {
    const { data: tokenRow } = await supabase
      .from("gmail_oauth_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    tokenPresent = Boolean(tokenRow);
  }

  return (
    <div className="pb-28 animate-fade-in relative z-10">
      <header className="page-header">
        <Link href="/dashboard/settings" className="inline-flex items-center text-xs text-muted-foreground gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to settings
        </Link>
        <h1 className="text-[28px] leading-none font-extrabold mt-3 tracking-tight flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" />
          Gmail Connection
        </h1>
      </header>

      <div className="px-5 pt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect Gmail to automatically detect statement alerts and extract bill details.
        </p>
        <GmailConnectionPanel
          initialConnected={Boolean(profile?.gmail_connected)}
          initialLastFetchedAt={profile?.email_last_fetched_at ?? null}
          tokenPresent={tokenPresent}
        />
      </div>
    </div>
  );
}
