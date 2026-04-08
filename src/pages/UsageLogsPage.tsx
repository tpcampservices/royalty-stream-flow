import { sampleUsageLogLines } from '@/data/sampleData';
import { Badge } from '@/components/ui/badge';

export default function UsageLogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{sampleUsageLogLines.length} log lines — {sampleUsageLogLines.filter(l => !l.matched).length} unmatched</p>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-3">Source</th>
              <th className="text-left py-3 px-3">Date</th>
              <th className="text-left py-3 px-3">Work Code</th>
              <th className="text-left py-3 px-3">Song Title</th>
              <th className="text-left py-3 px-3">Artist</th>
              <th className="text-left py-3 px-3">Type</th>
              <th className="text-left py-3 px-3">Code</th>
              <th className="text-right py-3 px-3">Weight</th>
              <th className="text-left py-3 px-3">Status</th>
              <th className="text-right py-3 px-3">Allocation</th>
            </tr>
          </thead>
          <tbody>
            {sampleUsageLogLines.map(l => (
              <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-3 text-foreground text-xs">{l.source}</td>
                <td className="py-3 px-3 text-muted-foreground text-xs">{l.date}</td>
                <td className="py-3 px-3 font-mono text-primary text-xs">{l.workCode || '—'}</td>
                <td className="py-3 px-3 font-medium text-foreground text-xs">{l.songTitle}</td>
                <td className="py-3 px-3 text-muted-foreground text-xs">{l.performingArtist}</td>
                <td className="py-3 px-3"><Badge variant="secondary" className="text-xs border-0">{l.diffusionType}</Badge></td>
                <td className="py-3 px-3 font-mono text-xs text-foreground">{l.usageCode}</td>
                <td className="py-3 px-3 text-right text-foreground">{l.weight}</td>
                <td className="py-3 px-3">
                  <Badge variant="secondary" className={l.matched ? 'bg-success/20 text-success border-0 text-xs' : 'bg-destructive/20 text-destructive border-0 text-xs'}>
                    {l.matched ? 'Matched' : 'Unmatched'}
                  </Badge>
                </td>
                <td className="py-3 px-3 text-right text-foreground font-medium">{l.allocation ? `$${l.allocation.toFixed(2)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
