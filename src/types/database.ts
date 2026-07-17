// Hand-authored to match supabase/migrations exactly, in the shape
// `supabase gen types typescript` produces. No live Supabase project exists
// yet to generate from: once one does, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
// and diff against this file before trusting the replacement.

export type AppRole = "admin" | "accountant" | "marketing" | "staff" | "agent";
export type LotStatusEnum =
  | "available"
  | "reserved"
  | "active"
  | "delinquent"
  | "defaulted"
  | "cancelled"
  | "paid";
export type LotTierEnum = "regular" | "premium" | "prime";
export type PlanTypeEnum = "monthly" | "quarterly" | "annual";
export type TransactionTypeEnum =
  | "reservation"
  | "downpayment"
  | "spotcash"
  | "discounted"
  | "interment"
  | "amortization"
  | "sale"
  | "maintenance"
  | "opening_balance"
  | "refund";
export type OwnershipEndReasonEnum = "forfeited" | "transferred" | "fully_paid" | "cancelled";
export type VerificationStatusEnum = "pending" | "approved" | "rejected";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: AppRole;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      agents: {
        Row: {
          id: string;
          profile_id: string | null;
          name: string;
          commission_rate: number;
          contact: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["agents"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["agents"]["Row"]>;
        Relationships: [];
      };
      sections: {
        Row: {
          code: string;
          label: string;
          description: string | null;
          color: string | null;
          price_min_cents: number;
          price_max_cents: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sections"]["Row"]> & { code: string };
        Update: Partial<Database["public"]["Tables"]["sections"]["Row"]>;
        Relationships: [];
      };
      lots: {
        Row: {
          id: string;
          section: string;
          phase: string | null;
          block: string | null;
          sub_block: string | null;
          lot_number: string;
          display_id: string;
          tier: LotTierEnum;
          status_override: LotStatusEnum | null;
          base_price_cents: number;
          geom_points: unknown;
          centroid: unknown;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lots"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["lots"]["Row"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          contact: string | null;
          email: string | null;
          address: string | null;
          since: string;
          notes: string | null;
          created_by: string | null;
          verified_at: string | null;
          verified_by: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["clients"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>;
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          lot_id: string;
          client_id: string;
          agent_id: string | null;
          price_cents: number;
          downpayment_cents: number;
          term_months: number;
          interest_rate: number;
          installment_cents: number;
          plan_type: PlanTypeEnum;
          start_date: string;
          status: LotStatusEnum;
          contract_file_path: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["contracts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["contracts"]["Row"]>;
        Relationships: [];
      };
      installments: {
        Row: {
          id: string;
          contract_id: string;
          seq: number;
          due_date: string;
          due_cents: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["installments"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["installments"]["Row"]>;
        Relationships: [];
      };
      cash_accounts: {
        Row: {
          id: string;
          name: string;
          kind: "cash" | "bank";
          active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["cash_accounts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["cash_accounts"]["Row"]>;
        Relationships: [];
      };
      commission_payouts: {
        Row: {
          id: string;
          agent_id: string;
          amount_cents: number;
          paid_at: string;
          note: string | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["commission_payouts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["commission_payouts"]["Row"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          contract_id: string | null;
          lot_id: string;
          client_id: string;
          agent_id: string | null;
          or_number: string | null;
          paid_at: string;
          type: TransactionTypeEnum;
          method: string | null;
          gross_cents: number;
          discount_cents: number;
          discount_reason: string | null;
          note: string | null;
          deposited: boolean;
          deposit_account_id: string | null;
          deposit_date: string | null;
          receipt_url: string | null;
          voided: boolean;
          void_reason: string | null;
          voided_by: string | null;
          voided_at: string | null;
          recorded_by: string;
          recorded_at: string;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["transactions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["transactions"]["Row"]>;
        Relationships: [];
      };
      ownership_episodes: {
        Row: {
          id: string;
          lot_id: string;
          client_id: string;
          contract_id: string | null;
          started_at: string;
          ended_at: string | null;
          end_reason: OwnershipEndReasonEnum | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ownership_episodes"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["ownership_episodes"]["Row"]>;
        Relationships: [];
      };
      commission_ledger: {
        Row: {
          id: string;
          transaction_id: string;
          agent_id: string;
          rate_snapshot: number;
          amount_cents: number;
          payout_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["commission_ledger"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["commission_ledger"]["Row"]>;
        Relationships: [];
      };
      pending_verifications: {
        Row: {
          id: string;
          kind: string;
          submitted_by: string;
          payload: Record<string, unknown>;
          status: VerificationStatusEnum;
          resolved_by: string | null;
          resolved_at: string | null;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["pending_verifications"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["pending_verifications"]["Row"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          ts: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          user_id: string | null;
          details: Record<string, unknown> | null;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_log"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Row"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          category: string;
          description: string;
          amount_cents: number;
          paid_from: "petty_cash" | "bank" | "other";
          receipt_path: string | null;
          recorded_by: string;
          incurred_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["expenses"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["expenses"]["Row"]>;
        Relationships: [];
      };
      requisitions: {
        Row: {
          id: string;
          requested_by: string;
          category: string;
          description: string;
          vendor: string | null;
          amount_cents: number;
          paid_from: "petty_cash" | "bank" | "other";
          supporting_doc_path: string;
          status: "auto_approved" | "pending" | "approved" | "rejected";
          resolved_by: string | null;
          resolved_at: string | null;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["requisitions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["requisitions"]["Row"]>;
        Relationships: [];
      };
      requisition_settings: {
        Row: {
          id: boolean;
          threshold_cents: number;
        };
        Insert: Partial<Database["public"]["Tables"]["requisition_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["requisition_settings"]["Row"]>;
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          name: string;
          category: "brand" | "policy" | "other";
          file_path: string;
          uploaded_by: string;
          uploaded_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["resources"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["resources"]["Row"]>;
        Relationships: [];
      };
      penalties: {
        Row: {
          id: string;
          contract_id: string;
          installment_seq: number;
          amount_cents: number;
          charged_at: string;
          waived_at: string | null;
          waived_by: string | null;
          waived_reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["penalties"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["penalties"]["Row"]>;
        Relationships: [];
      };
      penalty_settings: {
        Row: {
          id: boolean;
          rate_percent: number;
          grace_period_days: number;
        };
        Insert: Partial<Database["public"]["Tables"]["penalty_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["penalty_settings"]["Row"]>;
        Relationships: [];
      };
      reminder_settings: {
        Row: {
          id: boolean;
          automation_enabled: boolean;
          automation_template_id: string;
          template_overrides: Record<string, { subject: string; body: string }>;
        };
        Insert: Partial<Database["public"]["Tables"]["reminder_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["reminder_settings"]["Row"]>;
        Relationships: [];
      };
      reminder_log: {
        Row: {
          id: string;
          contract_id: string | null;
          client_name: string;
          channel: "email" | "sms";
          ok: boolean;
          error: string | null;
          sent_at: string;
          sent_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["reminder_log"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["reminder_log"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      lots_with_status: {
        Row: Database["public"]["Tables"]["lots"]["Row"] & {
          effective_status: LotStatusEnum;
          active_contract_id: string | null;
          active_client_id: string | null;
          active_agent_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      auth_role: { Args: Record<string, never>; Returns: AppRole };
      current_agent_id: { Args: Record<string, never>; Returns: string | null };
      recompute_contract_status: { Args: { p_contract_id: string }; Returns: LotStatusEnum };
      resync_contract_status: { Args: { p_contract_id: string }; Returns: void };
    };
    Enums: {
      app_role: AppRole;
      lot_status: LotStatusEnum;
      lot_tier: LotTierEnum;
      plan_type: PlanTypeEnum;
      transaction_type: TransactionTypeEnum;
      ownership_end_reason: OwnershipEndReasonEnum;
      verification_status: VerificationStatusEnum;
    };
    CompositeTypes: Record<string, never>;
  };
}
