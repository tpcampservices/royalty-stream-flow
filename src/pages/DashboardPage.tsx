import { sampleMembers, samplePools, sampleWorks, sampleUsageLogLines, sourceTypeLabels } from '@/data/sampleData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Music, AlertTriangle, DollarSign, FileText, CheckCircle, Clock } from 'lucide-react';

const poolChartData = samplePools.map(p => ({
  name: sourceTypeLabels[p.sourceType],
  gross: p.grossAmount,
  net: p.netAmount,
}));

const pieData = samplePools.map(p => ({
  name: sourceTypeLabels[p.sourceType],
  value: p.grossAmount,
}));

const COLORS = ['hsl(239,84%,67%)', 'hsl(142,76%,36%)', 'hsl(38,92%,50%)', 'hsl(199,89%,48%)'];

const stats = [
  { label: 'Total Collections', value: '$80,500', icon: DollarSign, change: '+12%' },
  { label: 'Active Members', value: sampleMembers.filter(m => m.status === 'active').length.toString(), icon: Users, change: '+3' },
  { label: 'Registered Works', value: sampleWorks.length.toString(), icon: Music, change: '+2' },
  { label: 'Unmatched Lines', value: sampleUsageLogLines.filter(l => !l.matched).length.toString(), icon: AlertTriangle, change: 'Pending' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pool chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Collections by Pool</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={poolChartData}>
              <XAxis dataKey="name" tick={{ fill: 'hsl(226,20%,55%)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(226,20%,55%)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'hsl(240,18%,9%)', border: '1px solid hsl(240,14%,18%)', borderRadius: 8, color: 'hsl(226,100%,94%)' }} />
              <Bar dataKey="gross" fill="hsl(239,84%,67%)" radius={[4, 4, 0, 0]} name="Gross" />
              <Bar dataKey="net" fill="hsl(142,76%,36%)" radius={[4, 4, 0, 0]} name="Net" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie */}
        <div className="glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Revenue Split</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(240,18%,9%)', border: '1px solid hsl(240,14%,18%)', borderRadius: 8, color: 'hsl(226,100%,94%)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="ml-auto text-foreground font-medium">${d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pool status */}
      <div className="glass-card p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4">Distribution Pools — Q1 2025</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-4">Pool</th>
                <th className="text-right py-3 px-4">Gross</th>
                <th className="text-right py-3 px-4">Net</th>
                <th className="text-right py-3 px-4">Weighted Pts</th>
                <th className="text-right py-3 px-4">Point Value</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {samplePools.map(pool => (
                <tr key={pool.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{sourceTypeLabels[pool.sourceType]}</td>
                  <td className="py-3 px-4 text-right text-foreground">${pool.grossAmount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-foreground">${pool.netAmount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-foreground">{pool.totalWeightedPoints || '—'}</td>
                  <td className="py-3 px-4 text-right text-foreground">{pool.pointValue ? `$${pool.pointValue.toFixed(2)}` : '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      pool.status === 'approved' ? 'bg-success/20 text-success' :
                      pool.status === 'calculating' ? 'bg-info/20 text-info' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {pool.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
