"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AddCardForm } from "@/components/cards/add-card-form";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface AddCardSectionProps {
  cardCount: number;
}

export function AddCardSection({ cardCount }: AddCardSectionProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Cards</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {cardCount} card{cardCount !== 1 ? "s" : ""} tracked
        </p>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="rounded-xl h-10 w-10 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-6 px-4">
          <SheetHeader className="mb-6 text-left">
            <SheetTitle className="text-xl">Add New Card</SheetTitle>
            <SheetDescription>
              Enter the card details to start tracking its bills.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto pb-safe">
            <AddCardForm
              onSuccess={() => {
                setOpen(false);
                router.refresh();
              }}
              onCancel={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
