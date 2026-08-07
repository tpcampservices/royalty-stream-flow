import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldDef } from '@/components/EntityDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  fields: FieldDef[];
  onApply: (values: Record<string, unknown>) => void | Promise<void>;
}

export default function BulkEditDialog({ open, onOpenChange, count, fields, onApply }: Props) {
  const [fieldKey, setFieldKey] = useState('');
  const [value, setValue] = useState('');
  const field = fields.find((f) => f.key === fieldKey);

  useEffect(() => { if (open) { setFieldKey(''); setValue(''); } }, [open]);

  const apply = async () => {
    if (!field) return;
    const trimmed = value.trim();
    const parsed = field.type === 'number' ? (trimmed === '' ? null : Number(trimmed)) : (trimmed === '' ? null : trimmed);
    await onApply({ [field.key]: parsed });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit {count} selected {count === 1 ? 'record' : 'records'}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Pick one field and the new value — it will be applied to every selected record.</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Field</Label>
            <Select value={fieldKey} onValueChange={(v) => { setFieldKey(v); setValue(''); }}>
              <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                {fields.filter((f) => f.type !== 'textarea').map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {field && (
            <div className="space-y-1.5">
              <Label>New value</Label>
              {field.type === 'select' ? (
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {field.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={apply} disabled={!field}>Apply to {count}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
