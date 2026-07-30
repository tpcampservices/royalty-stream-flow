import { useState } from 'react';
import { CheckCircle, AlertTriangle, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTable } from '@/hooks/useTable';
import { SoundRecording, UsageLog } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const clean = (value?: string | null) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export default function MatchingPage() {
  const logs = useTable<UsageLog>('usage_logs', 'usage_date', false);
  const { rows: recordings } = useTable<SoundRecording>('sound_recordings', 'title', true);
  const [busy, setBusy] = useState(false);

  const matched = logs.rows.filter((l) => l.matched);
  const unmatched = logs.rows.filter((l) => !l.matched);

  const findMatch = (line: UsageLog) =>
    recordings.find((r) => r.isrc && line.isrc && clean(r.isrc) === clean(line.isrc)) ||
    recordings.find((r) => r.recording_code && line.recording_code && clean(r.recording_code) === clean(line.recording_code)) ||
    recordings.find((r) => clean(r.title) === clean(line.song_title) && (!line.performing_artist || clean(r.artist) === clean(line.performing_artist))) ||
    recordings.find((r) => clean(r.title) === clean(line.song_title));

  const autoMatch = async () => {
    setBusy(true);
    let count = 0;
    for (const line of unmatched) {
      const hit = findMatch(line);
      if (!hit) continue;
      const { error } = await supabase.from('usage_logs').update({ recording_id: hit.id, matched: true }).eq('id', line.id);
      if (!error) count += 1;
    }
    setBusy(false);
    logs.invalidate();
    toast({ title: `Auto-match complete`, description: `${count} of ${unmatched.length} lines matched to sound recordings.` });
  };

  const link = (lineId: string, recordingId: string) =>
    logs.update.mutate({ id: lineId, values: { recording_id: recordingId, matched: true } });

  const unlink = (lineId: string) =>
    logs.update.mutate({ id: lineId, values: { recording_id: null, matched: false, allocation: null } });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-sm text-muted-foreground">Total lines</p><p className="text-2xl font-heading font-bold text-foreground">{logs.rows.length}</p></div>
        <div className="stat-card"><p className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle className="w-4 h-4 text-success" /> Matched</p><p className="text-2xl font-heading font-bold text-success">{matched.length}</p></div>
        <div className="stat-card"><p className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-destructive" /> Unmatched</p><p className="text-2xl font-heading font-bold text-destructive">{unmatched.length}</p></div>
      </div>

      <div className="flex justify-end">
        <Button onClick={autoMatch} disabled={busy || !unmatched.length || !recordings.length}>
          <Wand2 className="w-4 h-4 mr-2" />{busy ? 'Matching…' : 'Auto-match to recordings'}
        </Button>
      </div>

      {unmatched.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" /> Unmatched records — requires resolution
          </h3>
          <div className="space-y-3">
            {unmatched.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{l.song_title || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">{l.source || '—'} • {l.usage_date || '—'} • Artist: {l.performing_artist || 'Unknown'}</p>
                  <p className="text-xs font-mono text-primary mt-1">{l.isrc || l.recording_code || 'No ISRC'}</p>
                </div>
                <Select onValueChange={(v) => link(l.id, v)}>
                  <SelectTrigger className="w-72"><SelectValue placeholder="Link to sound recording" /></SelectTrigger>
                  <SelectContent>
                    {recordings.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}{r.artist ? ` — ${r.artist}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {matched.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Matched lines</h3>
          <div className="space-y-2">
            {matched.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                <div>
                  <p className="text-sm text-foreground">{l.song_title}</p>
                  <p className="text-xs text-muted-foreground">→ {recordings.find((r) => r.id === l.recording_id)?.title || 'Recording removed'}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => unlink(l.id)}>Unmatch</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
