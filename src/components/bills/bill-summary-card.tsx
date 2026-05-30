"use client";

import type { BillWithCard } from "@/lib/types/database";
import { formatCurrency, formatDateShort, getDueDateLabel, getPaymentStatusConfig, getCardGradient } from "@/lib/utils";
import { ExternalLink, Check, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

interface BillSummaryCardProps {
  bill: BillWithCard;
  index?: number;
}

const statusIcons = {
  check: Check,
  clock: Clock,
  alert: AlertTriangle,
};

export function BillSummaryCard({ bill, index = 0 }: BillSummaryCardProps) {
  const dueLabel = getDueDateLabel(bill.due_date);
  const statusConfig = getPaymentStatusConfig(bill.payment_status);
  const StatusIcon = statusIcons[statusConfig.icon];

  const dueLabelColors = {
    success: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-accent/40 text-accent-foreground border-accent/30",
    danger: "bg-destructive/15 text-destructive border-destructive/20",
    info: "bg-secondary text-secondary-foreground border-border",
  };

  return (
    <Card
      className="overflow-hidden surface-glass-card hover-lift border-0 animate-card-enter"
      style={{ animationDelay: `${index * 0.08}s`, animationFillMode: "both" }}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-11 h-7 rounded-lg ${getCardGradient(index)} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {bill.credit_cards.bank_name}
            </p>
            <p className="text-xs text-muted-foreground tabular">
              •••• {bill.credit_cards.last_four_digits}
            </p>
          </div>
          <Badge variant="outline" className={`flex items-center gap-1 font-semibold ${statusConfig.color} border-current/20 bg-current/5`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        </div>

        <div className="mb-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] font-bold mb-1">Total Due</p>
          <p className="text-2xl sm:text-3xl font-extrabold tabular tracking-tight text-foreground">
            {formatCurrency(bill.total_amount)}
          </p>
          {bill.minimum_payment && (
            <p className="text-xs text-muted-foreground mt-1 tabular">
              Min: {formatCurrency(bill.minimum_payment)}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${dueLabelColors[dueLabel.variant as keyof typeof dueLabelColors]}`}>
              {dueLabel.text}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Due {formatDateShort(bill.due_date)}
            </span>
          </div>
          {bill.ai_verified && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-primary">
              <Check className="w-3.5 h-3.5" />
              Verified
            </span>
          )}
        </div>

        {bill.payment_link && bill.payment_status !== "paid" && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <a
              href={bill.payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "lg", className: "w-full rounded-xl" })}
            >
              Pay Now
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
