import { Bill, BillWithCard, CreditCard, Notification } from "./types/database";

export const MOCK_CARDS: CreditCard[] = [
  {
    id: "mock-card-1",
    user_id: "mock-user",
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-card-2",
    user_id: "mock-user",
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-card-3",
    user_id: "mock-user",
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();

const hdfcStatementDate = new Date(currentYear, currentMonth, 16);
const hdfcDueDate = new Date(currentYear, currentMonth, 16 + 20);

const iciciStatementDate = new Date(currentYear, currentMonth - 1, 6);
const iciciDueDate = new Date(currentYear, currentMonth - 1, 6 + 15);

const sbiStatementDate = new Date(currentYear, currentMonth - 1, 21);
const sbiDueDate = new Date(currentYear, currentMonth - 1, 21 + 20);
const sbiPaidDate = new Date(currentYear, currentMonth, 5);

export const MOCK_BILLS: BillWithCard[] = [
  {
    id: "mock-bill-1",
    card_id: MOCK_CARDS[0].id,
    user_id: "mock-user",
    statement_date: hdfcStatementDate.toISOString(),
    due_date: hdfcDueDate.toISOString(),
    total_amount: 45230.5,
    minimum_payment: 2261.5,
    previous_balance: 0,
    payment_status: "pending",
    payment_link: null,
    paid_amount: 0,
    paid_at: null,
    source_email_id: null,
    ai_confidence: 0.95,
    ai_verified: true,
    raw_email_snippet: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    credit_cards: MOCK_CARDS[0],
  },
  {
    id: "mock-bill-2",
    card_id: MOCK_CARDS[1].id,
    user_id: "mock-user",
    statement_date: iciciStatementDate.toISOString(),
    due_date: iciciDueDate.toISOString(),
    total_amount: 12560.0,
    minimum_payment: 628.0,
    previous_balance: 0,
    payment_status: "overdue",
    payment_link: null,
    paid_amount: 0,
    paid_at: null,
    source_email_id: null,
    ai_confidence: 0.88,
    ai_verified: true,
    raw_email_snippet: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    credit_cards: MOCK_CARDS[1],
  },
  {
    id: "mock-bill-3",
    card_id: MOCK_CARDS[2].id,
    user_id: "mock-user",
    statement_date: sbiStatementDate.toISOString(),
    due_date: sbiDueDate.toISOString(),
    total_amount: 8450.75,
    minimum_payment: 422.5,
    previous_balance: 0,
    payment_status: "paid",
    payment_link: null,
    paid_amount: 8450.75,
    paid_at: sbiPaidDate.toISOString(),
    source_email_id: null,
    ai_confidence: 0.99,
    ai_verified: true,
    raw_email_snippet: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    credit_cards: MOCK_CARDS[2],
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "mock-notif-1",
    user_id: "mock-user",
    title: "Bill Overdue",
    message: "Your Amazon Pay ICICI card bill of ₹12,560 is overdue.",
    type: "alert",
    related_bill_id: null,
    related_card_id: MOCK_CARDS[1].id,
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "mock-notif-2",
    user_id: "mock-user",
    title: "New Statement Generated",
    message: "HDFC Regalia statement of ₹45,230.50 has been fetched from your email.",
    type: "info",
    related_bill_id: null,
    related_card_id: MOCK_CARDS[0].id,
    is_read: false,
    created_at: new Date().toISOString(),
  }
];