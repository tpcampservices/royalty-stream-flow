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
      licensees: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          end_date: string | null
          id: string
          licence_fee: number
          licence_number: string | null
          licence_type: string | null
          name: string
          notes: string | null
          source_type: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          licence_fee?: number
          licence_number?: string | null
          licence_type?: string | null
          name: string
          notes?: string | null
          source_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          licence_fee?: number
          licence_number?: string | null
          licence_type?: string | null
          name?: string
          notes?: string | null
          source_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          created_at: string
          email: string | null
          id: string
          ipi_number: string | null
          member_code: string | null
          name: string
          notes: string | null
          phone: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ipi_number?: string | null
          member_code?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ipi_number?: string | null
          member_code?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          member_id: string
          method: string | null
          notes: string | null
          paid_at: string | null
          pool_id: string | null
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          member_id: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          pool_id?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          member_id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          pool_id?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pools: {
        Row: {
          created_at: string
          deductions: number
          gross_amount: number
          id: string
          name: string | null
          net_amount: number
          period: string
          point_value: number
          source_type: string
          status: string
          total_weighted_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deductions?: number
          gross_amount?: number
          id?: string
          name?: string | null
          net_amount?: number
          period: string
          point_value?: number
          source_type?: string
          status?: string
          total_weighted_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deductions?: number
          gross_amount?: number
          id?: string
          name?: string | null
          net_amount?: number
          period?: string
          point_value?: number
          source_type?: string
          status?: string
          total_weighted_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      recording_shares: {
        Row: {
          created_at: string
          id: string
          member_id: string
          percentage: number
          recording_id: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          percentage?: number
          recording_id: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          percentage?: number
          recording_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_shares_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recording_shares_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "sound_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      sound_recordings: {
        Row: {
          album: string | null
          alternate_title: string | null
          artist: string | null
          created_at: string
          duration_seconds: number | null
          genre: string | null
          id: string
          isrc: string | null
          label: string | null
          notes: string | null
          recording_code: string | null
          release_year: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          album?: string | null
          alternate_title?: string | null
          artist?: string | null
          created_at?: string
          duration_seconds?: number | null
          genre?: string | null
          id?: string
          isrc?: string | null
          label?: string | null
          notes?: string | null
          recording_code?: string | null
          release_year?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          album?: string | null
          alternate_title?: string | null
          artist?: string | null
          created_at?: string
          duration_seconds?: number | null
          genre?: string | null
          id?: string
          isrc?: string | null
          label?: string | null
          notes?: string | null
          recording_code?: string | null
          release_year?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          allocation: number | null
          created_at: string
          diffusion_type: string | null
          id: string
          isrc: string | null
          licensee_id: string | null
          matched: boolean
          original_performer: string | null
          performing_artist: string | null
          pool_id: string | null
          quantity: number
          recording_code: string | null
          recording_id: string | null
          song_title: string | null
          source: string | null
          updated_at: string
          usage_code: string | null
          usage_date: string | null
          weight: number
        }
        Insert: {
          allocation?: number | null
          created_at?: string
          diffusion_type?: string | null
          id?: string
          isrc?: string | null
          licensee_id?: string | null
          matched?: boolean
          original_performer?: string | null
          performing_artist?: string | null
          pool_id?: string | null
          quantity?: number
          recording_code?: string | null
          recording_id?: string | null
          song_title?: string | null
          source?: string | null
          updated_at?: string
          usage_code?: string | null
          usage_date?: string | null
          weight?: number
        }
        Update: {
          allocation?: number | null
          created_at?: string
          diffusion_type?: string | null
          id?: string
          isrc?: string | null
          licensee_id?: string | null
          matched?: boolean
          original_performer?: string | null
          performing_artist?: string | null
          pool_id?: string | null
          quantity?: number
          recording_code?: string | null
          recording_id?: string | null
          song_title?: string | null
          source?: string | null
          updated_at?: string
          usage_code?: string | null
          usage_date?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_licensee_id_fkey"
            columns: ["licensee_id"]
            isOneToOne: false
            referencedRelation: "licensees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "sound_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_rules: {
        Row: {
          active: boolean
          code: string
          created_at: string
          diffusion_type: string | null
          id: string
          label: string
          source_type: string
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          diffusion_type?: string | null
          id?: string
          label: string
          source_type?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          diffusion_type?: string | null
          id?: string
          label?: string
          source_type?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
