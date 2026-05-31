export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          gmail_connected: boolean;
          email_last_fetched_at: string | null;
          email_last_fetch_source: string | null;
          notification_preferences: Json;
          pdf_passwords: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          gmail_connected?: boolean;
          email_last_fetched_at?: string | null;
          email_last_fetch_source?: string | null;
          notification_preferences?: Json;
          pdf_passwords?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          gmail_connected?: boolean;
          email_last_fetched_at?: string | null;
          email_last_fetch_source?: string | null;
          notification_preferences?: Json;
          pdf_passwords?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_cards: {
        Row: {
          id: string;
          user_id: string;
          bank_name: string;
          card_name: string | null;
          card_network: string | null;
          last_four_digits: string;
          card_type: string;
          card_color: string;
          billing_cycle_day: number | null;
          credit_limit: number | null;
          is_active: boolean;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bank_name: string;
          card_name?: string | null;
          card_network?: string | null;
          last_four_digits: string;
          card_type?: string;
          card_color?: string;
          billing_cycle_day?: number | null;
          credit_limit?: number | null;
          is_active?: boolean;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bank_name?: string;
          card_name?: string | null;
          card_network?: string | null;
          last_four_digits?: string;
          card_type?: string;
          card_color?: string;
          billing_cycle_day?: number | null;
          credit_limit?: number | null;
          is_active?: boolean;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bills: {
        Row: {
          id: string;
          card_id: string;
          user_id: string;
          statement_date: string;
          due_date: string;
          total_amount: number;
          minimum_payment: number | null;
          previous_balance: number | null;
          payment_status: string;
          payment_link: string | null;
          paid_amount: number;
          paid_at: string | null;
          source_email_id: string | null;
          ai_confidence: number | null;
          ai_verified: boolean;
          raw_email_snippet: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          user_id: string;
          statement_date: string;
          due_date: string;
          total_amount: number;
          minimum_payment?: number | null;
          previous_balance?: number | null;
          payment_status?: string;
          payment_link?: string | null;
          paid_amount?: number;
          paid_at?: string | null;
          source_email_id?: string | null;
          ai_confidence?: number | null;
          ai_verified?: boolean;
          raw_email_snippet?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          user_id?: string;
          statement_date?: string;
          due_date?: string;
          total_amount?: number;
          minimum_payment?: number | null;
          previous_balance?: number | null;
          payment_status?: string;
          payment_link?: string | null;
          paid_amount?: number;
          paid_at?: string | null;
          source_email_id?: string | null;
          ai_confidence?: number | null;
          ai_verified?: boolean;
          raw_email_snippet?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          related_bill_id: string | null;
          related_card_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          related_bill_id?: string | null;
          related_card_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          related_bill_id?: string | null;
          related_card_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      email_log: {
        Row: {
          id: string;
          user_id: string;
          gmail_message_id: string;
          subject: string | null;
          sender: string | null;
          received_at: string | null;
          processing_status: string;
          processing_result: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gmail_message_id: string;
          subject?: string | null;
          sender?: string | null;
          received_at?: string | null;
          processing_status?: string;
          processing_result?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          gmail_message_id?: string;
          subject?: string | null;
          sender?: string | null;
          received_at?: string | null;
          processing_status?: string;
          processing_result?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      gmail_oauth_tokens: {
        Row: {
          user_id: string;
          provider: string;
          refresh_token: string | null;
          access_token: string | null;
          token_type: string | null;
          scope: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          provider?: string;
          refresh_token?: string | null;
          access_token?: string | null;
          token_type?: string | null;
          scope?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          provider?: string;
          refresh_token?: string | null;
          access_token?: string | null;
          token_type?: string | null;
          scope?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
export type GmailOAuthToken = Database["public"]["Tables"]["gmail_oauth_tokens"]["Row"];

export type NotificationPreferences = {
  due_date_reminder: boolean;
  new_bill: boolean;
};

export type CreditCardInsert = Database["public"]["Tables"]["credit_cards"]["Insert"];
export type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];

// Extended types with relations
export type CreditCardWithBills = CreditCard & {
  bills: Bill[];
  latest_bill?: Bill;
};

export type BillWithCard = Bill & {
  credit_cards: CreditCard;
};

// Payment status enum
export type PaymentStatus = "pending" | "paid" | "overdue" | "partial";

// Card network type
export type CardNetwork = "visa" | "mastercard" | "rupay" | "amex" | "discover";
