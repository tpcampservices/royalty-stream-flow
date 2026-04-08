import { sampleLicensees, sourceTypeLabels } from '@/data/sampleData';
import { Badge } from '@/components/ui/badge';

export default function LicenseesPage() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{sampleLicensees.length} licensees</p>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Licence Fee</th>
            </tr>
          </thead>
          <tbody>
            {sampleLicensees.map(l => (
              <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium text-foreground">{l.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{sourceTypeLabels[l.type]}</td>
                <td className="py-3 px-4">
                  <Badge variant="secondary" className={l.status === 'active' ? 'bg-success/20 text-success border-0' : 'bg-destructive/20 text-destructive border-0'}>
                    {l.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right text-foreground font-medium">${l.licenceFee.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
