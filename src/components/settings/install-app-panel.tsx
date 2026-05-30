"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppPanel() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setMessage("CardTrack was installed successfully.");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setMessage("Install prompt is not available on this browser right now.");
      return;
    }

    setIsInstalling(true);
    setMessage(null);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setMessage("Install accepted.");
      } else {
        setMessage("Install was dismissed.");
      }
      setDeferredPrompt(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Install failed");
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="surface-glass-card p-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Install CardTrack for faster launch, offline shell, and a native app-like experience.
      </p>

      <button
        onClick={handleInstall}
        disabled={isInstalling}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
      >
        {isInstalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Install CardTrack
      </button>

      <p className="text-xs text-muted-foreground">
        If this button is unavailable, use your browser menu and choose &quot;Install App&quot; or &quot;Add to Home Screen&quot;.
      </p>

      {message && <p className="text-xs text-muted-foreground text-center">{message}</p>}
    </div>
  );
}
