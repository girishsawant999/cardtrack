import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";
import { getProfile } from "@/lib/data";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences";
import type { NotificationPreferences } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  due_date_reminder: true,
  new_bill: true,
};

function normalizePreferences(input: unknown): NotificationPreferences {
  if (!input || typeof input !== "object") return DEFAULT_PREFERENCES;
  const obj = input as Record<string, unknown>;
  return {
    due_date_reminder:
      typeof obj.due_date_reminder === "boolean"
        ? obj.due_date_reminder
        : DEFAULT_PREFERENCES.due_date_reminder,
    new_bill: typeof obj.new_bill === "boolean" ? obj.new_bill : DEFAULT_PREFERENCES.new_bill,
  };
}

export default async function NotificationSettingsPage() {
  const profile = await getProfile();
  const initialPreferences = normalizePreferences(profile?.notification_preferences);

  return (
    <div className="pb-28 animate-fade-in relative z-10">
      <header className="page-header">
        <Link href="/dashboard/settings" className="inline-flex items-center text-xs text-muted-foreground gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to settings
        </Link>
        <h1 className="text-[28px] leading-none font-extrabold mt-3 tracking-tight flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          Notifications
        </h1>
      </header>

      <div className="px-5 pt-4 space-y-4">
        <p className="text-sm text-muted-foreground">Control when CardTrack sends alerts and reminders.</p>
        <NotificationPreferencesForm initialPreferences={initialPreferences} />
      </div>
    </div>
  );
}
