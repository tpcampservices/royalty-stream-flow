import { useState } from 'react';
import { Plus, Upload, Pencil, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import ImportDialog from '@/components/ImportDialog';
import BulkEditDialog from '@/components/BulkEditDialog';
import { BulkBar, SelectTd, SelectTh, SortTh, TablePagination, TableToolbar } from '@/components/DataTableControls';
import { useTable } from '@/hooks/useTable';
import { useDataTable } from '@/hooks/useDataTable';
import { Licensee, Pool, UsageLog, WeightingRule, money } from '@/lib/types';
import { exportRows, toDate, toNumber, toText } from '@/lib/importUtils';

export default function UsageLogsPage() {
  const { rows, isLoading, insert, insertMany, update, updateMany, remove, removeMany } = useTable<UsageLog>('usage_logs', 'usage_date', false);
  const { rows: pools } = useTable<Pool>('pools', 'period', true);
  const { rows: licensees } = useTable<Licensee>('licensees', 'name', true);
  const { rows: weights } = useTable<WeightingRule>('weighting_rules', 'code', true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<UsageLog | null>(null);

  const fields: FieldDef[] = [
    { key: 'song_title', label: 'Song title', required: true },
    { key: 'performing_artist', label: 'Performing artist' },
    { key: 'isrc', label: 'ISRC' },
    { key: 'recording_code', label: 'Recording code' },
    { key: 'source', label: 'Source / venue' },
    { key: 'usage_date', label: 'Usage date', type: 'date' },
    { key: 'pool_id', label: 'Pool', type: 'select', options: pools.map((p) => ({ value: p.id, label: `${p.name || p.source_type} — ${p.period}` })) },
    { key: 'licensee_id', label: 'Licensee', type: 'select', options: licensees.map((l) => ({ value: l.id, label: l.name })) },
    { key: 'diffusion_type', label: 'Diffusion type', type: 'select', options: [{ value: 'Live', label: 'Live' }, { value: 'DJ', label: 'DJ' }, { value: 'Broadcast', label: 'Broadcast' }] },
    { key: 'usage_code', label: 'Usage code', type: 'select', options: weights.map((w) => ({ value: w.code, label: `${w.code} — ${w.label} (${Number(w.weight)})` })) },
    { key: 'quantity', label: 'Quantity / plays', type: 'number' },
  ];

  const weightFor = (code?: string | null) => Number(weights.find((w) => w.code === (code || '').toUpperCase())?.weight ?? 0);

  const save = (values: Record<string, unknown>) => {
    const payload = {
      ...values,
      quantity: Number(values.quantity || 1),
      weight: weightFor(values.usage_code as string),
    };
    return editing ? update.mutate({ id: editing.id, values: payload }) : insert.mutate(payload);
  };

  const table = useDataTable<UsageLog>({
    rows,
    searchKeys: ['song_title', 'performing_artist', 'isrc', 'source', 'usage_code'],
    initialSort: 'usage_date',
    initialDir: 'desc',
    filters: [
      { key: 'matched', label: 'Match', options: ['Matched', 'Unmatched'], value: (l) => (l.matched ? 'Matched' : 'Unmatched') },
      { key: 'diffusion_type', label: 'Diffusion', options: ['Live', 'DJ', 'Broadcast'], value: (l) => l.diffusion_type },
      ...(weights.length ? [{ key: 'usage_code', label: 'Code', options: weights.map((w) => w.code), value: (l: UsageLog) => l.usage_code }] : []),
    ],
  });

  const unmatched = rows.filter((l) => !l.matched).length;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{rows.length} log lines — {unmatched} unmatched</p>

      <TableToolbar table={table} searchPlaceholder="Search usage…">
        <Button variant="outline" onClick={() => exportRows('usage-logs.xlsx', table.filtered)}><Download className="w-4 h-4 mr-2" />Export</Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Bulk import</Button>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add line</Button>
      </TableToolbar>

      <BulkBar table={table}>
        <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Pencil className="w-4 h-4 mr-1" />Edit selected</Button>
        <Button variant="outline" size="sm" onClick={() => updateMany.mutate({ ids: table.selected, values: { matched: false, recording_id: null } })}>Unmatch</Button>
        <Button variant="destructive" size="sm" onClick={() => { removeMany.mutate(table.selected); table.clearSelection(); }}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
      </BulkBar>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1060px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <SelectTh table={table} />
                <SortTh table={table} sortKey="source" className="px-3">Source</SortTh>
                <SortTh table={table} sortKey="usage_date" className="px-3">Date</SortTh>
                <SortTh table={table} sortKey="isrc" className="px-3">ISRC</SortTh>
                <SortTh table={table} sortKey="song_title" className="px-3">Song title</SortTh>
                <SortTh table={table} sortKey="performing_artist" className="px-3">Artist</SortTh>
                <SortTh table={table} sortKey="diffusion_type" className="px-3">Type</SortTh>
                <SortTh table={table} sortKey="usage_code" className="px-3">Code</SortTh>
                <SortTh table={table} sortKey="quantity" className="px-3" align="right">Qty</SortTh>
                <SortTh table={table} sortKey="weight" className="px-3" align="right">Weight</SortTh>
                <SortTh table={table} sortKey="matched" className="px-3">Status</SortTh>
                <SortTh table={table} sortKey="allocation" className="px-3" align="right">Allocation</SortTh>
                <th className="text-right py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={13} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && !table.total && <tr><td colSpan={13} className="py-8 text-center text-muted-foreground">No usage logs found — import a log file to begin.</td></tr>}
              {table.pageRows.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <SelectTd table={table} id={l.id} />
                  <td className="py-3 px-3 text-foreground text-xs">{l.source || '—'}</td>
                  <td className="py-3 px-3 text-muted-foreground text-xs">{l.usage_date || '—'}</td>
                  <td className="py-3 px-3 font-mono text-primary text-xs">{l.isrc || l.recording_code || '—'}</td>
                  <td className="py-3 px-3 font-medium text-foreground text-xs">{l.song_title}</td>
                  <td className="py-3 px-3 text-muted-foreground text-xs">{l.performing_artist || '—'}</td>
                  <td className="py-3 px-3"><Badge variant="secondary" className="text-xs border-0">{l.diffusion_type || '—'}</Badge></td>
                  <td className="py-3 px-3 font-mono text-xs text-foreground">{l.usage_code || '—'}</td>
                  <td className="py-3 px-3 text-right text-foreground">{l.quantity}</td>
                  <td className="py-3 px-3 text-right text-foreground">{Number(l.weight)}</td>
                  <td className="py-3 px-3">
                    <Badge variant="secondary" className={l.matched ? 'bg-success/20 text-success border-0 text-xs' : 'bg-destructive/20 text-destructive border-0 text-xs'}>
                      {l.matched ? 'Matched' : 'Unmatched'}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right text-foreground font-medium">{l.allocation ? money(l.allocation) : '—'}</td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(l); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination table={table} />
      </div>

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit usage line' : 'Add usage line'}
        fields={fields}
        initial={editing ?? { quantity: 1, diffusion_type: 'Live' }}
        onSubmit={save}
      />

      <BulkEditDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        count={table.selected.length}
        fields={fields}
        onApply={(values) => {
          const payload = 'usage_code' in values
            ? { ...values, weight: weightFor(values.usage_code as string) }
            : values;
          updateMany.mutate({ ids: table.selected, values: payload });
        }}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Bulk import usage logs"
        description="Weights are applied automatically from the weighting engine using the usage_code column."
        templateName="usage-logs-template.xlsx"
        templateHeaders={['source', 'usage_date', 'isrc', 'recording_code', 'song_title', 'performing_artist', 'original_performer', 'diffusion_type', 'usage_code', 'quantity']}
        templateExample={['Harbour Jazz Festival', '2026-01-15', 'TTA012500001', 'SR-001', 'Island Breeze', 'Marcus Johnson', 'Marcus Johnson', 'Live', 'FTR', 1]}
        mapRow={(row) => {
          const title = toText(row.song_title ?? row.title ?? row.track);
          const isrc = toText(row.isrc);
          if (!title && !isrc) return null;
          const code = (toText(row.usage_code ?? row.code) || '').toUpperCase() || null;
          return {
            source: toText(row.source ?? row.licensee ?? row.venue),
            usage_date: toDate(row.usage_date ?? row.date),
            isrc,
            recording_code: toText(row.recording_code),
            song_title: title,
            performing_artist: toText(row.performing_artist ?? row.artist),
            original_performer: toText(row.original_performer),
            diffusion_type: toText(row.diffusion_type ?? row.type),
            usage_code: code,
            quantity: toNumber(row.quantity ?? row.plays) ?? 1,
            weight: weightFor(code),
            matched: false,
          };
        }}
        onImport={(mapped, onProgress) => insertMany.mutateAsync({ values: mapped, onProgress })}
      />
    </div>
  );
}
