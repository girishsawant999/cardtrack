import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, ExternalLink } from "lucide-react";

import { CreditCardVisual } from "@/components/cards/credit-card-visual";
import { AccountActions } from "@/components/settings/account-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getBills, getCards } from "@/lib/data";
import { formatCurrency, formatDateShort, getPaymentStatusConfig } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const cardId = resolvedParams.id;
  const [cards, allBills] = await Promise.all([getCards(), getBills()]);

  const cardIndex = cards.findIndex((c) => c.id === cardId);
  const card = cards[cardIndex];

  if (!card) {
    notFound();
  }

  const bills = allBills
    .filter((b) => b.card_id === card.id)
    .sort(
      (a, b) =>
        new Date(b.statement_date).getTime() -
        new Date(a.statement_date).getTime()
    );

  const pendingAmount = bills
    .filter((b) => b.payment_status !== "paid")
    .reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0);

  return (
    <div className="px-5 pt-14 pb-24 animate-fade-in relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/dashboard/cards"
          className="w-10 h-10 rounded-full surface-glass flex items-center justify-center text-foreground hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-foreground truncate px-4">
          {card.bank_name} {card.last_four_digits}
        </h1>
        <button className="w-10 h-10 rounded-full surface-glass flex items-center justify-center text-foreground hover:bg-white/10 transition-colors">
          <Edit className="w-4 h-4" />
        </button>
      </div>

      {/* Main Card */}
      <div className="flex justify-center mb-8 relative">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/20 rounded-full blur-3xl -z-10" />
        <CreditCardVisual card={card} index={cardIndex} size="lg" interactive={true} />
      </div>

      <Card className="surface-glass-card border border-white/50 dark:border-white/10 mb-8 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">
              Outstanding Balance
            </p>
            <p className="text-3xl font-bold text-foreground font-mono tracking-tight text-gradient">
              {formatCurrency(pendingAmount)}
            </p>
          </div>
        </div>

        {card.tags.length > 0 && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/10 dark:border-white/5">
            {card.tags.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent shadow-none font-medium"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <h2 className="text-base font-semibold text-foreground mb-4 pl-1">
        Statement History
      </h2>
      
      {bills.length === 0 ? (
        <div className="text-center py-16 surface-glass-card rounded-3xl border border-white/20">
          <p className="text-sm font-medium text-foreground">No bills found</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">
            Statements will appear here when fetched via email.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map((bill) => {
            const statusConfig = getPaymentStatusConfig(bill.payment_status);

            const statusColors = {
              success: "bg-green-500/20  border-green-500/30 text-green-700 dark:text-green-400",
              warning: "bg-orange-500/20  border-orange-500/30 text-orange-700 dark:text-orange-400",
              danger: "bg-red-500/20  border-red-500/30 text-red-700 dark:text-red-400",
              info: "bg-blue-500/20  border-blue-500/30 text-blue-700 dark:text-blue-400",
            };

            return (
              <Card key={bill.id} className="surface-glass-card transition-all duration-300 border-white/50 dark:border-white/10 group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {formatDateShort(bill.statement_date)} Statement
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Due {formatDateShort(bill.due_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground font-mono">
                        {formatCurrency(Number(bill.total_amount))}
                      </p>
                      {bill.minimum_payment && (
                        <p className="text-[10px] text-muted-foreground uppercase opacity-70">
                          Min: {formatCurrency(Number(bill.minimum_payment))}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/20 dark:border-white/5 flex items-center justify-between">
                    <Badge className={`font-semibold border uppercase tracking-wider text-[9px] ${statusColors[(bill.payment_status === "paid" ? "success" : bill.payment_status === "overdue" ? "danger" : bill.payment_status === "partial" ? "warning" : "info") as keyof typeof statusColors] ?? statusColors.info}`}>
                      {statusConfig.label}
                    </Badge>
                    
                    {bill.payment_link && bill.payment_status !== "paid" && (
                      <Button render={<a href={bill.payment_link} target="_blank" rel="noopener noreferrer" />} size="sm" variant="ghost" className="h-8 gap-1 hover:bg-primary/10 hover:text-primary">
                        Pay Now <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-12">
        <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive h-12 rounded-2xl bg-destructive/5 border border-destructive/20 gap-2">
          <Trash2 className="w-4 h-4" />
          Remove Card
        </Button>
      </div>
    </div>
  );
}
