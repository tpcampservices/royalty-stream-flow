export const percentageTotal = <T>(rows: T[], read: (row: T) => number | null | undefined) =>
  rows.reduce((total, row) => total + Number(read(row) || 0), 0);

export const percentageComplete = (total: number) => Math.abs(total - 100) < 0.0001;

export const percentageState = (total: number) => {
  if (percentageComplete(total)) return 'complete';
  if (total > 100) return 'over';
  return 'incomplete';
};

export const humanizeCatalogRole = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export interface CatalogAllocation {
  memberId: string;
  amount: number;
}

export const allocateByPercentage = <T>(
  amount: number,
  rows: T[],
  memberId: (row: T) => string,
  percentage: (row: T) => number,
): CatalogAllocation[] => {
  const total = percentageTotal(rows, percentage);
  if (!percentageComplete(total)) return [];
  return rows.map((row) => ({
    memberId: memberId(row),
    amount: amount * (Number(percentage(row)) / 100),
  }));
};
