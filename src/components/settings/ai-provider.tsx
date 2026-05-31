"use client";

import { useState } from "react";
import { Loader2, Cpu, Sparkles, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type AiProviderFormProps = {
  initialProvider: "gemini" | "grok";
};

export function AiProviderForm({ initialProvider }: AiProviderFormProps) {
  const [provider, setProvider] = useState<"gemini" | "grok">(initialProvider);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const router = useRouter();

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/ai-provider", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_provider: provider }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        ai_provider?: "gemini" | "grok";
      } | null;

      if (!res.ok) {
        setMessage({ text: data?.error ?? "Failed to save settings", type: "error" });
        return;
      }

      if (data?.ai_provider) {
        setProvider(data.ai_provider);
      }
      setMessage({ text: "AI provider preference saved successfully.", type: "success" });
      
      // Refresh the page data so settings view gets updated dynamically
      router.refresh();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to save settings",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Information Alert */}
      <div className="surface-glass-card p-4 border border-border/40 relative overflow-hidden flex gap-3.5">
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none" />
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-primary animate-pulse" />
        </div>
        <div className="space-y-1 flex-1 text-xs text-muted-foreground">
          <h4 className="font-semibold text-foreground text-sm">Resilient Process Flow</h4>
          <p className="leading-relaxed">
            CardTrack automatically runs fallbacks to prevent rate limits or processing failures. 
            If your preferred provider hits a quota exhaustion, the system will seamlessly run 
            the statement processing with the other provider.
          </p>
        </div>
      </div>

      {/* Selector Options */}
      <div className="space-y-3.5">
        {/* Gemini Card */}
        <div
          onClick={() => {
            setProvider("gemini");
            setMessage(null);
          }}
          className={`surface-glass-card p-5 border relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:border-primary/40 group ${
            provider === "gemini"
              ? "border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/20"
              : "border-border/60 hover:bg-muted/30"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                provider === "gemini"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }`}
            >
              <Sparkles className="w-5.5 h-5.5" />
            </div>
            <div className="space-y-1.5 flex-1 pr-6">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground tracking-tight">Gemini AI</h3>
                {provider === "gemini" && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Standard native PDF & email body extraction. Runs using <code className="font-mono bg-muted/60 dark:bg-muted/20 px-1 py-0.5 rounded">gemini-3.5-flash</code>. Ideal for statement PDFs.
              </p>
            </div>
            {provider === "gemini" && (
              <div className="absolute right-5 top-5 text-primary">
                <CheckCircle2 className="w-5.5 h-5.5" />
              </div>
            )}
          </div>
        </div>

        {/* Groq Card */}
        <div
          onClick={() => {
            setProvider("grok");
            setMessage(null);
          }}
          className={`surface-glass-card p-5 border relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:border-primary/40 group ${
            provider === "grok"
              ? "border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/20"
              : "border-border/60 hover:bg-muted/30"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                provider === "grok"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }`}
            >
              <Cpu className="w-5.5 h-5.5" />
            </div>
            <div className="space-y-1.5 flex-1 pr-6">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground tracking-tight">Groq AI</h3>
                {provider === "grok" && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Fast email body extraction. Runs using <code className="font-mono bg-muted/60 dark:bg-muted/20 px-1 py-0.5 rounded">llama-3.3-70b-versatile</code>. Skips PDF attachments (falls back to Gemini for PDF parsing if needed).
              </p>
            </div>
            {provider === "grok" && (
              <div className="absolute right-5 top-5 text-primary">
                <CheckCircle2 className="w-5.5 h-5.5" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={isSaving || provider === initialProvider}
          className="w-full py-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-transform duration-100 hover:scale-[1.01]"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Save Preference
        </Button>
      </div>

      {/* Status Messages */}
      {message && (
        <div
          className={`p-3 rounded-xl border text-xs text-center font-semibold transition-all duration-300 animate-fade-in flex items-center justify-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {message.type === "error" && <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}
    </div>
  );
}
