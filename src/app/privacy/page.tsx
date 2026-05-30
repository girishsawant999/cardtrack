import Link from "next/link";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground pb-12">
      <header className="page-header">
        <Link href="/dashboard/settings" className="inline-flex items-center text-xs text-muted-foreground gap-1">
          Back to settings
        </Link>
        <h1 className="text-[30px] leading-none font-extrabold mt-3 tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Privacy and Data Policy
        </h1>
      </header>

      <div className="px-5 pt-2 space-y-6 text-sm leading-6">
        <section className="surface-glass-card p-4 space-y-2">
          <h2 className="text-base font-bold">1. What we collect</h2>
          <p>
            CardTrack stores account profile information, connected credit card metadata, bill details extracted
            from statement emails, and app interaction records needed for reminders and sync operations.
          </p>
        </section>

        <section className="surface-glass-card p-4 space-y-2">
          <h2 className="text-base font-bold">2. Gmail access scope</h2>
          <p>
            When you connect Gmail, CardTrack requests read-only Gmail access to identify statement-related emails.
            The app does not send emails or modify mailbox content.
          </p>
          <p>
            OAuth tokens are stored to support recurring sync. You may disconnect Gmail any time from settings.
          </p>
        </section>

        <section className="surface-glass-card p-4 space-y-2">
          <h2 className="text-base font-bold">3. How data is used</h2>
          <p>
            Email content is processed to detect bill statements and extract due dates, totals, and card identifiers.
            Extracted data is used to populate dashboards and reminders.
          </p>
          <p>
            Data is not sold. Processing is limited to app functionality and operational reliability.
          </p>
        </section>

        <section className="surface-glass-card p-4 space-y-2">
          <h2 className="text-base font-bold">4. Retention and deletion</h2>
          <p>
            Data remains available while your account is active. You can permanently delete your account from
            settings. Account deletion removes profile, cards, bills, notifications, and processing logs.
          </p>
        </section>

        <section className="surface-glass-card p-4 space-y-2">
          <h2 className="text-base font-bold">5. Security controls</h2>
          <p>
            CardTrack uses authenticated access controls and row-level security in the database so users can only
            access their own records.
          </p>
        </section>

        <section className="surface-glass-card p-4 space-y-2">
          <h2 className="text-base font-bold">6. Contact</h2>
          <p>
            For privacy questions, data requests, or policy concerns, contact the CardTrack support channel used for
            your deployment environment.
          </p>
          <p className="text-xs text-muted-foreground">Last updated: 31 May 2026.</p>
        </section>
      </div>
    </div>
  );
}
