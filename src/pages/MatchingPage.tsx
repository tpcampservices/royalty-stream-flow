import { sampleUsageLogLines } from '@/data/sampleData';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function MatchingPage() {
  const matched = sampleUsageLogLines.filter(l => l.matched);
  const unmatched = sampleUsageLogLines.filter(l => !l.matched);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total Lines</p>
          <p className="text-2xl font-heading font-bold text-foreground">{sampleUsageLogLines.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle className="w-4 h-4 text-success" /> Matched</p>
          <p className="text-2xl font-heading font-bold text-success">{matched.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-destructive" /> Unmatched</p>
          <p className="text-2xl font-heading font-bold text-destructive">{unmatched.length}</p>
        </div>
      </div>

      {unmatched.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" /> Unmatched Records — Requires Resolution
          </h3>
          <div className="space-y-3">
            {unmatched.map(l => (
              <div key={l.id} className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div>
                  <p className="font-medium text-foreground">{l.songTitle}</p>
                  <p className="text-xs text-muted-foreground">{l.source} • {l.date} • Artist: {l.performingArtist}</p>
                  {l.workCode && <p className="text-xs font-mono text-primary mt-1">Code: {l.workCode}</p>}
                  {!l.workCode && <p className="text-xs text-destructive mt-1">No work code</p>}
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/80 transition-colors">
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
