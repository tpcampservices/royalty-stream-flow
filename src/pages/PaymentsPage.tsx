import { sampleMembers } from '@/data/sampleData';
import { DollarSign, FileText, Download } from 'lucide-react';

export default function PaymentsPage() {
  const activeMembers = sampleMembers.filter(m => m.status === 'active');
  const totalPayable = activeMembers.reduce((sum, m) => sum + m.totalEarnings, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total Payable</p>
          <p className="text-2xl font-heading font-bold text-primary">${totalPayable.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Members to Pay</p>
          <p className="text-2xl font-heading font-bold text-foreground">{activeMembers.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Distribution Status</p>
          <p className="text-2xl font-heading font-bold text-warning">Pending Approval</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-foreground">Member Payment Schedule</h3>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-4">Member</th>
              <th className="text-left py-3 px-4">Role</th>
              <th className="text-right py-3 px-4">Amount</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeMembers.map(m => (
              <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium text-foreground">{m.name}</td>
                <td className="py-3 px-4 capitalize text-muted-foreground">{m.role}</td>
                <td className="py-3 px-4 text-right text-foreground font-bold">${m.totalEarnings.toLocaleString()}</td>
                <td className="py-3 px-4"><span className="px-2 py-1 rounded-full text-xs bg-warning/20 text-warning">Pending</span></td>
                <td className="py-3 px-4">
                  <button className="text-xs text-primary hover:underline flex items-center gap-1"><FileText className="w-3 h-3" /> Statement</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
