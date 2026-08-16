import { useState } from 'react';
import { Download, Pencil, Plus, Scale, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BulkEditDialog from '@/components/BulkEditDialog';
import CompositionRightsDialog from '@/components/CompositionRightsDialog';
import { BulkBar, SelectTd, SelectTh, SortTh, TablePagination, TableToolbar } from '@/components/DataTableControls';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import ImportDialog from '@/components/ImportDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDataTable } from '@/hooks/useDataTable';
import { useTable } from '@/hooks/useTable';
import { percentageComplete, percentageTotal } from '@/lib/catalog';
import { exportRows, toNumber, toText } from '@/lib/importUtils';
import { Composition, CompositionPublisher, CompositionWriter, Member } from '@/lib/types';

const fields: FieldDef[] = [
  { key: 'title', label: 'Composition title', required: true },
  { key: 'alternate_title', label: 'Alternate title' },
  { key: 'iswc', label: 'ISWC' },
  { key: 'work_code', label: 'Internal work code' },
  { key: 'work_type', label: 'Work type', type: 'select', options: ['original', 'arrangement', 'adaptation', 'translation', 'medley'].map((value) => ({ value, label: value })) },
  { key: 'language_code', label: 'Language code', placeholder: 'e.g. EN' },
  { key: 'duration_seconds', label: 'Duration (seconds)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['registered', 'pending', 'disputed'].map((value) => ({ value, label: value })) },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function CompositionsPage() {
  const { currentRole } = useAuth();
  const canDelete = currentRole === 'admin';
  const compositions = useTable<Composition>('compositions', 'title', true);
  const { rows: members } = useTable<Member>('members', 'name', true);
  const writers = useTable<CompositionWriter>('composition_writers');
  const publishers = useTable<CompositionPublisher>('composition_publishers');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Composition | null>(null);
  const [rightsFor, setRightsFor] = useState<Composition | null>(null);

  const writersOf = (id: string) => writers.rows.filter((row) => row.composition_id === id);
  const publishersOf = (id: string) => publishers.rows.filter((row) => row.composition_id === id);
  const ownershipTotal = (id: string) =>
    percentageTotal(writersOf(id), (row) => row.ownership_percentage)
    + percentageTotal(publishersOf(id), (row) => row.ownership_percentage);

  const table = useDataTable<Composition>({
    rows: compositions.rows,
    searchKeys: ['title', 'alternate_title', 'iswc', 'work_code'],
    initialSort: 'title',
    filters: [
      { key: 'status', label: 'Status', options: ['registered', 'pending', 'disputed'], value: (row) => row.status },
      { key: 'work_type', label: 'Work type', options: ['original', 'arrangement', 'adaptation', 'translation', 'medley'], value: (row) => row.work_type },
    ],
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{compositions.rows.length} musical compositions in the works registry</p>
      <TableToolbar table={table} searchPlaceholder="Search compositions…">
        <Button variant="outline" onClick={() => exportRows('compositions.xlsx', table.filtered)}><Download className="mr-2 h-4 w-4" />Export</Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Bulk import</Button>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add composition</Button>
      </TableToolbar>

      <BulkBar table={table}>
        <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Pencil className="mr-1 h-4 w-4" />Edit selected</Button>
        <Button variant="outline" size="sm" onClick={() => compositions.updateMany.mutate({ ids: table.selected, values: { status: 'registered' } })}>Mark registered</Button>
        {canDelete && <Button variant="destructive" size="sm" onClick={() => { compositions.removeMany.mutate(table.selected); table.clearSelection(); }}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>}
      </BulkBar>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead><tr className="border-b border-border text-muted-foreground"><SelectTh table={table} /><SortTh table={table} sortKey="iswc">ISWC / Code</SortTh><SortTh table={table} sortKey="title">Title</SortTh><SortTh table={table} sortKey="work_type">Type</SortTh><SortTh table={table} sortKey="status">Status</SortTh><th className="px-4 py-3 text-left">Writers / publishers</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {compositions.isLoading && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!compositions.isLoading && !table.total && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No compositions found — add one or import in bulk.</td></tr>}
              {table.pageRows.map((composition) => {
                const workWriters = writersOf(composition.id);
                const workPublishers = publishersOf(composition.id);
                const total = ownershipTotal(composition.id);
                return (
                  <tr key={composition.id} className="border-b border-border/50 align-top transition-colors hover:bg-muted/30">
                    <SelectTd table={table} id={composition.id} />
                    <td className="px-4 py-3 font-mono text-xs text-primary">{composition.iswc || composition.work_code || '—'}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{composition.title}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{composition.work_type}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className={composition.status === 'registered' ? 'border-0 bg-success/20 text-success' : composition.status === 'disputed' ? 'border-0 bg-destructive/20 text-destructive' : 'border-0 bg-warning/20 text-warning'}>{composition.status}</Badge></td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{workWriters.length} writer{workWriters.length === 1 ? '' : 's'} · {workPublishers.length} publisher/admin</p>
                      <p className={`text-xs ${percentageComplete(total) ? 'text-success' : 'text-warning'}`}>{total}% ownership</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" title="Manage composition rights" onClick={() => setRightsFor(composition)}><Scale className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Edit composition" onClick={() => { setEditing(composition); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      {canDelete && <Button variant="ghost" size="icon" title="Delete composition" onClick={() => compositions.remove.mutate(composition.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination table={table} />
      </div>

      <EntityDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? 'Edit composition' : 'Add composition'} fields={fields} initial={editing ?? { work_type: 'original', status: 'registered' }} onSubmit={(values) => editing ? compositions.update.mutate({ id: editing.id, values }) : compositions.insert.mutate(values)} />
      <BulkEditDialog open={bulkOpen} onOpenChange={setBulkOpen} count={table.selected.length} fields={fields} onApply={(values) => compositions.updateMany.mutate({ ids: table.selected, values })} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Bulk import compositions"
        description="Import musical works separately from sound recordings. Writer and publisher ownership is added after the work is created."
        templateName="compositions-template.xlsx"
        templateHeaders={['work_code', 'iswc', 'title', 'alternate_title', 'work_type', 'language_code', 'duration_seconds', 'status', 'notes']}
        templateExample={['WORK-001', 'T-123.456.789-0', 'Island Breeze', '', 'original', 'EN', 214, 'registered', '']}
        mapRow={(row) => {
          const title = toText(row.title ?? row.work_title ?? row.song_title);
          if (!title) return null;
          return { title, work_code: toText(row.work_code ?? row.code), iswc: toText(row.iswc), alternate_title: toText(row.alternate_title), work_type: (toText(row.work_type) || 'original').toLowerCase(), language_code: toText(row.language_code ?? row.language)?.toUpperCase() || null, duration_seconds: toNumber(row.duration_seconds ?? row.duration), status: (toText(row.status) || 'registered').toLowerCase(), notes: toText(row.notes) };
        }}
        onImport={(mapped, onProgress) => compositions.insertMany.mutateAsync({ values: mapped, onProgress })}
      />
      <CompositionRightsDialog
        composition={rightsFor}
        members={members}
        writers={rightsFor ? writersOf(rightsFor.id) : []}
        publishers={rightsFor ? publishersOf(rightsFor.id) : []}
        canDelete={canDelete}
        onClose={() => setRightsFor(null)}
        onAddWriter={(values) => writers.insert.mutate(values)}
        onUpdateWriter={(id, values) => writers.update.mutate({ id, values })}
        onRemoveWriter={(id) => writers.remove.mutate(id)}
        onAddPublisher={(values) => publishers.insert.mutate(values)}
        onUpdatePublisher={(id, values) => publishers.update.mutate({ id, values })}
        onRemovePublisher={(id) => publishers.remove.mutate(id)}
      />
    </div>
  );
}
