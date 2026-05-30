"use client";

import { formatCurrency } from "@/lib/utils";
import { CreditCard as CardIcon, Receipt, AlertTriangle, TrendingUp } from "lucide-react";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  tone?: "default" | "primary" | "warn" | "success";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-card",
  primary: "bg-secondary",
  warn: "bg-[color-mix(in_oklab,var(--destructive)_10%,var(--card))]",
  success: "bg-[color-mix(in_oklab,var(--accent)_30%,var(--card))]",
};

const iconToneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  warn: "bg-destructive/15 text-destructive",
  success: "bg-accent/40 text-accent-foreground",
};

function StatCard({ icon: Icon, label, value, subtitle, tone = "default" }: StatCardProps) {
  return (
    <div
      className={`rounded-xl p-3.5 border border-border hover-lift min-h-[112px] ${toneClasses[tone]}`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className={`w-6 h-6 rounded-md flex items-center justify-center ${iconToneClasses[tone]}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <div className="text-[1.65rem] sm:text-[1.8rem] font-extrabold tabular tracking-tight text-foreground leading-none">
        {value}
      </div>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-tight">{subtitle}</p>
      )}
    </div>
  );
}

interface OverviewStatsProps {
  totalOutstanding: number;
  cardCount: number;
  overdueCount: number;
  paidThisMonth: number;
}

export function OverviewStats({
  totalOutstanding,
  cardCount,
  overdueCount,
  paidThisMonth,
}: OverviewStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <StatCard
        icon={Receipt}
        label="Outstanding"
        value={formatCurrency(totalOutstanding)}
        tone="primary"
      />
      <StatCard
        icon={CardIcon}
        label="Active Cards"
        value={String(cardCount)}
        subtitle={`${cardCount} card${cardCount !== 1 ? "s" : ""} tracked`}
      />
      <StatCard
        icon={AlertTriangle}
        label="Overdue"
        value={String(overdueCount)}
        subtitle={overdueCount > 0 ? "Needs attention" : "All clear"}
        tone={overdueCount > 0 ? "warn" : "default"}
      />
      <StatCard
        icon={TrendingUp}
        label="Paid (Month)"
        value={formatCurrency(paidThisMonth)}
        tone="success"
      />
    </div>
  );
}
