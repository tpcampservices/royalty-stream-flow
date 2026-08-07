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
import { Licensee, licenceTypes, money, sourceTypeLabels, sourceTypeOptions } from '@/lib/types';
import { exportRows, toDate, toNumber, toText } from '@/lib/importUtils';

const fields: FieldDef[] = [
  { key: 'name', label: 'Licensee name', required: true },
  { key: 'source_type', label: 'Source type', type: 'select', options: sourceTypeOptions.map((v) => ({ value: v, label: sourceTypeLabels[v] })) },
  { key: 'licence_type', label: 'Licence held', type: 'select', options: licenceTypes.map((v) => ({ value: v, label: v })) },
  { key: 'licence_number', label: 'Licence number' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'pending', 'expired', 'suspended'].map((v) => ({ value: v, label: v })) },
  { key: 'licence_fee', label: 'Licence fee', type: 'number' },
  { key: 'start_date', label: 'Licence start', type: 'date' },
  { key: 'end_date', label: 'Licence end', type: 'date' },
  { key: 'contact_email', label: 'Contact email', type: 'email' },
  { key: 'contact_phone', label: 'Contact phone' },
  { key: 'address', label: 'Address' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function LicenseesPage() {
  const { rows, isLoading, insert, insertMany, update, updateMany, remove, removeMany } = useTable<Licensee>('licensees', 'name', true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Licensee | null>(null);

  const table = useDataTable<Licensee>({
    rows,
    searchKeys: ['name', 'licence_type', 'licence_number', 'contact_email'],
    initialSort: 'name',
    filters: [
      { key: 'source_type', label: 'Source', options: sourceTypeOptions, value: (l) => l.source_type },
      { key: 'licence_type', label: 'Licence', options: licenceTypes, value: (l) => l.licence_type },
      { key: 'status', label: 'Status', options: ['active', 'pending', 'expired', 'suspended'], value: (l) => l.status },
    ],
  });

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{rows.length} licensees — total fees {money(rows.reduce((s, l) => s + Number(l.licence_fee), 0))}</p>

      <TableToolbar table={table} searchPlaceholder="Search licensees…">
        <Button variant="outline" onClick={() => exportRows('licensees.xlsx', table.filtered)}><Download className="w-4 h-4 mr-2" />Export</Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Bulk import</Button>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add licensee</Button>
      </TableToolbar>

      <BulkBar table={table}>
        <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Pencil className="w-4 h-4 mr-1" />Edit selected</Button>
        <Button variant="outline" size="sm" onClick={() => updateMany.mutate({ ids: table.selected, values: { status: 'active' } })}>Mark active</Button>
        <Button variant="outline" size="sm" onClick={() => updateMany.mutate({ ids: table.selected, values: { status: 'expired' } })}>Mark expired</Button>
        <Button variant="destructive" size="sm" onClick={() => { removeMany.mutate(table.selected); table.clearSelection(); }}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
      </BulkBar>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <SelectTh table={table} />
                <SortTh table={table} sortKey="name">Name</SortTh>
                <SortTh table={table} sortKey="source_type">Type</SortTh>
                <SortTh table={table} sortKey="licence_type">Licence held</SortTh>
                <SortTh table={table} sortKey="licence_number">Licence no.</SortTh>
                <SortTh table={table} sortKey="start_date">Period</SortTh>
                <SortTh table={table} sortKey="status">Status</SortTh>
                <SortTh table={table} sortKey="licence_fee" align="right">Fee</SortTh>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && !table.total && <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No licensees found — add one or import in bulk.</td></tr>}
              {table.pageRows.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <SelectTd table={table} id={l.id} />
                  <td className="py-3 px-4 font-medium text-foreground">{l.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{sourceTypeLabels[l.source_type] || l.source_type}</td>
                  <td className="py-3 px-4 text-muted-foreground">{l.licence_type || '—'}</td>
                  <td className="py-3 px-4 font-mono text-primary text-xs">{l.licence_number || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{l.start_date || '—'} → {l.end_date || '—'}</td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className={l.status === 'active' ? 'bg-success/20 text-success border-0' : 'bg-destructive/20 text-destructive border-0'}>{l.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right text-foreground font-medium">{money(l.licence_fee)}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
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
        title={editing ? 'Edit licensee' : 'Add licensee'}
        fields={fields}
        initial={editing ?? { source_type: 'radio', status: 'active', licence_fee: 0 }}
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
        title="Bulk import licensees"
        description="Include the licence each business actually holds in the licence_type column."
        templateName="licensees-template.xlsx"
        templateHeaders={['name', 'source_type', 'licence_type', 'licence_number', 'status', 'licence_fee', 'start_date', 'end_date', 'contact_email', 'contact_phone', 'address']}
        templateExample={['Caribbean FM 101.5', 'radio', 'Broadcast Licence', 'LIC-2025-001', 'active', 25000, '2025-01-01', '2025-12-31', 'admin@caribbeanfm.tt', '868-000-0000', 'Port of Spain']}
        mapRow={(row) => {
          const name = toText(row.name ?? row.licensee ?? row.licensee_name);
          if (!name) return null;
          return {
            name,
            source_type: (toText(row.source_type ?? row.type) || 'radio').toLowerCase(),
            licence_type: toText(row.licence_type ?? row.license_type ?? row.licence),
            licence_number: toText(row.licence_number ?? row.license_number),
            status: (toText(row.status) || 'active').toLowerCase(),
            licence_fee: toNumber(row.licence_fee ?? row.license_fee ?? row.fee) ?? 0,
            start_date: toDate(row.start_date),
            end_date: toDate(row.end_date ?? row.expiry_date),
            contact_email: toText(row.contact_email ?? row.email),
            contact_phone: toText(row.contact_phone ?? row.phone),
            address: toText(row.address),
          };
        }}
        onImport={(mapped, onProgress) => insertMany.mutateAsync({ values: mapped, onProgress })}
      />
    </div>
  );
}
