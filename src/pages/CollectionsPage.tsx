import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LockKeyhole, Pencil, Plus, ReceiptText, RefreshCw, Trash2 } from 'lucide-react';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTable } from '@/hooks/useTable';
import { supabase } from '@/integrations/supabase/client';
import {
  Collection,
  CollectionAllocation,
  Currency,
  ExchangeRate,
  Invoice,
  InvoiceLine,
  Licence,
  Licensee,
  Pool,
  PoolCollectionAllocation,
  PoolDeduction,
  PoolReconciliation,
  Receipt,
  Tariff,
  money,
  sourceTypeLabels,
} from '@/lib/types';

const today = () => new Date().toISOString().slice(0, 10);
const statusTone = (status: string) => ['paid', 'cleared', 'issued', 'reconciled', 'active', 'approved'].includes(status)
  ? 'bg-success/20 text-success border-0'
  : ['void', 'reversed', 'overdue', 'locked', 'rejected'].includes(status)
    ? 'bg-destructive/20 text-destructive border-0'
    : 'bg-muted text-muted-foreground border-0';
const invoiceStatus = (invoice: Invoice) => invoice.status !== 'void' && invoice.status !== 'paid' && invoice.balance_due > 0 && invoice.due_date < today()
  ? 'overdue'
  : invoice.status;

export default function CollectionsPage() {
  const { currentRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currencies = useTable<Currency>('currencies', 'code', true);
  const rates = useTable<ExchangeRate>('exchange_rates', 'effective_date', false);
  const { rows: licensees } = useTable<Licensee>('licensees', 'name', true);
  const { rows: licences } = useTable<Licence>('licences', 'start_date', false);
  const { rows: tariffs } = useTable<Tariff>('tariffs', 'code', true);
  const invoices = useTable<Invoice>('invoices', 'issue_date', false);
  const lines = useTable<InvoiceLine>('invoice_lines', 'created_at', true);
  const collections = useTable<Collection>('collections', 'collection_date', false);
  const allocations = useTable<CollectionAllocation>('collection_allocations', 'created_at', true);
  const receipts = useTable<Receipt>('receipts', 'issued_at', false);
  const { rows: pools } = useTable<Pool>('pools', 'period', false);
  const deductions = useTable<PoolDeduction>('pool_deductions', 'incurred_date', false);
  const poolAllocations = useTable<PoolCollectionAllocation>('pool_collection_allocations', 'created_at', true);
  const { rows: reconciliations } = useTable<PoolReconciliation>('pool_reconciliations', 'reconciled_at', false);

  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [lineDialog, setLineDialog] = useState(false);
  const [collectionDialog, setCollectionDialog] = useState(false);
  const [allocationDialog, setAllocationDialog] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [deductionDialog, setDeductionDialog] = useState(false);
  const [poolAllocationDialog, setPoolAllocationDialog] = useState(false);
  const [currencyDialog, setCurrencyDialog] = useState(false);
  const [rateDialog, setRateDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingLine, setEditingLine] = useState<InvoiceLine | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editingDeduction, setEditingDeduction] = useState<PoolDeduction | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const currencyById = useMemo(() => new Map(currencies.rows.map((row) => [row.id, row])), [currencies.rows]);
  const licenseeById = useMemo(() => new Map(licensees.map((row) => [row.id, row])), [licensees]);
  const licenceById = useMemo(() => new Map(licences.map((row) => [row.id, row])), [licences]);
  const invoiceById = useMemo(() => new Map(invoices.rows.map((row) => [row.id, row])), [invoices.rows]);
  const poolById = useMemo(() => new Map(pools.map((row) => [row.id, row])), [pools]);
  const receiptByCollection = useMemo(() => new Map(receipts.rows.map((row) => [row.collection_id, row])), [receipts.rows]);
  const reconciliationByPool = useMemo(() => new Map(reconciliations.map((row) => [row.pool_id, row])), [reconciliations]);
  const baseCurrency = currencies.rows.find((row) => row.is_base);
  const currencyOptions = currencies.rows.filter((row) => row.active).map((row) => ({ value: row.id, label: `${row.code} — ${row.name}` }));
  const invoiceOptions = invoices.rows.filter((row) => row.status !== 'void' && row.balance_due > 0).map((row) => ({ value: row.id, label: `${row.invoice_number} — ${money(row.balance_due, currencyById.get(row.currency_id)?.code)} due` }));
  const clearedCollectionOptions = collections.rows.filter((row) => row.status === 'cleared').map((row) => ({ value: row.id, label: `${row.reference || row.collection_date} — ${money(row.amount, currencyById.get(row.currency_id)?.code)}` }));

  const invoiceFields: FieldDef[] = [
    { key: 'licence_id', label: 'Licence', type: 'select', required: true, options: licences.map((row) => ({ value: row.id, label: `${row.licence_number} — ${licenseeById.get(row.licensee_id)?.name || 'Licensee'}` })) },
    { key: 'invoice_number', label: 'Invoice number', required: true },
    { key: 'issue_date', label: 'Issue date', type: 'date', required: true },
    { key: 'due_date', label: 'Due date', type: 'date', required: true },
    { key: 'currency_id', label: 'Currency', type: 'select', required: true, options: currencyOptions },
    { key: 'status', label: 'Status', type: 'select', options: ['draft', 'issued', 'void'].map((value) => ({ value, label: value })) },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];
  const lineFields: FieldDef[] = [
    { key: 'invoice_id', label: 'Invoice', type: 'select', required: true, options: invoices.rows.filter((row) => row.status !== 'void').map((row) => ({ value: row.id, label: row.invoice_number })) },
    { key: 'tariff_id', label: 'Tariff', type: 'select', options: tariffs.map((row) => ({ value: row.id, label: `${row.code} — ${row.name}` })) },
    { key: 'description', label: 'Description', required: true, full: true },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true },
    { key: 'unit_price', label: 'Unit price', type: 'number', required: true },
    { key: 'tax_rate', label: 'Tax rate (%)', type: 'number' },
  ];
  const collectionFields: FieldDef[] = [
    { key: 'licensee_id', label: 'Licensee', type: 'select', required: true, options: licensees.map((row) => ({ value: row.id, label: row.name })) },
    { key: 'collection_date', label: 'Collection date', type: 'date', required: true },
    { key: 'amount', label: 'Amount received', type: 'number', required: true },
    { key: 'currency_id', label: 'Currency', type: 'select', required: true, options: currencyOptions },
    { key: 'exchange_rate_to_base', label: `Exchange rate to ${baseCurrency?.code || 'base'}`, type: 'number', required: true },
    { key: 'method', label: 'Method', type: 'select', options: ['bank_transfer', 'cash', 'cheque', 'card', 'online', 'other'].map((value) => ({ value, label: value.replace(/_/g, ' ') })) },
    { key: 'reference', label: 'Bank / transaction reference' },
    { key: 'status', label: 'Status', type: 'select', options: ['pending', 'cleared', 'reversed'].map((value) => ({ value, label: value })) },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];
  const allocationFields: FieldDef[] = [
    { key: 'collection_id', label: 'Cleared collection', type: 'select', required: true, options: clearedCollectionOptions },
    { key: 'invoice_id', label: 'Invoice', type: 'select', required: true, options: invoiceOptions },
    { key: 'collection_amount', label: 'Amount from collection currency', type: 'number', required: true },
    { key: 'invoice_amount', label: 'Amount in invoice currency', type: 'number', required: true },
    { key: 'exchange_rate', label: 'Collection-to-invoice exchange rate', type: 'number', required: true },
  ];
  const receiptFields: FieldDef[] = [
    { key: 'collection_id', label: 'Cleared collection', type: 'select', required: true, options: clearedCollectionOptions.filter((option) => !receiptByCollection.has(option.value)) },
    { key: 'receipt_number', label: 'Receipt number', required: true },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'issued', label: 'Issued' }, { value: 'void', label: 'Void' }] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];
  const poolAllocationFields: FieldDef[] = [
    { key: 'collection_id', label: 'Cleared collection', type: 'select', required: true, options: clearedCollectionOptions },
    { key: 'pool_id', label: 'Distribution pool', type: 'select', required: true, options: pools.map((row) => ({ value: row.id, label: `${row.name || sourceTypeLabels[row.source_type]} — ${row.period}` })) },
    { key: 'amount_base', label: `Amount in ${baseCurrency?.code || 'base currency'}`, type: 'number', required: true },
  ];
  const deductionFields: FieldDef[] = [
    { key: 'pool_id', label: 'Distribution pool', type: 'select', required: true, options: pools.map((row) => ({ value: row.id, label: `${row.name || sourceTypeLabels[row.source_type]} — ${row.period}` })) },
    { key: 'category', label: 'Category', type: 'select', options: ['administration', 'tax', 'bank_fee', 'social_cultural', 'adjustment', 'other'].map((value) => ({ value, label: value.replace(/_/g, ' ') })) },
    { key: 'description', label: 'Description', required: true, full: true },
    { key: 'amount', label: 'Amount', type: 'number', required: true },
    { key: 'currency_id', label: 'Currency', type: 'select', required: true, options: currencyOptions },
    { key: 'exchange_rate_to_base', label: `Exchange rate to ${baseCurrency?.code || 'base'}`, type: 'number', required: true },
    { key: 'incurred_date', label: 'Incurred date', type: 'date', required: true },
    { key: 'status', label: 'Approval', type: 'select', options: ['draft', 'approved', 'rejected'].map((value) => ({ value, label: value })) },
    { key: 'reference', label: 'Reference' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];
  const currencyFields: FieldDef[] = [
    { key: 'code', label: 'ISO code', required: true, placeholder: 'USD' },
    { key: 'name', label: 'Currency name', required: true },
    { key: 'symbol', label: 'Symbol', required: true },
    { key: 'decimal_places', label: 'Decimal places', type: 'number', required: true },
    { key: 'is_base', label: 'Base currency', type: 'select', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
    { key: 'active', label: 'Active', type: 'select', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
  ];
  const rateFields: FieldDef[] = [
    { key: 'from_currency_id', label: 'From currency', type: 'select', required: true, options: currencyOptions },
    { key: 'to_currency_id', label: 'To currency', type: 'select', required: true, options: currencyOptions },
    { key: 'rate', label: 'Exchange rate', type: 'number', required: true },
    { key: 'effective_date', label: 'Effective date', type: 'date', required: true },
    { key: 'source', label: 'Rate source' },
  ];

  const reconcile = useMutation({
    mutationFn: async ({ poolId, lock }: { poolId: string; lock: boolean }) => {
      const { error } = await supabase.rpc('reconcile_pool', { target_pool_id: poolId, lock_result: lock });
      if (error) throw error;
    },
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pools'] }),
        queryClient.invalidateQueries({ queryKey: ['pool_reconciliations'] }),
      ]);
      toast({ title: 'Pool reconciled', description: 'Financial totals were recalculated from cleared collections and approved deductions.' });
    },
    onError: (error) => toast({ title: 'Reconciliation failed', description: error instanceof Error ? error.message : 'Something went wrong', variant: 'destructive' }),
  });

  const licenceLabel = (licenceId: string) => {
    const licence = licenceById.get(licenceId);
    return licence ? `${licence.licence_number} — ${licenseeById.get(licence.licensee_id)?.name || 'Licensee'}` : 'Unknown licence';
  };

  const removeInvoiceLine = async (id: string) => {
    try {
      await lines.remove.mutateAsync(id);
      await invoices.invalidate();
    } catch {
      // The table hook already presents the database error.
    }
  };
  const removeInvoiceAllocation = async (id: string) => {
    try {
      await allocations.remove.mutateAsync(id);
      await invoices.invalidate();
    } catch {
      // The table hook already presents the database error.
    }
  };
  const removeDeduction = async (id: string) => {
    try {
      await deductions.remove.mutateAsync(id);
      await queryClient.invalidateQueries({ queryKey: ['pool_reconciliations'] });
    } catch {
      // The table hook already presents the database error.
    }
  };
  const removePoolAllocation = async (id: string) => {
    try {
      await poolAllocations.remove.mutateAsync(id);
      await queryClient.invalidateQueries({ queryKey: ['pool_reconciliations'] });
    } catch {
      // The table hook already presents the database error.
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground">Collections & reconciliation</h2>
        <p className="text-sm text-muted-foreground">Invoice licensees, record incoming money, issue receipts and build auditable distribution pools.</p>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 lg:grid-cols-4">
          <TabsTrigger value="invoices">Invoices</TabsTrigger><TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="reconciliation">Pool reconciliation</TabsTrigger><TabsTrigger value="currencies">Currencies</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Invoice totals come from line items and cannot be typed manually.</p><Button disabled={!licences.length || !currencies.rows.length} onClick={() => { setEditingInvoice(null); setInvoiceDialog(true); }}><Plus className="mr-2 h-4 w-4" />New invoice</Button></div>
          <div className="glass-card overflow-x-auto"><table className="w-full min-w-[960px] text-sm">
            <thead><tr className="border-b border-border text-muted-foreground"><th className="px-4 py-3 text-left">Invoice</th><th className="px-4 py-3 text-left">Licence</th><th className="px-4 py-3 text-left">Due</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>{invoices.rows.map((invoice) => <tr key={invoice.id} className="border-b border-border/50"><td className="px-4 py-3 font-mono text-xs text-primary">{invoice.invoice_number}</td><td className="px-4 py-3 text-foreground">{licenceLabel(invoice.licence_id)}</td><td className="px-4 py-3 text-muted-foreground">{invoice.due_date}</td><td className="px-4 py-3 text-right">{money(invoice.total_amount, currencyById.get(invoice.currency_id)?.code)}</td><td className="px-4 py-3 text-right font-medium">{money(invoice.balance_due, currencyById.get(invoice.currency_id)?.code)}</td><td className="px-4 py-3"><Badge className={statusTone(invoiceStatus(invoice))}>{invoiceStatus(invoice)}</Badge></td><td className="px-4 py-3 text-right whitespace-nowrap"><Button variant={selectedInvoiceId === invoice.id ? 'secondary' : 'ghost'} size="sm" onClick={() => setSelectedInvoiceId(selectedInvoiceId === invoice.id ? null : invoice.id)}>Lines</Button><Button variant="ghost" size="icon" onClick={() => { setEditingInvoice(invoice); setInvoiceDialog(true); }}><Pencil className="h-4 w-4" /></Button>{currentRole === 'admin' && <Button variant="ghost" size="icon" onClick={() => invoices.remove.mutate(invoice.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</td></tr>)}{!invoices.rows.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No invoices yet.</td></tr>}</tbody>
          </table></div>
          {selectedInvoiceId && <div className="glass-card p-5 space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-heading font-semibold text-foreground">Line items — {invoiceById.get(selectedInvoiceId)?.invoice_number}</h3><p className="text-xs text-muted-foreground">Tax and totals recalculate automatically.</p></div><Button size="sm" onClick={() => { setEditingLine(null); setLineDialog(true); }}><Plus className="mr-2 h-4 w-4" />Add line</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="py-2 text-left">Description</th><th className="py-2 text-right">Quantity</th><th className="py-2 text-right">Unit</th><th className="py-2 text-right">Tax</th><th className="py-2 text-right">Total</th><th /></tr></thead><tbody>{lines.rows.filter((line) => line.invoice_id === selectedInvoiceId).map((line) => <tr key={line.id} className="border-b border-border/50"><td className="py-2 text-foreground">{line.description}</td><td className="py-2 text-right">{Number(line.quantity)}</td><td className="py-2 text-right">{money(line.unit_price, currencyById.get(invoiceById.get(line.invoice_id)?.currency_id || '')?.code)}</td><td className="py-2 text-right">{Number(line.tax_rate)}%</td><td className="py-2 text-right font-medium">{money(line.line_total, currencyById.get(invoiceById.get(line.invoice_id)?.currency_id || '')?.code)}</td><td className="py-2 text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingLine(line); setLineDialog(true); }}><Pencil className="h-4 w-4" /></Button>{currentRole === 'admin' && <Button variant="ghost" size="icon" onClick={() => void removeInvoiceLine(line.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</td></tr>)}{!lines.rows.some((line) => line.invoice_id === selectedInvoiceId) && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No line items yet.</td></tr>}</tbody></table></div></div>}
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Incoming collections are allocated to invoices; receipts are only issued after clearance.</p><div className="flex gap-2"><Button variant="outline" disabled={!clearedCollectionOptions.length || !invoiceOptions.length} onClick={() => setAllocationDialog(true)}><CheckCircle2 className="mr-2 h-4 w-4" />Allocate</Button><Button variant="outline" disabled={!receiptFields[0].options?.length} onClick={() => setReceiptDialog(true)}><ReceiptText className="mr-2 h-4 w-4" />Issue receipt</Button><Button disabled={!licensees.length || !currencies.rows.length} onClick={() => { setEditingCollection(null); setCollectionDialog(true); }}><Plus className="mr-2 h-4 w-4" />Record collection</Button></div></div>
          <div className="glass-card overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="px-4 py-3 text-left">Date / reference</th><th className="px-4 py-3 text-left">Licensee</th><th className="px-4 py-3 text-right">Received</th><th className="px-4 py-3 text-right">Base amount</th><th className="px-4 py-3 text-left">Receipt</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{collections.rows.map((collection) => { const receipt = receiptByCollection.get(collection.id); return <tr key={collection.id} className="border-b border-border/50"><td className="px-4 py-3"><span className="text-foreground">{collection.collection_date}</span><span className="block font-mono text-xs text-muted-foreground">{collection.reference || 'No reference'}</span></td><td className="px-4 py-3 text-foreground">{licenseeById.get(collection.licensee_id)?.name || 'Unknown'}</td><td className="px-4 py-3 text-right">{money(collection.amount, currencyById.get(collection.currency_id)?.code)}</td><td className="px-4 py-3 text-right">{money(collection.base_amount, baseCurrency?.code)}</td><td className="px-4 py-3"><span className="font-mono text-xs text-primary">{receipt?.receipt_number || '—'}</span>{receipt && <Badge className={`ml-2 ${statusTone(receipt.status)}`}>{receipt.status}</Badge>}{receipt?.status === 'issued' && <Button variant="ghost" size="sm" className="ml-1 h-7" onClick={() => receipts.update.mutate({ id: receipt.id, values: { status: 'void' } })}>Void</Button>}</td><td className="px-4 py-3"><Badge className={statusTone(collection.status)}>{collection.status}</Badge></td><td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingCollection(collection); setCollectionDialog(true); }}><Pencil className="h-4 w-4" /></Button>{currentRole === 'admin' && <Button variant="ghost" size="icon" onClick={() => collections.remove.mutate(collection.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</td></tr>; })}{!collections.rows.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No incoming collections yet.</td></tr>}</tbody></table></div>
          {!!allocations.rows.length && <div className="glass-card p-5"><h3 className="mb-3 font-heading font-semibold text-foreground">Invoice allocations</h3><div className="space-y-2">{allocations.rows.map((allocation) => <div key={allocation.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2 text-sm"><span className="text-muted-foreground">{invoiceById.get(allocation.invoice_id)?.invoice_number || 'Invoice'} receives {money(allocation.invoice_amount, currencyById.get(invoiceById.get(allocation.invoice_id)?.currency_id || '')?.code)}</span>{currentRole === 'admin' && <Button variant="ghost" size="icon" onClick={() => void removeInvoiceAllocation(allocation.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>)}</div></div>}
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={!clearedCollectionOptions.length || !pools.length} onClick={() => setPoolAllocationDialog(true)}><Plus className="mr-2 h-4 w-4" />Allocate collection to pool</Button><Button variant="outline" disabled={!pools.length || !currencies.rows.length} onClick={() => { setEditingDeduction(null); setDeductionDialog(true); }}><Plus className="mr-2 h-4 w-4" />Add deduction</Button></div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{pools.map((pool) => { const reconciliation = reconciliationByPool.get(pool.id); const code = currencyById.get(pool.currency_id || '')?.code || baseCurrency?.code; const locked = reconciliation?.status === 'locked'; return <div key={pool.id} className="stat-card space-y-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-heading font-semibold text-foreground">{pool.name || sourceTypeLabels[pool.source_type]}</h3><p className="text-xs text-muted-foreground">{pool.period} • {pool.rights_domain} rights</p></div><Badge className={statusTone(reconciliation?.status || 'draft')}>{reconciliation?.status || 'not reconciled'}</Badge></div><div className="grid grid-cols-3 gap-3 text-sm"><div><span className="block text-muted-foreground">Cleared</span><strong className="text-foreground">{money(reconciliation?.collections_total ?? pool.gross_amount, code)}</strong></div><div><span className="block text-muted-foreground">Deductions</span><strong className="text-foreground">{money(reconciliation?.deductions_total ?? pool.deductions, code)}</strong></div><div><span className="block text-muted-foreground">Net pool</span><strong className="text-foreground">{money(reconciliation?.net_distributable ?? pool.net_amount, code)}</strong></div></div><div className="text-xs text-muted-foreground">{poolAllocations.rows.filter((row) => row.pool_id === pool.id).length} collection allocations • {deductions.rows.filter((row) => row.pool_id === pool.id && row.status === 'approved').length} approved deductions{reconciliation ? ` • variance ${money(reconciliation.variance, code)}` : ''}</div><div className="flex justify-end gap-2"><Button variant="outline" size="sm" disabled={locked || reconcile.isPending} onClick={() => reconcile.mutate({ poolId: pool.id, lock: false })}><RefreshCw className="mr-2 h-4 w-4" />Reconcile</Button><Button size="sm" disabled={locked || reconcile.isPending} onClick={() => reconcile.mutate({ poolId: pool.id, lock: true })}><LockKeyhole className="mr-2 h-4 w-4" />Reconcile & lock</Button></div></div>; })}{!pools.length && <div className="glass-card p-8 text-center text-sm text-muted-foreground xl:col-span-2">Create a distribution pool before reconciling collections.</div>}</div>
          {!!poolAllocations.rows.length && <div className="glass-card p-5"><h3 className="mb-3 font-heading font-semibold text-foreground">Pool funding allocations</h3><div className="space-y-2">{poolAllocations.rows.map((allocation) => <div key={allocation.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-2 text-sm"><span className="text-muted-foreground">{poolById.get(allocation.pool_id)?.name || poolById.get(allocation.pool_id)?.period || 'Pool'} receives {money(allocation.amount_base, baseCurrency?.code)}</span>{currentRole === 'admin' && <Button variant="ghost" size="icon" onClick={() => void removePoolAllocation(allocation.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>)}</div></div>}
          {!!deductions.rows.length && <div className="glass-card p-5"><h3 className="mb-3 font-heading font-semibold text-foreground">Deductions</h3><div className="space-y-2">{deductions.rows.map((deduction) => <div key={deduction.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-2 text-sm"><div><span className="text-foreground">{deduction.description}</span><span className="ml-2 text-xs text-muted-foreground">{poolById.get(deduction.pool_id)?.period} • {deduction.category.replace(/_/g, ' ')}</span></div><div className="flex items-center gap-2"><span>{money(deduction.base_amount, baseCurrency?.code)}</span><Badge className={statusTone(deduction.status)}>{deduction.status}</Badge><Button variant="ghost" size="icon" onClick={() => { setEditingDeduction(deduction); setDeductionDialog(true); }}><Pencil className="h-4 w-4" /></Button>{currentRole === 'admin' && <Button variant="ghost" size="icon" onClick={() => void removeDeduction(deduction.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div>)}</div></div>}
        </TabsContent>

        <TabsContent value="currencies" className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={currencies.rows.length < 2} onClick={() => setRateDialog(true)}><Plus className="mr-2 h-4 w-4" />Add exchange rate</Button><Button onClick={() => { setEditingCurrency(null); setCurrencyDialog(true); }}><Plus className="mr-2 h-4 w-4" />Add currency</Button></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{currencies.rows.map((currency) => <div key={currency.id} className="stat-card"><div className="flex items-start justify-between"><div><p className="font-heading text-xl font-bold text-foreground">{currency.code}</p><p className="text-sm text-muted-foreground">{currency.name} ({currency.symbol})</p></div>{currency.is_base && <Badge className={statusTone('active')}>base</Badge>}</div><div className="mt-3 flex justify-end"><Button variant="ghost" size="icon" onClick={() => { setEditingCurrency(currency); setCurrencyDialog(true); }}><Pencil className="h-4 w-4" /></Button>{currentRole === 'admin' && !currency.is_base && <Button variant="ghost" size="icon" onClick={() => currencies.remove.mutate(currency.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div>)}</div>
          {!!rates.rows.length && <div className="glass-card p-5"><h3 className="mb-3 font-heading font-semibold text-foreground">Exchange rate history</h3><div className="space-y-2">{rates.rows.map((rate) => <div key={rate.id} className="flex items-center justify-between border-b border-border/50 pb-2 text-sm"><span className="text-foreground">{currencyById.get(rate.from_currency_id)?.code} → {currencyById.get(rate.to_currency_id)?.code}</span><span className="text-muted-foreground">{Number(rate.rate)} on {rate.effective_date}{rate.source ? ` • ${rate.source}` : ''}</span></div>)}</div></div>}
        </TabsContent>
      </Tabs>

      <EntityDialog open={invoiceDialog} onOpenChange={setInvoiceDialog} title={editingInvoice ? 'Edit invoice' : 'New invoice'} fields={invoiceFields} initial={editingInvoice ?? { issue_date: today(), due_date: today(), currency_id: baseCurrency?.id, status: 'draft' }} onSubmit={(values) => editingInvoice ? invoices.update.mutate({ id: editingInvoice.id, values }) : invoices.insert.mutate(values)} />
      <EntityDialog open={lineDialog} onOpenChange={setLineDialog} title={editingLine ? 'Edit invoice line' : 'Add invoice line'} fields={lineFields} initial={editingLine ?? { invoice_id: selectedInvoiceId, quantity: 1, tax_rate: 0 }} onSubmit={async (values) => { if (editingLine) await lines.update.mutateAsync({ id: editingLine.id, values }); else await lines.insert.mutateAsync(values); await invoices.invalidate(); }} />
      <EntityDialog open={collectionDialog} onOpenChange={setCollectionDialog} title={editingCollection ? 'Edit collection' : 'Record collection'} fields={collectionFields} initial={editingCollection ?? { collection_date: today(), currency_id: baseCurrency?.id, exchange_rate_to_base: 1, method: 'bank_transfer', status: 'pending' }} onSubmit={async (values) => { if (editingCollection) await collections.update.mutateAsync({ id: editingCollection.id, values }); else await collections.insert.mutateAsync(values); await Promise.all([invoices.invalidate(), queryClient.invalidateQueries({ queryKey: ['pool_reconciliations'] })]); }} />
      <EntityDialog open={allocationDialog} onOpenChange={setAllocationDialog} title="Allocate collection to invoice" fields={allocationFields} initial={{ exchange_rate: 1 }} onSubmit={async (values) => { await allocations.insert.mutateAsync(values); await invoices.invalidate(); }} />
      <EntityDialog open={receiptDialog} onOpenChange={setReceiptDialog} title="Issue receipt" fields={receiptFields} initial={{ status: 'issued' }} onSubmit={(values) => receipts.insert.mutate(values)} />
      <EntityDialog open={poolAllocationDialog} onOpenChange={setPoolAllocationDialog} title="Allocate cleared collection to pool" fields={poolAllocationFields} onSubmit={async (values) => { await poolAllocations.insert.mutateAsync(values); await queryClient.invalidateQueries({ queryKey: ['pool_reconciliations'] }); }} />
      <EntityDialog open={deductionDialog} onOpenChange={setDeductionDialog} title={editingDeduction ? 'Edit pool deduction' : 'Add pool deduction'} fields={deductionFields} initial={editingDeduction ?? { category: 'administration', currency_id: baseCurrency?.id, exchange_rate_to_base: 1, incurred_date: today(), status: 'draft' }} onSubmit={async (values) => { if (editingDeduction) await deductions.update.mutateAsync({ id: editingDeduction.id, values }); else await deductions.insert.mutateAsync(values); await queryClient.invalidateQueries({ queryKey: ['pool_reconciliations'] }); }} />
      <EntityDialog open={currencyDialog} onOpenChange={setCurrencyDialog} title={editingCurrency ? 'Edit currency' : 'Add currency'} fields={currencyFields} initial={editingCurrency ?? { decimal_places: 2, is_base: false, active: true }} onSubmit={(values) => { const payload = { ...values, code: String(values.code || '').toUpperCase(), is_base: editingCurrency?.is_base || values.is_base === 'true', active: values.active === 'true' }; return editingCurrency ? currencies.update.mutate({ id: editingCurrency.id, values: payload }) : currencies.insert.mutate(payload); }} />
      <EntityDialog open={rateDialog} onOpenChange={setRateDialog} title="Add exchange rate" fields={rateFields} initial={{ to_currency_id: baseCurrency?.id, effective_date: today() }} onSubmit={(values) => rates.insert.mutate(values)} />
    </div>
  );
}
