import { describe, expect, it } from 'vitest';
import { calculateInvoiceLine, calculateReconciliation, convertToBase, remainingAllocation } from '@/lib/licensing';

describe('licensing and collections calculations', () => {
  it('calculates invoice line tax without floating point drift', () => {
    expect(calculateInvoiceLine({ quantity: 3, unitPrice: 19.99, taxRate: 12.5 })).toEqual({
      subtotal: 59.97,
      tax: 7.5,
      total: 67.47,
    });
  });

  it('converts collection values to the base currency', () => {
    expect(convertToBase(125.55, 6.78)).toBe(851.23);
  });

  it('never reports a negative remaining allocation', () => {
    expect(remainingAllocation(100, 40.25)).toBe(59.75);
    expect(remainingAllocation(100, 101)).toBe(0);
  });

  it('reconciles cleared collections less approved deductions', () => {
    expect(calculateReconciliation({ collections: [500, 250.25], deductions: [50, 10.25] })).toEqual({
      gross: 750.25,
      deductions: 60.25,
      net: 690,
    });
  });
});
