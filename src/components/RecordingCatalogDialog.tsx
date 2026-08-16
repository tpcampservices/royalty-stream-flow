import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { humanizeCatalogRole, percentageComplete, percentageTotal } from '@/lib/catalog';
import {
  Composition,
  Member,
  performerRoles,
  producerRoles,
  RecordingComposition,
  RecordingPerformer,
  RecordingProducer,
  RecordingRightsHolder,
  recordingRightsTypes,
  SoundRecording,
} from '@/lib/types';

interface Props {
  recording: SoundRecording | null;
  compositions: Composition[];
  members: Member[];
  links: RecordingComposition[];
  performers: RecordingPerformer[];
  producers: RecordingProducer[];
  rightsHolders: RecordingRightsHolder[];
  canDelete: boolean;
  onClose: () => void;
  onAddLink: (values: Record<string, unknown>) => void;
  onUpdateLink: (id: string, values: Record<string, unknown>) => void;
  onRemoveLink: (id: string) => void;
  onAddPerformer: (values: Record<string, unknown>) => void;
  onUpdatePerformer: (id: string, values: Record<string, unknown>) => void;
  onRemovePerformer: (id: string) => void;
  onAddProducer: (values: Record<string, unknown>) => void;
  onUpdateProducer: (id: string, values: Record<string, unknown>) => void;
  onRemoveProducer: (id: string) => void;
  onAddRightsHolder: (values: Record<string, unknown>) => void;
  onUpdateRightsHolder: (id: string, values: Record<string, unknown>) => void;
  onRemoveRightsHolder: (id: string) => void;
}

const percentage = (value: string, allowEmpty = false) => {
  if (allowEmpty && value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : undefined;
};

export default function RecordingCatalogDialog({
  recording,
  compositions,
  members,
  links,
  performers,
  producers,
  rightsHolders,
  canDelete,
  onClose,
  onAddLink,
  onUpdateLink,
  onRemoveLink,
  onAddPerformer,
  onUpdatePerformer,
  onRemovePerformer,
  onAddProducer,
  onUpdateProducer,
  onRemoveProducer,
  onAddRightsHolder,
  onUpdateRightsHolder,
  onRemoveRightsHolder,
}: Props) {
  const [compositionId, setCompositionId] = useState('');
  const [compositionShare, setCompositionShare] = useState('100');
  const [performerId, setPerformerId] = useState('');
  const [performerRole, setPerformerRole] = useState('main_artist');
  const [instrument, setInstrument] = useState('');
  const [producerId, setProducerId] = useState('');
  const [producerRole, setProducerRole] = useState('producer');
  const [producerPoints, setProducerPoints] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [rightsType, setRightsType] = useState('master_owner');
  const [ownerShare, setOwnerShare] = useState('');
  const [territory, setTerritory] = useState('WORLD');

  useEffect(() => {
    if (!recording) return;
    setCompositionId('');
    setCompositionShare('100');
    setPerformerId('');
    setInstrument('');
    setProducerId('');
    setProducerPoints('');
    setOwnerId('');
    setOwnerShare('');
    setTerritory('WORLD');
  }, [recording]);

  const memberName = (id: string) => members.find((member) => member.id === id)?.name || 'Unknown rights party';
  const compositionName = (id: string) => compositions.find((item) => item.id === id)?.title || 'Unknown composition';
  const linkTotal = useMemo(() => percentageTotal(links, (row) => row.share_percentage), [links]);
  const worldMasterOwners = rightsHolders.filter((row) => row.rights_type === 'master_owner' && row.territory === 'WORLD');
  const masterTotal = useMemo(() => percentageTotal(worldMasterOwners, (row) => row.ownership_percentage), [worldMasterOwners]);

  const addLink = () => {
    const share = percentage(compositionShare);
    if (!recording || !compositionId || share === undefined || share === null || share <= 0) return;
    onAddLink({ recording_id: recording.id, composition_id: compositionId, share_percentage: share, sequence_number: links.length + 1 });
    setCompositionId('');
    setCompositionShare('');
  };

  const addPerformer = () => {
    if (!recording || !performerId) return;
    onAddPerformer({ recording_id: recording.id, member_id: performerId, performer_role: performerRole, instrument: instrument.trim() || null });
    setPerformerId('');
    setInstrument('');
  };

  const addProducer = () => {
    const points = percentage(producerPoints, true);
    if (!recording || !producerId || points === undefined) return;
    onAddProducer({ recording_id: recording.id, member_id: producerId, producer_role: producerRole, royalty_points: points });
    setProducerId('');
    setProducerPoints('');
  };

  const addOwner = () => {
    const share = percentage(ownerShare);
    if (!recording || !ownerId || share === undefined || share === null || !territory.trim()) return;
    onAddRightsHolder({ recording_id: recording.id, member_id: ownerId, rights_type: rightsType, ownership_percentage: share, territory: territory.trim().toUpperCase(), review_status: 'confirmed' });
    setOwnerId('');
    setOwnerShare('');
  };

  return (
    <Dialog open={Boolean(recording)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader><DialogTitle>Recording catalog relationships — {recording?.title}</DialogTitle></DialogHeader>
        <Tabs defaultValue="compositions">
          <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="compositions">Compositions</TabsTrigger>
            <TabsTrigger value="performers">Performers</TabsTrigger>
            <TabsTrigger value="producers">Producers</TabsTrigger>
            <TabsTrigger value="rights">Master rights</TabsTrigger>
          </TabsList>

          <TabsContent value="compositions" className="space-y-4 pt-3">
            <p className="text-sm text-muted-foreground">Link the underlying musical work. Multiple links are supported for medleys.</p>
            <div className={`rounded-lg border p-3 text-sm ${percentageComplete(linkTotal) ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning'}`}>Composition coverage: <strong>{linkTotal}%</strong></div>
            {links.map((link) => (
              <div key={link.id} className="grid gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 sm:grid-cols-[1fr_120px_40px] sm:items-center">
                <span className="text-sm font-medium">{compositionName(link.composition_id)}</span>
                <div className="flex items-center gap-1"><Input type="number" min="0.0001" max="100" step="0.0001" defaultValue={Number(link.share_percentage)} onBlur={(event) => {
                  const share = percentage(event.target.value);
                  if (share !== undefined && share !== null && share > 0) onUpdateLink(link.id, { share_percentage: share });
                }} /><span className="text-xs text-muted-foreground">%</span></div>
                {canDelete ? <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveLink(link.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : <span />}
              </div>
            ))}
            {!links.length && <p className="text-sm text-warning">No composition linked.</p>}
            <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
              <div className="space-y-1"><Label>Composition</Label><Select value={compositionId} onValueChange={setCompositionId}><SelectTrigger><SelectValue placeholder="Select composition" /></SelectTrigger><SelectContent>{compositions.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}{item.iswc ? ` — ${item.iswc}` : ''}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Coverage %</Label><Input type="number" min="0.0001" max="100" step="0.0001" value={compositionShare} onChange={(event) => setCompositionShare(event.target.value)} /></div>
              <Button type="button" onClick={addLink}><Plus className="mr-1 h-4 w-4" />Link</Button>
            </div>
          </TabsContent>

          <TabsContent value="performers" className="space-y-4 pt-3">
            <p className="text-sm text-muted-foreground">Performance credits do not imply ownership of the sound recording.</p>
            {performers.map((performer) => (
              <div key={performer.id} className="grid gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 md:grid-cols-[1fr_190px_180px_40px] md:items-center">
                <span className="text-sm font-medium">{memberName(performer.member_id)}</span>
                <Select value={performer.performer_role} onValueChange={(value) => onUpdatePerformer(performer.id, { performer_role: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{performerRoles.map((role) => <SelectItem key={role} value={role}>{humanizeCatalogRole(role)}</SelectItem>)}</SelectContent></Select>
                <Input aria-label="Instrument or vocal" placeholder="Instrument / vocal" defaultValue={performer.instrument || ''} onBlur={(event) => onUpdatePerformer(performer.id, { instrument: event.target.value.trim() || null })} />
                {canDelete ? <Button type="button" variant="ghost" size="icon" onClick={() => onRemovePerformer(performer.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : <span />}
              </div>
            ))}
            {!performers.length && <p className="text-sm text-muted-foreground">No performers credited.</p>}
            <div className="grid gap-2 border-t border-border pt-3 md:grid-cols-[1fr_190px_180px_auto] md:items-end">
              <div className="space-y-1"><Label>Rights party</Label><Select value={performerId} onValueChange={setPerformerId}><SelectTrigger><SelectValue placeholder="Select performer" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Credit</Label><Select value={performerRole} onValueChange={setPerformerRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{performerRoles.map((role) => <SelectItem key={role} value={role}>{humanizeCatalogRole(role)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Instrument / vocal</Label><Input value={instrument} onChange={(event) => setInstrument(event.target.value)} /></div>
              <Button type="button" onClick={addPerformer}><Plus className="mr-1 h-4 w-4" />Add</Button>
            </div>
          </TabsContent>

          <TabsContent value="producers" className="space-y-4 pt-3">
            <p className="text-sm text-muted-foreground">Producer royalty points are contractual participation, not master ownership. Ownership belongs in the Master rights tab.</p>
            {producers.map((producer) => (
              <div key={producer.id} className="grid gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 md:grid-cols-[1fr_210px_130px_40px] md:items-center">
                <span className="text-sm font-medium">{memberName(producer.member_id)}</span>
                <Select value={producer.producer_role} onValueChange={(value) => onUpdateProducer(producer.id, { producer_role: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{producerRoles.map((role) => <SelectItem key={role} value={role}>{humanizeCatalogRole(role)}</SelectItem>)}</SelectContent></Select>
                <Input aria-label="Producer royalty points" type="number" min="0" max="100" step="0.0001" placeholder="Royalty points" defaultValue={producer.royalty_points ?? ''} onBlur={(event) => {
                  const points = percentage(event.target.value, true);
                  if (points !== undefined) onUpdateProducer(producer.id, { royalty_points: points });
                }} />
                {canDelete ? <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveProducer(producer.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : <span />}
              </div>
            ))}
            {!producers.length && <p className="text-sm text-muted-foreground">No producers credited.</p>}
            <div className="grid gap-2 border-t border-border pt-3 md:grid-cols-[1fr_210px_130px_auto] md:items-end">
              <div className="space-y-1"><Label>Rights party</Label><Select value={producerId} onValueChange={setProducerId}><SelectTrigger><SelectValue placeholder="Select producer" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Credit</Label><Select value={producerRole} onValueChange={setProducerRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{producerRoles.map((role) => <SelectItem key={role} value={role}>{humanizeCatalogRole(role)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Royalty points</Label><Input type="number" min="0" max="100" step="0.0001" value={producerPoints} onChange={(event) => setProducerPoints(event.target.value)} /></div>
              <Button type="button" onClick={addProducer}><Plus className="mr-1 h-4 w-4" />Add</Button>
            </div>
          </TabsContent>

          <TabsContent value="rights" className="space-y-4 pt-3">
            <p className="text-sm text-muted-foreground">Record actual master ownership or an exclusive licence. A label name or producer credit alone does not create ownership.</p>
            <div className={`rounded-lg border p-3 text-sm ${percentageComplete(masterTotal) ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning'}`}>Worldwide master ownership entered: <strong>{masterTotal}%</strong></div>
            {rightsHolders.map((holder) => (
              <div key={holder.id} className="grid gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 lg:grid-cols-[1fr_180px_110px_110px_130px_40px] lg:items-center">
                <span className="text-sm font-medium">{memberName(holder.member_id)}</span>
                <Select value={holder.rights_type} onValueChange={(value) => onUpdateRightsHolder(holder.id, { rights_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{recordingRightsTypes.map((type) => <SelectItem key={type} value={type}>{humanizeCatalogRole(type)}</SelectItem>)}</SelectContent></Select>
                <Input aria-label="Master ownership percentage" type="number" min="0" max="100" step="0.0001" defaultValue={Number(holder.ownership_percentage)} onBlur={(event) => {
                  const share = percentage(event.target.value);
                  if (share !== undefined && share !== null) onUpdateRightsHolder(holder.id, { ownership_percentage: share });
                }} />
                <Input aria-label="Territory" defaultValue={holder.territory} onBlur={(event) => onUpdateRightsHolder(holder.id, { territory: event.target.value.trim().toUpperCase() || 'WORLD' })} />
                <Select value={holder.review_status} onValueChange={(value) => onUpdateRightsHolder(holder.id, { review_status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['confirmed', 'needs_review', 'disputed'].map((status) => <SelectItem key={status} value={status}>{humanizeCatalogRole(status)}</SelectItem>)}</SelectContent></Select>
                {canDelete ? <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveRightsHolder(holder.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button> : <span />}
              </div>
            ))}
            {!rightsHolders.length && <p className="text-sm text-warning">No master rights holder recorded.</p>}
            <div className="grid gap-2 border-t border-border pt-3 md:grid-cols-2 lg:grid-cols-[1fr_180px_110px_110px_auto] lg:items-end">
              <div className="space-y-1"><Label>Rights party</Label><Select value={ownerId} onValueChange={setOwnerId}><SelectTrigger><SelectValue placeholder="Select owner or licensee" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Rights type</Label><Select value={rightsType} onValueChange={setRightsType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{recordingRightsTypes.map((type) => <SelectItem key={type} value={type}>{humanizeCatalogRole(type)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Ownership %</Label><Input type="number" min="0" max="100" step="0.0001" value={ownerShare} onChange={(event) => setOwnerShare(event.target.value)} /></div>
              <div className="space-y-1"><Label>Territory</Label><Input value={territory} onChange={(event) => setTerritory(event.target.value)} /></div>
              <Button type="button" onClick={addOwner}><Plus className="mr-1 h-4 w-4" />Add</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
