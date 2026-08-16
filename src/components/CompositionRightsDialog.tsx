import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { humanizeCatalogRole, percentageComplete, percentageTotal } from '@/lib/catalog';
import {
  Composition,
  CompositionPublisher,
  CompositionWriter,
  Member,
  publisherRoles,
  writerRoles,
} from '@/lib/types';

interface Props {
  composition: Composition | null;
  members: Member[];
  writers: CompositionWriter[];
  publishers: CompositionPublisher[];
  canDelete: boolean;
  onClose: () => void;
  onAddWriter: (values: Record<string, unknown>) => void;
  onUpdateWriter: (id: string, values: Record<string, unknown>) => void;
  onRemoveWriter: (id: string) => void;
  onAddPublisher: (values: Record<string, unknown>) => void;
  onUpdatePublisher: (id: string, values: Record<string, unknown>) => void;
  onRemovePublisher: (id: string) => void;
}

const validPercentage = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
};

export default function CompositionRightsDialog({
  composition,
  members,
  writers,
  publishers,
  canDelete,
  onClose,
  onAddWriter,
  onUpdateWriter,
  onRemoveWriter,
  onAddPublisher,
  onUpdatePublisher,
  onRemovePublisher,
}: Props) {
  const [writerMemberId, setWriterMemberId] = useState('');
  const [writerRole, setWriterRole] = useState('composer');
  const [writerShare, setWriterShare] = useState('');
  const [publisherMemberId, setPublisherMemberId] = useState('');
  const [publisherRole, setPublisherRole] = useState('original_publisher');
  const [publisherShare, setPublisherShare] = useState('');
  const [collectionShare, setCollectionShare] = useState('');
  const [territory, setTerritory] = useState('WORLD');

  useEffect(() => {
    if (!composition) return;
    setWriterMemberId('');
    setWriterShare('');
    setPublisherMemberId('');
    setPublisherShare('');
    setCollectionShare('');
    setTerritory('WORLD');
  }, [composition]);

  const memberName = (id: string) => members.find((member) => member.id === id)?.name || 'Unknown rights party';
  const ownershipTotal = useMemo(
    () => percentageTotal(writers, (row) => row.ownership_percentage) + percentageTotal(publishers, (row) => row.ownership_percentage),
    [writers, publishers],
  );

  const addWriter = () => {
    const percentage = validPercentage(writerShare);
    if (!composition || !writerMemberId || percentage === null) return;
    onAddWriter({
      composition_id: composition.id,
      member_id: writerMemberId,
      writer_role: writerRole,
      ownership_percentage: percentage,
    });
    setWriterMemberId('');
    setWriterShare('');
  };

  const addPublisher = () => {
    const ownership = validPercentage(publisherShare);
    const collection = validPercentage(collectionShare);
    if (!composition || !publisherMemberId || ownership === null || collection === null || !territory.trim()) return;
    onAddPublisher({
      composition_id: composition.id,
      member_id: publisherMemberId,
      publisher_role: publisherRole,
      ownership_percentage: ownership,
      collection_percentage: collection,
      territory: territory.trim().toUpperCase(),
    });
    setPublisherMemberId('');
    setPublisherShare('');
    setCollectionShare('');
  };

  return (
    <Dialog open={Boolean(composition)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>Composition rights — {composition?.title}</DialogTitle></DialogHeader>

        <div className={`rounded-lg border p-3 text-sm ${percentageComplete(ownershipTotal) ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning'}`}>
          Copyright ownership entered: <strong>{ownershipTotal}%</strong>. Writer and publisher ownership together must equal 100% before distribution.
        </div>

        <section className="space-y-3">
          <div>
            <h3 className="font-heading font-semibold">Writers</h3>
            <p className="text-xs text-muted-foreground">Composer, lyricist and related authorship roles with copyright ownership.</p>
          </div>
          {writers.map((writer) => (
            <div key={writer.id} className="grid gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 sm:grid-cols-[1fr_190px_110px_40px] sm:items-center">
              <span className="text-sm font-medium">{memberName(writer.member_id)}</span>
              <Select value={writer.writer_role} onValueChange={(value) => onUpdateWriter(writer.id, { writer_role: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{writerRoles.map((role) => <SelectItem key={role} value={role}>{humanizeCatalogRole(role)}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Input type="number" min="0" max="100" step="0.0001" defaultValue={Number(writer.ownership_percentage)} onBlur={(event) => {
                  const percentage = validPercentage(event.target.value);
                  if (percentage !== null) onUpdateWriter(writer.id, { ownership_percentage: percentage });
                }} />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              {canDelete ? <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveWriter(writer.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : <span />}
            </div>
          ))}
          {!writers.length && <p className="text-sm text-muted-foreground">No writers linked.</p>}
          <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_190px_110px_auto] sm:items-end">
            <div className="space-y-1"><Label>Rights party</Label><Select value={writerMemberId} onValueChange={setWriterMemberId}><SelectTrigger><SelectValue placeholder="Select writer" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Writer role</Label><Select value={writerRole} onValueChange={setWriterRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{writerRoles.map((role) => <SelectItem key={role} value={role}>{humanizeCatalogRole(role)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Ownership %</Label><Input type="number" min="0" max="100" step="0.0001" value={writerShare} onChange={(event) => setWriterShare(event.target.value)} /></div>
            <Button type="button" onClick={addWriter}><Plus className="mr-1 h-4 w-4" />Add</Button>
          </div>
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <div>
            <h3 className="font-heading font-semibold">Publishers and administrators</h3>
            <p className="text-xs text-muted-foreground">Ownership and collection authority are separate. An administrator can collect without owning copyright.</p>
          </div>
          {publishers.map((publisher) => (
            <div key={publisher.id} className="grid gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 lg:grid-cols-[1fr_175px_95px_95px_100px_40px] lg:items-center">
              <span className="text-sm font-medium">{memberName(publisher.member_id)}</span>
              <Select value={publisher.publisher_role} onValueChange={(value) => onUpdatePublisher(publisher.id, { publisher_role: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{publisherRoles.map((role) => <SelectItem key={role} value={role}>{humanizeCatalogRole(role)}</SelectItem>)}</SelectContent>
              </Select>
              <Input aria-label="Ownership percentage" type="number" min="0" max="100" step="0.0001" defaultValue={Number(publisher.ownership_percentage)} onBlur={(event) => {
                const percentage = validPercentage(event.target.value);
                if (percentage !== null) onUpdatePublisher(publisher.id, { ownership_percentage: percentage });
              }} />
              <Input aria-label="Collection percentage" type="number" min="0" max="100" step="0.0001" defaultValue={Number(publisher.collection_percentage)} onBlur={(event) => {
                const percentage = validPercentage(event.target.value);
                if (percentage !== null) onUpdatePublisher(publisher.id, { collection_percentage: percentage });
              }} />
              <Input aria-label="Territory" defaultValue={publisher.territory} onBlur={(event) => onUpdatePublisher(publisher.id, { territory: event.target.value.trim().toUpperCase() || 'WORLD' })} />
              {canDelete ? <Button type="button" variant="ghost" size="icon" onClick={() => onRemovePublisher(publisher.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : <span />}
            </div>
          ))}
          {publishers.length > 0 && <div className="hidden grid-cols-[1fr_175px_95px_95px_100px_40px] px-3 text-[11px] text-muted-foreground lg:grid"><span /><span>Role</span><span>Own %</span><span>Collect %</span><span>Territory</span><span /></div>}
          {!publishers.length && <p className="text-sm text-muted-foreground">No publishers or administrators linked.</p>}
          <div className="grid gap-2 border-t border-border pt-3 md:grid-cols-2 lg:grid-cols-[1fr_175px_95px_95px_100px_auto] lg:items-end">
            <div className="space-y-1"><Label>Rights party</Label><Select value={publisherMemberId} onValueChange={setPublisherMemberId}><SelectTrigger><SelectValue placeholder="Select publisher" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Publisher role</Label><Select value={publisherRole} onValueChange={setPublisherRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{publisherRoles.map((role) => <SelectItem key={role} value={role}>{humanizeCatalogRole(role)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Own %</Label><Input type="number" min="0" max="100" step="0.0001" value={publisherShare} onChange={(event) => setPublisherShare(event.target.value)} /></div>
            <div className="space-y-1"><Label>Collect %</Label><Input type="number" min="0" max="100" step="0.0001" value={collectionShare} onChange={(event) => setCollectionShare(event.target.value)} /></div>
            <div className="space-y-1"><Label>Territory</Label><Input value={territory} onChange={(event) => setTerritory(event.target.value)} /></div>
            <Button type="button" onClick={addPublisher}><Plus className="mr-1 h-4 w-4" />Add</Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
