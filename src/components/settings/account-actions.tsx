"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, RefreshCw, Database } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DeleteAccountPanel } from "@/components/settings/delete-account-panel";

export function AccountActions() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  };

  const handleFetchNow = async () => {
    setFetching(true);
    setFetchMessage(null);
    try {
      const res = await fetch("/api/trigger-fetch", { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;
      if (!res.ok) {
        setFetchMessage(data?.error ?? "Fetch failed");
      } else {
        setFetchMessage(data?.message ?? "Fetch started");
        router.refresh();
      }
    } catch (err) {
      setFetchMessage(
        err instanceof Error ? err.message : "Failed to trigger fetch"
      );
    } finally {
      setFetching(false);
    }
  };


  return (
    <div className="space-y-3 mt-6 mb-8">

      <button
        onClick={handleFetchNow}
        disabled={fetching || signingOut}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-card text-foreground text-sm font-semibold border border-border hover:bg-secondary/70 active:scale-[0.98] disabled:opacity-60 transition-all duration-200"
      >
        {fetching ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        Fetch statement emails now
      </button>

      {fetchMessage && (
        <p className="text-xs text-muted-foreground text-center">
          {fetchMessage}
        </p>
      )}

      <button
        onClick={handleSignOut}
        disabled={signingOut || fetching}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20 hover:bg-destructive/10 active:scale-[0.98] disabled:opacity-60 transition-all duration-200"
      >
        {signingOut ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        Sign Out
      </button>

      <DeleteAccountPanel />
    </div>
  );
}
