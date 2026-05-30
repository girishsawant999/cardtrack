import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center relative overflow-hidden group">
      
      <div className="relative z-10 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/10">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <p className="text-base font-bold text-foreground relative z-10">{title}</p>
      {description && (
        <p className="text-xs font-medium text-muted-foreground mt-2 leading-relaxed max-w-[250px] mx-auto relative z-10">
          {description}
        </p>
      )}
      {actionHref && actionLabel && (
        <Button render={<Link href={actionHref} />} className="mt-6 relative z-10 rounded-xl font-bold tracking-wide" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
