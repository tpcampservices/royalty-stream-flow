import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function OnboardingPage() {
  const { memberships, refreshOrganizations, setCurrentOrganizationId, signOut } = useAuth();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (memberships.length) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { data, error: createError } = await supabase.rpc('create_organization', { organization_name: name });
      if (createError) throw createError;
      await refreshOrganizations();
      if (data) setCurrentOrganizationId(data);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not create the organization');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-background px-4">
      <section className="w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-xl">
        <Building2 className="mb-4 h-10 w-10 text-primary" />
        <h1 className="font-heading text-2xl font-bold">Create your organization</h1>
        <p className="mt-2 text-sm text-muted-foreground">This workspace owns its members, recordings, usage and payments. You will become its first Admin.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2"><Label htmlFor="organization-name">Organization name</Label><Input id="organization-name" minLength={2} maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} placeholder="TTCO" /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create secure workspace'}</Button>
          <Button className="w-full" type="button" variant="ghost" onClick={() => void signOut()}>Sign out</Button>
        </form>
      </section>
    </main>
  );
}
