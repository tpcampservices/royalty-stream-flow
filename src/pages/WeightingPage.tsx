import { useState } from 'react';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import ImportDialog from '@/components/ImportDialog';
import { useTable } from '@/hooks/useTable';
import { WeightingRule, sourceTypeLabels, sourceTypeOptions } from '@/lib/types';
import { toNumber, toText } from '@/lib/importUtils';

const fields: FieldDef[] = [
  { key: 'code', label: 'Usage code', required: true, placeholder: 'e.g. HDL' },
  { key: 'label', label: 'Description', required: true, full: true },
  { key: 'weight', label: 'Weight', type: 'number', required: true },
  { key: 'source_type', label: 'Source type', type: 'select', options: sourceTypeOptions.map((v) => ({ value: v, label: sourceTypeLabels[v] })) },
  { key: 'diffusion_type', label: 'Diffusion type', type: 'select', options: [{ value: 'Live', label: 'Live' }, { value: 'DJ', label: 'DJ' }, { value: 'Broadcast', label: 'Broadcast' }] },
];

export default function WeightingPage() {
  const { rows, isLoading, insert, insertMany, update, remove } = useTable<WeightingRule>('weighting_rules', 'code', true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<WeightingRule | null>(null);

  const grouped = rows.reduce((acc, r) => {
    (acc[r.source_type] ||= []).push(r);
    return acc;
  }, {} as Record<string, WeightingRule[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">Weighting codes decide how much each usage type is worth relative to others.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Bulk import</Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add rule</Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {!isLoading && !rows.length && (
        <div className="glass-card p-10 text-center text-muted-foreground text-sm">No weighting rules yet — add your first rule to power the calculation engine.</div>
      )}

      {Object.entries(grouped).map(([type, rules]) => (
        <div key={type} className="glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">{sourceTypeLabels[type] || type}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rules.map((r) => (
              <div key={r.id} className={`p-3 rounded-lg bg-muted/30 border border-border/50 ${r.active ? '' : 'opacity-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-primary text-sm font-bold">{r.code}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.label}</p>
                    {r.diffusion_type && <p className="text-[11px] text-muted-foreground mt-1">{r.diffusion_type}</p>}
                  </div>
                  <div className="text-2xl font-heading font-bold text-foreground">{Number(r.weight)}</div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={r.active} onCheckedChange={(v) => update.mutate({ id: r.id, values: { active: v } })} />
                    <span className="text-xs text-muted-foreground">{r.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit weighting rule' : 'Add weighting rule'}
        fields={fields}
        initial={editing ?? { source_type: 'event', weight: 1 }}
        onSubmit={(values) => editing ? update.mutate({ id: editing.id, values }) : insert.mutate(values)}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Bulk import weighting rules"
        templateName="weighting-rules-template.xlsx"
        templateHeaders={['code', 'label', 'weight', 'source_type', 'diffusion_type']}
        templateExample={['HDL', 'Headline Live Performance', 30, 'event', 'Live']}
        mapRow={(row) => {
          const code = toText(row.code ?? row.usage_code);
          if (!code) return null;
          return {
            code: code.toUpperCase(),
            label: toText(row.label ?? row.description) || code,
            weight: toNumber(row.weight) ?? 1,
            source_type: (toText(row.source_type) || 'event').toLowerCase(),
            diffusion_type: toText(row.diffusion_type),
          };
        }}
        onImport={(mapped) => insertMany.mutateAsync(mapped)}
      />
    </div>
  );
}
