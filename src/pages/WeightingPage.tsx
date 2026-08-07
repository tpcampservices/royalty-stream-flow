import { useState } from 'react';
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import ImportDialog from '@/components/ImportDialog';
import BulkEditDialog from '@/components/BulkEditDialog';
import { BulkBar, SelectTd, SelectTh, SortTh, TablePagination, TableToolbar } from '@/components/DataTableControls';
import { useTable } from '@/hooks/useTable';
import { useDataTable } from '@/hooks/useDataTable';
import { WeightingRule, sourceTypeLabels, sourceTypeOptions } from '@/lib/types';
import { exportRows, toNumber, toText } from '@/lib/importUtils';

const fields: FieldDef[] = [
  { key: 'code', label: 'Usage code', required: true, placeholder: 'e.g. HDL' },
  { key: 'label', label: 'Description', required: true, full: true },
  { key: 'weight', label: 'Weight', type: 'number', required: true },
  { key: 'source_type', label: 'Source type', type: 'select', options: sourceTypeOptions.map((v) => ({ value: v, label: sourceTypeLabels[v] })) },
  { key: 'diffusion_type', label: 'Diffusion type', type: 'select', options: [{ value: 'Live', label: 'Live' }, { value: 'DJ', label: 'DJ' }, { value: 'Broadcast', label: 'Broadcast' }] },
];

export default function WeightingPage() {
  const { rows, isLoading, insert, insertMany, update, updateMany, remove, removeMany } = useTable<WeightingRule>('weighting_rules', 'code', true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<WeightingRule | null>(null);

  const table = useDataTable<WeightingRule>({
    rows,
    searchKeys: ['code', 'label', 'diffusion_type'],
    initialSort: 'code',
    filters: [
      { key: 'source_type', label: 'Source', options: sourceTypeOptions, value: (r) => r.source_type },
      { key: 'diffusion_type', label: 'Diffusion', options: ['Live', 'DJ', 'Broadcast'], value: (r) => r.diffusion_type },
      { key: 'active', label: 'State', options: ['Active', 'Inactive'], value: (r) => (r.active ? 'Active' : 'Inactive') },
    ],
  });

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">Weighting codes decide how much each usage type is worth relative to others.</p>

      <TableToolbar table={table} searchPlaceholder="Search rules…">
        <Button variant="outline" onClick={() => exportRows('weighting-rules.xlsx', table.filtered)}><Download className="w-4 h-4 mr-2" />Export</Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Bulk import</Button>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add rule</Button>
      </TableToolbar>

      <BulkBar table={table}>
        <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Pencil className="w-4 h-4 mr-1" />Edit selected</Button>
        <Button variant="outline" size="sm" onClick={() => updateMany.mutate({ ids: table.selected, values: { active: true } })}>Activate</Button>
        <Button variant="outline" size="sm" onClick={() => updateMany.mutate({ ids: table.selected, values: { active: false } })}>Deactivate</Button>
        <Button variant="destructive" size="sm" onClick={() => { removeMany.mutate(table.selected); table.clearSelection(); }}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
      </BulkBar>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <SelectTh table={table} />
                <SortTh table={table} sortKey="code">Code</SortTh>
                <SortTh table={table} sortKey="label">Description</SortTh>
                <SortTh table={table} sortKey="source_type">Source</SortTh>
                <SortTh table={table} sortKey="diffusion_type">Diffusion</SortTh>
                <SortTh table={table} sortKey="weight" align="right">Weight</SortTh>
                <SortTh table={table} sortKey="active">State</SortTh>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && !table.total && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No weighting rules found — add your first rule to power the calculation engine.</td></tr>}
              {table.pageRows.map((r) => (
                <tr key={r.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${r.active ? '' : 'opacity-60'}`}>
                  <SelectTd table={table} id={r.id} />
                  <td className="py-3 px-4 font-mono text-primary font-bold">{r.code}</td>
                  <td className="py-3 px-4 text-foreground">{r.label}</td>
                  <td className="py-3 px-4 text-muted-foreground">{sourceTypeLabels[r.source_type] || r.source_type}</td>
                  <td className="py-3 px-4 text-muted-foreground">{r.diffusion_type || '—'}</td>
                  <td className="py-3 px-4 text-right font-heading font-bold text-foreground">{Number(r.weight)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={r.active} onCheckedChange={(v) => update.mutate({ id: r.id, values: { active: v } })} />
                      <span className="text-xs text-muted-foreground">{r.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
        title={editing ? 'Edit weighting rule' : 'Add weighting rule'}
        fields={fields}
        initial={editing ?? { source_type: 'event', weight: 1 }}
        onSubmit={(values) => editing ? update.mutate({ id: editing.id, values }) : insert.mutate(values)}
      />

      <BulkEditDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        count={table.selected.length}
        fields={fields}
        onApply={(values) => updateMany.mutate({ ids: table.selected, values })}
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
        onImport={(mapped, onProgress) => insertMany.mutateAsync({ values: mapped, onProgress })}
      />
    </div>
  );
}
