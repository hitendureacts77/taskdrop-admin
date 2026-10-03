export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_events: {
        Row: {
          cost_minor: number
          created_at: string
          id: string
          kind: string
          promotion_id: string
          task_id: string
          viewer_id: string | null
        }
        Insert: {
          cost_minor?: number
          created_at?: string
          id?: string
          kind: string
          promotion_id: string
          task_id: string
          viewer_id?: string | null
        }
        Update: {
          cost_minor?: number
          created_at?: string
          id?: string
          kind?: string
          promotion_id?: string
          task_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "task_promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ad_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          bid_id: string
          created_at: string
          escrow_minor: number
          id: string
          payout_mode: Database["public"]["Enums"]["payout_mode"]
          status: Database["public"]["Enums"]["assignment_status"]
          task_id: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          bid_id: string
          created_at?: string
          escrow_minor: number
          id?: string
          payout_mode?: Database["public"]["Enums"]["payout_mode"]
          status?: Database["public"]["Enums"]["assignment_status"]
          task_id: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          bid_id?: string
          created_at?: string
          escrow_minor?: number
          id?: string
          payout_mode?: Database["public"]["Enums"]["payout_mode"]
          status?: Database["public"]["Enums"]["assignment_status"]
          task_id?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          last_sent_at: string | null
          phone: string
          sends_in_window: number
          window_started_at: string
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          last_sent_at?: string | null
          phone: string
          sends_in_window?: number
          window_started_at?: string
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          last_sent_at?: string | null
          phone?: string
          sends_in_window?: number
          window_started_at?: string
        }
        Relationships: []
      }
      auth_send_log: {
        Row: {
          ip: string
          sends: number
          window_started_at: string
        }
        Insert: {
          ip: string
          sends?: number
          window_started_at?: string
        }
        Update: {
          ip?: string
          sends?: number
          window_started_at?: string
        }
        Relationships: []
      }
      bids: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean
          message: string | null
          price_minor: number
          task_id: string
          time_limit_minutes: number
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean
          message?: string | null
          price_minor: number
          task_id: string
          time_limit_minutes: number
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean
          message?: string | null
          price_minor?: number
          task_id?: string
          time_limit_minutes?: number
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "bids_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellations_log: {
        Row: {
          cancelled_by: Database["public"]["Enums"]["cancelled_by"]
          created_at: string
          id: string
          locked_minor: number | null
          penalty_or_refund_minor: number | null
          phase: string
          reason: Database["public"]["Enums"]["cancel_reason"]
          task_id: string
        }
        Insert: {
          cancelled_by: Database["public"]["Enums"]["cancelled_by"]
          created_at?: string
          id?: string
          locked_minor?: number | null
          penalty_or_refund_minor?: number | null
          phase: string
          reason?: Database["public"]["Enums"]["cancel_reason"]
          task_id: string
        }
        Update: {
          cancelled_by?: Database["public"]["Enums"]["cancelled_by"]
          created_at?: string
          id?: string
          locked_minor?: number | null
          penalty_or_refund_minor?: number | null
          phase?: string
          reason?: Database["public"]["Enums"]["cancel_reason"]
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellations_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "cancellations_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          page: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind: string
          page?: string | null
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          page?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          task_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          task_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          task_id: string | null
          ticket_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          task_id?: string | null
          ticket_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          task_id?: string | null
          ticket_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      password_attempts: {
        Row: {
          at: string
          id: number
          ip: string | null
          ok: boolean
          username: string
        }
        Insert: {
          at?: string
          id?: never
          ip?: string | null
          ok?: boolean
          username: string
        }
        Update: {
          at?: string
          id?: never
          ip?: string | null
          ok?: boolean
          username?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_minor: number
          created_at: string
          credited_at: string | null
          id: string
          link_url: string | null
          paid_at: string | null
          provider: string
          provider_payment_id: string | null
          provider_ref: string | null
          purpose: Database["public"]["Enums"]["payment_purpose"]
          refund_ref: string | null
          refunded_at: string | null
          refunded_minor: number
          status: Database["public"]["Enums"]["payment_status"]
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          credited_at?: string | null
          id?: string
          link_url?: string | null
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_ref?: string | null
          purpose: Database["public"]["Enums"]["payment_purpose"]
          refund_ref?: string | null
          refunded_at?: string | null
          refunded_minor?: number
          status?: Database["public"]["Enums"]["payment_status"]
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          link_url?: string | null
          paid_at?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_ref?: string | null
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          refund_ref?: string | null
          refunded_at?: string | null
          refunded_minor?: number
          status?: Database["public"]["Enums"]["payment_status"]
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "payments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_destinations: {
        Row: {
          account_name: string | null
          account_number: string | null
          created_at: string
          id: string
          ifsc: string | null
          is_default: boolean
          kind: string
          label: string | null
          rzp_contact_id: string | null
          rzp_fund_account_id: string | null
          upi_id: string | null
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          created_at?: string
          id?: string
          ifsc?: string | null
          is_default?: boolean
          kind: string
          label?: string | null
          rzp_contact_id?: string | null
          rzp_fund_account_id?: string | null
          upi_id?: string | null
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          created_at?: string
          id?: string
          ifsc?: string | null
          is_default?: boolean
          kind?: string
          label?: string | null
          rzp_contact_id?: string | null
          rzp_fund_account_id?: string | null
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount_minor: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          id: string
          mode: string | null
          provider_payout_id: string | null
          reference: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          destination?: string | null
          destination_id?: string | null
          failure_note?: string | null
          id?: string
          mode?: string | null
          provider_payout_id?: string | null
          reference?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          destination?: string | null
          destination_id?: string | null
          failure_note?: string | null
          id?: string
          mode?: string | null
          provider_payout_id?: string | null
          reference?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "payout_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_ledger: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          id: string
          kind: string
          note: string | null
          task_id: string | null
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          id?: string
          kind: string
          note?: string | null
          task_id?: string | null
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          note?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_ledger_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "platform_ledger_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          intent: string | null
          languages: string[]
          last_seen_at: string | null
          live_until: string | null
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          onboarded_at: string | null
          payout_upi: string | null
          poster_rating_avg: number
          poster_rating_count: number
          referral_code: string | null
          skills: string[]
          updated_at: string
          username: string | null
          worker_bio: string | null
          worker_onboarded_at: string | null
          worker_rating_avg: number
          worker_rating_count: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          intent?: string | null
          languages?: string[]
          last_seen_at?: string | null
          live_until?: string | null
          loc_label?: string | null
          loc_lat?: number | null
          loc_lng?: number | null
          onboarded_at?: string | null
          payout_upi?: string | null
          poster_rating_avg?: number
          poster_rating_count?: number
          referral_code?: string | null
          skills?: string[]
          updated_at?: string
          username?: string | null
          worker_bio?: string | null
          worker_onboarded_at?: string | null
          worker_rating_avg?: number
          worker_rating_count?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          intent?: string | null
          languages?: string[]
          last_seen_at?: string | null
          live_until?: string | null
          loc_label?: string | null
          loc_lat?: number | null
          loc_lng?: number | null
          onboarded_at?: string | null
          payout_upi?: string | null
          poster_rating_avg?: number
          poster_rating_count?: number
          referral_code?: string | null
          skills?: string[]
          updated_at?: string
          username?: string | null
          worker_bio?: string | null
          worker_onboarded_at?: string | null
          worker_rating_avg?: number
          worker_rating_count?: number
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          about_role: Database["public"]["Enums"]["app_role"]
          author_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          subject_id: string
          task_id: string
        }
        Insert: {
          about_role: Database["public"]["Enums"]["app_role"]
          author_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          subject_id: string
          task_id: string
        }
        Update: {
          about_role?: Database["public"]["Enums"]["app_role"]
          author_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          subject_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_tasks: {
        Row: {
          created_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "saved_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          from_staff: boolean
          id: string
          sender_id: string | null
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_staff?: boolean
          id?: string
          sender_id?: string | null
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_staff?: boolean
          id?: string
          sender_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          page: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          page?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          page?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_promotions: {
        Row: {
          amount_minor: number
          audience: string
          created_at: string
          days: number
          ends_at: string | null
          id: string
          payment_id: string | null
          settled_at: string | null
          starts_at: string | null
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          audience?: string
          created_at?: string
          days: number
          ends_at?: string | null
          id?: string
          payment_id?: string | null
          settled_at?: string | null
          starts_at?: string | null
          status?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          audience?: string
          created_at?: string
          days?: number
          ends_at?: string | null
          id?: string
          payment_id?: string | null
          settled_at?: string | null
          starts_at?: string | null
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_promotions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_promotions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments_unapplied"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "task_promotions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "task_promotions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_promotions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_proofs: {
        Row: {
          created_at: string
          files: Json
          id: string
          summary: string
          task_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          files?: Json
          id?: string
          summary: string
          task_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          files?: Json
          id?: string
          summary?: string
          task_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_proofs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_proofs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_proofs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        Insert: {
          assignment_mode?: string
          auto_complete_at?: string | null
          benchmark_minor: number
          category?: string | null
          clear_at?: string | null
          cleared_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          difficulty?: string | null
          due_at?: string | null
          flag?: Database["public"]["Enums"]["task_flag"]
          funded_at?: string | null
          funded_credits_minor?: number
          funded_minor?: number | null
          funded_via?: string | null
          funding_payment_id?: string | null
          id?: string
          kind?: string
          loc_label?: string | null
          loc_lat?: number | null
          loc_lng?: number | null
          locked_bid_id?: string | null
          locked_minor?: number | null
          media_kind?: string | null
          media_path?: string | null
          media_seconds?: number | null
          milestones?: Json
          payout_mode?: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills?: string[]
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at?: string
          wallet_refunded_at?: string | null
          work_done_at?: string | null
        }
        Update: {
          assignment_mode?: string
          auto_complete_at?: string | null
          benchmark_minor?: number
          category?: string | null
          clear_at?: string | null
          cleared_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          difficulty?: string | null
          due_at?: string | null
          flag?: Database["public"]["Enums"]["task_flag"]
          funded_at?: string | null
          funded_credits_minor?: number
          funded_minor?: number | null
          funded_via?: string | null
          funding_payment_id?: string | null
          id?: string
          kind?: string
          loc_label?: string | null
          loc_lat?: number | null
          loc_lng?: number | null
          locked_bid_id?: string | null
          locked_minor?: number | null
          media_kind?: string | null
          media_path?: string | null
          media_seconds?: number | null
          milestones?: Json
          payout_mode?: Database["public"]["Enums"]["payout_mode"] | null
          pillar?: Database["public"]["Enums"]["pillar"]
          poster_id?: string
          skills?: string[]
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          time_limit_minutes?: number
          title?: string
          updated_at?: string
          wallet_refunded_at?: string | null
          work_done_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_funding_payment_id_fkey"
            columns: ["funding_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_funding_payment_id_fkey"
            columns: ["funding_payment_id"]
            isOneToOne: false
            referencedRelation: "payments_unapplied"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "tasks_funding_payment_id_fkey"
            columns: ["funding_payment_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["payment_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_adjustments: {
        Row: {
          balance_before: number
          clearing_before: number
          created_at: string
          delta_minor: number
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          balance_before: number
          clearing_before: number
          created_at?: string
          delta_minor: number
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          balance_before?: number
          clearing_before?: number
          created_at?: string
          delta_minor?: number
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_minor: number
          clearing_minor: number
          credits_minor: number
          currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_minor?: number
          clearing_minor?: number
          credits_minor?: number
          currency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_minor?: number
          clearing_minor?: number
          credits_minor?: number
          currency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      payments_unapplied: {
        Row: {
          expected_minor: number | null
          paid_at: string | null
          paid_minor: number | null
          payment_id: string | null
          poster_id: string | null
          provider_payment_id: string | null
          short_by_minor: number | null
          task_id: string | null
          task_status: Database["public"]["Enums"]["task_status"] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "payments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds_outstanding: {
        Row: {
          amount_minor: number | null
          cancelled_at: string | null
          due_minor: number | null
          payment_id: string | null
          penalty_minor: number | null
          poster_id: string | null
          provider_payment_id: string | null
          refunded_minor: number | null
          task_id: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_promotion: {
        Args: { p_payment_id: string; p_promotion_id: string }
        Returns: {
          amount_minor: number
          audience: string
          created_at: string
          days: number
          ends_at: string | null
          id: string
          payment_id: string | null
          settled_at: string | null
          starts_at: string | null
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "task_promotions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ad_auction: {
        Args: never
        Returns: {
          charge_minor: number
          daily_budget_minor: number
          ectr: number
          promotion_id: string
          rank: number
          spent_today_minor: number
          task_id: string
          total_value: number
        }[]
      }
      admin_mark_payout: {
        Args: { p_note?: string; p_payout_id: string; p_status: string }
        Returns: {
          amount_minor: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          id: string
          mode: string | null
          provider_payout_id: string | null
          reference: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_payout_queue: {
        Args: never
        Returns: {
          account_name: string
          account_number: string
          amount_minor: number
          display_name: string
          id: string
          ifsc: string
          kind: string
          requested_at: string
          snapshot: string
          status: Database["public"]["Enums"]["payout_status"]
          upi_id: string
          user_id: string
        }[]
      }
      admin_resolve_dispute: {
        Args: { p_note?: string; p_outcome: string; p_task_id: string }
        Returns: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_admin: {
        Args: { p_on: boolean; p_user_id: string }
        Returns: boolean
      }
      app_secrets: { Args: never; Returns: Json }
      apply_referral_code: { Args: { p_code: string }; Returns: boolean }
      cancel_promotion: {
        Args: { p_promotion_id: string }
        Returns: {
          amount_minor: number
          audience: string
          created_at: string
          days: number
          ends_at: string | null
          id: string
          payment_id: string | null
          settled_at: string | null
          starts_at: string | null
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "task_promotions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_task: {
        Args: { p_reason?: string; p_task_id: string }
        Returns: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_withdrawal: {
        Args: { p_payout_id: string }
        Returns: {
          amount_minor: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          id: string
          mode: string | null
          provider_payout_id: string | null
          reference: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_payout_for_sending: {
        Args: { p_payout_id: string }
        Returns: {
          amount_minor: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          id: string
          mode: string | null
          provider_payout_id: string | null
          reference: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_release: {
        Args: { p_task_id: string }
        Returns: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      credit_topup: { Args: { p_payment_id: string }; Returns: undefined }
      escrow_refund_due: {
        Args: { p_task_id: string }
        Returns: {
          due_minor: number
          payment_id: string
          provider_payment_id: string
          reason: string
        }[]
      }
      fund_task: {
        Args: { p_payment_id: string; p_task_id: string }
        Returns: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fund_task_from_payment: {
        Args: { p_payment_id: string }
        Returns: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      lock_bid: {
        Args: {
          p_bid_id: string
          p_payout_mode?: Database["public"]["Enums"]["payout_mode"]
        }
        Returns: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_work_done: {
        Args: { p_task_id: string }
        Returns: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_campaign_stats: {
        Args: never
        Returns: {
          budget_minor: number
          clicks: number
          ctr: number
          daily_minor: number
          ends_at: string
          impressions: number
          promotion_id: string
          spent_minor: number
          status: string
          task_id: string
          title: string
        }[]
      }
      my_stats: { Args: { p_role?: string }; Returns: Json }
      open_dispute: {
        Args: { p_reason?: string; p_task_id: string }
        Returns: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      open_support_ticket: {
        Args: { p_body: string; p_category: string; p_page?: string }
        Returns: {
          category: string
          created_at: string
          id: string
          page: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "support_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pay_task_from_wallet: {
        Args: { p_task_id: string }
        Returns: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      platform_earnings: {
        Args: never
        Returns: {
          balance_minor: number
          commission_minor: number
          orders: number
          poster_fee_minor: number
        }[]
      }
      platform_highlights: { Args: never; Returns: Json }
      platform_stats: { Args: { p_days?: number }; Returns: Json }
      public_profile_stats: { Args: { p_user: string }; Returns: Json }
      record_ad_click: { Args: { p_task_id: string }; Returns: undefined }
      record_ad_impression: { Args: { p_task_id: string }; Returns: undefined }
      record_escrow_refund: {
        Args: { p_amount_minor: number; p_payment_id: string; p_ref: string }
        Returns: {
          amount_minor: number
          created_at: string
          credited_at: string | null
          id: string
          link_url: string | null
          paid_at: string | null
          provider: string
          provider_payment_id: string | null
          provider_ref: string | null
          purpose: Database["public"]["Enums"]["payment_purpose"]
          refund_ref: string | null
          refunded_at: string | null
          refunded_minor: number
          status: Database["public"]["Enums"]["payment_status"]
          task_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_payout_sent: {
        Args: { p_mode: string; p_payout_id: string; p_provider_id: string }
        Returns: undefined
      }
      register_push_token: {
        Args: { p_platform?: string; p_token: string }
        Returns: undefined
      }
      reply_support_ticket: {
        Args: { p_body: string; p_ticket_id: string }
        Returns: {
          body: string
          created_at: string
          from_staff: boolean
          id: string
          sender_id: string | null
          ticket_id: string
        }
        SetofOptions: {
          from: "*"
          to: "support_messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_revision: {
        Args: { p_note?: string; p_task_id: string }
        Returns: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_withdrawal: {
        Args: {
          p_amount_minor: number
          p_destination?: string
          p_destination_id?: string
        }
        Returns: {
          amount_minor: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          id: string
          mode: string | null
          provider_payout_id: string | null
          reference: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_support_ticket: {
        Args: { p_ticket_id: string }
        Returns: {
          category: string
          created_at: string
          id: string
          page: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "support_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_payout_fund_account: {
        Args: {
          p_contact_id: string
          p_destination_id: string
          p_fund_account_id: string
        }
        Returns: undefined
      }
      set_app_secret: {
        Args: { p_name: string; p_value: string }
        Returns: string
      }
      set_default_payout_destination: {
        Args: { p_destination_id: string }
        Returns: {
          account_name: string | null
          account_number: string | null
          created_at: string
          id: string
          ifsc: string | null
          is_default: boolean
          kind: string
          label: string | null
          rzp_contact_id: string | null
          rzp_fund_account_id: string | null
          upi_id: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_destinations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      settle_cleared_earnings: { Args: never; Returns: number }
      settle_finished_campaigns: { Args: never; Returns: number }
      settle_my_cleared_earnings: { Args: never; Returns: number }
      settle_payout: {
        Args: {
          p_note?: string
          p_outcome: string
          p_payout_id: string
          p_reference?: string
        }
        Returns: {
          amount_minor: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          id: string
          mode: string | null
          provider_payout_id: string | null
          reference: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_promotion: {
        Args: { p_amount_minor: number; p_days: number; p_task_id: string }
        Returns: {
          amount_minor: number
          audience: string
          created_at: string
          days: number
          ends_at: string | null
          id: string
          payment_id: string | null
          settled_at: string | null
          starts_at: string | null
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "task_promotions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_task: {
        Args: { p_task_id: string }
        Returns: {
          assignment_mode: string
          auto_complete_at: string | null
          benchmark_minor: number
          category: string | null
          clear_at: string | null
          cleared_at: string | null
          completed_at: string | null
          created_at: string
          description: string
          difficulty: string | null
          due_at: string | null
          flag: Database["public"]["Enums"]["task_flag"]
          funded_at: string | null
          funded_credits_minor: number
          funded_minor: number | null
          funded_via: string | null
          funding_payment_id: string | null
          id: string
          kind: string
          loc_label: string | null
          loc_lat: number | null
          loc_lng: number | null
          locked_bid_id: string | null
          locked_minor: number | null
          media_kind: string | null
          media_path: string | null
          media_seconds: number | null
          milestones: Json
          payout_mode: Database["public"]["Enums"]["payout_mode"] | null
          pillar: Database["public"]["Enums"]["pillar"]
          poster_id: string
          skills: string[]
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_limit_minutes: number
          title: string
          updated_at: string
          wallet_refunded_at: string | null
          work_done_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_review: {
        Args: { p_comment?: string; p_rating: number; p_task_id: string }
        Returns: {
          about_role: Database["public"]["Enums"]["app_role"]
          author_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          subject_id: string
          task_id: string
        }
        SetofOptions: {
          from: "*"
          to: "reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      top_earners: {
        Args: { p_kind?: string; p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          jobs_done: number
          rating: number
          rating_count: number
          skill: string
          username: string
        }[]
      }
      trending_categories: {
        Args: { p_limit?: number }
        Returns: {
          avg_budget_minor: number
          category: string
          open_count: number
          recent_count: number
        }[]
      }
      unclaim_payout: {
        Args: { p_note: string; p_payout_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "poster" | "worker"
      assignment_status: "assigned" | "started" | "released" | "refunded"
      cancel_reason: "normal" | "overdue"
      cancelled_by: "poster" | "worker"
      payment_purpose: "escrow" | "topup"
      payment_status: "created" | "paid" | "failed" | "cancelled"
      payout_mode: "one_time" | "milestones"
      payout_status:
        | "requested"
        | "processing"
        | "paid"
        | "failed"
        | "cancelled"
      pillar: "services" | "procurement" | "local_intel"
      task_flag: "none" | "urgent" | "unique"
      task_status:
        | "OPEN"
        | "LOCKED"
        | "TASK_STARTED"
        | "OVERDUE"
        | "WORK_DONE"
        | "REVISION_REQUESTED"
        | "COMPLETED"
        | "AUTO_COMPLETED"
        | "CANCELLED"
        | "DISPUTED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "poster", "worker"],
      assignment_status: ["assigned", "started", "released", "refunded"],
      cancel_reason: ["normal", "overdue"],
      cancelled_by: ["poster", "worker"],
      payment_purpose: ["escrow", "topup"],
      payment_status: ["created", "paid", "failed", "cancelled"],
      payout_mode: ["one_time", "milestones"],
      payout_status: ["requested", "processing", "paid", "failed", "cancelled"],
      pillar: ["services", "procurement", "local_intel"],
      task_flag: ["none", "urgent", "unique"],
      task_status: [
        "OPEN",
        "LOCKED",
        "TASK_STARTED",
        "OVERDUE",
        "WORK_DONE",
        "REVISION_REQUESTED",
        "COMPLETED",
        "AUTO_COMPLETED",
        "CANCELLED",
        "DISPUTED",
      ],
    },
  },
} as const
