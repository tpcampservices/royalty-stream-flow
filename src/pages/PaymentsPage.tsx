import { useState } from 'react';
import { Plus, Pencil, Trash2, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import { useTable } from '@/hooks/useTable';
import { Member, Payment, Pool, money, sourceTypeLabels } from '@/lib/types';
import { exportRows } from '@/lib/importUtils';

export default function PaymentsPage() {
  const { rows, isLoading, insert, update, remove } = useTable<Payment>('payments', 'created_at', false);
  const { rows: members } = useTable<Member>('members', 'name', true);
  const { rows: pools } = useTable<Pool>('pools', 'period', true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);

  const fields: FieldDef[] = [
    { key: 'member_id', label: 'Member', type: 'select', required: true, options: members.map((m) => ({ value: m.id, label: m.name })) },
    { key: 'pool_id', label: 'Pool', type: 'select', options: pools.map((p) => ({ value: p.id, label: `${p.name || sourceTypeLabels[p.source_type]} — ${p.period}` })) },
    { key: 'amount', label: 'Amount', type: 'number', required: true },
    { key: 'status', label: 'Status', type: 'select', options: ['pending', 'approved', 'paid', 'on hold'].map((v) => ({ value: v, label: v })) },
    { key: 'method', label: 'Payment method', type: 'select', options: ['Bank transfer', 'Cheque', 'Cash', 'Mobile wallet'].map((v) => ({ value: v, label: v })) },
    { key: 'reference', label: 'Reference' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const memberName = (id: string) => members.find((m) => m.id === id)?.name || 'Unknown member';
  const totalPending = rows.filter((p) => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const totalPaid = rows.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);

  const markPaid = (payment: Payment) =>
    update.mutate({ id: payment.id, values: { status: 'paid', paid_at: new Date().toISOString() } });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-2xl font-heading font-bold text-warning">{money(totalPending)}</p></div>
        <div className="stat-card"><p className="text-sm text-muted-foreground">Paid to date</p><p className="text-2xl font-heading font-bold text-success">{money(totalPaid)}</p></div>
        <div className="stat-card"><p className="text-sm text-muted-foreground">Payment records</p><p className="text-2xl font-heading font-bold text-foreground">{rows.length}</p></div>
      </div>

      <div className="glass-card">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <h3 className="font-heading font-semibold text-foreground">Member payments</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportRows('payments.xlsx', rows.map((p) => ({ member: memberName(p.member_id), amount: p.amount, status: p.status, method: p.method, reference: p.reference, paid_at: p.paid_at })))}>
              <Download className="w-4 h-4 mr-2" />Export
            </Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add payment</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-4">Member</th>
                <th className="text-left py-3 px-4">Pool</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Method</th>
                <th className="text-left py-3 px-4">Reference</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && !rows.length && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No payments yet — run a calculation and create member payments.</td></tr>}
              {rows.map((p) => {
                const pool = pools.find((x) => x.id === p.pool_id);
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{memberName(p.member_id)}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{pool ? `${pool.name || sourceTypeLabels[pool.source_type]} — ${pool.period}` : '—'}</td>
                    <td className="py-3 px-4 text-right text-foreground font-bold">{money(p.amount)}</td>
                    <td className="py-3 px-4 text-muted-foreground">{p.method || '—'}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{p.reference || '—'}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className={p.status === 'paid' ? 'bg-success/20 text-success border-0' : 'bg-warning/20 text-warning border-0'}>{p.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {p.status !== 'paid' && (
                        <Button variant="ghost" size="sm" onClick={() => markPaid(p)}><CheckCircle className="w-4 h-4 mr-1 text-success" />Pay</Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit payment' : 'Add payment'}
        fields={fields}
        initial={editing ?? { status: 'pending', amount: 0 }}
        onSubmit={(values) => editing ? update.mutate({ id: editing.id, values }) : insert.mutate(values)}
      />
    </div>
  );
}
