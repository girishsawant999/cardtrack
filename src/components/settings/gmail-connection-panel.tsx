"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Link as LinkIcon, RefreshCw, Unlink, CheckCircle2, AlertTriangle, HelpCircle, Clock } from "lucide-react";
import type { EmailLog } from "@/lib/types/database";

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

  // Queue tracking states
  const [queueItems, setQueueItems] = useState<EmailLog[]>([]);
  const [pollingActive, setPollingActive] = useState(false);

  const formattedLastFetched = useMemo(() => {
    if (!lastFetchedAt) return "Never";
    return new Date(lastFetchedAt).toLocaleString();
  }, [lastFetchedAt]);

  const supabase = useMemo(() => createClient(), []);

  // Fetch recent queue items
  const fetchQueueStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("email_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      if (data) {
        setQueueItems(data as EmailLog[]);
        
        // Determine if any items are still pending or processing
        const active = data.some(
          (item) => item.processing_status === "pending" || item.processing_status === "processing"
        );
        setPollingActive(active);
      }
    } catch (err) {
      console.error("Failed to fetch queue status:", err);
    }
  };

  // Poll queue status while polling is active
  useEffect(() => {
    if (connected) {
      fetchQueueStatus();
    }
  }, [connected]);

  useEffect(() => {
    if (!pollingActive || !connected) return;

    const timer = setInterval(() => {
      fetchQueueStatus();
    }, 3000);

    return () => clearInterval(timer);
  }, [pollingActive, connected]);

  const handleConnect = async () => {
    setBusy("connect");
    setMessage(null);
    try {
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
      setQueueItems([]);
      setPollingActive(false);
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
        | { success?: boolean; error?: string; results?: Array<{ message?: string; queued_messages?: number }> }
        | null;

      if (!res.ok) {
        setMessage(data?.error ?? "Failed to trigger sync");
        return;
      }

      const statusText = data?.results?.[0]?.message ?? "Sync triggered";
      setMessage(statusText);
      setLastFetchedAt(new Date().toISOString());
      setConnected(true);

      // Trigger immediate fetch of queue items, which will activate polling if needed
      await fetchQueueStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to trigger sync");
    } finally {
      setBusy(null);
    }
  };

  // Compute determinate progress percentage for active items
  const syncProgress = useMemo(() => {
    if (queueItems.length === 0) return 0;
    
    // We only compute progress based on the items in the current batch (pending, processing, processed, ignored, failed)
    const completed = queueItems.filter(
      (item) =>
        item.processing_status === "processed" ||
        item.processing_status === "ignored" ||
        item.processing_status === "failed"
    ).length;
    
    return queueItems.length > 0 ? Math.round((completed / queueItems.length) * 100) : 0;
  }, [queueItems]);

  const activeCount = useMemo(() => {
    return queueItems.filter(
      (item) => item.processing_status === "pending" || item.processing_status === "processing"
    ).length;
  }, [queueItems]);

  return (
    <div className="space-y-4">
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 cursor-pointer"
          >
            {busy === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
            Connect Gmail
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={handleSync}
              disabled={busy !== null || pollingActive}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 cursor-pointer"
            >
              {busy === "sync" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : pollingActive ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {pollingActive ? "Syncing..." : "Sync now"}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={busy !== null}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20 disabled:opacity-60 cursor-pointer"
            >
              {busy === "disconnect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
              Disconnect
            </button>
          </div>
        )}

        {message && <p className="text-xs text-muted-foreground text-center">{message}</p>}
      </div>

      {/* Sync Queue Progress Panel */}
      {connected && queueItems.length > 0 && (
        <div className="surface-glass-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Sync Queue Status</h3>
            {pollingActive && (
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Processing ({activeCount} remaining)
              </span>
            )}
          </div>

          {pollingActive && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>Sync progress</span>
                <span>{syncProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden relative">
                <div
                  className="h-full bg-primary transition-transform duration-500 ease-out"
                  style={{
                    width: "100%",
                    transform: `scaleX(${syncProgress / 100})`,
                    transformOrigin: "left",
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            {queueItems.map((item) => {
              const dateStr = item.received_at
                ? new Date(item.received_at).toLocaleDateString()
                : new Date(item.created_at).toLocaleDateString();

              let statusBadge = null;
              switch (item.processing_status) {
                case "processed":
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Processed
                    </span>
                  );
                  break;
                case "ignored":
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      Ignored
                    </span>
                  );
                  break;
                case "processing":
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Parsing
                    </span>
                  );
                  break;
                case "pending":
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Clock className="w-3 h-3 text-amber-500" />
                      Queued
                    </span>
                  );
                  break;
                case "failed":
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                      <AlertTriangle className="w-3 h-3" />
                      Failed
                    </span>
                  );
                  break;
                default:
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground">
                      <HelpCircle className="w-3 h-3" />
                      Unknown
                    </span>
                  );
              }

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {item.subject || "Retrieving email details..."}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                      <span>{item.sender ? item.sender.replace(/<.*>/, "").trim() : "Gmail Ingestion"}</span>
                      <span>•</span>
                      <span>{dateStr}</span>
                      {item.retries > 0 && item.processing_status === "pending" && (
                        <>
                          <span>•</span>
                          <span className="text-amber-500 font-semibold">Retry #{item.retries}</span>
                        </>
                      )}
                    </p>
                    {item.processing_status === "failed" && item.error_message && (
                      <p className="text-[9px] text-destructive mt-1 bg-destructive/5 px-2 py-1 rounded border border-destructive/10 font-mono break-all line-clamp-2">
                        {item.error_message}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">{statusBadge}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
