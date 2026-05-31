"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, Key, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PdfPasswordsProps = {
  initialPasswords: string[];
};

export function PdfPasswordsForm({ initialPasswords }: PdfPasswordsProps) {
  const [passwords, setPasswords] = useState<string[]>(initialPasswords);
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleAdd = () => {
    const trimmed = newPassword.trim();
    if (!trimmed) return;
    if (passwords.includes(trimmed)) {
      setMessage({ text: "Password is already in the list.", type: "error" });
      return;
    }
    setPasswords((prev) => [...prev, trimmed]);
    setNewPassword("");
    setMessage(null);
  };

  const handleDelete = (index: number) => {
    setPasswords((prev) => prev.filter((_, i) => i !== index));
    setMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/passwords", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwords }),
      });
      
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        passwords?: string[];
      } | null;

      if (!res.ok) {
        setMessage({ text: data?.error ?? "Failed to save passwords", type: "error" });
        return;
      }

      if (data?.passwords) {
        setPasswords(data.passwords);
      }
      setMessage({ text: "Passwords list saved successfully.", type: "success" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to save passwords",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Decryption Information Card */}
      <div className="surface-glass-card p-4 border border-border/40 relative overflow-hidden flex gap-3.5">
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none" />
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-1.5 flex-1 text-xs text-muted-foreground">
          <h4 className="font-semibold text-foreground text-sm">How Statement Passwords Work</h4>
          <p className="leading-relaxed">
            Bank statement PDFs are often locked. CardTrack decrypts them securely on the server to extract statement details before sending them to Gemini.
          </p>
          <div className="pt-2 space-y-1">
            <p className="font-semibold text-foreground">Common password combinations to add:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>First 4 characters of your name + date of birth (e.g. <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">GIRI3105</code>)</li>
              <li>Your registered mobile number (e.g. <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">9876543210</code>)</li>
              <li>First 4 letters of your card network + birth date (e.g. <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">VISA1204</code>)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main List Management Form */}
      <div className="surface-glass-card p-4 space-y-4">
        {/* Add Password Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Add Password Combination
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="e.g. GIRI3105"
                className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="px-4 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-semibold flex items-center justify-center gap-1 transition-colors border border-border/40"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Password List */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block pt-2">
            Saved Passwords ({passwords.length})
          </label>
          
          {passwords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No passwords configured. PDFs will only be processed if they are not password protected.
            </div>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {passwords.map((pwd, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-3.5 py-3 text-sm hover:border-border transition-all duration-150"
                >
                  <span className="font-mono text-foreground font-medium select-all">{pwd}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(i)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete password"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-transform duration-100 hover:scale-[1.01]"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </div>

        {/* Status Messages */}
        {message && (
          <div
            className={`p-3 rounded-xl border text-xs text-center font-semibold transition-all duration-300 animate-fade-in ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
