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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          clinic_id: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          clinic_id: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          clinic_id?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      billing_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          last_error: string | null
          payload: Json
          payment_id: string | null
          processed_at: string | null
          processing_attempts: number
          provider: string
          received_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          last_error?: string | null
          payload: Json
          payment_id?: string | null
          processed_at?: string | null
          processing_attempts?: number
          provider?: string
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          last_error?: string | null
          payload?: Json
          payment_id?: string | null
          processed_at?: string | null
          processing_attempts?: number
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          booking_fee: number | null
          booking_fee_payment_method: string | null
          clinic_id: string
          created_at: string
          date: string
          end_time: string
          id: string
          lead_source: string | null
          notes: string | null
          patient_id: string
          payment_status: string
          procedure: string
          professional_id: string
          referral_name: string | null
          return_contacted_at: string | null
          seller_id: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_fee?: number | null
          booking_fee_payment_method?: string | null
          clinic_id: string
          created_at?: string
          date: string
          end_time: string
          id?: string
          lead_source?: string | null
          notes?: string | null
          patient_id: string
          payment_status?: string
          procedure: string
          professional_id: string
          referral_name?: string | null
          return_contacted_at?: string | null
          seller_id?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_fee?: number | null
          booking_fee_payment_method?: string | null
          clinic_id?: string
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          lead_source?: string | null
          notes?: string | null
          patient_id?: string
          payment_status?: string
          procedure?: string
          professional_id?: string
          referral_name?: string | null
          return_contacted_at?: string | null
          seller_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_closings: {
        Row: {
          clinic_id: string
          closed_at: string
          closed_by: string | null
          closing_date: string
          id: string
        }
        Insert: {
          clinic_id: string
          closed_at?: string
          closed_by?: string | null
          closing_date: string
          id?: string
        }
        Update: {
          clinic_id?: string
          closed_at?: string
          closed_by?: string | null
          closing_date?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_closings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_custom_features: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_custom_features_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_custom_role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          clinic_custom_role_id: string
          created_at: string
          feature: string
          id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          clinic_custom_role_id: string
          created_at?: string
          feature: string
          id?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          clinic_custom_role_id?: string
          created_at?: string
          feature?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_custom_role_permissions_clinic_custom_role_id_fkey"
            columns: ["clinic_custom_role_id"]
            isOneToOne: false
            referencedRelation: "clinic_custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_custom_roles: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_custom_roles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_documents: {
        Row: {
          clinic_id: string
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          is_upload: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_upload?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_upload?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          clinic_id: string
          created_at: string
          feature: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          clinic_id: string
          created_at?: string
          feature: string
          id?: string
          role: string
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          clinic_id?: string
          created_at?: string
          feature?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_role_permissions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_users: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_owner: boolean | null
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_owner?: boolean | null
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_owner?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          address_number: string | null
          asaas_customer_id: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          neighborhood: string | null
          organization_id: string | null
          owner_user_id: string | null
          phone: string | null
          razao_social: string | null
          slug: string | null
          state: string | null
          unit_name: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          asaas_customer_id?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          neighborhood?: string | null
          organization_id?: string | null
          owner_user_id?: string | null
          phone?: string | null
          razao_social?: string | null
          slug?: string | null
          state?: string | null
          unit_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          asaas_customer_id?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          organization_id?: string | null
          owner_user_id?: string | null
          phone?: string | null
          razao_social?: string | null
          slug?: string | null
          state?: string | null
          unit_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          contacted_at: string | null
          contacted_by: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          notes: string | null
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          appointment_id: string | null
          base_value: number | null
          beneficiary_id: string
          beneficiary_type: string
          clinic_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          percentage: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          base_value?: number | null
          beneficiary_id: string
          beneficiary_type: string
          clinic_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          percentage?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          base_value?: number | null
          beneficiary_id?: string
          beneficiary_type?: string
          clinic_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          percentage?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          id: string
          clinic_id: string
          professional_id: string
          beneficiary_type: string
          beneficiary_id: string | null
          beneficiary_name: string | null
          procedure: string
          day_of_week: string
          calculation_type: string
          calculation_unit: string
          value: number
          is_active: boolean
          priority: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          professional_id: string
          beneficiary_type: string
          beneficiary_id?: string | null
          beneficiary_name?: string | null
          procedure: string
          day_of_week: string
          calculation_type: string
          calculation_unit: string
          value: number
          is_active?: boolean
          priority?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          professional_id?: string
          beneficiary_type?: string
          beneficiary_id?: string | null
          beneficiary_name?: string | null
          procedure?: string
          day_of_week?: string
          calculation_type?: string
          calculation_unit?: string
          value?: number
          is_active?: boolean
          priority?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_status: {
        Row: {
          id: string
          clinic_id: string
          status_date: string
          is_open: boolean
          opened_by: string | null
          opened_at: string | null
          closed_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          status_date: string
          is_open?: boolean
          opened_by?: string | null
          opened_at?: string | null
          closed_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          status_date?: string
          is_open?: boolean
          opened_by?: string | null
          opened_at?: string | null
          closed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_status_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          id: string
          clinic_id: string
          channel_type: string
          display_name: string
          phone_number: string | null
          waba_id: string | null
          phone_number_id: string | null
          access_token: string | null
          webhook_verify_token: string | null
          status: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          channel_type?: string
          display_name: string
          phone_number?: string | null
          waba_id?: string | null
          phone_number_id?: string | null
          access_token?: string | null
          webhook_verify_token?: string | null
          status?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          channel_type?: string
          display_name?: string
          phone_number?: string | null
          waba_id?: string | null
          phone_number_id?: string | null
          access_token?: string | null
          webhook_verify_token?: string | null
          status?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          id: string
          clinic_id: string
          channel_id: string
          patient_id: string | null
          flow_id: string | null
          external_contact_id: string
          contact_name: string | null
          contact_phone: string
          status: string
          assigned_to: string | null
          last_message_at: string
          last_message_preview: string | null
          unread_count: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          channel_id: string
          patient_id?: string | null
          flow_id?: string | null
          external_contact_id: string
          contact_name?: string | null
          contact_phone: string
          status?: string
          assigned_to?: string | null
          last_message_at?: string
          last_message_preview?: string | null
          unread_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          channel_id?: string
          patient_id?: string | null
          flow_id?: string | null
          external_contact_id?: string
          contact_name?: string | null
          contact_phone?: string
          status?: string
          assigned_to?: string | null
          last_message_at?: string
          last_message_preview?: string | null
          unread_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_flow_sessions: {
        Row: {
          id: string
          conversation_id: string
          flow_id: string
          current_node_id: string | null
          variables: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          flow_id: string
          current_node_id?: string | null
          variables?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          flow_id?: string
          current_node_id?: string | null
          variables?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_flows: {
        Row: {
          id: string
          clinic_id: string
          channel_id: string | null
          name: string
          description: string | null
          is_active: boolean
          is_default: boolean
          trigger_type: string
          definition: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          channel_id?: string | null
          name: string
          description?: string | null
          is_active?: boolean
          is_default?: boolean
          trigger_type?: string
          definition?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          channel_id?: string | null
          name?: string
          description?: string | null
          is_active?: boolean
          is_default?: boolean
          trigger_type?: string
          definition?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_flows_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          clinic_id: string
          direction: string
          body: string
          message_type: string
          external_id: string | null
          status: string
          sent_by: string | null
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          clinic_id: string
          direction: string
          body: string
          message_type?: string
          external_id?: string | null
          status?: string
          sent_by?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          clinic_id?: string
          direction?: string
          body?: string
          message_type?: string
          external_id?: string | null
          status?: string
          sent_by?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          preference_key: string
          preference_value: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preference_key: string
          preference_value?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preference_key?: string
          preference_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dental_charts: {
        Row: {
          clinic_id: string
          condition: string
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          professional_id: string | null
          tooth_number: number
          treatment_date: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          condition?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          professional_id?: string | null
          tooth_number: number
          treatment_date?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          condition?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          professional_id?: string | null
          tooth_number?: number
          treatment_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dental_charts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dental_charts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dental_charts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string | null
          clinic_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          notes: string | null
          patient_id: string | null
          payment_method: string | null
          payment_split: Json | null
          reference_id: string | null
          reference_type: string | null
          refunded_at: string | null
          refunded_by: string | null
          type: string
          updated_at: string
          user_id: string
          voucher_discount: number | null
        }
        Insert: {
          amount: number
          category?: string | null
          clinic_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          payment_method?: string | null
          payment_split?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          type: string
          updated_at?: string
          user_id: string
          voucher_discount?: number | null
        }
        Update: {
          amount?: number
          category?: string | null
          clinic_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          payment_method?: string | null
          payment_split?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          voucher_discount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          clinic_id: string
          created_at: string | null
          id: string
          reason: string | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          clinic_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
          transaction_id: string
          user_id: string
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          new_stock: number
          notes: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
          type: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          new_stock: number
          notes?: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reason?: string | null
          type: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_products: {
        Row: {
          category: string | null
          clinic_id: string
          cost_price: number | null
          created_at: string
          current_stock: number
          description: string | null
          id: string
          is_active: boolean | null
          minimum_stock: number | null
          name: string
          sale_price: number | null
          sku: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          clinic_id: string
          cost_price?: number | null
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_stock?: number | null
          name: string
          sale_price?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          clinic_id?: string
          cost_price?: number | null
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_stock?: number | null
          name?: string
          sale_price?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_products_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_evolutions: {
        Row: {
          clinic_id: string
          content: string
          created_at: string
          created_by: string | null
          evolution_date: string
          id: string
          patient_id: string
          professional_id: string | null
          professional_name: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          content?: string
          created_at?: string
          created_by?: string | null
          evolution_date?: string
          id?: string
          patient_id: string
          professional_id?: string | null
          professional_name?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          evolution_date?: string
          id?: string
          patient_id?: string
          professional_id?: string | null
          professional_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_evolutions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_evolutions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_evolutions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_files: {
        Row: {
          category: string
          clinic_id: string
          created_at: string
          created_by: string | null
          evolution_id: string | null
          file_path: string
          file_size: number
          id: string
          mime_type: string
          name: string
          notes: string
          patient_id: string
          rotation: number
          tooth_number: number | null
          updated_at: string
        }
        Insert: {
          category?: string
          clinic_id: string
          created_at?: string
          created_by?: string | null
          evolution_id?: string | null
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string
          name: string
          notes?: string
          patient_id: string
          rotation?: number
          tooth_number?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          evolution_id?: string | null
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          name?: string
          notes?: string
          patient_id?: string
          rotation?: number
          tooth_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_files_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_files_evolution_id_fkey"
            columns: ["evolution_id"]
            isOneToOne: false
            referencedRelation: "patient_evolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_files_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string[] | null
          birth_date: string | null
          clinic_id: string
          clinical_notes: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          lead_source: string | null
          name: string
          phone: string | null
          referral_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          birth_date?: string | null
          clinic_id: string
          clinical_notes?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_source?: string | null
          name: string
          phone?: string | null
          referral_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          birth_date?: string | null
          clinic_id?: string
          clinical_notes?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_source?: string | null
          name?: string
          phone?: string | null
          referral_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          asaas_payment_id: string | null
          asaas_status: string | null
          asaas_subscription_id: string | null
          bank_slip_url: string | null
          billing_type: string | null
          charge_kind: string
          clinic_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          external_reference: string | null
          id: string
          invoice_url: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_proof_url: string | null
          provider_payload: Json | null
          requested_plan_id: string | null
          status: string
          subscription_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          asaas_payment_id?: string | null
          asaas_status?: string | null
          asaas_subscription_id?: string | null
          bank_slip_url?: string | null
          billing_type?: string | null
          charge_kind?: string
          clinic_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          provider_payload?: Json | null
          requested_plan_id?: string | null
          status?: string
          subscription_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          asaas_payment_id?: string | null
          asaas_status?: string | null
          asaas_subscription_id?: string | null
          bank_slip_url?: string | null
          billing_type?: string | null
          charge_kind?: string
          clinic_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          provider_payload?: Json | null
          requested_plan_id?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_modules: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean | null
          module_name: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          module_name: string
          plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          module_name?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_modules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          discount_pix_percent: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_clinics: number | null
          max_patients: number | null
          max_users: number | null
          name: string
          price_monthly: number
          price_yearly: number | null
          promo_active: boolean | null
          promo_label: string | null
          promo_price_monthly: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_pix_percent?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_clinics?: number | null
          max_patients?: number | null
          max_users?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number | null
          promo_active?: boolean | null
          promo_label?: string | null
          promo_price_monthly?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_pix_percent?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_clinics?: number | null
          max_patients?: number | null
          max_users?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          promo_active?: boolean | null
          promo_label?: string | null
          promo_price_monthly?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      professionals: {
        Row: {
          clinic_id: string | null
          created_at: string
          cro: string
          email: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          specialty: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          cro: string
          email?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          specialty: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          cro?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          specialty?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          preferred_clinic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          preferred_clinic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          preferred_clinic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_clinic_id_fkey"
            columns: ["preferred_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      signed_terms: {
        Row: {
          id: string
          ip_address: string | null
          patient_id: string
          signature_data: string | null
          signed_at: string
          term_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          patient_id: string
          signature_data?: string | null
          signed_at?: string
          term_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          patient_id?: string
          signature_data?: string | null
          signed_at?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signed_terms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signed_terms_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_replied_at: string | null
          admin_replied_by: string | null
          admin_reply: string | null
          attachments: Json | null
          clinic_id: string
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_replied_at?: string | null
          admin_replied_by?: string | null
          admin_reply?: string | null
          attachments?: Json | null
          clinic_id: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_replied_at?: string | null
          admin_replied_by?: string | null
          admin_reply?: string | null
          attachments?: Json | null
          clinic_id?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          admin_notes: string | null
          asaas_last_synced_at: string | null
          asaas_next_due_date: string | null
          asaas_subscription_id: string | null
          billing_day: number
          billing_defer_days: number
          billing_first_due_date: string | null
          billing_mode: string
          billing_status: string | null
          clinic_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_payment_at: string | null
          monthly_fee: number | null
          mp_payment_id: string | null
          mp_preapproval_id: string | null
          notes: string | null
          external_reference: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_status: string | null
          plan_id: string | null
          proration_amount: number | null
          proration_days: number | null
          setup_fee: number | null
          status: string
          trial_ends_at: string | null
          updated_at: string
          features_override: Json
          feature_grants: Json
        }
        Insert: {
          admin_notes?: string | null
          asaas_last_synced_at?: string | null
          asaas_next_due_date?: string | null
          asaas_subscription_id?: string | null
          billing_day?: number
          billing_defer_days?: number
          billing_first_due_date?: string | null
          features_override?: Json
          feature_grants?: Json
          billing_mode?: string
          billing_status?: string | null
          clinic_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_at?: string | null
          monthly_fee?: number | null
          mp_payment_id?: string | null
          mp_preapproval_id?: string | null
          notes?: string | null
          external_reference?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          plan_id?: string | null
          proration_amount?: number | null
          proration_days?: number | null
          setup_fee?: number | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          asaas_last_synced_at?: string | null
          asaas_next_due_date?: string | null
          asaas_subscription_id?: string | null
          billing_day?: number
          billing_defer_days?: number
          billing_first_due_date?: string | null
          billing_mode?: string
          billing_status?: string | null
          clinic_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          features_override?: Json
          feature_grants?: Json
          id?: string
          last_payment_at?: string | null
          monthly_fee?: number | null
          mp_payment_id?: string | null
          mp_preapproval_id?: string | null
          notes?: string | null
          external_reference?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          plan_id?: string | null
          proration_amount?: number | null
          proration_days?: number | null
          setup_fee?: number | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          clinic_id: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          correction_reason: string | null
          correction_status: string | null
          created_at: string
          entry_type: string
          id: string
          is_correction: boolean | null
          timestamp: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          correction_reason?: string | null
          correction_status?: string | null
          created_at?: string
          entry_type: string
          id?: string
          is_correction?: boolean | null
          timestamp?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          correction_reason?: string | null
          correction_status?: string | null
          created_at?: string
          entry_type?: string
          id?: string
          is_correction?: boolean | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      upgrade_requests: {
        Row: {
          admin_notes: string | null
          clinic_id: string
          created_at: string
          current_plan_id: string | null
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          requested_by: string
          requested_feature: string | null
          requested_plan_id: string | null
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          clinic_id: string
          created_at?: string
          current_plan_id?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_by: string
          requested_feature?: string | null
          requested_plan_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          clinic_id?: string
          created_at?: string
          current_plan_id?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_by?: string
          requested_feature?: string | null
          requested_plan_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_requests_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_requests_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_requests_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_clinic_custom_roles: {
        Row: {
          clinic_custom_role_id: string
          clinic_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          clinic_custom_role_id: string
          clinic_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          clinic_custom_role_id?: string
          clinic_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_clinic_custom_roles_clinic_custom_role_id_fkey"
            columns: ["clinic_custom_role_id"]
            isOneToOne: false
            referencedRelation: "clinic_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_clinic_custom_roles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_clients_status: {
        Row: {
          admin_email: string | null
          admin_name: string | null
          billing_status: string | null
          clinic_email: string | null
          clinic_id: string | null
          clinic_name: string | null
          cnpj: string | null
          current_period_end: string | null
          last_payment_at: string | null
          monthly_fee: number | null
          plan_name: string | null
          plan_slug: string | null
          setup_fee: number | null
          subscription_created_at: string | null
          subscription_id: string | null
          subscription_status: string | null
          total_clinics_of_admin: number | null
          total_paid: number | null
        }
        Relationships: []
      }
      vw_owner_clinics: {
        Row: {
          address: string | null
          address_number: string | null
          asaas_customer_id: string | null
          city: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          is_owner: boolean | null
          logo_url: string | null
          name: string | null
          neighborhood: string | null
          owner_user_id: string | null
          phone: string | null
          razao_social: string | null
          role: string | null
          slug: string | null
          state: string | null
          unit_name: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      asaas_apply_payment_event: {
        Args: { p_event_id: string }
        Returns: Json
      }
      asaas_mark_event_error: {
        Args: { p_error: string; p_event_id: string }
        Returns: undefined
      }
      asaas_mark_subscription_cancelled: {
        Args: { p_subscription_id: string }
        Returns: undefined
      }
      asaas_persist_webhook_event: {
        Args: { p_event_id: string; p_event_type: string; p_payload: Json }
        Returns: boolean
      }
      asaas_store_billing_binding: {
        Args: {
          p_asaas_subscription_id: string
          p_customer_id: string
          p_next_due_date?: string
          p_subscription_id: string
        }
        Returns: undefined
      }
      ensure_organization_for_owner: {
        Args: { p_name?: string; p_owner_user_id: string }
        Returns: string
      }
      get_admin_by_email: {
        Args: { p_email: string }
        Returns: {
          name: string
          user_id: string
        }[]
      }
      get_clinics_of_same_owner: {
        Args: { p_user_id?: string }
        Returns: {
          address: string | null
          address_number: string | null
          asaas_customer_id: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          neighborhood: string | null
          owner_user_id: string | null
          phone: string | null
          razao_social: string | null
          slug: string | null
          state: string | null
          unit_name: string | null
          updated_at: string
          zip_code: string | null
        }[]
      }
      get_superadmin_stats: { Args: never; Returns: Json }
      get_user_clinic_id: { Args: { _user_id: string }; Returns: string }
      get_user_clinics: {
        Args: { p_user_id?: string }
        Returns: {
          clinic_id: string
          clinic_name: string
          is_owner: boolean
          is_preferred: boolean
          role: string
        }[]
      }
      get_user_current_clinic: {
        Args: { p_user_id?: string }
        Returns: {
          clinic_id: string
          clinic_name: string
          is_owner: boolean
          role: string
        }[]
      }
      get_user_subscription_status: {
        Args: { _user_id: string }
        Returns: string
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_clinic_member: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      is_user_admin: { Args: { p_user_id?: string }; Returns: boolean }
      notify_clinic_users_on_appointment: {
        Args: {
          p_clinic_id: string
          p_creator_id: string
          p_message: string
          p_reference_id: string
          p_title: string
        }
        Returns: undefined
      }
      register_payment: {
        Args: {
          p_amount: number
          p_created_by?: string
          p_description?: string
          p_next_due_date?: string
          p_paid_at: string
          p_payment_method?: string
          p_subscription_id: string
        }
        Returns: string
      }
      update_billing_status: {
        Args: { p_new_status: string; p_subscription_id: string }
        Returns: undefined
      }
      user_belongs_to_clinic: {
        Args: { p_clinic_id: string }
        Returns: boolean
      }
      user_can_access_clinic: {
        Args: { p_clinic_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      user_is_multi_clinic_owner: {
        Args: { p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "receptionist"
        | "seller"
        | "professional"
        | "superadmin"
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
      app_role: [
        "admin",
        "receptionist",
        "seller",
        "professional",
        "superadmin",
      ],
    },
  },
} as const
