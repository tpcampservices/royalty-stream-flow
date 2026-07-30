import { useState } from 'react';
import { Plus, Upload, Pencil, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import ImportDialog from '@/components/ImportDialog';
import { useTable } from '@/hooks/useTable';
import { Licensee, Pool, UsageLog, WeightingRule, money } from '@/lib/types';
import { exportRows, toDate, toNumber, toText } from '@/lib/importUtils';

export default function UsageLogsPage() {
  const { rows, isLoading, insert, insertMany, update, remove } = useTable<UsageLog>('usage_logs', 'usage_date', false);
  const { rows: pools } = useTable<Pool>('pools', 'period', true);
  const { rows: licensees } = useTable<Licensee>('licensees', 'name', true);
  const { rows: weights } = useTable<WeightingRule>('weighting_rules', 'code', true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<UsageLog | null>(null);
  const [search, setSearch] = useState('');

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

  const filtered = rows.filter((l) =>
    [l.song_title, l.performing_artist, l.isrc, l.source].some((v) => (v || '').toLowerCase().includes(search.toLowerCase())));

  const unmatched = rows.filter((l) => !l.matched).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{rows.length} log lines — {unmatched} unmatched</p>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search usage…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
          <Button variant="outline" onClick={() => exportRows('usage-logs.xlsx', rows)}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Bulk import</Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add line</Button>
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-3">Source</th>
              <th className="text-left py-3 px-3">Date</th>
              <th className="text-left py-3 px-3">ISRC</th>
              <th className="text-left py-3 px-3">Song title</th>
              <th className="text-left py-3 px-3">Artist</th>
              <th className="text-left py-3 px-3">Type</th>
              <th className="text-left py-3 px-3">Code</th>
              <th className="text-right py-3 px-3">Qty</th>
              <th className="text-right py-3 px-3">Weight</th>
              <th className="text-left py-3 px-3">Status</th>
              <th className="text-right py-3 px-3">Allocation</th>
              <th className="text-right py-3 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={12} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && !filtered.length && <tr><td colSpan={12} className="py-8 text-center text-muted-foreground">No usage logs yet — import a log file to begin.</td></tr>}
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
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

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit usage line' : 'Add usage line'}
        fields={fields}
        initial={editing ?? { quantity: 1, diffusion_type: 'Live' }}
        onSubmit={save}
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
        onImport={(mapped) => insertMany.mutateAsync(mapped)}
      />
    </div>
  );
}
