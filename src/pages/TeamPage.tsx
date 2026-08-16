import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { appRoles, type AppRole } from '@/lib/types';

interface TeamMember {
  user_id: string;
  role: AppRole;
  email: string | null;
  full_name: string | null;
}

export default function TeamPage() {
  const { currentOrganizationId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('reviewer');

  const key = ['organization-team', currentOrganizationId];
  const team = useQuery({
    queryKey: key,
    enabled: Boolean(currentOrganizationId),
    queryFn: async (): Promise<TeamMember[]> => {
      if (!currentOrganizationId) return [];
      const { data: membershipRows, error: membershipError } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', currentOrganizationId)
        .order('created_at', { ascending: true });
      if (membershipError) throw membershipError;

      const userIds = (membershipRows ?? []).map((membership) => membership.user_id);
      if (!userIds.length) return [];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      if (profileError) throw profileError;

      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return (membershipRows ?? []).map((membership) => ({
        user_id: membership.user_id,
        role: membership.role,
        email: profileById.get(membership.user_id)?.email ?? null,
        full_name: profileById.get(membership.user_id)?.full_name ?? null,
      }));
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const showError = (mutationError: unknown) => toast({
    title: 'Team update failed',
    description: mutationError instanceof Error ? mutationError.message : 'Something went wrong',
    variant: 'destructive',
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!currentOrganizationId) throw new Error('Select an organization first');
      const { error: addError } = await supabase.rpc('add_organization_member_by_email', {
        target_organization_id: currentOrganizationId,
        member_email: email,
        member_role: role,
      });
      if (addError) throw addError;
    },
    onSuccess: () => {
      setEmail('');
      void refresh();
      toast({ title: 'Team member added' });
    },
    onError: showError,
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      if (!currentOrganizationId) throw new Error('Select an organization first');
      const { error: roleError } = await supabase.rpc('set_organization_member_role', {
        target_organization_id: currentOrganizationId,
        target_user_id: userId,
        new_role: newRole,
      });
      if (roleError) throw roleError;
    },
    onSuccess: () => { void refresh(); toast({ title: 'Role updated' }); },
    onError: showError,
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentOrganizationId) throw new Error('Select an organization first');
      const { error: removeError } = await supabase.rpc('remove_organization_member', {
        target_organization_id: currentOrganizationId,
        target_user_id: userId,
      });
      if (removeError) throw removeError;
    },
    onSuccess: () => { void refresh(); toast({ title: 'Team member removed' }); },
    onError: showError,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    addMember.mutate();
  };

  return (
    <div className="space-y-6">
      <div><h2 className="font-heading text-xl font-semibold">Organization team</h2><p className="text-sm text-muted-foreground">Admins manage access. New team members must create an account before being added.</p></div>

      <form onSubmit={submit} className="glass-card grid gap-4 p-5 md:grid-cols-[1fr_180px_auto] md:items-end">
        <div className="space-y-2"><Label htmlFor="team-email">Account email</Label><Input id="team-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" /></div>
        <div className="space-y-2"><Label htmlFor="team-role">Role</Label><select id="team-role" value={role} onChange={(event) => setRole(event.target.value as AppRole)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{appRoles.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        <Button type="submit" disabled={addMember.isPending}><UserPlus className="mr-2 h-4 w-4" />{addMember.isPending ? 'Adding…' : 'Add member'}</Button>
      </form>

      <div className="glass-card overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="px-4 py-3">Person</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {team.isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading team…</td></tr>}
            {team.isError && <tr><td colSpan={4} className="px-4 py-8 text-center text-destructive">Could not load this team.</td></tr>}
            {team.data?.map((member) => (
              <tr key={member.user_id} className="border-b border-border/50">
                <td className="px-4 py-3 font-medium">{member.full_name || 'Unnamed user'} {member.user_id === user?.id && <Badge variant="secondary" className="ml-2">You</Badge>}</td>
                <td className="px-4 py-3 text-muted-foreground">{member.email || '—'}</td>
                <td className="px-4 py-3"><label className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><select aria-label={`Role for ${member.email ?? member.user_id}`} value={member.role} onChange={(event) => changeRole.mutate({ userId: member.user_id, newRole: event.target.value as AppRole })} className="h-9 rounded-md border border-input bg-background px-2 capitalize" disabled={changeRole.isPending}>{appRoles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></td>
                <td className="px-4 py-3 text-right"><Button type="button" size="icon" variant="ghost" disabled={member.user_id === user?.id || removeMember.isPending} onClick={() => { if (window.confirm(`Remove ${member.email ?? 'this user'} from the organization?`)) removeMember.mutate(member.user_id); }}><Trash2 className="h-4 w-4 text-destructive" /><span className="sr-only">Remove team member</span></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
