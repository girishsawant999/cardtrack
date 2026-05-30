import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { AddCardSection } from "@/components/cards/add-card-section";
import { CreditCardVisual } from "@/components/cards/credit-card-visual";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBills, getCards } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const [cards, bills] = await Promise.all([getCards(), getBills()]);

  return (
    <div className="pb-28 animate-fade-in">
      <header className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Your wallet
            </p>
            <h1 className="text-[28px] leading-none font-extrabold mt-1 tracking-tight">
              My Cards
            </h1>
          </div>
          <span className="stat-chip">{cards.length} card{cards.length !== 1 ? "s" : ""}</span>
        </div>
      </header>

      <div className="px-5 pt-4">
        <AddCardSection cardCount={cards.length} />

        {cards.length === 0 ? (
          <EmptyState
            title="No cards added yet"
            description="Tap the + button above to add your first card, or sign in with Gmail so we can auto-detect your cards from statement emails."
          />
        ) : (
          <div className="space-y-4">
            {cards.map((card, i) => {
              const cardBills = bills.filter((b) => b.card_id === card.id);
              const latestBill = cardBills
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.statement_date).getTime() -
                    new Date(a.statement_date).getTime()
                )[0];
              const pendingAmount = cardBills
                .filter((b) => b.payment_status !== "paid")
                .reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0);

              return (
                <Link
                  key={card.id}
                  href={`/dashboard/cards/${card.id}`}
                  className="block animate-card-enter group"
                  style={{
                    animationDelay: `${i * 0.08}s`,
                    animationFillMode: "both",
                  }}
                >
                  <Card className="surface-glass-card hover-lift border-0">
                    <CardContent className="p-4">
                      <div className="flex justify-center mb-5 mt-2">
                        <CreditCardVisual
                          card={card}
                          index={i}
                          size="md"
                          interactive={false}
                        />
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] font-bold">
                            Outstanding
                          </p>
                          <p className="text-xl font-extrabold tabular text-foreground">
                            {pendingAmount > 0 ? formatCurrency(pendingAmount) : "₹0"}
                          </p>
                        </div>
                        <div className="text-right">
                          {latestBill && (
                            <>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] font-bold">
                                {latestBill.payment_status === "paid" ? "Last paid" : "Latest bill"}
                              </p>
                              <p className="text-base font-semibold text-muted-foreground tabular">
                                {formatCurrency(Number(latestBill.total_amount))}
                              </p>
                            </>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>

                      {card.tags.length > 0 && (
                        <div className="flex gap-2 mt-4 pt-1 items-center pb-1 overflow-x-auto no-scrollbar">
                          {card.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs font-normal">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
