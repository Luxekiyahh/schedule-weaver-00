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
      ai_generation_logs: {
        Row: {
          created_at: string
          credits_deducted: number
          id: string
          prompt_text: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          credits_deducted?: number
          id?: string
          prompt_text: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          credits_deducted?: number
          id?: string
          prompt_text?: string
          workspace_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          customer_id: string
          deposit_cents: number
          end_at: string
          hair_color: string | null
          id: string
          length_option_id: string | null
          notes: string | null
          provider_id: string
          service_id: string
          square_order_id: string | null
          start_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          variant_id: string | null
          workspace_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          customer_id: string
          deposit_cents?: number
          end_at: string
          hair_color?: string | null
          id?: string
          length_option_id?: string | null
          notes?: string | null
          provider_id: string
          service_id: string
          square_order_id?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          variant_id?: string | null
          workspace_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          customer_id?: string
          deposit_cents?: number
          end_at?: string
          hair_color?: string | null
          id?: string
          length_option_id?: string | null
          notes?: string | null
          provider_id?: string
          service_id?: string
          square_order_id?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          variant_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_length_option_id_fkey"
            columns: ["length_option_id"]
            isOneToOne: false
            referencedRelation: "service_length_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "service_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          created_at: string
          end_at: string
          id: string
          is_available: boolean
          member_id: string
          reason: string | null
          start_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          is_available?: boolean
          member_id: string
          reason?: string | null
          start_at: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          is_available?: boolean
          member_id?: string
          reason?: string | null
          start_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_exceptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          no_show_count: number
          notes: string | null
          phone: string | null
          prepay_overridden_by: string | null
          require_prepay: boolean
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          no_show_count?: number
          notes?: string | null
          phone?: string | null
          prepay_overridden_by?: string | null
          require_prepay?: boolean
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          no_show_count?: number
          notes?: string | null
          phone?: string | null
          prepay_overridden_by?: string | null
          require_prepay?: boolean
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          email_client_confirm: boolean
          email_provider_alert: boolean
          id: string
          sms_client_confirm: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email_client_confirm?: boolean
          email_provider_alert?: boolean
          id?: string
          sms_client_confirm?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email_client_confirm?: boolean
          email_provider_alert?: boolean
          id?: string
          sms_client_confirm?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          member_id: string
          start_time: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          member_id: string
          start_time: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          member_id?: string
          start_time?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_exceptions: {
        Row: {
          block_date: string
          created_at: string
          created_by: string | null
          end_time: string | null
          id: string
          label: string
          start_time: string | null
          workspace_id: string
        }
        Insert: {
          block_date: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          label: string
          start_time?: string | null
          workspace_id: string
        }
        Update: {
          block_date?: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          label?: string
          start_time?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      service_hair_colors: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          label: string
          sort_order: number
          swatch_hex: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          swatch_hex: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          swatch_hex?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_hair_colors_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      service_length_options: {
        Row: {
          active: boolean
          created_at: string
          duration_min: number
          id: string
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_min?: number
          id?: string
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_min?: number
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_length_options_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          created_at: string
          member_id: string
          service_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          member_id: string
          service_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          member_id?: string
          service_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      service_variants: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          description: string | null
          duration_min: number
          id: string
          image_url: string | null
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          image_url?: string | null
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          image_url?: string | null
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_variants_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_variants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          color: string | null
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          options: Json
          price_cents: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          options?: Json
          price_cents?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          options?: Json
          price_cents?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          price_id: string | null
          setup_fee_paid: boolean
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_id?: string | null
          setup_fee_paid?: boolean
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_id?: string | null
          setup_fee_paid?: boolean
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      waitlist_entries: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          desired_date: string | null
          desired_from: string | null
          desired_to: string | null
          id: string
          notified_at: string | null
          provider_id: string | null
          service_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          desired_date?: string | null
          desired_from?: string | null
          desired_to?: string | null
          id?: string
          notified_at?: string | null
          provider_id?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          desired_date?: string | null
          desired_from?: string | null
          desired_to?: string | null
          id?: string
          notified_at?: string | null
          provider_id?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_branding: {
        Row: {
          accent_hex: string
          background_hex: string
          body_font: string
          cta_label: string
          heading_font: string
          hero_headline: string
          hero_image_url: string | null
          hero_subhead: string
          layout_config: Json
          logo_url: string | null
          primary_hex: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accent_hex?: string
          background_hex?: string
          body_font?: string
          cta_label?: string
          heading_font?: string
          hero_headline?: string
          hero_image_url?: string | null
          hero_subhead?: string
          layout_config?: Json
          logo_url?: string | null
          primary_hex?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accent_hex?: string
          background_hex?: string
          body_font?: string
          cta_label?: string
          heading_font?: string
          hero_headline?: string
          hero_image_url?: string | null
          hero_subhead?: string
          layout_config?: Json
          logo_url?: string | null
          primary_hex?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_branding_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_payment_credentials: {
        Row: {
          created_at: string
          environment: string
          paypal_client_id: string | null
          paypal_secret: string | null
          square_access_token: string | null
          square_location_id: string | null
          stripe_secret_key: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          environment?: string
          paypal_client_id?: string | null
          paypal_secret?: string | null
          square_access_token?: string | null
          square_location_id?: string | null
          stripe_secret_key?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          paypal_client_id?: string | null
          paypal_secret?: string | null
          square_access_token?: string | null
          square_location_id?: string | null
          stripe_secret_key?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_payment_credentials_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_payment_settings: {
        Row: {
          connection_status: string
          created_at: string
          currency: string
          deposit_amount_cents: number
          deposit_percent: number
          deposit_type: string
          id: string
          no_show_prepay_threshold: number
          platform_fee_percent: number
          provider: string
          provider_account_id: string | null
          stripe_publishable_key: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connection_status?: string
          created_at?: string
          currency?: string
          deposit_amount_cents?: number
          deposit_percent?: number
          deposit_type?: string
          id?: string
          no_show_prepay_threshold?: number
          platform_fee_percent?: number
          provider?: string
          provider_account_id?: string | null
          stripe_publishable_key?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connection_status?: string
          created_at?: string
          currency?: string
          deposit_amount_cents?: number
          deposit_percent?: number
          deposit_type?: string
          id?: string
          no_show_prepay_threshold?: number
          platform_fee_percent?: number
          provider?: string
          provider_account_id?: string | null
          stripe_publishable_key?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_payment_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          ai_credits: number
          business_address: string | null
          business_email: string | null
          business_phone: string | null
          business_website: string | null
          created_at: string
          domain_status: string
          font_family: string
          id: string
          is_solo: boolean
          logo_url: string | null
          name: string
          notification_settings: Json
          notify_mobile: string | null
          onboarded_at: string | null
          owner_id: string
          primary_color: string
          secondary_color: string
          slug: string
          theme_config: Json
          theme_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          ai_credits?: number
          business_address?: string | null
          business_email?: string | null
          business_phone?: string | null
          business_website?: string | null
          created_at?: string
          domain_status?: string
          font_family?: string
          id?: string
          is_solo?: boolean
          logo_url?: string | null
          name: string
          notification_settings?: Json
          notify_mobile?: string | null
          onboarded_at?: string | null
          owner_id: string
          primary_color?: string
          secondary_color?: string
          slug: string
          theme_config?: Json
          theme_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          ai_credits?: number
          business_address?: string | null
          business_email?: string | null
          business_phone?: string | null
          business_website?: string | null
          created_at?: string
          domain_status?: string
          font_family?: string
          id?: string
          is_solo?: boolean
          logo_url?: string | null
          name?: string
          notification_settings?: Json
          notify_mobile?: string | null
          onboarded_at?: string | null
          owner_id?: string
          primary_color?: string
          secondary_color?: string
          slug?: string
          theme_config?: Json
          theme_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_ai_credit: {
        Args: { _prompt: string; _workspace_id: string }
        Returns: number
      }
      current_member_id: { Args: { _workspace_id: string }; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_workspace_role: {
        Args: {
          _min_role: Database["public"]["Enums"]["workspace_role"]
          _workspace_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refund_ai_credit: { Args: { _workspace_id: string }; Returns: number }
      workspace_has_feature:
        | {
            Args: { _feature: string; _workspace_id: string }
            Returns: boolean
          }
        | {
            Args: { _env?: string; _feature: string; _workspace_id: string }
            Returns: boolean
          }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      plan_tier: "basic" | "pro" | "enterprise"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "unpaid"
        | "paused"
      workspace_role: "client" | "staff" | "admin" | "owner"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      plan_tier: ["basic", "pro", "enterprise"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "unpaid",
        "paused",
      ],
      workspace_role: ["client", "staff", "admin", "owner"],
    },
  },
} as const
