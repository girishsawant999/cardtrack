"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const CONFIRMATION_TEXT = "DELETE MY ACCOUNT";

export function DeleteAccountPanel() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        setMessage(data?.error ?? "Failed to delete account");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="surface-glass-card p-4 space-y-4 border border-destructive/30">
      <div>
        <p className="text-sm font-semibold text-destructive">Danger zone</p>
        <p className="text-xs text-muted-foreground mt-1">
          Deleting your account permanently removes cards, bills, notifications, and email logs.
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Type DELETE MY ACCOUNT to confirm
        </label>
        <input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
        />
      </div>

      <button
        onClick={handleDelete}
        disabled={isDeleting || confirmation !== CONFIRMATION_TEXT}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20 disabled:opacity-60"
      >
        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        Delete account permanently
      </button>

      {message && <p className="text-xs text-muted-foreground text-center">{message}</p>}
    </div>
  );
}
