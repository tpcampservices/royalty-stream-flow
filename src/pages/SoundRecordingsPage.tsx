import { useState } from 'react';
import { Plus, Upload, Pencil, Trash2, Users, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EntityDialog, { FieldDef } from '@/components/EntityDialog';
import ImportDialog from '@/components/ImportDialog';
import SharesDialog from '@/components/SharesDialog';
import BulkEditDialog from '@/components/BulkEditDialog';
import { BulkBar, SelectTd, SelectTh, SortTh, TablePagination, TableToolbar } from '@/components/DataTableControls';
import { useTable } from '@/hooks/useTable';
import { useDataTable } from '@/hooks/useDataTable';
import { Member, RecordingShare, SoundRecording } from '@/lib/types';
import { exportRows, toNumber, toText } from '@/lib/importUtils';

const fields: FieldDef[] = [
  { key: 'title', label: 'Recording title', required: true },
  { key: 'artist', label: 'Performing artist' },
  { key: 'isrc', label: 'ISRC' },
  { key: 'recording_code', label: 'Recording code' },
  { key: 'alternate_title', label: 'Alternate title' },
  { key: 'album', label: 'Album' },
  { key: 'label', label: 'Label' },
  { key: 'genre', label: 'Genre' },
  { key: 'duration_seconds', label: 'Duration (seconds)', type: 'number' },
  { key: 'release_year', label: 'Release year', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['registered', 'pending', 'disputed'].map((v) => ({ value: v, label: v })) },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function SoundRecordingsPage() {
  const { rows, isLoading, insert, insertMany, update, updateMany, remove, removeMany } = useTable<SoundRecording>('sound_recordings', 'title', true);
  const { rows: members } = useTable<Member>('members', 'name', true);
  const shares = useTable<RecordingShare>('recording_shares');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [sharesFor, setSharesFor] = useState<SoundRecording | null>(null);
  const [editing, setEditing] = useState<SoundRecording | null>(null);

  const memberName = (id: string) => members.find((m) => m.id === id)?.name || 'Unknown member';
  const sharesOf = (recordingId: string) => shares.rows.filter((s) => s.recording_id === recordingId);

  const genres = Array.from(new Set(rows.map((r) => r.genre).filter(Boolean))) as string[];

  const table = useDataTable<SoundRecording>({
    rows,
    searchKeys: ['title', 'artist', 'isrc', 'recording_code', 'album', 'label'],
    initialSort: 'title',
    filters: [
      { key: 'status', label: 'Status', options: ['registered', 'pending', 'disputed'], value: (r) => r.status },
      ...(genres.length ? [{ key: 'genre', label: 'Genre', options: genres, value: (r: SoundRecording) => r.genre }] : []),
    ],
  });

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{rows.length} sound recordings in registry</p>

      <TableToolbar table={table} searchPlaceholder="Search recordings…">
        <Button variant="outline" onClick={() => exportRows('sound-recordings.xlsx', table.filtered)}><Download className="w-4 h-4 mr-2" />Export</Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Bulk import</Button>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add recording</Button>
      </TableToolbar>

      <BulkBar table={table}>
        <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}><Pencil className="w-4 h-4 mr-1" />Edit selected</Button>
        <Button variant="outline" size="sm" onClick={() => updateMany.mutate({ ids: table.selected, values: { status: 'registered' } })}>Mark registered</Button>
        <Button variant="destructive" size="sm" onClick={() => { removeMany.mutate(table.selected); table.clearSelection(); }}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
      </BulkBar>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <SelectTh table={table} />
                <SortTh table={table} sortKey="isrc">ISRC / Code</SortTh>
                <SortTh table={table} sortKey="title">Title</SortTh>
                <SortTh table={table} sortKey="artist">Artist</SortTh>
                <SortTh table={table} sortKey="label">Label</SortTh>
                <SortTh table={table} sortKey="status">Status</SortTh>
                <th className="text-left py-3 px-4">Linked members</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && !table.total && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No sound recordings found — add one or import in bulk.</td></tr>}
              {table.pageRows.map((r) => {
                const rowShares = sharesOf(r.id);
                const total = rowShares.reduce((s, x) => s + Number(x.percentage), 0);
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors align-top">
                    <SelectTd table={table} id={r.id} />
                    <td className="py-3 px-4 font-mono text-primary text-xs">{r.isrc || r.recording_code || '—'}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{r.title}</td>
                    <td className="py-3 px-4 text-muted-foreground">{r.artist || '—'}</td>
                    <td className="py-3 px-4 text-muted-foreground">{r.label || '—'}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className={
                        r.status === 'registered' ? 'bg-success/20 text-success border-0' :
                        r.status === 'disputed' ? 'bg-destructive/20 text-destructive border-0' :
                        'bg-warning/20 text-warning border-0'}>{r.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      {rowShares.length ? (
                        <div className="space-y-1">
                          {rowShares.map((s) => (
                            <span key={s.id} className="text-xs text-muted-foreground block">{memberName(s.member_id)} ({s.role}) — {Number(s.percentage)}%</span>
                          ))}
                          {total !== 100 && <span className="text-xs text-warning">Shares total {total}%</span>}
                        </div>
                      ) : <span className="text-xs text-warning">No members linked</span>}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" title="Link members" onClick={() => setSharesFor(r)}><Users className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination table={table} />
      </div>

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit sound recording' : 'Add sound recording'}
        fields={fields}
        initial={editing ?? { status: 'registered' }}
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
        title="Bulk import sound recordings"
        description="Upload your catalogue as CSV or Excel. Title is required."
        templateName="sound-recordings-template.xlsx"
        templateHeaders={['isrc', 'recording_code', 'title', 'alternate_title', 'artist', 'album', 'label', 'genre', 'duration_seconds', 'release_year', 'status']}
        templateExample={['TTA012500001', 'SR-001', 'Island Breeze', '', 'Marcus Johnson', 'Trini Roots', 'Island Records', 'Soca', 214, 2025, 'registered']}
        mapRow={(row) => {
          const title = toText(row.title ?? row.song_title ?? row.recording_title);
          if (!title) return null;
          return {
            title,
            isrc: toText(row.isrc),
            recording_code: toText(row.recording_code ?? row.code),
            alternate_title: toText(row.alternate_title),
            artist: toText(row.artist ?? row.performing_artist),
            album: toText(row.album),
            label: toText(row.label ?? row.record_label),
            genre: toText(row.genre),
            duration_seconds: toNumber(row.duration_seconds ?? row.duration),
            release_year: toNumber(row.release_year ?? row.year),
            status: (toText(row.status) || 'registered').toLowerCase(),
          };
        }}
        onImport={(mapped, onProgress) => insertMany.mutateAsync({ values: mapped, onProgress })}
      />

      <SharesDialog
        recording={sharesFor}
        members={members}
        shares={sharesFor ? sharesOf(sharesFor.id) : []}
        onClose={() => setSharesFor(null)}
        onAdd={(values) => shares.insert.mutate(values)}
        onUpdate={(id, values) => shares.update.mutate({ id, values })}
        onRemove={(id) => shares.remove.mutate(id)}
      />
    </div>
  );
}
