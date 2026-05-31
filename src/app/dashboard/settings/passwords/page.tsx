import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { getProfile } from "@/lib/data";
import { PdfPasswordsForm } from "@/components/settings/pdf-passwords";

export const dynamic = "force-dynamic";

export default async function PasswordsSettingsPage() {
  const profile = await getProfile();
  const initialPasswords = profile?.pdf_passwords ?? [];

  return (
    <div className="pb-28 animate-fade-in relative z-10">
      <header className="page-header">
        <Link href="/dashboard/settings" className="inline-flex items-center text-xs text-muted-foreground gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to settings
        </Link>
        <h1 className="text-[28px] leading-none font-extrabold mt-3 tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Statement Passwords
        </h1>
      </header>

      <div className="px-5 pt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Provide passwords or combinations to automatically decrypt and parse your credit card statement PDFs.
        </p>
        <PdfPasswordsForm initialPasswords={initialPasswords} />
      </div>
    </div>
  );
}
