import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { Member, RecordingShare, SoundRecording, shareRoles } from '@/lib/types';

interface Props {
  recording: SoundRecording | null;
  members: Member[];
  shares: RecordingShare[];
  onClose: () => void;
  onAdd: (values: Record<string, unknown>) => void;
  onUpdate: (id: string, values: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
}

export default function SharesDialog({ recording, members, shares, onClose, onAdd, onUpdate, onRemove }: Props) {
  const [memberId, setMemberId] = useState('');
  const [role, setRole] = useState('Composer');
  const [percentage, setPercentage] = useState('');

  const total = shares.reduce((sum, s) => sum + Number(s.percentage), 0);

  const add = () => {
    const value = Number(percentage);
    if (!memberId || !Number.isFinite(value) || value <= 0 || value > 100) return;
    onAdd({ recording_id: recording?.id, member_id: memberId, role, percentage: value });
    setMemberId(''); setPercentage('');
  };

  return (
    <Dialog open={!!recording} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Linked members — {recording?.title}</DialogTitle></DialogHeader>

        <div className="space-y-3">
          {shares.length === 0 && <p className="text-sm text-muted-foreground">No members linked to this recording yet.</p>}
          {shares.map((s) => (
            <div key={s.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
              <span className="flex-1 text-sm text-foreground">{members.find((m) => m.id === s.member_id)?.name || 'Unknown member'}</span>
              <Select value={s.role} onValueChange={(v) => onUpdate(s.id, { role: v })}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{shareRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Input
                type="number" className="w-24" defaultValue={Number(s.percentage)}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isFinite(value) && value >= 0 && value <= 100) onUpdate(s.id, { percentage: value });
                }}
              />
              <span className="text-sm text-muted-foreground">%</span>
              <Button variant="ghost" size="icon" onClick={() => onRemove(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}

          <p className={`text-xs ${total === 100 ? 'text-success' : 'text-warning'}`}>Total allocated: {total}%</p>

          <div className="border-t border-border pt-4 space-y-3">
            <Label>Link another member</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{shareRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="%" className="w-24" value={percentage} onChange={(e) => setPercentage(e.target.value)} />
              <Button onClick={add}><Plus className="w-4 h-4 mr-1" />Link</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
