import { useEffect, useMemo, useState } from 'react';

export interface TableFilter<T> {
  key: string;
  label: string;
  options: string[];
  value: (row: T) => string | null | undefined;
}

export type SortDir = 'asc' | 'desc';

interface Options<T> {
  rows: T[];
  searchKeys?: (keyof T | string)[];
  filters?: TableFilter<T>[];
  initialSort?: string;
  initialDir?: SortDir;
  getValue?: (row: T, key: string) => unknown;
}

export const pageSizeOptions = [10, 25, 50, 100];

export function useDataTable<T extends { id: string }>({
  rows, searchKeys = [], filters = [], initialSort = '', initialDir = 'asc', getValue,
}: Options<T>) {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState(initialSort);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<string[]>([]);

  const read = (row: T, key: string): unknown =>
    getValue ? getValue(row, key) : (row as Record<string, unknown>)[key];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let out = rows;
    if (term) {
      out = out.filter((row) =>
        searchKeys.some((k) => String(read(row, String(k)) ?? '').toLowerCase().includes(term)));
    }
    filters.forEach((f) => {
      const value = filterValues[f.key];
      if (value && value !== 'all') out = out.filter((row) => String(f.value(row) ?? '') === value);
    });
    if (sortKey) {
      out = [...out].sort((a, b) => {
        const av = read(a, sortKey);
        const bv = read(b, sortKey);
        if (av === null || av === undefined || av === '') return 1;
        if (bv === null || bv === undefined || bv === '') return -1;
        const na = Number(av);
        const nb = Number(bv);
        const cmp = !Number.isNaN(na) && !Number.isNaN(nb) && String(av).trim() !== '' && String(bv).trim() !== ''
          ? na - nb
          : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, search, filterValues, filters, sortKey, sortDir, searchKeys, getValue]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => { setPage(1); }, [search, filterValues, pageSize, rows.length]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const toggleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const setFilter = (key: string, value: string) =>
    setFilterValues((prev) => ({ ...prev, [key]: value }));

  const toggleRow = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const pageIds = pageRows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  const toggleAllOnPage = () =>
    setSelected((prev) => (allPageSelected
      ? prev.filter((id) => !pageIds.includes(id))
      : Array.from(new Set([...prev, ...pageIds]))));

  const clearSelection = () => setSelected([]);
  const selectAllFiltered = () => setSelected(filtered.map((r) => r.id));
  const selectedRows = filtered.filter((r) => selected.includes(r.id));

  const resetFilters = () => { setSearch(''); setFilterValues({}); };

  return {
    search, setSearch,
    filterValues, setFilter, resetFilters,
    sortKey, sortDir, toggleSort,
    page, setPage, totalPages,
    pageSize, setPageSize,
    filtered, pageRows, total: filtered.length,
    selected, selectedRows, toggleRow, toggleAllOnPage, allPageSelected, clearSelection, selectAllFiltered,
    filters,
  };
}

export type DataTableState<T extends { id: string }> = ReturnType<typeof useDataTable<T>>;
