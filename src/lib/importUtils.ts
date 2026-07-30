import * as XLSX from 'xlsx';

export type ImportRow = Record<string, string | number | boolean | null>;

const normalise = (header: string) =>
  header.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Parse a CSV or Excel file into rows keyed by normalised header names. */
export async function parseSpreadsheet(file: File): Promise<ImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  return raw.map((row) => {
    const out: ImportRow = {};
    Object.entries(row).forEach(([key, value]) => {
      out[normalise(key)] = typeof value === 'string' ? value.trim() : (value as never);
    });
    return out;
  });
}

export function downloadTemplate(filename: string, headers: string[], example?: (string | number)[]) {
  const rows = example ? [headers, example] : [headers];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Template');
  XLSX.writeFile(book, filename);
}

export function exportRows(filename: string, rows: unknown[]) {
  const sheet = XLSX.utils.json_to_sheet(rows as Record<string, unknown>[]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Export');
  XLSX.writeFile(book, filename);
}

export const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

export const toDate = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

export const toText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
};
