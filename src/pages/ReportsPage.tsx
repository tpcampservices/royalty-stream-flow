import { samplePools, sampleUsageLogLines, sampleMembers, sampleWorks, sourceTypeLabels } from '@/data/sampleData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const poolSummary = samplePools.map(p => ({
    pool: sourceTypeLabels[p.sourceType],
    collected: p.grossAmount,
    distributed: p.status === 'approved' ? p.netAmount : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Collection vs Distribution</h3>
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
          <h3 className="font-heading font-semibold text-foreground mb-4">Key Metrics</h3>
          <div className="space-y-4">
            {[
              { label: 'Total Members', value: sampleMembers.length },
              { label: 'Total Works', value: sampleWorks.length },
              { label: 'Total Usage Lines', value: sampleUsageLogLines.length },
              { label: 'Match Rate', value: `${Math.round((sampleUsageLogLines.filter(l => l.matched).length / sampleUsageLogLines.length) * 100)}%` },
              { label: 'Active Pools', value: samplePools.length },
              { label: 'Disputed Works', value: sampleWorks.filter(w => w.status === 'disputed').length },
            ].map(m => (
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
