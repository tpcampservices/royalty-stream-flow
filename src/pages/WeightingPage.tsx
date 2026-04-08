import { sampleWeightingRules } from '@/data/sampleData';
import { Badge } from '@/components/ui/badge';

export default function WeightingPage() {
  const grouped = sampleWeightingRules.reduce((acc, r) => {
    if (!acc[r.sourceType]) acc[r.sourceType] = [];
    acc[r.sourceType].push(r);
    return acc;
  }, {} as Record<string, typeof sampleWeightingRules>);

  const labels: Record<string, string> = { event: 'Special Events', radio: 'Radio', venue: 'Venues', shop: 'Shops & Stores' };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">Weighting codes by source type — determines how much each usage type is worth relative to others</p>
      {Object.entries(grouped).map(([type, rules]) => (
        <div key={type} className="glass-card p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">{labels[type] || type}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rules.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div>
                  <span className="font-mono text-primary text-sm font-bold">{r.code}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.label}</p>
                </div>
                <div className="text-2xl font-heading font-bold text-foreground">{r.weight}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
