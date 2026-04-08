import { sampleWorks } from '@/data/sampleData';
import { Badge } from '@/components/ui/badge';

export default function WorksPage() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{sampleWorks.length} works in registry</p>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-4">Code</th>
              <th className="text-left py-3 px-4">Title</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Ownership Shares</th>
            </tr>
          </thead>
          <tbody>
            {sampleWorks.map(w => (
              <tr key={w.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-mono text-primary text-xs">{w.code}</td>
                <td className="py-3 px-4 font-medium text-foreground">{w.title}</td>
                <td className="py-3 px-4">
                  <Badge variant="secondary" className={
                    w.status === 'registered' ? 'bg-success/20 text-success border-0' :
                    w.status === 'disputed' ? 'bg-destructive/20 text-destructive border-0' :
                    'bg-warning/20 text-warning border-0'
                  }>{w.status}</Badge>
                </td>
                <td className="py-3 px-4">
                  {w.shares.length > 0 ? (
                    <div className="space-y-1">
                      {w.shares.map((s, i) => (
                        <span key={i} className="text-xs text-muted-foreground block">
                          {s.memberName} ({s.role}) — {s.percentage}%
                        </span>
                      ))}
                    </div>
                  ) : <span className="text-xs text-warning">No shares registered</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
