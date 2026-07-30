import { useState } from 'react';
import { Plus, Upload, Pencil, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import ImportDialog from '@/components/ImportDialog';
import { useTable } from '@/hooks/useTable';
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
  const { rows, isLoading, insert, insertMany, update, remove } = useTable<Licensee>('licensees', 'name', true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Licensee | null>(null);
  const [search, setSearch] = useState('');

  const filtered = rows.filter((l) =>
    [l.name, l.licence_type, l.licence_number].some((v) => (v || '').toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">{rows.length} licensees — total fees {money(rows.reduce((s, l) => s + Number(l.licence_fee), 0))}</p>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search licensees…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
          <Button variant="outline" onClick={() => exportRows('licensees.xlsx', rows)}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Bulk import</Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add licensee</Button>
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Licence held</th>
              <th className="text-left py-3 px-4">Licence no.</th>
              <th className="text-left py-3 px-4">Period</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Fee</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && !filtered.length && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No licensees yet — add one or import in bulk.</td></tr>}
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
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

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit licensee' : 'Add licensee'}
        fields={fields}
        initial={editing ?? { source_type: 'radio', status: 'active', licence_fee: 0 }}
        onSubmit={(values) => editing ? update.mutate({ id: editing.id, values }) : insert.mutate(values)}
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
        onImport={(mapped) => insertMany.mutateAsync(mapped)}
      />
    </div>
  );
}
