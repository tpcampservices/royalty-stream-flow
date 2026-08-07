import { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTableState, pageSizeOptions } from '@/hooks/useDataTable';

interface ToolbarProps<T extends { id: string }> {
  table: DataTableState<T>;
  searchPlaceholder?: string;
  children?: ReactNode;
}

export function TableToolbar<T extends { id: string }>({ table, searchPlaceholder = 'Search…', children }: ToolbarProps<T>) {
  const hasFilters = table.search || Object.values(table.filterValues).some((v) => v && v !== 'all');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder={searchPlaceholder}
        value={table.search}
        onChange={(e) => table.setSearch(e.target.value)}
        className="w-full sm:w-56"
      />
      {table.filters.map((f) => (
        <Select key={f.key} value={table.filterValues[f.key] || 'all'} onValueChange={(v) => table.setFilter(f.key, v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder={f.label} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {f.label.toLowerCase()}</SelectItem>
            {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      ))}
      <Select value={String(table.pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
        <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map((n) => <SelectItem key={n} value={String(n)}>Show {n}</SelectItem>)}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={table.resetFilters}><X className="w-4 h-4 mr-1" />Clear</Button>
      )}
      <div className="flex flex-wrap gap-2 ml-auto">{children}</div>
    </div>
  );
}

interface SortThProps<T extends { id: string }> {
  table: DataTableState<T>;
  sortKey: string;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function SortTh<T extends { id: string }>({ table, sortKey, children, align = 'left', className = '' }: SortThProps<T>) {
  const active = table.sortKey === sortKey;
  const Icon = !active ? ArrowUpDown : table.sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`py-3 px-4 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      <button
        type="button"
        onClick={() => table.toggleSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? 'text-foreground' : ''} ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {children}
        <Icon className="w-3 h-3 opacity-70" />
      </button>
    </th>
  );
}

export function SelectTh<T extends { id: string }>({ table }: { table: DataTableState<T> }) {
  return (
    <th className="py-3 px-4 w-10">
      <Checkbox checked={table.allPageSelected} onCheckedChange={() => table.toggleAllOnPage()} aria-label="Select all rows on page" />
    </th>
  );
}

export function SelectTd<T extends { id: string }>({ table, id }: { table: DataTableState<T>; id: string }) {
  return (
    <td className="py-3 px-4">
      <Checkbox checked={table.selected.includes(id)} onCheckedChange={() => table.toggleRow(id)} aria-label="Select row" />
    </td>
  );
}

export function BulkBar<T extends { id: string }>({ table, children }: { table: DataTableState<T>; children?: ReactNode }) {
  if (!table.selected.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2">
      <span className="text-sm text-foreground font-medium">{table.selected.length} selected</span>
      {table.selected.length < table.total && (
        <Button variant="link" size="sm" className="h-auto p-0" onClick={table.selectAllFiltered}>Select all {table.total}</Button>
      )}
      <div className="flex flex-wrap gap-2 ml-auto">
        {children}
        <Button variant="ghost" size="sm" onClick={table.clearSelection}>Clear</Button>
      </div>
    </div>
  );
}

export function TablePagination<T extends { id: string }>({ table }: { table: DataTableState<T> }) {
  const from = table.total === 0 ? 0 : (table.page - 1) * table.pageSize + 1;
  const to = Math.min(table.page * table.pageSize, table.total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground">Showing {from}–{to} of {table.total}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={table.page <= 1} onClick={() => table.setPage(table.page - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground">Page {table.page} of {table.totalPages}</span>
        <Button variant="outline" size="sm" disabled={table.page >= table.totalPages} onClick={() => table.setPage(table.page + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
