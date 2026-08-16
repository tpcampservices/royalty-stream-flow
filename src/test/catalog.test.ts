import { describe, expect, it } from 'vitest';
import { allocateByPercentage, percentageComplete, percentageState, percentageTotal } from '@/lib/catalog';

describe('catalog percentage helpers', () => {
  it('totals decimal ownership percentages safely', () => {
    expect(percentageTotal([{ share: 60 }, { share: 40 }], (row) => row.share)).toBe(100);
  });

  it('distinguishes complete, incomplete, and excessive totals', () => {
    expect(percentageComplete(100)).toBe(true);
    expect(percentageState(100)).toBe('complete');
    expect(percentageState(75)).toBe('incomplete');
    expect(percentageState(101)).toBe('over');
  });

  it('allocates only when the ownership chain is complete', () => {
    const owners = [
      { member: 'writer', share: 65 },
      { member: 'publisher', share: 35 },
    ];
    expect(allocateByPercentage(1000, owners, (row) => row.member, (row) => row.share)).toEqual([
      { memberId: 'writer', amount: 650 },
      { memberId: 'publisher', amount: 350 },
    ]);
    expect(allocateByPercentage(1000, owners.slice(0, 1), (row) => row.member, (row) => row.share)).toEqual([]);
  });
});
