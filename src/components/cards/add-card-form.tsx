"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Loader2, X } from "lucide-react";

interface AddCardFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const bankOptions = [
  "HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Mahindra",
  "Yes Bank", "IndusInd Bank", "RBL Bank", "IDFC First Bank",
  "American Express", "Citibank", "Standard Chartered", "HSBC", "Other",
];

const networkOptions = ["visa", "mastercard", "rupay", "amex"];

const tagOptions = ["rewards", "cashback", "travel", "fuel", "shopping", "premium"];

export function AddCardForm({ onSuccess, onCancel }: AddCardFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    bank_name: "",
    card_name: "",
    card_network: "visa",
    last_four_digits: "",
    credit_limit: "",
    billing_cycle_day: "",
    tags: [] as string[],
  });

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.bank_name || !formData.last_four_digits) {
      setError("Bank name and last 4 digits are required");
      return;
    }

    if (formData.last_four_digits.length !== 4 || !/^\d{4}$/.test(formData.last_four_digits)) {
      setError("Please enter exactly 4 digits");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: insertError } = await supabase.from("credit_cards").insert({
        user_id: user.id,
        bank_name: formData.bank_name,
        card_name: formData.card_name || null,
        card_network: formData.card_network,
        last_four_digits: formData.last_four_digits,
        credit_limit: formData.credit_limit ? Number(formData.credit_limit) : null,
        billing_cycle_day: formData.billing_cycle_day ? Number(formData.billing_cycle_day) : null,
        tags: formData.tags,
      });

      if (insertError) throw insertError;
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add card");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-input/30 border border-border text-foreground text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Bank name */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Bank Name *
        </label>
        <select
          value={formData.bank_name}
          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
          className={inputClass}
        >
          <option value="">Select bank</option>
          {bankOptions.map((bank) => (
            <option key={bank} value={bank}>{bank}</option>
          ))}
        </select>
      </div>

      {/* Card name */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Card Name
        </label>
        <input
          type="text"
          placeholder="e.g., Regalia, SimplyCLICK"
          value={formData.card_name}
          onChange={(e) => setFormData({ ...formData, card_name: e.target.value })}
          className={inputClass}
        />
      </div>

      {/* Last 4 digits & Network */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Last 4 Digits *
          </label>
          <input
            type="text"
            maxLength={4}
            placeholder="1234"
            value={formData.last_four_digits}
            onChange={(e) =>
              setFormData({ ...formData, last_four_digits: e.target.value.replace(/\D/g, "") })
            }
            className={`${inputClass} font-mono tracking-widest text-center`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Network
          </label>
          <select
            value={formData.card_network}
            onChange={(e) => setFormData({ ...formData, card_network: e.target.value })}
            className={inputClass}
          >
            {networkOptions.map((n) => (
              <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Credit limit & Billing day */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Credit Limit
          </label>
          <input
            type="number"
            placeholder="₹ 2,00,000"
            value={formData.credit_limit}
            onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Bill Cycle Day
          </label>
          <input
            type="number"
            min={1}
            max={31}
            placeholder="15"
            value={formData.billing_cycle_day}
            onChange={(e) => setFormData({ ...formData, billing_cycle_day: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Card Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {tagOptions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`
                px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200
                ${
                  formData.tags.includes(tag)
                    ? "bg-primary text-white"
                    : "bg-secondary text-muted-foreground border border-border hover:border-primary/40"
                }
              `}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-xl">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              bg-secondary text-muted-foreground text-sm font-medium
              border border-border
              hover:bg-secondary/70
              transition-all duration-200"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
            bg-primary text-white text-sm font-semibold
           
            hover:bg-primary/90
            active:scale-[0.98]
            disabled:opacity-60
            transition-all duration-200"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Card
            </>
          )}
        </button>
      </div>
    </form>
  );
}
