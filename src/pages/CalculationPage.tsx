import { useMemo, useState } from 'react';
import { Calculator, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTable } from '@/hooks/useTable';
import { Member, Pool, RecordingShare, SoundRecording, UsageLog, money, sourceTypeLabels } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { exportRows } from '@/lib/importUtils';

export default function CalculationPage() {
  const pools = useTable<Pool>('pools', 'period', true);
  const logs = useTable<UsageLog>('usage_logs', 'usage_date', false);
  const { rows: recordings } = useTable<SoundRecording>('sound_recordings', 'title', true);
  const { rows: shares } = useTable<RecordingShare>('recording_shares');
  const { rows: members } = useTable<Member>('members', 'name', true);
  const payments = useTable<{ id: string }>('payments');
  const [poolId, setPoolId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const pool = pools.rows.find((p) => p.id === poolId);
  const lines = useMemo(() => logs.rows.filter((l) => l.pool_id === poolId && l.matched), [logs.rows, poolId]);

  const totalPoints = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.weight), 0);
  const pointValue = pool && totalPoints > 0 ? Number(pool.net_amount) / totalPoints : 0;

  const memberTotals = useMemo(() => {
    const totals: Record<string, { name: string; amount: number; recordings: Set<string> }> = {};
    lines.forEach((line) => {
      const allocation = Number(line.quantity) * Number(line.weight) * pointValue;
      const recordingShares = shares.filter((s) => s.recording_id === line.recording_id);
      const shareTotal = recordingShares.reduce((s, x) => s + Number(x.percentage), 0) || 100;
      recordingShares.forEach((s) => {
        const member = members.find((m) => m.id === s.member_id);
        if (!member) return;
        totals[member.id] ||= { name: member.name, amount: 0, recordings: new Set() };
        totals[member.id].amount += allocation * (Number(s.percentage) / shareTotal);
        totals[member.id].recordings.add(recordings.find((r) => r.id === line.recording_id)?.title || '');
      });
    });
    return Object.entries(totals).map(([id, v]) => ({ id, name: v.name, amount: v.amount, recordings: v.recordings.size }))
      .sort((a, b) => b.amount - a.amount);
  }, [lines, pointValue, shares, members, recordings]);

  const runCalculation = async () => {
    if (!pool) return;
    setBusy(true);
    for (const line of lines) {
      await supabase.from('usage_logs')
        .update({ allocation: Number(line.quantity) * Number(line.weight) * pointValue })
        .eq('id', line.id);
    }
    await supabase.from('pools')
      .update({ total_weighted_points: totalPoints, point_value: pointValue, status: 'approved' })
      .eq('id', pool.id);
    setBusy(false);
    logs.invalidate();
    pools.invalidate();
    toast({ title: 'Calculation complete', description: `${lines.length} lines allocated at ${money(pointValue)} per point.` });
  };

  const generatePayments = async () => {
    if (!pool || !memberTotals.length) return;
    setBusy(true);
    const { error } = await supabase.from('payments').insert(
      memberTotals.map((m) => ({ member_id: m.id, pool_id: pool.id, amount: Number(m.amount.toFixed(2)), status: 'pending' }))
    );
    setBusy(false);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    payments.invalidate();
    toast({ title: 'Payments created', description: `${memberTotals.length} member payments are pending on the Payments page.` });
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Distribution pool</p>
            <Select value={poolId} onValueChange={setPoolId}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Select a pool to calculate" /></SelectTrigger>
              <SelectContent>
                {pools.rows.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || sourceTypeLabels[p.source_type]} — {p.period}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runCalculation} disabled={!pool || !lines.length || busy}><Calculator className="w-4 h-4 mr-2" />Run calculation</Button>
          <Button variant="outline" onClick={generatePayments} disabled={!memberTotals.length || busy}><Wallet className="w-4 h-4 mr-2" />Create member payments</Button>
        </div>

        {!pool && <p className="text-sm text-muted-foreground">Choose a pool to see the distribution breakdown.</p>}
        {pool && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground block">Net distributable</span><span className="text-foreground font-semibold">{money(pool.net_amount)}</span></div>
            <div><span className="text-muted-foreground block">Matched lines</span><span className="text-foreground font-semibold">{lines.length}</span></div>
            <div><span className="text-muted-foreground block">Total weighted points</span><span className="text-foreground font-semibold">{totalPoints || '—'}</span></div>
            <div><span className="text-muted-foreground block">Point value</span><span className="text-primary font-semibold">{pointValue ? money(pointValue) : '—'}</span></div>
          </div>
        )}
      </div>

      {pool && lines.length > 0 && (
        <>
          <div className="glass-card overflow-x-auto">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-heading font-semibold text-foreground">Line allocations</h3>
            </div>
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-4">Recording</th>
                  <th className="text-left py-3 px-4">Source</th>
                  <th className="text-left py-3 px-4">Code</th>
                  <th className="text-right py-3 px-4">Qty</th>
                  <th className="text-right py-3 px-4">Weight</th>
                  <th className="text-right py-3 px-4">Points</th>
                  <th className="text-right py-3 px-4">Allocation</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const points = Number(l.quantity) * Number(l.weight);
                  return (
                    <tr key={l.id} className="border-b border-border/50">
                      <td className="py-3 px-4 text-foreground">{recordings.find((r) => r.id === l.recording_id)?.title || l.song_title}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{l.source || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-foreground">{l.usage_code || '—'}</td>
                      <td className="py-3 px-4 text-right text-foreground">{l.quantity}</td>
                      <td className="py-3 px-4 text-right text-foreground">{Number(l.weight)}</td>
                      <td className="py-3 px-4 text-right text-foreground">{points}</td>
                      <td className="py-3 px-4 text-right text-foreground font-medium">{money(points * pointValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="glass-card overflow-x-auto">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-heading font-semibold text-foreground">Member entitlements</h3>
              <Button variant="outline" size="sm" onClick={() => exportRows('member-entitlements.xlsx', memberTotals.map((m) => ({ member: m.name, amount: m.amount.toFixed(2) })))}>Export</Button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-4">Member</th>
                  <th className="text-right py-3 px-4">Recordings</th>
                  <th className="text-right py-3 px-4">Entitlement</th>
                </tr>
              </thead>
              <tbody>
                {memberTotals.map((m) => (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="py-3 px-4 text-foreground font-medium">{m.name}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{m.recordings}</td>
                    <td className="py-3 px-4 text-right text-primary font-bold">{money(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {pool && !lines.length && (
        <div className="glass-card p-10 text-center text-muted-foreground text-sm">
          No matched usage lines in this pool yet. Import usage logs, assign them to this pool, then match them to sound recordings.
        </div>
      )}
    </div>
  );
}
