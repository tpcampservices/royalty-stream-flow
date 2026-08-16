import { useState } from 'react';
import { Plus, Upload, Pencil, Trash2, Download, Landmark, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import ImportDialog from '@/components/ImportDialog';
import BulkEditDialog from '@/components/BulkEditDialog';
import { BulkBar, SelectTd, SelectTh, SortTh, TablePagination, TableToolbar } from '@/components/DataTableControls';
import { useTable } from '@/hooks/useTable';
import { useDataTable } from '@/hooks/useDataTable';
import { Member, MemberPaymentDetails, MemberRole, memberRoles, money } from '@/lib/types';
import { exportRows, toText } from '@/lib/importUtils';
import { useAuth } from '@/contexts/AuthContext';
import PartyRolesDialog from '@/components/PartyRolesDialog';
import { humanizeCatalogRole } from '@/lib/catalog';

const fields: FieldDef[] = [
  { key: 'name', label: 'Full name / Entity', required: true },
  { key: 'legal_name', label: 'Legal name' },
  { key: 'member_code', label: 'Member code' },
  { key: 'entity_type', label: 'Party type', type: 'select', options: [{ value: 'person', label: 'Person' }, { value: 'organization', label: 'Organization' }] },
  { key: 'role', label: 'Primary capacity', type: 'select', options: memberRoles.map((role) => ({ value: role, label: humanizeCatalogRole(role) })) },
  { key: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'active' }, { value: 'inactive', label: 'inactive' }] },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'ipi_number', label: 'IPI / CAE number' },
  { key: 'isni', label: 'ISNI' },
  { key: 'ipn_number', label: 'IPN number' },
  { key: 'society_code', label: 'Society code / affiliation' },
  { key: 'country_code', label: 'Country code', placeholder: 'e.g. TT' },
  { key: 'address', label: 'Address' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const paymentFields: FieldDef[] = [
  { key: 'bank_name', label: 'Bank name' },
  { key: 'bank_account', label: 'Bank account' },
];

export default function MembersPage() {
  const { currentRole } = useAuth();
  const canDelete = currentRole === 'admin';
  const { rows, isLoading, insert, insertMany, update, updateMany, remove, removeMany } = useTable<Member>('members', 'name', true);
  const { rows: payments } = useTable<{ member_id: string; amount: number; status: string }>('payments');
  const paymentDetails = useTable<MemberPaymentDetails>('member_payment_details');
  const memberRolesTable = useTable<MemberRole>('member_roles');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [paymentMember, setPaymentMember] = useState<Member | null>(null);
  const [rolesMember, setRolesMember] = useState<Member | null>(null);

  const paid = (memberId: string) =>
    payments.filter((payment) => payment.member_id === memberId && payment.status === 'paid').reduce((sum, payment) => sum + Number(payment.amount), 0);

  const table = useDataTable<Member>({
    rows,
    searchKeys: ['name', 'email', 'member_code', 'role', 'ipi_number'],
    initialSort: 'name',
    filters: [
      { key: 'role', label: 'Role', options: memberRoles, value: (member) => member.role },
      { key: 'status', label: 'Status', options: ['active', 'inactive'], value: (member) => member.status },
    ],
  });

  const selectedPaymentDetails = paymentMember
    ? paymentDetails.rows.find((details) => details.member_id === paymentMember.id) ?? null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-muted-foreground text-sm">{rows.length} registered rights parties</p></div>

      <TableToolbar table={table} searchPlaceholder="Search rights parties…">
        <Button variant="outline" onClick={() => exportRows('rights-parties.xlsx', table.filtered)}><Download className="w-4 h-4 mr-2" />Export</Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Bulk import</Button>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add rights party</Button>
      </TableToolbar>

      <BulkBar table={table}>
        <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Pencil className="w-4 h-4 mr-1" />Edit selected</Button>
        <Button variant="outline" size="sm" onClick={() => updateMany.mutate({ ids: table.selected, values: { status: 'active' } })}>Mark active</Button>
        <Button variant="outline" size="sm" onClick={() => updateMany.mutate({ ids: table.selected, values: { status: 'inactive' } })}>Mark inactive</Button>
        {canDelete && <Button variant="destructive" size="sm" onClick={() => { removeMany.mutate(table.selected); table.clearSelection(); }}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>}
      </BulkBar>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead><tr className="border-b border-border text-muted-foreground"><SelectTh table={table} /><SortTh table={table} sortKey="member_code">Code</SortTh><SortTh table={table} sortKey="name">Name</SortTh><SortTh table={table} sortKey="entity_type">Type</SortTh><th className="text-left py-3 px-4">Catalog capacities</th><SortTh table={table} sortKey="email">Email</SortTh><SortTh table={table} sortKey="ipi_number">IPI / ISNI</SortTh><SortTh table={table} sortKey="status">Status</SortTh><th className="text-right py-3 px-4">Paid to date</th><th className="text-right py-3 px-4">Actions</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && !table.total && <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">No rights parties found — add one or import in bulk.</td></tr>}
              {table.pageRows.map((member) => (
                <tr key={member.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <SelectTd table={table} id={member.id} />
                  <td className="py-3 px-4 font-mono text-primary text-xs">{member.member_code || '—'}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{member.name}</td>
                  <td className="py-3 px-4 capitalize text-muted-foreground">{member.entity_type}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{memberRolesTable.rows.filter((item) => item.member_id === member.id).map((item) => humanizeCatalogRole(item.role)).join(', ') || humanizeCatalogRole(member.role)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{member.email || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs"><span className="block">{member.ipi_number || '—'}</span>{member.isni && <span className="block">ISNI {member.isni}</span>}</td>
                  <td className="py-3 px-4"><Badge variant="secondary" className={member.status === 'active' ? 'bg-success/20 text-success border-0' : ''}>{member.status}</Badge></td>
                  <td className="py-3 px-4 text-right text-foreground font-medium">{money(paid(member.id))}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" title="Catalog capacities" onClick={() => setRolesMember(member)}><Tags className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" title="Payment details" onClick={() => { setPaymentMember(member); setPaymentDialogOpen(true); }}><Landmark className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" title="Edit member" onClick={() => { setEditing(member); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    {canDelete && <Button variant="ghost" size="icon" title="Delete member" onClick={() => remove.mutate(member.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination table={table} />
      </div>

      <EntityDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? 'Edit rights party' : 'Add rights party'} fields={fields} initial={editing ?? { role: 'writer', entity_type: 'person', status: 'active' }} onSubmit={(values) => editing ? update.mutate({ id: editing.id, values }) : insert.mutate(values)} />
      <EntityDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} title={`Payment details${paymentMember ? ` — ${paymentMember.name}` : ''}`} fields={paymentFields} initial={selectedPaymentDetails ?? {}} onSubmit={(values) => {
        if (!paymentMember) return;
        if (selectedPaymentDetails) paymentDetails.update.mutate({ id: selectedPaymentDetails.id, values });
        else paymentDetails.insert.mutate({ ...values, member_id: paymentMember.id });
      }} />
      <BulkEditDialog open={bulkOpen} onOpenChange={setBulkOpen} count={table.selected.length} fields={fields} onApply={(values) => updateMany.mutate({ ids: table.selected, values })} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Bulk import rights parties"
        description="Column headings are matched automatically. Bank details are managed separately to keep them finance-only."
        templateName="rights-parties-template.xlsx"
        templateHeaders={['member_code', 'name', 'legal_name', 'entity_type', 'role', 'email', 'phone', 'ipi_number', 'isni', 'ipn_number', 'society_code', 'country_code', 'address', 'status', 'notes']}
        templateExample={['MEM-001', 'Jane Doe', 'Jane A. Doe', 'person', 'writer', 'jane@example.com', '868-000-0000', '00123456789', '', '', 'COTT', 'TT', 'Port of Spain', 'active', '']}
        mapRow={(row) => {
          const name = toText(row.name ?? row.full_name ?? row.member_name);
          if (!name) return null;
          return { name, legal_name: toText(row.legal_name), member_code: toText(row.member_code ?? row.code), entity_type: (toText(row.entity_type ?? row.party_type) || 'person').toLowerCase(), role: (toText(row.role ?? row.primary_capacity) || 'writer').toLowerCase(), email: toText(row.email), phone: toText(row.phone ?? row.telephone), ipi_number: toText(row.ipi_number ?? row.ipi ?? row.cae), isni: toText(row.isni), ipn_number: toText(row.ipn_number ?? row.ipn), society_code: toText(row.society_code ?? row.society), country_code: toText(row.country_code ?? row.country)?.toUpperCase() || null, address: toText(row.address), status: (toText(row.status) || 'active').toLowerCase(), notes: toText(row.notes) };
        }}
        onImport={(mapped, onProgress) => insertMany.mutateAsync({ values: mapped, onProgress })}
      />
      <PartyRolesDialog
        member={rolesMember}
        roles={rolesMember ? memberRolesTable.rows.filter((item) => item.member_id === rolesMember.id) : []}
        onClose={() => setRolesMember(null)}
        onAdd={(role) => rolesMember && memberRolesTable.insert.mutate({ member_id: rolesMember.id, role })}
        onRemove={(id) => memberRolesTable.remove.mutate(id)}
      />
    </div>
  );
}
