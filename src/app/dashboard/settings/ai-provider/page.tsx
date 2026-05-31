import Link from "next/link";
import { ArrowLeft, Cpu } from "lucide-react";
import { getProfile } from "@/lib/data";
import { AiProviderForm } from "@/components/settings/ai-provider";

export const dynamic = "force-dynamic";

export default async function AiProviderSettingsPage() {
  const profile = await getProfile();
  const initialProvider = (profile as any)?.ai_provider ?? "gemini";

  return (
    <div className="pb-28 animate-fade-in relative z-10">
      <header className="page-header">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center text-xs text-muted-foreground gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to settings
        </Link>
        <h1 className="text-[28px] leading-none font-extrabold mt-3 tracking-tight flex items-center gap-2">
          <Cpu className="w-6 h-6 text-primary" />
          AI Model Provider
        </h1>
      </header>

      <div className="px-5 pt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose the AI provider used for reading and parsing statements from your emails.
        </p>
        <AiProviderForm initialProvider={initialProvider} />
      </div>
    </div>
  );
}
