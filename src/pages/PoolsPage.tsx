import { samplePools, sourceTypeLabels } from '@/data/sampleData';
import { CheckCircle, Clock } from 'lucide-react';

export default function PoolsPage() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">Distribution pools for the current period</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {samplePools.map(pool => (
          <div key={pool.id} className="stat-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-foreground">{sourceTypeLabels[pool.sourceType]}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                pool.status === 'approved' ? 'bg-success/20 text-success' :
                pool.status === 'calculating' ? 'bg-info/20 text-info' :
                'bg-muted text-muted-foreground'
              }`}>
                {pool.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {pool.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground block">Gross</span><span className="text-foreground font-semibold">${pool.grossAmount.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground block">Net Distributable</span><span className="text-foreground font-semibold">${pool.netAmount.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground block">Weighted Points</span><span className="text-foreground font-semibold">{pool.totalWeightedPoints || '—'}</span></div>
              <div><span className="text-muted-foreground block">Point Value</span><span className="text-foreground font-semibold">{pool.pointValue ? `$${pool.pointValue.toFixed(2)}` : '—'}</span></div>
            </div>
            <div className="text-xs text-muted-foreground">{pool.period}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
