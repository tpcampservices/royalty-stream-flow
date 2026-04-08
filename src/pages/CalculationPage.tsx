import { sampleUsageLogLines, samplePools, sampleWorks, sourceTypeLabels } from '@/data/sampleData';

export default function CalculationPage() {
  const pool = samplePools.find(p => p.id === 'p1')!;
  const matchedLines = sampleUsageLogLines.filter(l => l.poolId === 'p1' && l.matched);

  // Aggregate by work
  const workTotals: Record<string, { title: string; total: number; lines: number }> = {};
  matchedLines.forEach(l => {
    if (!workTotals[l.workCode]) workTotals[l.workCode] = { title: l.songTitle, total: 0, lines: 0 };
    workTotals[l.workCode].total += l.allocation || 0;
    workTotals[l.workCode].lines += 1;
  });

  // Member splits
  const memberAllocations: { member: string; work: string; role: string; share: number; amount: number }[] = [];
  Object.entries(workTotals).forEach(([code, wt]) => {
    const work = sampleWorks.find(w => w.code === code);
    if (work) {
      work.shares.forEach(s => {
        memberAllocations.push({
          member: s.memberName,
          work: wt.title,
          role: s.role,
          share: s.percentage,
          amount: wt.total * (s.percentage / 100),
        });
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Pool summary */}
      <div className="glass-card p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4">
          Calculation — {sourceTypeLabels[pool.sourceType]} Pool ({pool.period})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-muted-foreground block">Net Pool</span><span className="text-foreground font-bold text-lg">${pool.netAmount.toLocaleString()}</span></div>
          <div><span className="text-muted-foreground block">Total Weighted Points</span><span className="text-foreground font-bold text-lg">{pool.totalWeightedPoints}</span></div>
          <div><span className="text-muted-foreground block">Point Value</span><span className="text-primary font-bold text-lg">${pool.pointValue.toFixed(2)}</span></div>
          <div><span className="text-muted-foreground block">Matched Lines</span><span className="text-foreground font-bold text-lg">{matchedLines.length}</span></div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground font-mono">
          point_value = ${pool.netAmount.toLocaleString()} ÷ {pool.totalWeightedPoints} = ${pool.pointValue.toFixed(2)}
        </div>
      </div>

      {/* Work aggregation */}
      <div className="glass-card p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4">Work-Level Aggregation</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-4">Work Code</th>
              <th className="text-left py-3 px-4">Title</th>
              <th className="text-right py-3 px-4">Usage Lines</th>
              <th className="text-right py-3 px-4">Total Allocation</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(workTotals).map(([code, wt]) => (
              <tr key={code} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-mono text-primary text-xs">{code}</td>
                <td className="py-3 px-4 font-medium text-foreground">{wt.title}</td>
                <td className="py-3 px-4 text-right text-foreground">{wt.lines}</td>
                <td className="py-3 px-4 text-right text-foreground font-bold">${wt.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Member splits */}
      <div className="glass-card p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4">Member-Level Split</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-4">Member</th>
              <th className="text-left py-3 px-4">Work</th>
              <th className="text-left py-3 px-4">Role</th>
              <th className="text-right py-3 px-4">Share %</th>
              <th className="text-right py-3 px-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {memberAllocations.map((a, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium text-foreground">{a.member}</td>
                <td className="py-3 px-4 text-muted-foreground">{a.work}</td>
                <td className="py-3 px-4 text-muted-foreground">{a.role}</td>
                <td className="py-3 px-4 text-right text-foreground">{a.share}%</td>
                <td className="py-3 px-4 text-right text-primary font-bold">${a.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
