"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

type ProfileFormProps = {
  initialFullName: string;
  initialAvatarUrl: string;
};

export function ProfileForm({ initialFullName, initialAvatarUrl }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, avatar_url: avatarUrl }),
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: string; profile?: { full_name: string | null; avatar_url: string | null } }
        | null;

      if (!res.ok) {
        setMessage(data?.error ?? "Failed to save profile");
        return;
      }

      setFullName(data?.profile?.full_name ?? "");
      setAvatarUrl(data?.profile?.avatar_url ?? "");
      setMessage("Profile updated successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="surface-glass-card p-4 space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Full name
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Avatar URL
        </label>
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.png"
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save profile
      </button>

      {message && <p className="text-xs text-muted-foreground text-center">{message}</p>}
    </div>
  );
}
