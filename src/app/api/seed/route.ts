import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const user = await getCurrentUser();
    const supabase = await createClient();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Insert demo cards
    const { data: cards, error: cardsError } = await supabase
      .from("credit_cards")
      .insert([
        {
          user_id: user.id,
          bank_name: "HDFC Bank",
          card_name: "Regalia",
          card_network: "visa",
          last_four_digits: "4532",
          card_type: "credit",
          card_color: "indigo",
          billing_cycle_day: 15,
          credit_limit: 500000,
          is_active: true,
          tags: ["travel", "rewards"],
        },
        {
          user_id: user.id,
          bank_name: "ICICI Bank",
          card_name: "Amazon Pay",
          card_network: "visa",
          last_four_digits: "8291",
          card_type: "credit",
          card_color: "amber",
          billing_cycle_day: 5,
          credit_limit: 150000,
          is_active: true,
          tags: ["shopping", "cashback"],
        },
        {
          user_id: user.id,
          bank_name: "SBI Card",
          card_name: "SimplyCLICK",
          card_network: "visa",
          last_four_digits: "1024",
          card_type: "credit",
          card_color: "blue",
          billing_cycle_day: 20,
          credit_limit: 100000,
          is_active: true,
          tags: ["shopping", "online"],
        },
      ])
      .select();

    if (cardsError) {
      throw cardsError;
    }

    // Create current dates for realistic statements
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // HDFC statement (Due in a few days)
    const hdfcStatementDate = new Date(currentYear, currentMonth, 16);
    const hdfcDueDate = new Date(currentYear, currentMonth, 16 + 20); // 20 days later
    
    // ICICI statement (Overdue)
    const iciciStatementDate = new Date(currentYear, currentMonth - 1, 6);
    const iciciDueDate = new Date(currentYear, currentMonth - 1, 6 + 15);
    
    // SBI statement (Paid recently)
    const sbiStatementDate = new Date(currentYear, currentMonth - 1, 21);
    const sbiDueDate = new Date(currentYear, currentMonth - 1, 21 + 20);
    const sbiPaidDate = new Date(currentYear, currentMonth, 5);

    // Insert demo bills
    const { error: billsError } = await supabase.from("bills").insert([
      {
        user_id: user.id,
        card_id: cards[0].id,
        statement_date: hdfcStatementDate.toISOString(),
        due_date: hdfcDueDate.toISOString(),
        total_amount: 45230.5,
        minimum_payment: 2261.5,
        payment_status: "pending",
        paid_amount: 0,
        ai_verified: true,
        ai_confidence: 0.95,
      },
      {
        user_id: user.id,
        card_id: cards[1].id,
        statement_date: iciciStatementDate.toISOString(),
        due_date: iciciDueDate.toISOString(),
        total_amount: 12560.0,
        minimum_payment: 628.0,
        payment_status: "overdue",
        paid_amount: 0,
        ai_verified: true,
        ai_confidence: 0.88,
      },
      {
        user_id: user.id,
        card_id: cards[2].id,
        statement_date: sbiStatementDate.toISOString(),
        due_date: sbiDueDate.toISOString(),
        total_amount: 8450.75,
        minimum_payment: 422.5,
        payment_status: "paid",
        paid_amount: 8450.75,
        paid_at: sbiPaidDate.toISOString(),
        ai_verified: true,
        ai_confidence: 0.99,
      },
      // Previous month bill for HDFC (paid)
      {
        user_id: user.id,
        card_id: cards[0].id,
        statement_date: new Date(currentYear, currentMonth - 1, 16).toISOString(),
        due_date: new Date(currentYear, currentMonth - 1, 16 + 20).toISOString(),
        total_amount: 32150.0,
        minimum_payment: 1607.5,
        payment_status: "paid",
        paid_amount: 32150.0,
        paid_at: new Date(currentYear, currentMonth, 2).toISOString(),
        ai_verified: true,
        ai_confidence: 0.96,
      }
    ]);

    if (billsError) {
      throw billsError;
    }
    
    // Insert some notifications
    const { error: notifsError } = await supabase.from("notifications").insert([
      {
        user_id: user.id,
        title: "Bill Overdue",
        message: "Your Amazon Pay ICICI card bill of ₹12,560 is overdue.",
        type: "alert",
        related_bill_id: null,
        related_card_id: cards[1].id,
        is_read: false,
      },
      {
        user_id: user.id,
        title: "New Statement Generated",
        message: "HDFC Regalia statement of ₹45,230.50 has been fetched from your email.",
        type: "info",
        related_bill_id: null,
        related_card_id: cards[0].id,
        is_read: false,
      }
    ]);
    
    if (notifsError) {
      throw notifsError;
    }

    return NextResponse.json({ success: true, message: "Demo data seeded successfully" });
  } catch (error) {
    console.error("Error seeding data:", error);
    return NextResponse.json(
      { error: "Failed to seed data" },
      { status: 500 }
    );
  }
}
