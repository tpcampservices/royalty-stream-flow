import { sampleMembers } from '@/data/sampleData';
import { Badge } from '@/components/ui/badge';

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{sampleMembers.length} registered members</p>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Role</th>
              <th className="text-left py-3 px-4">Email</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Total Earnings</th>
            </tr>
          </thead>
          <tbody>
            {sampleMembers.map(m => (
              <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium text-foreground">{m.name}</td>
                <td className="py-3 px-4 capitalize text-muted-foreground">{m.role}</td>
                <td className="py-3 px-4 text-muted-foreground">{m.email}</td>
                <td className="py-3 px-4">
                  <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className={m.status === 'active' ? 'bg-success/20 text-success border-0' : ''}>
                    {m.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right text-foreground font-medium">${m.totalEarnings.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
