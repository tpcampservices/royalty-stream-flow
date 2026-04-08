// Sample data for end-to-end demo

export interface Member {
  id: string;
  name: string;
  role: 'writer' | 'publisher' | 'administrator' | 'producer' | 'performer';
  email: string;
  status: 'active' | 'inactive';
  totalEarnings: number;
}

export interface Work {
  id: string;
  code: string;
  title: string;
  alternateTitle?: string;
  status: 'registered' | 'pending' | 'disputed';
  shares: OwnershipShare[];
}

export interface OwnershipShare {
  memberId: string;
  memberName: string;
  role: string;
  percentage: number;
}

export interface Licensee {
  id: string;
  name: string;
  type: 'radio' | 'event' | 'venue' | 'shop';
  status: 'active' | 'expired';
  licenceFee: number;
}

export interface DistributionPool {
  id: string;
  sourceType: 'radio' | 'event' | 'venue' | 'shop';
  period: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: 'open' | 'calculating' | 'approved' | 'paid';
  totalWeightedPoints: number;
  pointValue: number;
}

export interface UsageLogLine {
  id: string;
  poolId: string;
  source: string;
  date: string;
  workCode: string;
  songTitle: string;
  performingArtist: string;
  originalPerformer: string;
  diffusionType: 'Live' | 'DJ';
  usageCode: string;
  weight: number;
  matched: boolean;
  allocation?: number;
}

export interface WeightingRule {
  id: string;
  code: string;
  label: string;
  weight: number;
  sourceType: string;
}

export const sampleMembers: Member[] = [
  { id: 'm1', name: 'Marcus Johnson', role: 'writer', email: 'marcus@email.com', status: 'active', totalEarnings: 12450 },
  { id: 'm2', name: 'Sophia Williams', role: 'writer', email: 'sophia@email.com', status: 'active', totalEarnings: 8920 },
  { id: 'm3', name: 'Island Records Ltd', role: 'publisher', email: 'admin@island.com', status: 'active', totalEarnings: 34200 },
  { id: 'm4', name: 'Carlos Rivera', role: 'performer', email: 'carlos@email.com', status: 'active', totalEarnings: 5670 },
  { id: 'm5', name: 'Nina Chen', role: 'writer', email: 'nina@email.com', status: 'inactive', totalEarnings: 2100 },
  { id: 'm6', name: 'Rhythm Publishing', role: 'publisher', email: 'info@rhythm.com', status: 'active', totalEarnings: 18500 },
];

export const sampleWorks: Work[] = [
  { id: 'w1', code: 'WRK-001', title: 'Island Breeze', status: 'registered', shares: [
    { memberId: 'm1', memberName: 'Marcus Johnson', role: 'Composer', percentage: 50 },
    { memberId: 'm3', memberName: 'Island Records Ltd', role: 'Publisher', percentage: 50 },
  ]},
  { id: 'w2', code: 'WRK-002', title: 'Sunset Groove', status: 'registered', shares: [
    { memberId: 'm2', memberName: 'Sophia Williams', role: 'Author', percentage: 40 },
    { memberId: 'm6', memberName: 'Rhythm Publishing', role: 'Publisher', percentage: 35 },
    { memberId: 'm4', memberName: 'Carlos Rivera', role: 'Performer', percentage: 25 },
  ]},
  { id: 'w3', code: 'WRK-003', title: 'Carnival Nights', status: 'registered', shares: [
    { memberId: 'm1', memberName: 'Marcus Johnson', role: 'Composer', percentage: 60 },
    { memberId: 'm3', memberName: 'Island Records Ltd', role: 'Publisher', percentage: 40 },
  ]},
  { id: 'w4', code: 'WRK-004', title: 'Dancing Fire', status: 'pending', shares: [] },
  { id: 'w5', code: 'WRK-005', title: 'Morning Light', status: 'disputed', shares: [
    { memberId: 'm2', memberName: 'Sophia Williams', role: 'Composer', percentage: 100 },
  ]},
];

export const sampleLicensees: Licensee[] = [
  { id: 'l1', name: 'Caribbean FM 101.5', type: 'radio', status: 'active', licenceFee: 25000 },
  { id: 'l2', name: 'Harbour Jazz Festival', type: 'event', status: 'active', licenceFee: 10000 },
  { id: 'l3', name: 'Blue Lagoon Bar & Grill', type: 'venue', status: 'active', licenceFee: 3500 },
  { id: 'l4', name: 'Island Sounds Music Festival', type: 'event', status: 'active', licenceFee: 15000 },
  { id: 'l5', name: 'Tropical Mall', type: 'shop', status: 'active', licenceFee: 2000 },
  { id: 'l6', name: 'Rhythm Radio 98.7', type: 'radio', status: 'expired', licenceFee: 18000 },
];

export const samplePools: DistributionPool[] = [
  { id: 'p1', sourceType: 'event', period: 'Q1 2025', grossAmount: 25000, deductions: 2500, netAmount: 22500, status: 'approved', totalWeightedPoints: 535, pointValue: 42.06 },
  { id: 'p2', sourceType: 'radio', period: 'Q1 2025', grossAmount: 43000, deductions: 4300, netAmount: 38700, status: 'calculating', totalWeightedPoints: 0, pointValue: 0 },
  { id: 'p3', sourceType: 'venue', period: 'Q1 2025', grossAmount: 8500, deductions: 850, netAmount: 7650, status: 'open', totalWeightedPoints: 0, pointValue: 0 },
  { id: 'p4', sourceType: 'shop', period: 'Q1 2025', grossAmount: 4000, deductions: 400, netAmount: 3600, status: 'open', totalWeightedPoints: 0, pointValue: 0 },
];

export const sampleWeightingRules: WeightingRule[] = [
  { id: 'wr1', code: 'HDL', label: 'Headline Live Performance', weight: 30, sourceType: 'event' },
  { id: 'wr2', code: 'FTR', label: 'Featured Live Performance', weight: 25, sourceType: 'event' },
  { id: 'wr3', code: 'FDM', label: 'Featured DJ Music', weight: 15, sourceType: 'event' },
  { id: 'wr4', code: 'DJM', label: 'Other DJ Music', weight: 3, sourceType: 'event' },
  { id: 'wr5', code: 'LIV', label: 'Other Live Concert', weight: 6, sourceType: 'event' },
  { id: 'wr6', code: 'RSP', label: 'Radio Spin Play', weight: 10, sourceType: 'radio' },
  { id: 'wr7', code: 'RFT', label: 'Radio Feature Play', weight: 20, sourceType: 'radio' },
  { id: 'wr8', code: 'BGM', label: 'Background Music', weight: 1, sourceType: 'venue' },
  { id: 'wr9', code: 'BGS', label: 'Background Music Store', weight: 1, sourceType: 'shop' },
];

export const sampleUsageLogLines: UsageLogLine[] = [
  { id: 'u1', poolId: 'p1', source: 'Harbour Jazz Festival', date: '2025-01-15', workCode: 'WRK-001', songTitle: 'Island Breeze', performingArtist: 'Marcus Johnson', originalPerformer: 'Marcus Johnson', diffusionType: 'Live', usageCode: 'FTR', weight: 25, matched: true, allocation: 1051.40 },
  { id: 'u2', poolId: 'p1', source: 'Harbour Jazz Festival', date: '2025-01-15', workCode: 'WRK-002', songTitle: 'Sunset Groove', performingArtist: 'Carlos Rivera', originalPerformer: 'Sophia Williams', diffusionType: 'Live', usageCode: 'FTR', weight: 25, matched: true, allocation: 1051.40 },
  { id: 'u3', poolId: 'p1', source: 'Harbour Jazz Festival', date: '2025-01-15', workCode: 'WRK-003', songTitle: 'Carnival Nights', performingArtist: 'DJ Flame', originalPerformer: 'Marcus Johnson', diffusionType: 'DJ', usageCode: 'FDM', weight: 15, matched: true, allocation: 630.84 },
  { id: 'u4', poolId: 'p1', source: 'Island Sounds Festival', date: '2025-02-20', workCode: 'WRK-001', songTitle: 'Island Breeze', performingArtist: 'Marcus Johnson', originalPerformer: 'Marcus Johnson', diffusionType: 'Live', usageCode: 'HDL', weight: 30, matched: true, allocation: 1261.68 },
  { id: 'u5', poolId: 'p1', source: 'Island Sounds Festival', date: '2025-02-20', workCode: 'WRK-002', songTitle: 'Sunset Groove', performingArtist: 'Sophia Williams', originalPerformer: 'Sophia Williams', diffusionType: 'DJ', usageCode: 'FDM', weight: 15, matched: true, allocation: 630.84 },
  { id: 'u6', poolId: 'p1', source: 'Island Sounds Festival', date: '2025-02-20', workCode: 'WRK-004', songTitle: 'Dancing Fire', performingArtist: 'Unknown', originalPerformer: 'Unknown', diffusionType: 'DJ', usageCode: 'DJM', weight: 3, matched: false },
  { id: 'u7', poolId: 'p1', source: 'Island Sounds Festival', date: '2025-02-20', workCode: '', songTitle: 'Mystery Track', performingArtist: 'Unknown', originalPerformer: 'Unknown', diffusionType: 'DJ', usageCode: 'DJM', weight: 3, matched: false },
];

export const sourceTypeLabels: Record<string, string> = {
  radio: 'Radio',
  event: 'Special Events',
  venue: 'Venues',
  shop: 'Shops & Stores',
};

export const sourceTypeColors: Record<string, string> = {
  radio: 'hsl(var(--chart-4))',
  event: 'hsl(var(--chart-1))',
  venue: 'hsl(var(--chart-2))',
  shop: 'hsl(var(--chart-3))',
};
