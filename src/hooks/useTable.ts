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
    mutationFn: async (values: Record<string, unknown>[]) => {
      const { error } = await supabase.from(table).insert(values as never);
      if (error) throw error;
      return values.length;
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

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Deleted' }); },
    onError: handleError,
  });

  return { ...query, rows: query.data ?? [], insert, insertMany, update, remove, invalidate };
}
