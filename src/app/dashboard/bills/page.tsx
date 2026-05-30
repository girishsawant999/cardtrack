import { Receipt } from "lucide-react";

import { BillsFilterList } from "@/components/bills/bills-filter-list";
import { EmptyState } from "@/components/ui/empty-state";
import { getBills } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const bills = await getBills();
  const pendingCount = bills.filter(
    (b) => b.payment_status !== "paid"
  ).length;

  return (
    <div className="pb-28 animate-fade-in">
      <header className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              All statements
            </p>
            <h1 className="text-[28px] leading-none font-extrabold mt-1 tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              Bills
            </h1>
          </div>
          <div className="flex gap-2">
            <span className="stat-chip">{bills.length} total</span>
            <span className="stat-chip bg-primary/10 text-primary border-primary/20">
              {pendingCount} pending
            </span>
          </div>
        </div>
      </header>

      <div className="px-5 pt-4">
        {bills.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No bills yet"
            description="Bills will appear here as soon as we detect a statement email or you add one for a card."
          />
        ) : (
          <BillsFilterList bills={bills} />
        )}
      </div>
    </div>
  );
}
