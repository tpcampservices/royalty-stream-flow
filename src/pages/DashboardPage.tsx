import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Music, AlertTriangle, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { useTable } from '@/hooks/useTable';
import { Member, Payment, Pool, SoundRecording, UsageLog, money, sourceTypeLabels } from '@/lib/types';

const COLORS = ['hsl(239,84%,67%)', 'hsl(142,76%,36%)', 'hsl(38,92%,50%)', 'hsl(199,89%,48%)'];

export default function DashboardPage() {
  const { rows: members } = useTable<Member>('members', 'name', true);
  const { rows: recordings } = useTable<SoundRecording>('sound_recordings', 'title', true);
  const { rows: pools } = useTable<Pool>('pools', 'period', true);
  const { rows: logs } = useTable<UsageLog>('usage_logs');
  const { rows: payments } = useTable<Payment>('payments');

  const totalCollections = pools.reduce((s, p) => s + Number(p.gross_amount), 0);
  const unmatched = logs.filter((l) => !l.matched).length;
  const paid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);

  const stats = [
    { label: 'Total collections', value: money(totalCollections), icon: DollarSign, note: `${pools.length} pools` },
    { label: 'Active members', value: String(members.filter((m) => m.status === 'active').length), icon: Users, note: `${members.length} total` },
    { label: 'Sound recordings', value: String(recordings.length), icon: Music, note: 'in registry' },
    { label: 'Unmatched lines', value: String(unmatched), icon: AlertTriangle, note: `${logs.length} usage lines` },
  ];

  const chartData = pools.map((p) => ({ name: `${sourceTypeLabels[p.source_type]} ${p.period}`, gross: Number(p.gross_amount), net: Number(p.net_amount) }));
  const pieData = pools.filter((p) => Number(p.gross_amount) > 0).map((p) => ({ name: sourceTypeLabels[p.source_type], value: Number(p.gross_amount) }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.note}</p>
          </div>
        ))}
      </div>

      {!pools.length && !members.length && (
        <div className="glass-card p-10 text-center space-y-2">
          <h2 className="font-heading font-semibold text-foreground">Welcome to the TTCO suite</h2>
          <p className="text-sm text-muted-foreground">Start by importing members and sound recordings, then add licensees, usage logs and a distribution pool.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Collections by pool</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fill: 'hsl(226,20%,55%)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(226,20%,55%)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'hsl(240,18%,9%)', border: '1px solid hsl(240,14%,18%)', borderRadius: 8, color: 'hsl(226,100%,94%)' }} />
              <Bar dataKey="gross" fill="hsl(239,84%,67%)" radius={[4, 4, 0, 0]} name="Gross" />
              <Bar dataKey="net" fill="hsl(142,76%,36%)" radius={[4, 4, 0, 0]} name="Net" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Revenue split</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(240,18%,9%)', border: '1px solid hsl(240,14%,18%)', borderRadius: 8, color: 'hsl(226,100%,94%)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Paid to members</span>
              <span className="text-foreground font-medium">{money(paid)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4">Distribution pools</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-4">Pool</th>
                <th className="text-left py-3 px-4">Period</th>
                <th className="text-right py-3 px-4">Gross</th>
                <th className="text-right py-3 px-4">Net</th>
                <th className="text-right py-3 px-4">Point value</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {!pools.length && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No pools yet.</td></tr>}
              {pools.map((pool) => (
                <tr key={pool.id} className="border-b border-border/50">
                  <td className="py-3 px-4 font-medium text-foreground">{pool.name || sourceTypeLabels[pool.source_type]}</td>
                  <td className="py-3 px-4 text-muted-foreground">{pool.period}</td>
                  <td className="py-3 px-4 text-right text-foreground">{money(pool.gross_amount)}</td>
                  <td className="py-3 px-4 text-right text-foreground">{money(pool.net_amount)}</td>
                  <td className="py-3 px-4 text-right text-foreground">{Number(pool.point_value) ? money(pool.point_value) : '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      pool.status === 'approved' || pool.status === 'paid' ? 'bg-success/20 text-success' :
                      pool.status === 'calculating' ? 'bg-info/20 text-info' : 'bg-muted text-muted-foreground'}`}>
                      {pool.status === 'approved' || pool.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {pool.status}
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
