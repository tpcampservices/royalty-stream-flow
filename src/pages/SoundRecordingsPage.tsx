import { useState } from 'react';
import { Download, GitBranch, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BulkEditDialog from '@/components/BulkEditDialog';
import { BulkBar, SelectTd, SelectTh, SortTh, TablePagination, TableToolbar } from '@/components/DataTableControls';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import ImportDialog from '@/components/ImportDialog';
import RecordingCatalogDialog from '@/components/RecordingCatalogDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDataTable } from '@/hooks/useDataTable';
import { useTable } from '@/hooks/useTable';
import { percentageComplete, percentageTotal } from '@/lib/catalog';
import { exportRows, toNumber, toText } from '@/lib/importUtils';
import {
  Composition,
  Member,
  RecordingComposition,
  RecordingPerformer,
  RecordingProducer,
  RecordingRightsHolder,
  SoundRecording,
} from '@/lib/types';

const fields: FieldDef[] = [
  { key: 'title', label: 'Recording title', required: true },
  { key: 'alternate_title', label: 'Version / alternate title' },
  { key: 'isrc', label: 'ISRC' },
  { key: 'recording_code', label: 'Internal recording code' },
  { key: 'artist', label: 'Display artist', placeholder: 'Search/display text; add performer credits separately' },
  { key: 'album', label: 'Release / album' },
  { key: 'label', label: 'Display label', placeholder: 'Display text; record actual master ownership separately' },
  { key: 'genre', label: 'Genre' },
  { key: 'duration_seconds', label: 'Duration (seconds)', type: 'number' },
  { key: 'release_year', label: 'Release year', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['registered', 'pending', 'disputed'].map((value) => ({ value, label: value })) },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function SoundRecordingsPage() {
  const { currentRole } = useAuth();
  const canDelete = currentRole === 'admin';
  const recordings = useTable<SoundRecording>('sound_recordings', 'title', true);
  const { rows: members } = useTable<Member>('members', 'name', true);
  const { rows: compositions } = useTable<Composition>('compositions', 'title', true);
  const links = useTable<RecordingComposition>('recording_compositions');
  const performers = useTable<RecordingPerformer>('recording_performers');
  const producers = useTable<RecordingProducer>('recording_producers');
  const rightsHolders = useTable<RecordingRightsHolder>('recording_rights_holders');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [catalogFor, setCatalogFor] = useState<SoundRecording | null>(null);
  const [editing, setEditing] = useState<SoundRecording | null>(null);

  const memberName = (id: string) => members.find((member) => member.id === id)?.name || 'Unknown rights party';
  const linksOf = (id: string) => links.rows.filter((row) => row.recording_id === id);
  const performersOf = (id: string) => performers.rows.filter((row) => row.recording_id === id);
  const producersOf = (id: string) => producers.rows.filter((row) => row.recording_id === id);
  const rightsOf = (id: string) => rightsHolders.rows.filter((row) => row.recording_id === id);
  const genres = Array.from(new Set(recordings.rows.map((recording) => recording.genre).filter(Boolean))) as string[];

  const table = useDataTable<SoundRecording>({
    rows: recordings.rows,
    searchKeys: ['title', 'artist', 'isrc', 'recording_code', 'album', 'label'],
    initialSort: 'title',
    filters: [
      { key: 'status', label: 'Status', options: ['registered', 'pending', 'disputed'], value: (row) => row.status },
      ...(genres.length ? [{ key: 'genre', label: 'Genre', options: genres, value: (row: SoundRecording) => row.genre }] : []),
    ],
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{recordings.rows.length} sound recordings in the master registry</p>
      <TableToolbar table={table} searchPlaceholder="Search recordings…">
        <Button variant="outline" onClick={() => exportRows('sound-recordings.xlsx', table.filtered)}><Download className="mr-2 h-4 w-4" />Export</Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Bulk import</Button>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add recording</Button>
      </TableToolbar>

      <BulkBar table={table}>
        <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Pencil className="mr-1 h-4 w-4" />Edit selected</Button>
        <Button variant="outline" size="sm" onClick={() => recordings.updateMany.mutate({ ids: table.selected, values: { status: 'registered' } })}>Mark registered</Button>
        {canDelete && <Button variant="destructive" size="sm" onClick={() => { recordings.removeMany.mutate(table.selected); table.clearSelection(); }}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>}
      </BulkBar>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead><tr className="border-b border-border text-muted-foreground"><SelectTh table={table} /><SortTh table={table} sortKey="isrc">ISRC / Code</SortTh><SortTh table={table} sortKey="title">Recording</SortTh><th className="px-4 py-3 text-left">Composition</th><th className="px-4 py-3 text-left">Performers / producers</th><th className="px-4 py-3 text-left">Master rights</th><SortTh table={table} sortKey="status">Status</SortTh><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {recordings.isLoading && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!recordings.isLoading && !table.total && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No sound recordings found — add one or import in bulk.</td></tr>}
              {table.pageRows.map((recording) => {
                const recordingLinks = linksOf(recording.id);
                const recordingPerformers = performersOf(recording.id);
                const recordingProducers = producersOf(recording.id);
                const recordingRights = rightsOf(recording.id);
                const worldOwners = recordingRights.filter((row) => row.rights_type === 'master_owner' && row.territory === 'WORLD');
                const linkTotal = percentageTotal(recordingLinks, (row) => row.share_percentage);
                const masterTotal = percentageTotal(worldOwners, (row) => row.ownership_percentage);
                return (
                  <tr key={recording.id} className="border-b border-border/50 align-top transition-colors hover:bg-muted/30">
                    <SelectTd table={table} id={recording.id} />
                    <td className="px-4 py-3 font-mono text-xs text-primary">{recording.isrc || recording.recording_code || '—'}</td>
                    <td className="px-4 py-3"><p className="font-medium text-foreground">{recording.title}</p><p className="text-xs text-muted-foreground">{recording.artist || 'No display artist'}</p></td>
                    <td className="px-4 py-3">
                      {recordingLinks.map((link) => <span key={link.id} className="block text-xs text-muted-foreground">{compositions.find((item) => item.id === link.composition_id)?.title || 'Missing work'} — {Number(link.share_percentage)}%</span>)}
                      <span className={`text-xs ${percentageComplete(linkTotal) ? 'text-success' : 'text-warning'}`}>{recordingLinks.length ? `${linkTotal}% linked` : 'No work linked'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <p>{recordingPerformers.length ? recordingPerformers.map((row) => memberName(row.member_id)).join(', ') : 'No performer credits'}</p>
                      <p>{recordingProducers.length} producer credit{recordingProducers.length === 1 ? '' : 's'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {worldOwners.map((owner) => <span key={owner.id} className="block text-xs text-muted-foreground">{memberName(owner.member_id)} — {Number(owner.ownership_percentage)}%</span>)}
                      <span className={`text-xs ${percentageComplete(masterTotal) ? 'text-success' : 'text-warning'}`}>{worldOwners.length ? `${masterTotal}% worldwide` : 'No master owner'}</span>
                    </td>
                    <td className="px-4 py-3"><Badge variant="secondary" className={recording.status === 'registered' ? 'border-0 bg-success/20 text-success' : recording.status === 'disputed' ? 'border-0 bg-destructive/20 text-destructive' : 'border-0 bg-warning/20 text-warning'}>{recording.status}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" title="Manage composition, credits and master rights" onClick={() => setCatalogFor(recording)}><GitBranch className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Edit recording" onClick={() => { setEditing(recording); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      {canDelete && <Button variant="ghost" size="icon" title="Delete recording" onClick={() => recordings.remove.mutate(recording.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination table={table} />
      </div>

      <EntityDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? 'Edit sound recording' : 'Add sound recording'} fields={fields} initial={editing ?? { status: 'registered' }} onSubmit={(values) => editing ? recordings.update.mutate({ id: editing.id, values }) : recordings.insert.mutate(values)} />
      <BulkEditDialog open={bulkOpen} onOpenChange={setBulkOpen} count={table.selected.length} fields={fields} onApply={(values) => recordings.updateMany.mutate({ ids: table.selected, values })} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Bulk import sound recordings"
        description="Import master metadata here. Display artist and label are searchable text; connect actual performer credits, compositions, producers, and master owners after import."
        templateName="sound-recordings-template.xlsx"
        templateHeaders={['isrc', 'recording_code', 'title', 'alternate_title', 'artist', 'album', 'label', 'genre', 'duration_seconds', 'release_year', 'status']}
        templateExample={['TTA012500001', 'SR-001', 'Island Breeze', 'Radio Edit', 'Marcus Johnson', 'Trini Roots', 'Island Records', 'Soca', 214, 2025, 'registered']}
        mapRow={(row) => {
          const title = toText(row.title ?? row.song_title ?? row.recording_title);
          if (!title) return null;
          return { title, isrc: toText(row.isrc), recording_code: toText(row.recording_code ?? row.code), alternate_title: toText(row.alternate_title ?? row.version_title), artist: toText(row.artist ?? row.performing_artist), album: toText(row.album ?? row.release), label: toText(row.label ?? row.record_label), genre: toText(row.genre), duration_seconds: toNumber(row.duration_seconds ?? row.duration), release_year: toNumber(row.release_year ?? row.year), status: (toText(row.status) || 'registered').toLowerCase() };
        }}
        onImport={(mapped, onProgress) => recordings.insertMany.mutateAsync({ values: mapped, onProgress })}
      />
      <RecordingCatalogDialog
        recording={catalogFor}
        compositions={compositions}
        members={members}
        links={catalogFor ? linksOf(catalogFor.id) : []}
        performers={catalogFor ? performersOf(catalogFor.id) : []}
        producers={catalogFor ? producersOf(catalogFor.id) : []}
        rightsHolders={catalogFor ? rightsOf(catalogFor.id) : []}
        canDelete={canDelete}
        onClose={() => setCatalogFor(null)}
        onAddLink={(values) => links.insert.mutate(values)}
        onUpdateLink={(id, values) => links.update.mutate({ id, values })}
        onRemoveLink={(id) => links.remove.mutate(id)}
        onAddPerformer={(values) => performers.insert.mutate(values)}
        onUpdatePerformer={(id, values) => performers.update.mutate({ id, values })}
        onRemovePerformer={(id) => performers.remove.mutate(id)}
        onAddProducer={(values) => producers.insert.mutate(values)}
        onUpdateProducer={(id, values) => producers.update.mutate({ id, values })}
        onRemoveProducer={(id) => producers.remove.mutate(id)}
        onAddRightsHolder={(values) => rightsHolders.insert.mutate(values)}
        onUpdateRightsHolder={(id, values) => rightsHolders.update.mutate({ id, values })}
        onRemoveRightsHolder={(id) => rightsHolders.remove.mutate(id)}
      />
    </div>
  );
}
