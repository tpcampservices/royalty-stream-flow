import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTable } from '@/hooks/useTable';
import {
  Currency,
  Licence,
  Licensee,
  Tariff,
  licenceTypes,
  money,
  sourceTypeLabels,
  sourceTypeOptions,
} from '@/lib/types';

const today = () => new Date().toISOString().slice(0, 10);
const statusClass = (status: string) => status === 'active'
  ? 'bg-success/20 text-success border-0'
  : status === 'draft' || status === 'pending'
    ? 'bg-muted text-muted-foreground border-0'
    : 'bg-destructive/20 text-destructive border-0';

export default function LicenseesPage() {
  const { currentRole } = useAuth();
  const licensees = useTable<Licensee>('licensees', 'name', true);
  const tariffs = useTable<Tariff>('tariffs', 'code', true);
  const licences = useTable<Licence>('licences', 'start_date', false);
  const { rows: currencies } = useTable<Currency>('currencies', 'code', true);
  const [licenseeDialog, setLicenseeDialog] = useState(false);
  const [tariffDialog, setTariffDialog] = useState(false);
  const [licenceDialog, setLicenceDialog] = useState(false);
  const [editingLicensee, setEditingLicensee] = useState<Licensee | null>(null);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [editingLicence, setEditingLicence] = useState<Licence | null>(null);

  const currencyById = useMemo(() => new Map(currencies.map((currency) => [currency.id, currency])), [currencies]);
  const licenseeById = useMemo(() => new Map(licensees.rows.map((licensee) => [licensee.id, licensee])), [licensees.rows]);
  const tariffById = useMemo(() => new Map(tariffs.rows.map((tariff) => [tariff.id, tariff])), [tariffs.rows]);

  const licenseeFields: FieldDef[] = [
    { key: 'name', label: 'Trading name', required: true },
    { key: 'legal_name', label: 'Legal name' },
    { key: 'registration_number', label: 'Registration / tax number' },
    { key: 'source_type', label: 'Business type', type: 'select', options: sourceTypeOptions.map((value) => ({ value, label: sourceTypeLabels[value] })) },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'pending', 'suspended', 'inactive'].map((value) => ({ value, label: value })) },
    { key: 'contact_email', label: 'Contact email', type: 'email' },
    { key: 'billing_email', label: 'Billing email', type: 'email' },
    { key: 'contact_phone', label: 'Contact phone' },
    { key: 'country_code', label: 'Country code', placeholder: 'TT' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const currencyOptions = currencies.filter((currency) => currency.active).map((currency) => ({
    value: currency.id,
    label: `${currency.code} — ${currency.name}`,
  }));
  const tariffFields: FieldDef[] = [
    { key: 'code', label: 'Tariff code', required: true },
    { key: 'name', label: 'Tariff name', required: true },
    { key: 'source_type', label: 'Source type', type: 'select', options: sourceTypeOptions.map((value) => ({ value, label: sourceTypeLabels[value] })) },
    { key: 'charging_basis', label: 'Charging basis', type: 'select', options: [
      { value: 'flat', label: 'Flat amount' },
      { value: 'percentage', label: 'Percentage' },
      { value: 'per_unit', label: 'Per unit' },
      { value: 'minimum_guarantee', label: 'Minimum guarantee' },
    ] },
    { key: 'currency_id', label: 'Currency', type: 'select', options: currencyOptions, required: true },
    { key: 'flat_amount', label: 'Flat amount', type: 'number' },
    { key: 'rate_percentage', label: 'Rate percentage', type: 'number' },
    { key: 'rate_per_unit', label: 'Rate per unit', type: 'number' },
    { key: 'minimum_fee', label: 'Minimum fee', type: 'number' },
    { key: 'effective_from', label: 'Effective from', type: 'date', required: true },
    { key: 'effective_to', label: 'Effective to', type: 'date' },
    { key: 'active', label: 'Availability', type: 'select', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];
  const licenceFields: FieldDef[] = [
    { key: 'licensee_id', label: 'Licensee', type: 'select', options: licensees.rows.map((licensee) => ({ value: licensee.id, label: licensee.name })), required: true },
    { key: 'licence_number', label: 'Licence number', required: true },
    { key: 'licence_type', label: 'Licence type', type: 'select', options: licenceTypes.map((value) => ({ value, label: value })), required: true },
    { key: 'tariff_id', label: 'Tariff', type: 'select', options: [{ value: '__none__', label: 'Custom terms (no tariff)' }, ...tariffs.rows.filter((tariff) => tariff.active).map((tariff) => ({ value: tariff.id, label: `${tariff.code} — ${tariff.name}` }))] },
    { key: 'currency_id', label: 'Billing currency', type: 'select', options: currencyOptions, required: true },
    { key: 'agreed_fee', label: 'Agreed fee / minimum', type: 'number' },
    { key: 'billing_frequency', label: 'Billing frequency', type: 'select', options: [
      { value: 'one_off', label: 'One-off' }, { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' }, { value: 'annually', label: 'Annually' },
    ] },
    { key: 'start_date', label: 'Start date', type: 'date', required: true },
    { key: 'end_date', label: 'End date', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['draft', 'active', 'suspended', 'expired', 'terminated'].map((value) => ({ value, label: value })) },
    { key: 'notes', label: 'Terms / notes', type: 'textarea' },
  ];

  const tariffPrice = (tariff: Tariff) => {
    const code = currencyById.get(tariff.currency_id)?.code;
    if (tariff.charging_basis === 'flat') return money(tariff.flat_amount, code);
    if (tariff.charging_basis === 'percentage') return `${Number(tariff.rate_percentage || 0)}%`;
    if (tariff.charging_basis === 'per_unit') return `${money(tariff.rate_per_unit, code)} / unit`;
    return `Minimum ${money(tariff.minimum_fee, code)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground">Licensing</h2>
        <p className="text-sm text-muted-foreground">Manage customers, approved pricing and the licence agreements that connect them.</p>
      </div>

      <Tabs defaultValue="licensees" className="space-y-4">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="licensees">Licensees</TabsTrigger>
          <TabsTrigger value="tariffs">Tariffs</TabsTrigger>
          <TabsTrigger value="licences">Licences</TabsTrigger>
        </TabsList>

        <TabsContent value="licensees" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{licensees.rows.length} customer records</p>
            <Button onClick={() => { setEditingLicensee(null); setLicenseeDialog(true); }}><Plus className="mr-2 h-4 w-4" />Add licensee</Button>
          </div>
          <div className="glass-card overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-border text-muted-foreground">
                <th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Billing contact</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {licensees.isLoading && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
                {!licensees.isLoading && !licensees.rows.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No licensees yet.</td></tr>}
                {licensees.rows.map((licensee) => <tr key={licensee.id} className="border-b border-border/50">
                  <td className="px-4 py-3"><span className="font-medium text-foreground">{licensee.name}</span><span className="block text-xs text-muted-foreground">{licensee.legal_name || licensee.registration_number || '—'}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{sourceTypeLabels[licensee.source_type] || licensee.source_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{licensee.billing_email || licensee.contact_email || '—'}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className={statusClass(licensee.status)}>{licensee.status}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingLicensee(licensee); setLicenseeDialog(true); }}><Pencil className="h-4 w-4" /></Button>{currentRole === 'admin' && <Button variant="ghost" size="icon" onClick={() => licensees.remove.mutate(licensee.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="tariffs" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Tariffs define approved pricing; agreements may override the fee.</p>
            <Button disabled={!currencies.length} onClick={() => { setEditingTariff(null); setTariffDialog(true); }}><Plus className="mr-2 h-4 w-4" />Add tariff</Button>
          </div>
          {!currencies.length && <div className="glass-card p-4 text-sm text-muted-foreground">Add a currency under Collections & Reconciliation before creating tariffs.</div>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {tariffs.rows.map((tariff) => <div key={tariff.id} className="stat-card space-y-3">
              <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-primary">{tariff.code}</p><h3 className="font-heading font-semibold text-foreground">{tariff.name}</h3></div><Badge variant="secondary" className={tariff.active ? statusClass('active') : statusClass('inactive')}>{tariff.active ? 'active' : 'inactive'}</Badge></div>
              <div className="grid grid-cols-2 gap-3 text-sm"><div><span className="block text-muted-foreground">Basis</span><span className="capitalize text-foreground">{tariff.charging_basis.replace(/_/g, ' ')}</span></div><div><span className="block text-muted-foreground">Rate</span><span className="text-foreground">{tariffPrice(tariff)}</span></div></div>
              <p className="text-xs text-muted-foreground">{sourceTypeLabels[tariff.source_type] || tariff.source_type} • from {tariff.effective_from}{tariff.effective_to ? ` to ${tariff.effective_to}` : ''}</p>
              <div className="flex justify-end"><Button variant="ghost" size="icon" onClick={() => { setEditingTariff(tariff); setTariffDialog(true); }}><Pencil className="h-4 w-4" /></Button>{currentRole === 'admin' && <Button variant="ghost" size="icon" onClick={() => tariffs.remove.mutate(tariff.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>
            </div>)}
            {!tariffs.rows.length && <div className="glass-card p-8 text-center text-sm text-muted-foreground md:col-span-2">No tariffs yet.</div>}
          </div>
        </TabsContent>

        <TabsContent value="licences" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{licences.rows.length} licence agreements</p>
            <Button disabled={!licensees.rows.length || !currencies.length} onClick={() => { setEditingLicence(null); setLicenceDialog(true); }}><Plus className="mr-2 h-4 w-4" />Add licence</Button>
          </div>
          <div className="glass-card overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b border-border text-muted-foreground">
                <th className="px-4 py-3 text-left">Licence</th><th className="px-4 py-3 text-left">Licensee</th><th className="px-4 py-3 text-left">Tariff</th><th className="px-4 py-3 text-left">Period</th><th className="px-4 py-3 text-right">Fee</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {licences.rows.map((licence) => <tr key={licence.id} className="border-b border-border/50">
                  <td className="px-4 py-3"><span className="font-mono text-xs text-primary">{licence.licence_number}</span><span className="block text-xs text-muted-foreground">{licence.licence_type}</span></td>
                  <td className="px-4 py-3 font-medium text-foreground">{licenseeById.get(licence.licensee_id)?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{licence.tariff_id ? tariffById.get(licence.tariff_id)?.code || 'Unknown' : 'Custom terms'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{licence.start_date} → {licence.end_date || 'open'}</td>
                  <td className="px-4 py-3 text-right text-foreground">{licence.agreed_fee === null ? 'Tariff rate' : money(licence.agreed_fee, currencyById.get(licence.currency_id)?.code)}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className={statusClass(licence.status)}>{licence.status}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingLicence(licence); setLicenceDialog(true); }}><Pencil className="h-4 w-4" /></Button>{currentRole === 'admin' && <Button variant="ghost" size="icon" onClick={() => licences.remove.mutate(licence.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</td>
                </tr>)}
                {!licences.rows.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No licence agreements yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <EntityDialog open={licenseeDialog} onOpenChange={setLicenseeDialog} title={editingLicensee ? 'Edit licensee' : 'Add licensee'} fields={licenseeFields} initial={editingLicensee ?? { source_type: 'radio', status: 'active', country_code: 'TT' }} onSubmit={(values) => editingLicensee ? licensees.update.mutate({ id: editingLicensee.id, values }) : licensees.insert.mutate(values)} />
      <EntityDialog open={tariffDialog} onOpenChange={setTariffDialog} title={editingTariff ? 'Edit tariff' : 'Add tariff'} fields={tariffFields} initial={editingTariff ?? { source_type: 'radio', charging_basis: 'flat', currency_id: currencies.find((currency) => currency.is_base)?.id, flat_amount: 0, minimum_fee: 0, effective_from: today(), active: true }} onSubmit={(values) => { const payload = { ...values, active: values.active === 'true' }; return editingTariff ? tariffs.update.mutate({ id: editingTariff.id, values: payload }) : tariffs.insert.mutate(payload); }} />
      <EntityDialog open={licenceDialog} onOpenChange={setLicenceDialog} title={editingLicence ? 'Edit licence' : 'Add licence'} fields={licenceFields} initial={editingLicence ? { ...editingLicence, tariff_id: editingLicence.tariff_id || '__none__' } : { tariff_id: '__none__', currency_id: currencies.find((currency) => currency.is_base)?.id, billing_frequency: 'annually', start_date: today(), status: 'draft' }} onSubmit={(values) => { const payload = { ...values, tariff_id: values.tariff_id === '__none__' ? null : values.tariff_id }; return editingLicence ? licences.update.mutate({ id: editingLicence.id, values: payload }) : licences.insert.mutate(payload); }} />
    </div>
  );
}
