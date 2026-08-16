import { useState } from 'react';
import { Plus, Pencil, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import { useTable } from '@/hooks/useTable';
import { Currency, Pool, money, sourceTypeLabels, sourceTypeOptions } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { humanizeCatalogRole } from '@/lib/catalog';

const baseFields: FieldDef[] = [
  { key: 'name', label: 'Pool name', required: true },
  { key: 'source_type', label: 'Source type', type: 'select', options: sourceTypeOptions.map((v) => ({ value: v, label: sourceTypeLabels[v] })) },
  { key: 'rights_domain', label: 'Rights being distributed', type: 'select', options: [{ value: 'composition', label: 'Composition copyright' }, { value: 'master', label: 'Sound recording master' }] },
  { key: 'period', label: 'Period', required: true, placeholder: 'e.g. Q1 2026' },
  { key: 'status', label: 'Status', type: 'select', options: ['open', 'calculating', 'approved', 'paid'].map((v) => ({ value: v, label: v })) },
];

export default function PoolsPage() {
  const { currentRole } = useAuth();
  const { rows, isLoading, insert, update, remove } = useTable<Pool>('pools', 'period', true);
  const { rows: currencies } = useTable<Currency>('currencies', 'code', true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pool | null>(null);

  const fields: FieldDef[] = [
    ...baseFields.slice(0, 4),
    { key: 'currency_id', label: 'Pool currency', type: 'select', required: true, options: currencies.filter((currency) => currency.is_base).map((currency) => ({ value: currency.id, label: `${currency.code} — ${currency.name}` })) },
    ...baseFields.slice(4),
  ];

  const save = (values: Record<string, unknown>) => editing
    ? update.mutate({ id: editing.id, values })
    : insert.mutate(values);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">Financial totals are calculated from cleared collections and approved deductions.</p>
        <Button disabled={!currencies.some((currency) => currency.is_base)} onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add pool</Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {!isLoading && !rows.length && <div className="glass-card p-10 text-center text-muted-foreground text-sm">No pools yet — create a pool to start a distribution.</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((pool) => (
          <div key={pool.id} className="stat-card space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading font-semibold text-foreground">{pool.name || sourceTypeLabels[pool.source_type]}</h3>
                <p className="text-xs text-muted-foreground">{sourceTypeLabels[pool.source_type]} • {pool.period} • {humanizeCatalogRole(pool.rights_domain)} rights</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                pool.status === 'approved' || pool.status === 'paid' ? 'bg-success/20 text-success' :
                pool.status === 'calculating' ? 'bg-info/20 text-info' : 'bg-muted text-muted-foreground'}`}>
                {pool.status === 'approved' || pool.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {pool.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground block">Reconciled gross</span><span className="text-foreground font-semibold">{money(pool.gross_amount, currencies.find((currency) => currency.id === pool.currency_id)?.code)}</span></div>
              <div><span className="text-muted-foreground block">Net distributable</span><span className="text-foreground font-semibold">{money(pool.net_amount, currencies.find((currency) => currency.id === pool.currency_id)?.code)}</span></div>
              <div><span className="text-muted-foreground block">Weighted points</span><span className="text-foreground font-semibold">{Number(pool.total_weighted_points) || '—'}</span></div>
              <div><span className="text-muted-foreground block">Point value</span><span className="text-foreground font-semibold">{Number(pool.point_value) ? money(pool.point_value, currencies.find((currency) => currency.id === pool.currency_id)?.code) : '—'}</span></div>
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" size="icon" onClick={() => { setEditing(pool); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
              {currentRole === 'admin' && <Button variant="ghost" size="icon" onClick={() => remove.mutate(pool.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
            </div>
          </div>
        ))}
      </div>

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit pool' : 'Add pool'}
        fields={fields}
        initial={editing ?? { source_type: 'event', rights_domain: 'composition', status: 'open', currency_id: currencies.find((currency) => currency.is_base)?.id }}
        onSubmit={save}
      />
    </div>
  );
}
