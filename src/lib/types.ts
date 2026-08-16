export type AppRole = 'admin' | 'finance' | 'reviewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface OrganizationMembership {
  organization_id: string;
  role: AppRole;
  organization: Organization;
}

export type SourceType = 'radio' | 'event' | 'venue' | 'shop';

export const sourceTypeLabels: Record<string, string> = {
  radio: 'Radio',
  event: 'Special Events',
  venue: 'Venues',
  shop: 'Shops & Stores',
};

export const sourceTypeOptions = ['radio', 'event', 'venue', 'shop'];
export const partyRoles = ['writer', 'publisher', 'administrator', 'performer', 'producer', 'label'] as const;
export const partyTypes = ['person', 'organization'] as const;
export const writerRoles = ['composer', 'lyricist', 'author', 'composer_lyricist', 'arranger', 'adapter', 'translator'] as const;
export const publisherRoles = ['original_publisher', 'administrator', 'sub_publisher'] as const;
export const performerRoles = ['main_artist', 'featured_artist', 'session_musician', 'background_vocalist', 'conductor', 'ensemble'] as const;
export const producerRoles = ['producer', 'co_producer', 'executive_producer', 'remixer', 'recording_engineer', 'mixing_engineer', 'mastering_engineer'] as const;
export const recordingRightsTypes = ['master_owner', 'exclusive_licensee'] as const;
export const memberRoles = [...partyRoles];
/** @deprecated The legacy recording_shares table is read-only. */
export const shareRoles = ['Composer', 'Author', 'Arranger', 'Publisher', 'Performer', 'Producer', 'Label'];
export const appRoles: AppRole[] = ['admin', 'finance', 'reviewer'];

export const licenceTypes = [
  'Blanket Licence',
  'Broadcast Licence',
  'Public Performance Licence',
  'Special Event Licence',
  'Background Music Licence',
  'Digital / Streaming Licence',
];

interface TenantOwned {
  organization_id: string;
}

export interface Member extends TenantOwned {
  id: string;
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
}

export interface MemberRole extends TenantOwned {
  id: string;
  member_id: string;
  role: string;
}

export interface MemberPaymentDetails extends TenantOwned {
  id: string;
  member_id: string;
  bank_name: string | null;
  bank_account: string | null;
}

export interface SoundRecording extends TenantOwned {
  id: string;
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
}

export interface RecordingShare extends TenantOwned {
  id: string;
  recording_id: string;
  member_id: string;
  role: string;
  percentage: number;
}

export interface Composition extends TenantOwned {
  id: string;
  work_code: string | null;
  iswc: string | null;
  title: string;
  alternate_title: string | null;
  work_type: string;
  language_code: string | null;
  duration_seconds: number | null;
  status: string;
  notes: string | null;
}

export interface CompositionWriter extends TenantOwned {
  id: string;
  composition_id: string;
  member_id: string;
  writer_role: string;
  ownership_percentage: number;
}

export interface CompositionPublisher extends TenantOwned {
  id: string;
  composition_id: string;
  member_id: string;
  publisher_role: string;
  ownership_percentage: number;
  collection_percentage: number;
  territory: string;
  effective_from: string | null;
  effective_to: string | null;
}

export interface RecordingComposition extends TenantOwned {
  id: string;
  recording_id: string;
  composition_id: string;
  sequence_number: number;
  share_percentage: number;
}

export interface RecordingPerformer extends TenantOwned {
  id: string;
  recording_id: string;
  member_id: string;
  performer_role: string;
  instrument: string | null;
  legacy_share_percentage: number | null;
}

export interface RecordingProducer extends TenantOwned {
  id: string;
  recording_id: string;
  member_id: string;
  producer_role: string;
  royalty_points: number | null;
  legacy_share_percentage: number | null;
}

export interface RecordingRightsHolder extends TenantOwned {
  id: string;
  recording_id: string;
  member_id: string;
  rights_type: string;
  ownership_percentage: number;
  territory: string;
  effective_from: string | null;
  effective_to: string | null;
  review_status: string;
}

export interface Licensee extends TenantOwned {
  id: string;
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
}

export interface WeightingRule extends TenantOwned {
  id: string;
  code: string;
  label: string;
  weight: number;
  source_type: string;
  diffusion_type: string | null;
  active: boolean;
}

export interface Pool extends TenantOwned {
  id: string;
  name: string | null;
  source_type: string;
  period: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  status: string;
  rights_domain: 'composition' | 'master';
  total_weighted_points: number;
  point_value: number;
}

export interface UsageLog extends TenantOwned {
  id: string;
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
}

export interface Payment extends TenantOwned {
  id: string;
  member_id: string;
  pool_id: string | null;
  amount: number;
  status: string;
  method: string | null;
  reference: string | null;
  paid_at: string | null;
  notes: string | null;
}

export const money = (value: number | null | undefined) =>
  `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
