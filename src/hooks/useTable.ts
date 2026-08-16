import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type TableName =
  | 'members'
  | 'member_payment_details'
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
const withoutOrganizationId = (values: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(values).filter(([key]) => key !== 'organization_id'));

export function useTable<T>(table: TableName, orderBy = 'created_at', ascending = false) {
  const { currentOrganizationId } = useAuth();
  const queryClient = useQueryClient();
  const key = [table, currentOrganizationId];

  const requireOrganization = () => {
    if (!currentOrganizationId) throw new Error('Select an organization before working with records');
    return currentOrganizationId;
  };

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(currentOrganizationId),
    queryFn: async () => {
      const organizationId = requireOrganization();
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('organization_id', organizationId)
        .order(orderBy, { ascending });
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
      const organizationId = requireOrganization();
      const { error } = await supabase.from(table).insert({
        ...withoutOrganizationId(values),
        organization_id: organizationId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => { void invalidate(); toast({ title: 'Saved' }); },
    onError: handleError,
  });

  const insertMany = useMutation({
    mutationFn: async (input: Record<string, unknown>[] | BulkImportArgs) => {
      const organizationId = requireOrganization();
      const { values, onProgress } = Array.isArray(input) ? { values: input, onProgress: undefined } : input;
      const total = values.length;
      onProgress?.(0, total);
      for (let i = 0; i < total; i += CHUNK) {
        const chunk = values.slice(i, i + CHUNK).map((value) => ({
          ...withoutOrganizationId(value),
          organization_id: organizationId,
        }));
        const { error } = await supabase.from(table).insert(chunk as never);
        if (error) throw error;
        onProgress?.(Math.min(i + chunk.length, total), total);
      }
      return total;
    },
    onSuccess: (count) => { void invalidate(); toast({ title: `Imported ${count} rows` }); },
    onError: handleError,
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const organizationId = requireOrganization();
      const { error } = await supabase
        .from(table)
        .update(withoutOrganizationId(values) as never)
        .eq('id', id)
        .eq('organization_id', organizationId);
      if (error) throw error;
    },
    onSuccess: () => { void invalidate(); toast({ title: 'Updated' }); },
    onError: handleError,
  });

  const updateMany = useMutation({
    mutationFn: async ({ ids, values }: { ids: string[]; values: Record<string, unknown> }) => {
      const organizationId = requireOrganization();
      for (let i = 0; i < ids.length; i += CHUNK) {
        const { error } = await supabase
          .from(table)
          .update(withoutOrganizationId(values) as never)
          .in('id', ids.slice(i, i + CHUNK))
          .eq('organization_id', organizationId);
        if (error) throw error;
      }
      return ids.length;
    },
    onSuccess: (count) => { void invalidate(); toast({ title: `Updated ${count} records` }); },
    onError: handleError,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const organizationId = requireOrganization();
      const { error } = await supabase.from(table).delete().eq('id', id).eq('organization_id', organizationId);
      if (error) throw error;
    },
    onSuccess: () => { void invalidate(); toast({ title: 'Deleted' }); },
    onError: handleError,
  });

  const removeMany = useMutation({
    mutationFn: async (ids: string[]) => {
      const organizationId = requireOrganization();
      for (let i = 0; i < ids.length; i += CHUNK) {
        const { error } = await supabase
          .from(table)
          .delete()
          .in('id', ids.slice(i, i + CHUNK))
          .eq('organization_id', organizationId);
        if (error) throw error;
      }
      return ids.length;
    },
    onSuccess: (count) => { void invalidate(); toast({ title: `Deleted ${count} records` }); },
    onError: handleError,
  });

  return { ...query, rows: query.data ?? [], insert, insertMany, update, updateMany, remove, removeMany, invalidate };
}
