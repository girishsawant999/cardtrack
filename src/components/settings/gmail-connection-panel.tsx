"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Link as LinkIcon, RefreshCw, Unlink } from "lucide-react";

type GmailConnectionPanelProps = {
  initialConnected: boolean;
  initialLastFetchedAt: string | null;
  tokenPresent: boolean;
};

export function GmailConnectionPanel({
  initialConnected,
  initialLastFetchedAt,
  tokenPresent,
}: GmailConnectionPanelProps) {
  const [connected, setConnected] = useState(initialConnected);
  const [lastFetchedAt, setLastFetchedAt] = useState(initialLastFetchedAt);
  const [busy, setBusy] = useState<null | "connect" | "disconnect" | "sync">(null);
  const [message, setMessage] = useState<string | null>(null);

  const formattedLastFetched = useMemo(() => {
    if (!lastFetchedAt) return "Never";
    return new Date(lastFetchedAt).toLocaleString();
  }, [lastFetchedAt]);

  const handleConnect = async () => {
    setBusy("connect");
    setMessage(null);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings/gmail`,
          scopes: "https://www.googleapis.com/auth/gmail.readonly",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to start Google OAuth");
      setBusy(null);
    }
  };

  const handleDisconnect = async () => {
    setBusy("disconnect");
    setMessage(null);

    try {
      const res = await fetch("/api/settings/gmail", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage(data?.error ?? "Failed to disconnect Gmail");
        return;
      }

      setConnected(false);
      setMessage("Gmail disconnected.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to disconnect Gmail");
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async () => {
    setBusy("sync");
    setMessage(null);
    try {
      const res = await fetch("/api/trigger-fetch", { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string; results?: Array<{ message?: string }> }
        | null;

      if (!res.ok) {
        setMessage(data?.error ?? "Failed to trigger sync");
        return;
      }

      const statusText = data?.results?.[0]?.message ?? "Sync completed";
      setMessage(statusText);
      setLastFetchedAt(new Date().toISOString());
      setConnected(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to trigger sync");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="surface-glass-card p-4 space-y-4">
      <div className="rounded-xl border border-border px-3 py-3">
        <p className="text-sm font-semibold text-foreground">Connection status</p>
        <p className="text-xs text-muted-foreground mt-1">
          {connected ? "Connected" : "Not connected"} {tokenPresent ? "• token saved" : "• no token"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Last fetched: {formattedLastFetched}</p>
      </div>

      {!connected ? (
        <button
          onClick={handleConnect}
          disabled={busy !== null}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          {busy === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
          Connect Gmail
        </button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={handleSync}
            disabled={busy !== null}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {busy === "sync" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync now
          </button>
          <button
            onClick={handleDisconnect}
            disabled={busy !== null}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20 disabled:opacity-60"
          >
            {busy === "disconnect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
            Disconnect
          </button>
        </div>
      )}

      {message && <p className="text-xs text-muted-foreground text-center">{message}</p>}
    </div>
  );
}
