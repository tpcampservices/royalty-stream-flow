import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type TableName =
  | 'members'
  | 'sound_recordings'
  | 'recording_shares'
  | 'licensees'
  | 'weighting_rules'
  | 'pools'
  | 'usage_logs'
  | 'payments';

export interface BulkImportArgs {
  values: Record<string, unknown>[];
  onProgress?: (done: number, total: number) => void;
}

const CHUNK = 200;

export function useTable<T>(table: TableName, orderBy = 'created_at', ascending = false) {
  const queryClient = useQueryClient();
  const key = [table];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending });
      if (error) throw error;
      return (data || []) as T[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    toast({ title: 'Error', description: message, variant: 'destructive' });
  };

  const insert = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await supabase.from(table).insert(values as never);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Saved' }); },
    onError: handleError,
  });

  const insertMany = useMutation({
    mutationFn: async (input: Record<string, unknown>[] | BulkImportArgs) => {
      const { values, onProgress } = Array.isArray(input) ? { values: input, onProgress: undefined } : input;
      const total = values.length;
      onProgress?.(0, total);
      for (let i = 0; i < total; i += CHUNK) {
        const chunk = values.slice(i, i + CHUNK);
        const { error } = await supabase.from(table).insert(chunk as never);
        if (error) throw error;
        onProgress?.(Math.min(i + chunk.length, total), total);
      }
      return total;
    },
    onSuccess: (count) => { invalidate(); toast({ title: `Imported ${count} rows` }); },
    onError: handleError,
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase.from(table).update(values as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Updated' }); },
    onError: handleError,
  });

  const updateMany = useMutation({
    mutationFn: async ({ ids, values }: { ids: string[]; values: Record<string, unknown> }) => {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const { error } = await supabase.from(table).update(values as never).in('id', ids.slice(i, i + CHUNK));
        if (error) throw error;
      }
      return ids.length;
    },
    onSuccess: (count) => { invalidate(); toast({ title: `Updated ${count} records` }); },
    onError: handleError,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Deleted' }); },
    onError: handleError,
  });

  const removeMany = useMutation({
    mutationFn: async (ids: string[]) => {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const { error } = await supabase.from(table).delete().in('id', ids.slice(i, i + CHUNK));
        if (error) throw error;
      }
      return ids.length;
    },
    onSuccess: (count) => { invalidate(); toast({ title: `Deleted ${count} records` }); },
    onError: handleError,
  });

  return { ...query, rows: query.data ?? [], insert, insertMany, update, updateMany, remove, removeMany, invalidate };
}
