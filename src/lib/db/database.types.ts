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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_deletions: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          files_listed: number
          kept_money_records: boolean
          reason: string | null
          user_id: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          files_listed?: number
          kept_money_records: boolean
          reason?: string | null
          user_id: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          files_listed?: number
          kept_money_records?: boolean
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      admin_alerts: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          kind: string
          read_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind: string
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor: string | null
          actor_kind: string
          after: Json | null
          at: string
          before: Json | null
          detail: string | null
          id: number
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor?: string | null
          actor_kind: string
          after?: Json | null
          at?: string
          before?: Json | null
          detail?: string | null
          id?: never
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor?: string | null
          actor_kind?: string
          after?: Json | null
          at?: string
          before?: Json | null
          detail?: string | null
          id?: never
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      admin_live_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: number
          kind: string
          record_id: string | null
          record_type: string
          summary: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: never
          kind: string
          record_id?: string | null
          record_type: string
          summary?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: never
          kind?: string
          record_id?: string | null
          record_type?: string
          summary?: Json
        }
        Relationships: []
      }
      admin_staff: {
        Row: {
          notify: boolean
          staff_role: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          notify?: boolean
          staff_role?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          notify?: boolean
          staff_role?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      age_checks: {
        Row: {
          birth_date: string
          checked_at: string
          min_age: number
          passed: boolean
          user_id: string
        }
        Insert: {
          birth_date: string
          checked_at?: string
          min_age: number
          passed: boolean
          user_id: string
        }
        Update: {
          birth_date?: string
          checked_at?: string
          min_age?: number
          passed?: boolean
          user_id?: string
        }
        Relationships: []
      }
      app_controls: {
        Row: {
          banner_ends_at: string | null
          banner_level: string
          banner_link: string | null
          banner_text: string | null
          bidding: boolean
          chat_photos: boolean
          maintenance: boolean
          maintenance_message: string | null
          min_version: string | null
          platform: string
          posting: boolean
          promotions: boolean
          require_phone_verified: boolean
          signin_apple: boolean
          signin_google: boolean
          signin_password: boolean
          signin_phone: boolean
          signups_open: boolean
          topups: boolean
          update_url: string | null
          updated_at: string
          updated_by: string | null
          withdrawals: boolean
        }
        Insert: {
          banner_ends_at?: string | null
          banner_level?: string
          banner_link?: string | null
          banner_text?: string | null
          bidding?: boolean
          chat_photos?: boolean
          maintenance?: boolean
          maintenance_message?: string | null
          min_version?: string | null
          platform: string
          posting?: boolean
          promotions?: boolean
          require_phone_verified?: boolean
          signin_apple?: boolean
          signin_google?: boolean
          signin_password?: boolean
          signin_phone?: boolean
          signups_open?: boolean
          topups?: boolean
          update_url?: string | null
          updated_at?: string
          updated_by?: string | null
          withdrawals?: boolean
        }
        Update: {
          banner_ends_at?: string | null
          banner_level?: string
          banner_link?: string | null
          banner_text?: string | null
          bidding?: boolean
          chat_photos?: boolean
          maintenance?: boolean
          maintenance_message?: string | null
          min_version?: string | null
          platform?: string
          posting?: boolean
          promotions?: boolean
          require_phone_verified?: boolean
          signin_apple?: boolean
          signin_google?: boolean
          signin_password?: boolean
          signin_phone?: boolean
          signups_open?: boolean
          topups?: boolean
          update_url?: string | null
          updated_at?: string
          updated_by?: string | null
          withdrawals?: boolean
        }
        Relationships: []
      }
      app_devices: {
        Row: {
          app_version: string | null
          first_seen_at: string
          id: string
          install_id: string
          last_seen_at: string
          os_version: string | null
          platform: string
          push_registered_at: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          first_seen_at?: string
          id?: string
          install_id: string
          last_seen_at?: string
          os_version?: string | null
          platform: string
          push_registered_at?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          first_seen_at?: string
          id?: string
          install_id?: string
          last_seen_at?: string
          os_version?: string | null
          platform?: string
          push_registered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_devices_user_id_fkey"
            columns: ["user_id"]
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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
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
      copyright_notices: {
        Row: {
          complainant: string
          complainant_email: string
          counter_at: string | null
          id: string
          logged_by: string | null
          material: string
          note: string | null
          received_at: string
          removed_at: string | null
          removed_value: string | null
          removed_what: string | null
          restore_from: string | null
          restored_at: string | null
          status: string
          task_id: string | null
          updated_at: string
          uploader_id: string | null
          work: string
        }
        Insert: {
          complainant: string
          complainant_email: string
          counter_at?: string | null
          id?: string
          logged_by?: string | null
          material: string
          note?: string | null
          received_at?: string
          removed_at?: string | null
          removed_value?: string | null
          removed_what?: string | null
          restore_from?: string | null
          restored_at?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
          uploader_id?: string | null
          work: string
        }
        Update: {
          complainant?: string
          complainant_email?: string
          counter_at?: string | null
          id?: string
          logged_by?: string | null
          material?: string
          note?: string | null
          received_at?: string
          removed_at?: string | null
          removed_value?: string | null
          removed_what?: string | null
          restore_from?: string | null
          restored_at?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
          uploader_id?: string | null
          work?: string
        }
        Relationships: [
          {
            foreignKeyName: "copyright_notices_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "copyright_notices_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_broadcasts: {
        Row: {
          audience: string
          body: string
          criteria: Json | null
          id: string
          recipients: number
          sent_at: string
          sent_by: string | null
          title: string
          to_user: string | null
        }
        Insert: {
          audience: string
          body: string
          criteria?: Json | null
          id?: string
          recipients?: number
          sent_at?: string
          sent_by?: string | null
          title: string
          to_user?: string | null
        }
        Update: {
          audience?: string
          body?: string
          criteria?: Json | null
          id?: string
          recipients?: number
          sent_at?: string
          sent_by?: string | null
          title?: string
          to_user?: string | null
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          contact: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          name: string
          note: string | null
          owner_id: string | null
          source: string | null
          stage: string
          stage_changed_at: string
          user_id: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          name: string
          note?: string | null
          owner_id?: string | null
          source?: string | null
          stage?: string
          stage_changed_at?: string
          user_id?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          name?: string
          note?: string | null
          owner_id?: string | null
          source?: string | null
          stage?: string
          stage_changed_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      crm_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          done_at: string | null
          follow_up_at: string | null
          id: string
          pinned: boolean
          user_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          done_at?: string | null
          follow_up_at?: string | null
          id?: string
          pinned?: boolean
          user_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          done_at?: string | null
          follow_up_at?: string | null
          id?: string
          pinned?: boolean
          user_id?: string
        }
        Relationships: []
      }
      crm_owners: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          owner_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          owner_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          owner_id?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_rules: {
        Row: {
          created_at: string
          created_by: string | null
          days: number
          enabled: boolean
          id: string
          kind: string
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days?: number
          enabled?: boolean
          id?: string
          kind: string
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days?: number
          enabled?: boolean
          id?: string
          kind?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      crm_segments: {
        Row: {
          created_at: string
          created_by: string | null
          criteria: Json
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          id?: string
          name?: string
        }
        Relationships: []
      }
      crm_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      crm_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          detail: string | null
          due_at: string | null
          id: string
          owner_id: string | null
          rule_id: string | null
          source: string
          status: string
          task_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          due_at?: string | null
          id?: string
          owner_id?: string | null
          rule_id?: string | null
          source?: string
          status?: string
          task_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          due_at?: string | null
          id?: string
          owner_id?: string | null
          rule_id?: string | null
          source?: string
          status?: string
          task_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "crm_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "crm_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_user_tags: {
        Row: {
          added_by: string | null
          created_at: string
          tag_id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          tag_id: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_user_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_decisions: {
        Row: {
          created_at: string
          decided_by: string | null
          id: string
          note: string | null
          outcome: string
          poster_refunded_minor: number
          task_id: string
          worker_paid_minor: number
        }
        Insert: {
          created_at?: string
          decided_by?: string | null
          id?: string
          note?: string | null
          outcome: string
          poster_refunded_minor?: number
          task_id: string
          worker_paid_minor?: number
        }
        Update: {
          created_at?: string
          decided_by?: string | null
          id?: string
          note?: string | null
          outcome?: string
          poster_refunded_minor?: number
          task_id?: string
          worker_paid_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispute_decisions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "dispute_decisions_task_id_fkey"
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
          refund_claimed_at: string | null
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
          refund_claimed_at?: string | null
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
          refund_claimed_at?: string | null
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
      payout_profiles: {
        Row: {
          created_at: string
          legal_name: string
          pan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          legal_name: string
          pan: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          legal_name?: string
          pan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount_minor: number
          attempts: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          fee_minor: number | null
          id: string
          last_attempt_at: string | null
          mode: string | null
          provider_payout_id: string | null
          provider_status: string | null
          provider_status_at: string | null
          reference: string | null
          reversed_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tax_minor: number | null
          updated_at: string
          user_id: string
          via: string
        }
        Insert: {
          amount_minor: number
          attempts?: number
          created_at?: string
          destination?: string | null
          destination_id?: string | null
          failure_note?: string | null
          fee_minor?: number | null
          id?: string
          last_attempt_at?: string | null
          mode?: string | null
          provider_payout_id?: string | null
          provider_status?: string | null
          provider_status_at?: string | null
          reference?: string | null
          reversed_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          tax_minor?: number | null
          updated_at?: string
          user_id: string
          via?: string
        }
        Update: {
          amount_minor?: number
          attempts?: number
          created_at?: string
          destination?: string | null
          destination_id?: string | null
          failure_note?: string | null
          fee_minor?: number | null
          id?: string
          last_attempt_at?: string | null
          mode?: string | null
          provider_payout_id?: string | null
          provider_status?: string | null
          provider_status_at?: string | null
          reference?: string | null
          reversed_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          tax_minor?: number | null
          updated_at?: string
          user_id?: string
          via?: string
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
      places_quota: {
        Row: {
          calls: number
          user_id: string
          window_started_at: string
        }
        Insert: {
          calls?: number
          user_id: string
          window_started_at?: string
        }
        Update: {
          calls?: number
          user_id?: string
          window_started_at?: string
        }
        Relationships: []
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
      profile_private: {
        Row: {
          loc_lat: number | null
          loc_lng: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          loc_lat?: number | null
          loc_lng?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          loc_lat?: number | null
          loc_lng?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      reconciliation_runs: {
        Row: {
          checked: number
          detail: Json
          from_day: string | null
          id: string
          kind: string
          mismatches: number
          ran_at: string
          to_day: string | null
        }
        Insert: {
          checked?: number
          detail?: Json
          from_day?: string | null
          id?: string
          kind: string
          mismatches?: number
          ran_at?: string
          to_day?: string | null
        }
        Update: {
          checked?: number
          detail?: Json
          from_day?: string | null
          id?: string
          kind?: string
          mismatches?: number
          ran_at?: string
          to_day?: string | null
        }
        Relationships: []
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
      reports: {
        Row: {
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          reason: string
          reporter_id: string
          resolution: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution?: string | null
          status?: string
          target_id?: string
          target_type?: string
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
      task_disputes: {
        Row: {
          created_at: string
          id: string
          opened_by: string | null
          reason: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opened_by?: string | null
          reason: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opened_by?: string | null
          reason?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_disputes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_disputes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_moderation: {
        Row: {
          hidden_at: string
          hidden_by: string | null
          reason: string
          task_id: string
        }
        Insert: {
          hidden_at?: string
          hidden_by?: string | null
          reason: string
          task_id: string
        }
        Update: {
          hidden_at?: string
          hidden_by?: string | null
          reason?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_moderation_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_moderation_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_private: {
        Row: {
          loc_lat: number | null
          loc_lng: number | null
          task_id: string
          updated_at: string
        }
        Insert: {
          loc_lat?: number | null
          loc_lng?: number | null
          task_id: string
          updated_at?: string
        }
        Update: {
          loc_lat?: number | null
          loc_lng?: number | null
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_private_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "refunds_outstanding"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_private_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
      user_suspensions: {
        Row: {
          id: string
          lift_note: string | null
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          suspended_at: string
          suspended_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          lift_note?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          reason: string
          suspended_at?: string
          suspended_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          lift_note?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string
          suspended_at?: string
          suspended_by?: string | null
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
      account_deletion_check: { Args: never; Returns: Json }
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
      admin_account_deletion_check: { Args: { p_user: string }; Returns: Json }
      admin_business_daily: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cancellations: number
          day: string
          disputes_decided: number
          funded_minor: number
          jobs_finished: number
          jobs_posted: number
          new_people: number
          revenue_minor: number
          topup_minor: number
        }[]
      }
      admin_cancel_task_with_refund: {
        Args: { p_reason: string; p_task_id: string }
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
      admin_copyright_counter: {
        Args: { p_note?: string; p_notice: string }
        Returns: string
      }
      admin_copyright_reject: {
        Args: { p_note: string; p_notice: string }
        Returns: undefined
      }
      admin_copyright_restore: {
        Args: { p_notice: string }
        Returns: undefined
      }
      admin_copyright_takedown: {
        Args: { p_note?: string; p_notice: string; p_what: string }
        Returns: undefined
      }
      admin_delete_account: {
        Args: { p_reason: string; p_user: string }
        Returns: Json
      }
      admin_delete_crm_rule: { Args: { p_id: string }; Returns: undefined }
      admin_devices_summary: {
        Args: never
        Returns: {
          app_version: string
          devices: number
          last_seen: string
          people: number
          platform: string
        }[]
      }
      admin_earnings_daily: {
        Args: { p_since: string }
        Returns: {
          amount_minor: number
          day: string
          kind: string
        }[]
      }
      admin_funnel: {
        Args: { p_from: string; p_to: string }
        Returns: {
          completed: number
          engaged: number
          funded: number
          joined: number
          repeat: number
        }[]
      }
      admin_hide_task: {
        Args: { p_reason: string; p_task: string }
        Returns: undefined
      }
      admin_live_counters: { Args: never; Returns: Json }
      admin_log_copyright_notice: {
        Args: {
          p_complainant: string
          p_email: string
          p_material: string
          p_task?: string
          p_uploader?: string
          p_work: string
        }
        Returns: string
      }
      admin_log_event: {
        Args: { p_action: string; p_detail?: string; p_target?: string }
        Returns: undefined
      }
      admin_mark_payout: {
        Args: { p_note?: string; p_payout_id: string; p_status: string }
        Returns: {
          amount_minor: number
          attempts: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          fee_minor: number | null
          id: string
          last_attempt_at: string | null
          mode: string | null
          provider_payout_id: string | null
          provider_status: string | null
          provider_status_at: string | null
          reference: string | null
          reversed_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tax_minor: number | null
          updated_at: string
          user_id: string
          via: string
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_money_position: {
        Args: never
        Returns: {
          clearing_minor: number
          credits_minor: number
          earnings_minor: number
          held_for_people_minor: number
          in_flight_minor: number
          locked_minor: number
          ready_to_withdraw_minor: number
          refunds_owed_minor: number
          taskdrop_earned_minor: number
          unapplied_minor: number
        }[]
      }
      admin_pause_promotion: {
        Args: { p_promotion_id: string; p_reason: string }
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
      admin_payout_queue: {
        Args: never
        Returns: {
          account_name: string
          account_number: string
          amount_minor: number
          attempts: number
          display_name: string
          failure_note: string
          has_pan: boolean
          id: string
          ifsc: string
          kind: string
          last_attempt_at: string
          provider_payout_id: string
          provider_status: string
          provider_status_at: string
          requested_at: string
          snapshot: string
          status: Database["public"]["Enums"]["payout_status"]
          upi_id: string
          user_id: string
          via: string
        }[]
      }
      admin_payout_queue_068: {
        Args: never
        Returns: {
          account_name: string
          account_number: string
          amount_minor: number
          attempts: number
          display_name: string
          failure_note: string
          has_pan: boolean
          id: string
          ifsc: string
          kind: string
          last_attempt_at: string
          provider_payout_id: string
          provider_status: string
          provider_status_at: string
          requested_at: string
          snapshot: string
          status: Database["public"]["Enums"]["payout_status"]
          upi_id: string
          user_id: string
          via: string
        }[]
      }
      admin_pipeline_counts: {
        Args: never
        Returns: {
          at_risk: number
          people: number
          stage: string
        }[]
      }
      admin_promotion_roi: {
        Args: { p_from: string; p_to: string }
        Returns: {
          active: number
          clicks: number
          impressions: number
          promotions: number
          spend_minor: number
        }[]
      }
      admin_reconcile: {
        Args: { p_from: string; p_to: string }
        Returns: {
          amount_minor: number
          at: string
          check_code: string
          detail: string
          ref_id: string
          ref_type: string
          severity: string
        }[]
      }
      admin_reconciliation_runs: {
        Args: { p_limit?: number }
        Returns: {
          checked: number
          detail: Json
          from_day: string
          id: string
          kind: string
          mismatches: number
          ran_at: string
          to_day: string
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
      admin_resolve_report: {
        Args: { p_note?: string; p_report: string; p_status: string }
        Returns: undefined
      }
      admin_retention: {
        Args: { p_weeks?: number }
        Returns: {
          active: number
          cohort_size: number
          cohort_week: string
          week_offset: number
        }[]
      }
      admin_save_crm_rule: {
        Args: {
          p_days: number
          p_enabled: boolean
          p_id: string
          p_kind: string
          p_name: string
        }
        Returns: string
      }
      admin_set_admin: {
        Args: { p_on: boolean; p_user_id: string }
        Returns: boolean
      }
      admin_set_app_control: {
        Args: { p_changes: Json; p_platform: string; p_reason?: string }
        Returns: Json
      }
      admin_set_payout_method: { Args: { p_method: string }; Returns: string }
      admin_set_staff: {
        Args: { p_notify?: boolean; p_role: string; p_user_id: string }
        Returns: string
      }
      admin_staff_performance: {
        Args: { p_from: string; p_to: string }
        Returns: {
          broadcasts: number
          customers_owned: number
          disputes_decided: number
          first_response_minutes: number
          notes: number
          reports_handled: number
          staff_role: string
          suspensions: number
          tasks_done: number
          tasks_on_time: number
          tasks_open: number
          tasks_overdue: number
          ticket_replies: number
          user_id: string
        }[]
      }
      admin_unhide_task: { Args: { p_task: string }; Returns: undefined }
      admin_user_stages: {
        Args: never
        Returns: {
          at_risk: boolean
          stage: string
          user_id: string
        }[]
      }
      api_rate_hit: {
        Args: {
          p_bucket: string
          p_limit: number
          p_user: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      app_secrets: { Args: never; Returns: Json }
      apply_referral_code: { Args: { p_code: string }; Returns: boolean }
      block_user: { Args: { p_user: string }; Returns: undefined }
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
          attempts: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          fee_minor: number | null
          id: string
          last_attempt_at: string | null
          mode: string | null
          provider_payout_id: string | null
          provider_status: string | null
          provider_status_at: string | null
          reference: string | null
          reversed_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tax_minor: number | null
          updated_at: string
          user_id: string
          via: string
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_escrow_refund: { Args: { p_payment_id: string }; Returns: boolean }
      claim_payout_for_sending: {
        Args: { p_payout_id: string }
        Returns: {
          amount_minor: number
          attempts: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          fee_minor: number | null
          id: string
          last_attempt_at: string | null
          mode: string | null
          provider_payout_id: string | null
          provider_status: string | null
          provider_status_at: string | null
          reference: string | null
          reversed_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tax_minor: number | null
          updated_at: string
          user_id: string
          via: string
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
      consume_auth_attempt: {
        Args: { p_max: number; p_phone: string }
        Returns: {
          out_attempts: number
          out_code: string
          out_expires: string
        }[]
      }
      copyright_strikes: { Args: { p_user: string }; Returns: number }
      credit_topup: { Args: { p_payment_id: string }; Returns: undefined }
      crm_add_lead: {
        Args: {
          p_contact?: string
          p_kind?: string
          p_name: string
          p_note?: string
          p_owner?: string
          p_source?: string
        }
        Returns: string
      }
      crm_add_note: {
        Args: { p_body: string; p_follow_up?: string; p_user: string }
        Returns: {
          author_id: string | null
          body: string
          created_at: string
          done_at: string | null
          follow_up_at: string | null
          id: string
          pinned: boolean
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "crm_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crm_add_task: {
        Args: {
          p_detail?: string
          p_due?: string
          p_owner?: string
          p_task?: string
          p_title: string
          p_user?: string
        }
        Returns: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          detail: string | null
          due_at: string | null
          id: string
          owner_id: string | null
          rule_id: string | null
          source: string
          status: string
          task_id: string | null
          title: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "crm_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crm_assign_owner: {
        Args: { p_owner: string; p_users: string[] }
        Returns: number
      }
      crm_assign_tag: {
        Args: { p_color?: string; p_name: string; p_user: string }
        Returns: {
          color: string
          created_at: string
          id: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "crm_tags"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crm_complete_task: {
        Args: { p_id: string; p_reopen?: boolean }
        Returns: undefined
      }
      crm_delete_note: { Args: { p_note: string }; Returns: undefined }
      crm_delete_segment: { Args: { p_id: string }; Returns: undefined }
      crm_delete_tag: { Args: { p_tag: string }; Returns: undefined }
      crm_remove_tag: {
        Args: { p_tag: string; p_user: string }
        Returns: undefined
      }
      crm_save_segment: {
        Args: { p_criteria: Json; p_name: string }
        Returns: {
          created_at: string
          created_by: string | null
          criteria: Json
          id: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "crm_segments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crm_segment_users: {
        Args: { p_criteria: Json }
        Returns: {
          user_id: string
        }[]
      }
      crm_send_broadcast: {
        Args: {
          p_body: string
          p_criteria?: Json
          p_label?: string
          p_title: string
          p_user?: string
        }
        Returns: number
      }
      crm_suspend_user: {
        Args: { p_reason: string; p_user: string }
        Returns: {
          id: string
          lift_note: string | null
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          suspended_at: string
          suspended_by: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_suspensions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crm_unsuspend_user: {
        Args: { p_note?: string; p_user: string }
        Returns: {
          id: string
          lift_note: string | null
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          suspended_at: string
          suspended_by: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_suspensions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crm_update_lead: {
        Args: {
          p_clear_owner?: boolean
          p_id: string
          p_note?: string
          p_owner?: string
          p_stage?: string
        }
        Returns: undefined
      }
      crm_update_note: {
        Args: { p_done?: boolean; p_note: string; p_pinned?: boolean }
        Returns: {
          author_id: string | null
          body: string
          created_at: string
          done_at: string | null
          follow_up_at: string | null
          id: string
          pinned: boolean
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "crm_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      daily_digest: { Args: never; Returns: Json }
      delete_my_account: { Args: { p_confirm: string }; Returns: Json }
      escrow_refund_due: {
        Args: { p_task_id: string }
        Returns: {
          due_minor: number
          payment_id: string
          provider_payment_id: string
          reason: string
        }[]
      }
      fail_unsent_payout: {
        Args: {
          p_expected_attempts?: number
          p_note: string
          p_payout_id: string
          p_quiet_minutes?: number
        }
        Returns: {
          amount_minor: number
          attempts: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          fee_minor: number | null
          id: string
          last_attempt_at: string | null
          mode: string | null
          provider_payout_id: string | null
          provider_status: string | null
          provider_status_at: string | null
          reference: string | null
          reversed_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tax_minor: number | null
          updated_at: string
          user_id: string
          via: string
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
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
      get_app_controls: {
        Args: { p_platform?: string; p_version?: string }
        Returns: Json
      }
      hit_auth_send_ip: {
        Args: { p_ip: string; p_max: number; p_window_min: number }
        Returns: boolean
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
      my_payout_profile: {
        Args: never
        Returns: {
          legal_name: string
          pan_last4: string
          updated_at: string
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
      outbox_mark_sent: { Args: { p_ids: string[] }; Returns: number }
      outbox_pending: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          data: Json
          id: string
          kind: string
        }[]
      }
      outbox_prune: { Args: never; Returns: number }
      password_sign_in_gate: {
        Args: { p_ip: string; p_username: string }
        Returns: number
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
      phone_account_is_admin: { Args: { p_email: string }; Returns: boolean }
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
      reconcile_provider_candidates: {
        Args: { p_days?: number }
        Returns: {
          amount_minor: number
          created_at: string
          id: string
          provider_ref: string
          status: string
        }[]
      }
      record_ad_click: { Args: { p_task_id: string }; Returns: undefined }
      record_ad_impression: { Args: { p_task_id: string }; Returns: undefined }
      record_admin_alert: {
        Args: {
          p_body?: string
          p_data?: Json
          p_kind: string
          p_title: string
        }
        Returns: string
      }
      record_birth_date: { Args: { p_birth_date: string }; Returns: string }
      record_device: {
        Args: {
          p_app_version?: string
          p_install_id: string
          p_os_version?: string
          p_platform: string
          p_push?: boolean
        }
        Returns: undefined
      }
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
          refund_claimed_at: string | null
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
      record_password_attempt: {
        Args: { p_ip: string; p_ok: boolean; p_username: string }
        Returns: undefined
      }
      record_payout_sent: {
        Args: { p_mode: string; p_payout_id: string; p_provider_id: string }
        Returns: undefined
      }
      record_payout_status: {
        Args: {
          p_fee_minor?: number
          p_note?: string
          p_payout_id: string
          p_provider_id: string
          p_status: string
          p_tax_minor?: number
          p_utr?: string
        }
        Returns: {
          amount_minor: number
          attempts: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          fee_minor: number | null
          id: string
          last_attempt_at: string | null
          mode: string | null
          provider_payout_id: string | null
          provider_status: string | null
          provider_status_at: string | null
          reference: string | null
          reversed_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tax_minor: number | null
          updated_at: string
          user_id: string
          via: string
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_provider_reconciliation: {
        Args: { p_checked: number; p_mismatches: Json }
        Returns: string
      }
      register_push_token: {
        Args: { p_platform?: string; p_token: string }
        Returns: undefined
      }
      release_escrow_refund_claim: {
        Args: { p_payment_id: string }
        Returns: undefined
      }
      remove_listing: { Args: { p_task_id: string }; Returns: undefined }
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
      report_content: {
        Args: { p_reason: string; p_target: string; p_type: string }
        Returns: string
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
          attempts: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          fee_minor: number | null
          id: string
          last_attempt_at: string | null
          mode: string | null
          provider_payout_id: string | null
          provider_status: string | null
          provider_status_at: string | null
          reference: string | null
          reversed_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tax_minor: number | null
          updated_at: string
          user_id: string
          via: string
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
      run_auto_complete_due: { Args: never; Returns: number }
      run_crm_rules: { Args: never; Returns: number }
      run_reconciliation: { Args: { p_days?: number }; Returns: Json }
      save_payout_fund_account: {
        Args: {
          p_contact_id: string
          p_destination_id: string
          p_fund_account_id: string
        }
        Returns: undefined
      }
      save_payout_profile: {
        Args: { p_legal_name: string; p_pan: string }
        Returns: {
          created_at: string
          legal_name: string
          pan: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
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
          attempts: number
          created_at: string
          destination: string | null
          destination_id: string | null
          failure_note: string | null
          fee_minor: number | null
          id: string
          last_attempt_at: string | null
          mode: string | null
          provider_payout_id: string | null
          provider_status: string | null
          provider_status_at: string | null
          reference: string | null
          reversed_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tax_minor: number | null
          updated_at: string
          user_id: string
          via: string
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
      take_places_quota: {
        Args: { p_limit: number; p_user: string; p_window_minutes: number }
        Returns: boolean
      }
      task_contact_phone: { Args: { p_task_id: string }; Returns: string }
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
      unblock_user: { Args: { p_user: string }; Returns: undefined }
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
