import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTable } from '@/hooks/useTable';
import { Member, Payment, Pool, SoundRecording, UsageLog, money, sourceTypeLabels } from '@/lib/types';

export default function ReportsPage() {
  const { rows: pools } = useTable<Pool>('pools', 'period', true);
  const { rows: logs } = useTable<UsageLog>('usage_logs');
  const { rows: members } = useTable<Member>('members', 'name', true);
  const { rows: recordings } = useTable<SoundRecording>('sound_recordings', 'title', true);
  const { rows: payments } = useTable<Payment>('payments');

  const poolSummary = pools.map((p) => ({
    pool: `${sourceTypeLabels[p.source_type]} ${p.period}`,
    collected: Number(p.gross_amount),
    distributed: payments.filter((x) => x.pool_id === p.id && x.status === 'paid').reduce((s, x) => s + Number(x.amount), 0),
  }));

  const matchRate = logs.length ? Math.round((logs.filter((l) => l.matched).length / logs.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Collection vs distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={poolSummary}>
              <XAxis dataKey="pool" tick={{ fill: 'hsl(226,20%,55%)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(226,20%,55%)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'hsl(240,18%,9%)', border: '1px solid hsl(240,14%,18%)', borderRadius: 8, color: 'hsl(226,100%,94%)' }} />
              <Bar dataKey="collected" fill="hsl(239,84%,67%)" name="Collected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="distributed" fill="hsl(142,76%,36%)" name="Distributed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Key metrics</h3>
          <div className="space-y-4">
            {[
              { label: 'Total members', value: members.length },
              { label: 'Sound recordings', value: recordings.length },
              { label: 'Usage log lines', value: logs.length },
              { label: 'Match rate', value: `${matchRate}%` },
              { label: 'Distribution pools', value: pools.length },
              { label: 'Paid to members', value: money(payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)) },
              { label: 'Outstanding payments', value: money(payments.filter((p) => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0)) },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{m.label}</span>
                <span className="text-sm font-bold text-foreground">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
