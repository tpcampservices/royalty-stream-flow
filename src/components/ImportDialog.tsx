import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { ImportRow, downloadTemplate, parseSpreadsheet } from '@/lib/importUtils';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  templateHeaders: string[];
  templateExample?: (string | number)[];
  templateName: string;
  mapRow: (row: ImportRow) => Record<string, unknown> | null;
  onImport: (rows: Record<string, unknown>[]) => Promise<unknown>;
}

export default function ImportDialog({
  open, onOpenChange, title, description, templateHeaders, templateExample, templateName, mapRow, onImport,
}: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setRows([]); setFileName(''); };

  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = await parseSpreadsheet(file);
      const mapped = parsed.map(mapRow).filter(Boolean) as Record<string, unknown>[];
      if (!mapped.length) {
        toast({ title: 'Nothing to import', description: 'No valid rows found. Check the column headings against the template.', variant: 'destructive' });
        return;
      }
      setFileName(file.name);
      setRows(mapped);
    } catch {
      toast({ title: 'Could not read file', description: 'Please upload a valid CSV or Excel file.', variant: 'destructive' });
    }
  };

  const run = async () => {
    setBusy(true);
    try {
      await onImport(rows);
      reset();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const previewKeys = rows.length ? Object.keys(rows[0]).slice(0, 6) : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={() => downloadTemplate(templateName, templateHeaders, templateExample)}>
            <Download className="w-4 h-4 mr-2" /> Download template
          </Button>

          <div className="border border-dashed border-border rounded-lg p-6 text-center space-y-3">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Upload a CSV or Excel (.xlsx) file</p>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => handleFile(e.target.files?.[0])} className="max-w-sm mx-auto" />
            {fileName && <p className="text-xs text-primary">{fileName} — {rows.length} rows ready</p>}
          </div>

          {rows.length > 0 && (
            <div className="border border-border rounded-lg overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>{previewKeys.map((k) => <th key={k} className="text-left py-2 px-3 text-muted-foreground">{k}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-t border-border/50">
                      {previewKeys.map((k) => <td key={k} className="py-2 px-3 text-foreground">{String(r[k] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} disabled={!rows.length || busy}>
            <Upload className="w-4 h-4 mr-2" /> Import {rows.length ? `${rows.length} rows` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
