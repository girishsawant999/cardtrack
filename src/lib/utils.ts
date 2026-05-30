import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PaymentStatus } from "@/lib/types/database"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCardGradient(index: number = 0) {
  const gradients = [
    "card-gradient-1",
    "card-gradient-2",
    "card-gradient-3",
    "card-gradient-4",
    "card-gradient-5",
    "card-gradient-6",
    "card-gradient-7",
    "card-gradient-8",
  ];
  return gradients[index % gradients.length];
}

export function maskCardNumber(lastFour: string | undefined | null) {
  if (!lastFour) return "•••• •••• •••• ••••";
  return `•••• •••• •••• ${lastFour}`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getInitials(name: string | null | undefined) {
  if (!name) return "U";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function parseDateInput(value: string | Date) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  // Parse plain YYYY-MM-DD as local date to avoid timezone drift.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: string | Date) {
  const date = parseDateInput(value);
  if (!date) return "Invalid date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(value: string | Date) {
  const date = parseDateInput(value);
  if (!date) return "Invalid date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function getDueDateLabel(dueDate: string | Date) {
  const due = parseDateInput(dueDate);
  if (!due) return { text: "Unknown", variant: "info" as const };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d overdue`, variant: "danger" as const };
  }
  if (diffDays === 0) {
    return { text: "Due today", variant: "warning" as const };
  }
  if (diffDays === 1) {
    return { text: "Due tomorrow", variant: "warning" as const };
  }
  if (diffDays <= 7) {
    return { text: `Due in ${diffDays}d`, variant: "info" as const };
  }

  return { text: `Due in ${diffDays}d`, variant: "success" as const };
}

export function getPaymentStatusConfig(status: PaymentStatus | string) {
  switch (status) {
    case "paid":
      return {
        label: "Paid",
        icon: "check" as const,
        color: "text-green-700 dark:text-green-400",
        bg: "bg-green-100 dark:bg-green-900/30",
      };
    case "overdue":
      return {
        label: "Overdue",
        icon: "alert" as const,
        color: "text-red-700 dark:text-red-400",
        bg: "bg-red-100 dark:bg-red-900/30",
      };
    case "partial":
      return {
        label: "Partial",
        icon: "clock" as const,
        color: "text-blue-700 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-900/30",
      };
    case "pending":
    default:
      return {
        label: "Pending",
        icon: "clock" as const,
        color: "text-orange-700 dark:text-orange-400",
        bg: "bg-orange-100 dark:bg-orange-900/30",
      };
  }
}
