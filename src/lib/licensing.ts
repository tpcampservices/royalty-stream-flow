export interface InvoiceLineAmount {
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface ReconciliationAmount {
  collections: number[];
  deductions: number[];
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateInvoiceLine({ quantity, unitPrice, taxRate }: InvoiceLineAmount) {
  const subtotal = roundMoney(Number(quantity || 0) * Number(unitPrice || 0));
  const tax = roundMoney(subtotal * (Number(taxRate || 0) / 100));
  return { subtotal, tax, total: roundMoney(subtotal + tax) };
}

export function convertToBase(amount: number, exchangeRate: number) {
  return roundMoney(Number(amount || 0) * Number(exchangeRate || 0));
}

export function remainingAllocation(total: number, allocated: number) {
  return Math.max(0, roundMoney(Number(total || 0) - Number(allocated || 0)));
}

export function calculateReconciliation({ collections, deductions }: ReconciliationAmount) {
  const gross = roundMoney(collections.reduce((sum, amount) => sum + Number(amount || 0), 0));
  const deducted = roundMoney(deductions.reduce((sum, amount) => sum + Number(amount || 0), 0));
  return { gross, deductions: deducted, net: roundMoney(gross - deducted) };
}
