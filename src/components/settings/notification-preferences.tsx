"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { NotificationPreferences } from "@/lib/types/database";

type NotificationPreferencesProps = {
  initialPreferences: NotificationPreferences;
};

export function NotificationPreferencesForm({
  initialPreferences,
}: NotificationPreferencesProps) {
  const [prefs, setPrefs] = useState(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; preferences?: NotificationPreferences }
        | null;

      if (!res.ok) {
        setMessage(data?.error ?? "Failed to update preferences");
        return;
      }

      if (data?.preferences) {
        setPrefs(data.preferences);
      }
      setMessage("Notification preferences updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update preferences");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="surface-glass-card p-4 space-y-4">
      <label className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Due date reminders</p>
          <p className="text-xs text-muted-foreground">Get reminders for upcoming bill due dates.</p>
        </div>
        <input
          type="checkbox"
          checked={prefs.due_date_reminder}
          onChange={(e) => updatePreference("due_date_reminder", e.target.checked)}
          className="h-4 w-4"
        />
      </label>

      <label className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">New bill alerts</p>
          <p className="text-xs text-muted-foreground">Notify when a new statement is detected in Gmail.</p>
        </div>
        <input
          type="checkbox"
          checked={prefs.new_bill}
          onChange={(e) => updatePreference("new_bill", e.target.checked)}
          className="h-4 w-4"
        />
      </label>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save preferences
      </button>

      {message && <p className="text-xs text-muted-foreground text-center">{message}</p>}
    </div>
  );
}
