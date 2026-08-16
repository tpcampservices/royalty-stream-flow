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
  legal_name: string | null;
  registration_number: string | null;
  billing_email: string | null;
  country_code: string | null;
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

export interface Currency extends TenantOwned {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_base: boolean;
  active: boolean;
}

export interface ExchangeRate extends TenantOwned {
  id: string;
  from_currency_id: string;
  to_currency_id: string;
  rate: number;
  effective_date: string;
  source: string | null;
}

export interface Tariff extends TenantOwned {
  id: string;
  code: string;
  name: string;
  source_type: string;
  charging_basis: 'flat' | 'percentage' | 'per_unit' | 'minimum_guarantee';
  currency_id: string;
  flat_amount: number | null;
  rate_percentage: number | null;
  rate_per_unit: number | null;
  minimum_fee: number;
  effective_from: string;
  effective_to: string | null;
  active: boolean;
  notes: string | null;
}

export interface Licence extends TenantOwned {
  id: string;
  licensee_id: string;
  tariff_id: string | null;
  currency_id: string;
  licence_number: string;
  licence_type: string;
  status: 'draft' | 'active' | 'suspended' | 'expired' | 'terminated';
  start_date: string;
  end_date: string | null;
  billing_frequency: 'one_off' | 'monthly' | 'quarterly' | 'annually';
  agreed_fee: number | null;
  notes: string | null;
}

export interface Invoice extends TenantOwned {
  id: string;
  licence_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  currency_id: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: 'draft' | 'issued' | 'part_paid' | 'paid' | 'overdue' | 'void';
  notes: string | null;
}

export interface InvoiceLine extends TenantOwned {
  id: string;
  invoice_id: string;
  tariff_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_subtotal: number;
  tax_amount: number;
  line_total: number;
}

export interface Collection extends TenantOwned {
  id: string;
  licensee_id: string;
  collection_date: string;
  amount: number;
  currency_id: string;
  exchange_rate_to_base: number;
  base_amount: number;
  method: string;
  reference: string | null;
  status: 'pending' | 'cleared' | 'reversed';
  notes: string | null;
}

export interface CollectionAllocation extends TenantOwned {
  id: string;
  collection_id: string;
  invoice_id: string;
  collection_amount: number;
  invoice_amount: number;
  exchange_rate: number;
}

export interface Receipt extends TenantOwned {
  id: string;
  collection_id: string;
  receipt_number: string;
  issued_at: string;
  status: 'issued' | 'void';
  notes: string | null;
}

export interface PoolDeduction extends TenantOwned {
  id: string;
  pool_id: string;
  category: string;
  description: string;
  amount: number;
  currency_id: string;
  exchange_rate_to_base: number;
  base_amount: number;
  status: 'draft' | 'approved' | 'rejected';
  reference: string | null;
  incurred_date: string;
  notes: string | null;
}

export interface PoolCollectionAllocation extends TenantOwned {
  id: string;
  collection_id: string;
  pool_id: string;
  amount_base: number;
}

export interface PoolReconciliation extends TenantOwned {
  id: string;
  pool_id: string;
  collections_total: number;
  deductions_total: number;
  net_distributable: number;
  variance: number;
  status: 'draft' | 'reconciled' | 'locked';
  reconciled_at: string | null;
  reconciled_by: string | null;
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
  currency_id: string | null;
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
  currency_id: string | null;
  status: string;
  method: string | null;
  reference: string | null;
  paid_at: string | null;
  notes: string | null;
}

export const money = (value: number | null | undefined, currencyCode?: string) => {
  const amount = Number(value || 0);
  if (currencyCode) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
    } catch {
      // Fall through for incomplete custom currency configuration.
    }
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
