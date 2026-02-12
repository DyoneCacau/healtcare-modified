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
      appointments: {
        Row: {
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
          seller_id: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
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
          seller_id?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
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
          city: string | null
          cnpj: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_user_id: string | null
          phone: string | null
          slug: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          slug?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          slug?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
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
          description: string | null
          id: string
          payment_method: string | null
          reference_id: string | null
          reference_type: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          updated_at?: string
          user_id?: string
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
          name: string
          phone: string | null
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
          name: string
          phone?: string | null
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
          name?: string
          phone?: string | null
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
          clinic_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          payment_proof_url: string | null
          requested_plan_id: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          amount: number
          clinic_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          requested_plan_id?: string | null
          status?: string
          subscription_id: string
        }
        Update: {
          amount?: number
          clinic_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          requested_plan_id?: string | null
          status?: string
          subscription_id?: string
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
          features: Json | null
          id: string
          is_active: boolean | null
          max_patients: number | null
          max_users: number | null
          name: string
          price_monthly: number
          price_yearly: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_patients?: number | null
          max_users?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_patients?: number | null
          max_users?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      professionals: {
        Row: {
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
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
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
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      subscriptions: {
        Row: {
          clinic_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_payment_at: string | null
          notes: string | null
          payment_status: string | null
          plan_id: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_at?: string | null
          notes?: string | null
          payment_status?: string | null
          plan_id?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_at?: string | null
          notes?: string | null
          payment_status?: string | null
          plan_id?: string | null
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
      [_ in never]: never
    }
    Functions: {
      get_user_clinic_id: { Args: { _user_id: string }; Returns: string }
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
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      user_has_feature: {
        Args: { _feature: string; _user_id: string }
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
