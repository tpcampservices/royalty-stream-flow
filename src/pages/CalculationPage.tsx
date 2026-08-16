import { useMemo, useState } from 'react';
import { AlertTriangle, Calculator, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useTable } from '@/hooks/useTable';
import { allocateByPercentage, percentageComplete, percentageTotal } from '@/lib/catalog';
import {
  CompositionPublisher,
  CompositionWriter,
  Member,
  Payment,
  Pool,
  RecordingComposition,
  RecordingRightsHolder,
  SoundRecording,
  UsageLog,
  money,
  sourceTypeLabels,
} from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { exportRows } from '@/lib/importUtils';

export default function CalculationPage() {
  const { currentOrganizationId } = useAuth();
  const pools = useTable<Pool>('pools', 'period', true);
  const logs = useTable<UsageLog>('usage_logs', 'usage_date', false);
  const { rows: recordings } = useTable<SoundRecording>('sound_recordings', 'title', true);
  const { rows: recordingCompositions } = useTable<RecordingComposition>('recording_compositions');
  const { rows: compositionWriters } = useTable<CompositionWriter>('composition_writers');
  const { rows: compositionPublishers } = useTable<CompositionPublisher>('composition_publishers');
  const { rows: recordingRightsHolders } = useTable<RecordingRightsHolder>('recording_rights_holders');
  const { rows: members } = useTable<Member>('members', 'name', true);
  const payments = useTable<Payment>('payments');
  const [poolId, setPoolId] = useState('');
  const [busy, setBusy] = useState(false);

  const pool = pools.rows.find((item) => item.id === poolId);
  const lines = useMemo(() => logs.rows.filter((line) => line.pool_id === poolId && line.matched), [logs.rows, poolId]);
  const totalPoints = lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.weight), 0);
  const pointValue = pool && totalPoints > 0 ? Number(pool.net_amount) / totalPoints : 0;

  const allocationPreview = useMemo(() => {
    const totals: Record<string, { amount: number; recordings: Set<string> }> = {};
    const unresolved: { lineId: string; reason: string }[] = [];

    const add = (memberId: string, amount: number, recordingTitle: string) => {
      totals[memberId] ||= { amount: 0, recordings: new Set() };
      totals[memberId].amount += amount;
      totals[memberId].recordings.add(recordingTitle);
    };

    lines.forEach((line) => {
      if (!line.recording_id) {
        unresolved.push({ lineId: line.id, reason: 'No sound recording linked' });
        return;
      }
      const recordingTitle = recordings.find((recording) => recording.id === line.recording_id)?.title || line.song_title || 'Recording';
      const lineAmount = Number(line.quantity) * Number(line.weight) * pointValue;
      const lineAllocations: { memberId: string; amount: number }[] = [];

      if (pool?.rights_domain === 'master') {
        const owners = recordingRightsHolders.filter((holder) =>
          holder.recording_id === line.recording_id
          && holder.rights_type === 'master_owner'
          && holder.territory === 'WORLD'
          && holder.review_status === 'confirmed');
        const total = percentageTotal(owners, (holder) => holder.ownership_percentage);
        if (!percentageComplete(total)) {
          unresolved.push({ lineId: line.id, reason: `Worldwide master ownership totals ${total}%` });
          return;
        }
        lineAllocations.push(...allocateByPercentage(lineAmount, owners, (holder) => holder.member_id, (holder) => holder.ownership_percentage));
      } else {
        const links = recordingCompositions.filter((link) => link.recording_id === line.recording_id);
        const linkTotal = percentageTotal(links, (link) => link.share_percentage);
        if (!percentageComplete(linkTotal)) {
          unresolved.push({ lineId: line.id, reason: `Recording-to-composition coverage totals ${linkTotal}%` });
          return;
        }

        for (const link of links) {
          const writers = compositionWriters.filter((writer) => writer.composition_id === link.composition_id);
          const publishers = compositionPublishers.filter((publisher) => publisher.composition_id === link.composition_id && Number(publisher.ownership_percentage) > 0);
          const interests = [
            ...writers.map((writer) => ({ member_id: writer.member_id, percentage: Number(writer.ownership_percentage) })),
            ...publishers.map((publisher) => ({ member_id: publisher.member_id, percentage: Number(publisher.ownership_percentage) })),
          ];
          const interestTotal = percentageTotal(interests, (interest) => interest.percentage);
          if (!percentageComplete(interestTotal)) {
            unresolved.push({ lineId: line.id, reason: `Composition ownership totals ${interestTotal}%` });
            lineAllocations.length = 0;
            break;
          }
          const compositionAmount = lineAmount * (Number(link.share_percentage) / 100);
          lineAllocations.push(...allocateByPercentage(compositionAmount, interests, (interest) => interest.member_id, (interest) => interest.percentage));
        }
      }

      lineAllocations.forEach((allocation) => add(allocation.memberId, allocation.amount, recordingTitle));
    });

    const memberTotals = Object.entries(totals).map(([id, value]) => ({
      id,
      name: members.find((member) => member.id === id)?.name || 'Unknown rights party',
      amount: value.amount,
      recordings: value.recordings.size,
    })).sort((a, b) => b.amount - a.amount);

    return { memberTotals, unresolved };
  }, [lines, pointValue, pool?.rights_domain, recordings, recordingCompositions, compositionWriters, compositionPublishers, recordingRightsHolders, members]);

  const existingPayments = payments.rows.filter((payment) => payment.pool_id === poolId);

  const runCalculation = async () => {
    if (!pool || !currentOrganizationId) return;
    setBusy(true);
    for (const line of lines) {
      const { error } = await supabase.from('usage_logs')
        .update({ allocation: Number(line.quantity) * Number(line.weight) * pointValue })
        .eq('id', line.id)
        .eq('organization_id', currentOrganizationId);
      if (error) {
        setBusy(false);
        toast({ title: 'Calculation failed', description: error.message, variant: 'destructive' });
        return;
      }
    }
    const { error } = await supabase.from('pools')
      .update({ total_weighted_points: totalPoints, point_value: pointValue, status: 'approved' })
      .eq('id', pool.id)
      .eq('organization_id', currentOrganizationId);
    setBusy(false);
    if (error) return toast({ title: 'Calculation failed', description: error.message, variant: 'destructive' });
    void logs.invalidate();
    void pools.invalidate();
    toast({ title: 'Calculation complete', description: `${lines.length} lines valued at ${money(pointValue)} per point. ${allocationPreview.unresolved.length} line(s) remain in suspense.` });
  };

  const generatePayments = async () => {
    if (!pool || !currentOrganizationId || !allocationPreview.memberTotals.length || allocationPreview.unresolved.length) return;
    if (existingPayments.length) {
      toast({ title: 'Payments already exist', description: 'Remove or reconcile the existing pool payments before generating another batch.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('payments').insert(
      allocationPreview.memberTotals.map((member) => ({ organization_id: currentOrganizationId, member_id: member.id, pool_id: pool.id, amount: Number(member.amount.toFixed(2)), status: 'pending' })),
    );
    setBusy(false);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    void payments.invalidate();
    toast({ title: 'Payments created', description: `${allocationPreview.memberTotals.length} rights-party payments are pending on the Payments page.` });
  };

  return (
    <div className="space-y-6">
      <div className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Distribution pool</p>
            <Select value={poolId} onValueChange={setPoolId}>
              <SelectTrigger className="w-80"><SelectValue placeholder="Select a pool to calculate" /></SelectTrigger>
              <SelectContent>{pools.rows.map((item) => <SelectItem key={item.id} value={item.id}>{item.name || sourceTypeLabels[item.source_type]} — {item.period} ({item.rights_domain})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={runCalculation} disabled={!pool || !lines.length || busy}><Calculator className="mr-2 h-4 w-4" />Run calculation</Button>
          <Button variant="outline" onClick={generatePayments} disabled={!allocationPreview.memberTotals.length || allocationPreview.unresolved.length > 0 || existingPayments.length > 0 || busy}><Wallet className="mr-2 h-4 w-4" />Create payments</Button>
        </div>

        {!pool && <p className="text-sm text-muted-foreground">Choose a pool to see the distribution breakdown.</p>}
        {pool && <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5"><div><span className="block text-muted-foreground">Rights domain</span><span className="font-semibold capitalize text-foreground">{pool.rights_domain}</span></div><div><span className="block text-muted-foreground">Net distributable</span><span className="font-semibold text-foreground">{money(pool.net_amount)}</span></div><div><span className="block text-muted-foreground">Matched lines</span><span className="font-semibold text-foreground">{lines.length}</span></div><div><span className="block text-muted-foreground">Weighted points</span><span className="font-semibold text-foreground">{totalPoints || '—'}</span></div><div><span className="block text-muted-foreground">Point value</span><span className="font-semibold text-primary">{pointValue ? money(pointValue) : '—'}</span></div></div>}
      </div>

      {pool && allocationPreview.unresolved.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />{allocationPreview.unresolved.length} usage line(s) cannot be paid yet</p>
          <p className="mt-1">Complete the recording links and applicable {pool.rights_domain} ownership to 100%. Payment generation remains locked so incomplete shares are not silently normalized.</p>
          <ul className="mt-2 list-disc pl-5 text-xs">{allocationPreview.unresolved.slice(0, 5).map((item) => <li key={`${item.lineId}-${item.reason}`}>{item.reason}</li>)}</ul>
        </div>
      )}

      {pool && lines.length > 0 && (
        <>
          <div className="glass-card overflow-x-auto">
            <div className="flex items-center justify-between p-4"><h3 className="font-heading font-semibold text-foreground">Line allocations</h3></div>
            <table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="px-4 py-3 text-left">Recording</th><th className="px-4 py-3 text-left">Source</th><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Weight</th><th className="px-4 py-3 text-right">Points</th><th className="px-4 py-3 text-right">Allocation</th></tr></thead><tbody>{lines.map((line) => { const points = Number(line.quantity) * Number(line.weight); return <tr key={line.id} className="border-b border-border/50"><td className="px-4 py-3 text-foreground">{recordings.find((recording) => recording.id === line.recording_id)?.title || line.song_title}</td><td className="px-4 py-3 text-xs text-muted-foreground">{line.source || '—'}</td><td className="px-4 py-3 font-mono text-xs text-foreground">{line.usage_code || '—'}</td><td className="px-4 py-3 text-right text-foreground">{line.quantity}</td><td className="px-4 py-3 text-right text-foreground">{Number(line.weight)}</td><td className="px-4 py-3 text-right text-foreground">{points}</td><td className="px-4 py-3 text-right font-medium text-foreground">{money(points * pointValue)}</td></tr>; })}</tbody></table>
          </div>

          <div className="glass-card overflow-x-auto">
            <div className="flex items-center justify-between p-4"><h3 className="font-heading font-semibold text-foreground">Rights-party entitlements</h3><Button variant="outline" size="sm" onClick={() => exportRows('rights-party-entitlements.xlsx', allocationPreview.memberTotals.map((member) => ({ rights_party: member.name, amount: member.amount.toFixed(2) })))}>Export</Button></div>
            <table className="w-full text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="px-4 py-3 text-left">Rights party</th><th className="px-4 py-3 text-right">Recordings</th><th className="px-4 py-3 text-right">Entitlement</th></tr></thead><tbody>{allocationPreview.memberTotals.map((member) => <tr key={member.id} className="border-b border-border/50"><td className="px-4 py-3 font-medium text-foreground">{member.name}</td><td className="px-4 py-3 text-right text-muted-foreground">{member.recordings}</td><td className="px-4 py-3 text-right font-bold text-primary">{money(member.amount)}</td></tr>)}</tbody></table>
          </div>
        </>
      )}

      {pool && !lines.length && <div className="glass-card p-10 text-center text-sm text-muted-foreground">No matched usage lines in this pool yet. Import usage logs, assign them to this pool, then match them to sound recordings.</div>}
    </div>
  );
}
