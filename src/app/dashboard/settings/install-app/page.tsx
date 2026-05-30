import Link from "next/link";
import { ArrowLeft, Smartphone } from "lucide-react";
import { InstallAppPanel } from "@/components/settings/install-app-panel";

export default function InstallAppSettingsPage() {
  return (
    <div className="pb-28 animate-fade-in relative z-10">
      <header className="page-header">
        <Link href="/dashboard/settings" className="inline-flex items-center text-xs text-muted-foreground gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to settings
        </Link>
        <h1 className="text-[28px] leading-none font-extrabold mt-3 tracking-tight flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-primary" />
          Install App
        </h1>
      </header>

      <div className="px-5 pt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Install CardTrack on your device for faster access and app-like behavior.
        </p>
        <InstallAppPanel />
      </div>
    </div>
  );
}
