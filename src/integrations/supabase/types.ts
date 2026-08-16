export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type TenantFields = {
  id: string;
  organization_id: string | null;
  created_at: string;
};

type DatabaseAppRole = "admin" | "finance" | "reviewer";

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        email: string | null;
        full_name: string | null;
        created_at: string;
        updated_at: string;
      }>;
      organizations: Table<{
        id: string;
        name: string;
        slug: string;
        created_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      organization_members: Table<{
        organization_id: string;
        user_id: string;
        role: DatabaseAppRole;
        created_at: string;
        updated_at: string;
      }>;
      members: Table<TenantFields & {
        member_code: string | null;
        name: string;
        role: string;
        entity_type: string;
        legal_name: string | null;
        email: string | null;
        phone: string | null;
        ipi_number: string | null;
        isni: string | null;
        ipn_number: string | null;
        society_code: string | null;
        country_code: string | null;
        address: string | null;
        status: string;
        notes: string | null;
        updated_at: string;
      }>;
      member_roles: Table<TenantFields & {
        member_id: string;
        role: string;
      }>;
      member_payment_details: Table<TenantFields & {
        member_id: string;
        bank_name: string | null;
        bank_account: string | null;
        updated_at: string;
      }>;
      sound_recordings: Table<TenantFields & {
        recording_code: string | null;
        isrc: string | null;
        title: string;
        alternate_title: string | null;
        artist: string | null;
        album: string | null;
        label: string | null;
        duration_seconds: number | null;
        release_year: number | null;
        genre: string | null;
        status: string;
        notes: string | null;
        updated_at: string;
      }>;
      recording_shares: Table<TenantFields & {
        recording_id: string;
        member_id: string;
        role: string;
        percentage: number;
      }>;
      compositions: Table<TenantFields & {
        work_code: string | null;
        iswc: string | null;
        title: string;
        alternate_title: string | null;
        work_type: string;
        language_code: string | null;
        duration_seconds: number | null;
        status: string;
        notes: string | null;
        updated_at: string;
      }>;
      composition_writers: Table<TenantFields & {
        composition_id: string;
        member_id: string;
        writer_role: string;
        ownership_percentage: number;
        updated_at: string;
      }>;
      composition_publishers: Table<TenantFields & {
        composition_id: string;
        member_id: string;
        publisher_role: string;
        ownership_percentage: number;
        collection_percentage: number;
        territory: string;
        effective_from: string | null;
        effective_to: string | null;
        updated_at: string;
      }>;
      recording_compositions: Table<TenantFields & {
        recording_id: string;
        composition_id: string;
        sequence_number: number;
        share_percentage: number;
      }>;
      recording_performers: Table<TenantFields & {
        recording_id: string;
        member_id: string;
        performer_role: string;
        instrument: string | null;
        legacy_share_percentage: number | null;
        updated_at: string;
      }>;
      recording_producers: Table<TenantFields & {
        recording_id: string;
        member_id: string;
        producer_role: string;
        royalty_points: number | null;
        legacy_share_percentage: number | null;
        updated_at: string;
      }>;
      recording_rights_holders: Table<TenantFields & {
        recording_id: string;
        member_id: string;
        rights_type: string;
        ownership_percentage: number;
        territory: string;
        effective_from: string | null;
        effective_to: string | null;
        review_status: string;
        updated_at: string;
      }>;
      licensees: Table<TenantFields & {
        name: string;
        source_type: string;
        licence_type: string | null;
        licence_number: string | null;
        status: string;
        licence_fee: number;
        contact_email: string | null;
        contact_phone: string | null;
        address: string | null;
        start_date: string | null;
        end_date: string | null;
        notes: string | null;
        updated_at: string;
      }>;
      weighting_rules: Table<TenantFields & {
        code: string;
        label: string;
        weight: number;
        source_type: string;
        diffusion_type: string | null;
        active: boolean;
        updated_at: string;
      }>;
      pools: Table<TenantFields & {
        name: string | null;
        source_type: string;
        period: string;
        gross_amount: number;
        deductions: number;
        net_amount: number;
        status: string;
        rights_domain: "composition" | "master";
        total_weighted_points: number;
        point_value: number;
        updated_at: string;
      }>;
      usage_logs: Table<TenantFields & {
        pool_id: string | null;
        licensee_id: string | null;
        source: string | null;
        usage_date: string | null;
        recording_id: string | null;
        isrc: string | null;
        recording_code: string | null;
        song_title: string | null;
        performing_artist: string | null;
        original_performer: string | null;
        diffusion_type: string | null;
        usage_code: string | null;
        quantity: number;
        weight: number;
        matched: boolean;
        allocation: number | null;
        updated_at: string;
      }>;
      payments: Table<TenantFields & {
        member_id: string;
        pool_id: string | null;
        amount: number;
        status: string;
        method: string | null;
        reference: string | null;
        paid_at: string | null;
        notes: string | null;
        updated_at: string;
      }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_organization: {
        Args: { organization_name: string };
        Returns: string;
      };
      add_organization_member_by_email: {
        Args: {
          target_organization_id: string;
          member_email: string;
          member_role: DatabaseAppRole;
        };
        Returns: null;
      };
      set_organization_member_role: {
        Args: {
          target_organization_id: string;
          target_user_id: string;
          new_role: DatabaseAppRole;
        };
        Returns: null;
      };
      remove_organization_member: {
        Args: { target_organization_id: string; target_user_id: string };
        Returns: null;
      };
    };
    Enums: { app_role: DatabaseAppRole };
    CompositeTypes: { [_ in never]: never };
  };
};

export const Constants = {
  public: {
    Enums: { app_role: ["admin", "finance", "reviewer"] },
  },
} as const;
