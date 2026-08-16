import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldDef[];
  initial?: object | null;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
}

export default function EntityDialog({ open, onOpenChange, title, fields, initial, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    fields.forEach((f) => {
      const value = (initial as Record<string, unknown> | null | undefined)?.[f.key];
      next[f.key] = value === null || value === undefined ? '' : String(value);
    });
    setValues(next);
    setErrors({});
  }, [open, initial, fields]);

  const set = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    fields.forEach((f) => {
      const value = (values[f.key] ?? '').trim();
      if (f.required && !value) nextErrors[f.key] = `${f.label} is required`;
      if (value.length > 500) nextErrors[f.key] = `${f.label} is too long`;
      if (f.type === 'email' && value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
        nextErrors[f.key] = 'Enter a valid email address';
      }
    });
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);

    const payload: Record<string, unknown> = {};
    fields.forEach((f) => {
      const value = (values[f.key] ?? '').trim();
      if (f.type === 'number') payload[f.key] = value === '' ? null : Number(value);
      else payload[f.key] = value === '' ? null : value;
    });
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      // Mutation hooks surface the error. Keep the dialog open for correction.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key} className={f.full || f.type === 'textarea' ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}>
              <Label htmlFor={f.key}>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
              {f.type === 'select' ? (
                <Select value={values[f.key] || ''} onValueChange={(v) => set(f.key, v)}>
                  <SelectTrigger id={f.key}><SelectValue placeholder={`Select ${f.label.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : f.type === 'textarea' ? (
                <Textarea id={f.key} value={values[f.key] || ''} maxLength={500} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
              ) : (
                <Input
                  id={f.key}
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'}
                  value={values[f.key] || ''}
                  maxLength={f.type === 'number' ? undefined : 255}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
              {errors[f.key] && <p className="text-xs text-destructive">{errors[f.key]}</p>}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
