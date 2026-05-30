import Link from "next/link";
import { Sparkles, ChevronRight, CreditCard as CardIcon } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { OverviewStats } from "@/components/dashboard/overview-stats";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { CreditCardVisual } from "@/components/cards/credit-card-visual";
import { BillSummaryCard } from "@/components/bills/bill-summary-card";
import { EmptyState } from "@/components/ui/empty-state";

import { getBills, getCards, getNotifications, getProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [_profile, cards, bills, notifications] = await Promise.all([
    getProfile(),
    getCards(),
    getBills(),
    getNotifications(),
  ]);
  void _profile;

  const pendingBills = bills.filter(
    (b) => b.payment_status === "pending" || b.payment_status === "overdue"
  );
  const totalOutstanding = pendingBills.reduce(
    (sum, b) => sum + Number(b.total_amount ?? 0),
    0
  );
  const overdueCount = bills.filter(
    (b) => b.payment_status === "overdue"
  ).length;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const paidThisMonth = bills
    .filter(
      (b) =>
        b.payment_status === "paid" &&
        b.paid_at &&
        new Date(b.paid_at) >= startOfMonth
    )
    .reduce((sum, b) => sum + Number(b.paid_amount ?? 0), 0);

  const upcomingBills = pendingBills
    .slice()
    .sort(
      (a, b) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

  return (
    <div className="pb-28 animate-fade-in relative">
      {/* Sticky header */}
      <header className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Welcome back
            </p>
            <h1 className="text-[28px] leading-none font-extrabold mt-1 tracking-tight">
              Card<span className="text-gradient">Track</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell notifications={notifications} />
          </div>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-8">
        {/* Hero summary card */}
        <section className="rounded-[28px] p-5 bg-brand-gradient relative overflow-hidden ">
          <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-white/15 blur-2xl" aria-hidden />
          <div className="absolute -bottom-20 -left-10 w-52 h-52 rounded-full bg-accent/30 blur-3xl" aria-hidden />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              Total outstanding
            </p>
            <p className="mt-2 text-4xl font-extrabold tabular text-primary-foreground tracking-tight">
              ₹{totalOutstanding.toLocaleString("en-IN")}
            </p>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="stat-chip bg-white/15 text-primary-foreground border-white/20">
                <CardIcon className="w-3 h-3" />
                {cards.length} card{cards.length !== 1 ? "s" : ""}
              </span>
              <span className="stat-chip bg-white/15 text-primary-foreground border-white/20">
                {pendingBills.length} pending
              </span>
              {overdueCount > 0 && (
                <span className="stat-chip bg-destructive text-destructive-foreground border-transparent">
                  {overdueCount} overdue
                </span>
              )}
            </div>
          </div>
        </section>

        <section>
          <OverviewStats
            totalOutstanding={totalOutstanding}
            cardCount={cards.length}
            overdueCount={overdueCount}
            paidThisMonth={paidThisMonth}
          />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 tracking-tight">
              <CardIcon className="w-4 h-4 text-primary" />
              My Cards
            </h2>
            <Link
              href="/dashboard/cards"
              className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline underline-offset-4"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {cards.length === 0 ? (
            <EmptyState
              icon={CardIcon}
              title="No cards yet"
              description="Add your first credit card, or wait for the next email fetch to auto-detect cards from your statements."
              actionHref="/dashboard/cards"
              actionLabel="Add a card"
            />
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
              {cards.map((card, i) => (
                <div key={card.id} className="flex-shrink-0">
                  <CreditCardVisual card={card} index={i} size="sm" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 tracking-tight">
              <Sparkles className="w-4 h-4 text-accent-foreground" />
              Upcoming Bills
            </h2>
            <Link
              href="/dashboard/bills"
              className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline underline-offset-4"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {upcomingBills.length === 0 ? (
            <EmptyState
              title="No upcoming bills"
              description="When we detect a new statement email or you add one manually, it will show up here."
            />
          ) : (
            <div className="space-y-4">
              {upcomingBills.map((bill, i) => (
                <BillSummaryCard key={bill.id} bill={bill} index={i} />
              ))}
            </div>
          )}
        </section>

        {pendingBills.length > 0 && (
          <section>
            <div className="surface-glass-card p-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-accent/40 blur-2xl" aria-hidden />
              <div className="relative flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-primary tracking-[0.18em] uppercase">
                    AI Insight
                  </p>
                  <p className="text-sm text-foreground mt-1.5 leading-relaxed">
                    You have <span className="font-bold">{pendingBills.length}</span> pending bill{pendingBills.length !== 1 ? "s" : ""} totalling{" "}
                    <span className="font-bold tabular">₹{totalOutstanding.toLocaleString("en-IN")}</span>.
                    {overdueCount > 0 && (
                      <span className="text-destructive font-semibold">
                        {` ${overdueCount} of ${overdueCount === 1 ? "them is" : "these are"} overdue — settle those first.`}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
