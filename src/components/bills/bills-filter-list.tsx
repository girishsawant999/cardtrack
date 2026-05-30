"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { BillSummaryCard } from "@/components/bills/bill-summary-card";
import type { BillWithCard } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";

const statusFilters = ["all", "pending", "overdue", "paid", "partial"] as const;
type StatusFilter = (typeof statusFilters)[number];

interface BillsFilterListProps {
  bills: BillWithCard[];
}

export function BillsFilterList({ bills }: BillsFilterListProps) {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");

  const countsByStatus = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: bills.length,
      pending: 0,
      overdue: 0,
      paid: 0,
      partial: 0,
    };
    for (const bill of bills) {
      const key = bill.payment_status as StatusFilter;
      if (key in counts && key !== "all") counts[key] += 1;
    }
    return counts;
  }, [bills]);

  const sortedBills = useMemo(() => {
    const list =
      activeFilter === "all"
        ? bills
        : bills.filter((b) => b.payment_status === activeFilter);
    return [...list].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );
  }, [activeFilter, bills]);

  return (
    <>
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
        {statusFilters.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold
                whitespace-nowrap transition-all duration-500
                ${
                  isActive
                    ? "bg-primary text-primary-foreground  border-transparent"
                    : "bg-background/40 backdrop-blur-md text-muted-foreground border border-white/20 dark:border-white/10 hover:border-primary/50"
                }
              `}
            >
              <span className="capitalize">{filter}</span>
              <Badge 
                variant={isActive ? "secondary" : "outline"} 
                className={`px-1.5 min-w-[1.25rem] flex items-center justify-center font-mono ${isActive ? "bg-background/20 text-white hover:bg-background/20" : ""}`}
              >
                {countsByStatus[filter]}
              </Badge>
            </button>
          );
        })}
      </div>

      {sortedBills.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-foreground">
            No bills match filter
          </p>
          <p className="text-xs text-muted-foreground mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedBills.map((bill, i) => (
            <BillSummaryCard key={bill.id} bill={bill} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
