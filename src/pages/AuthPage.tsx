import { FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!loading && user) {
    const destination = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={destination} replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() || null },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage('Check your email to confirm your account, then return here to sign in.');
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-background px-4">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary"><Music className="h-5 w-5 text-primary-foreground" /></div>
          <div><h1 className="font-heading text-xl font-bold">TTCO Suite</h1><p className="text-sm text-muted-foreground">Secure royalty workspace</p></div>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1">
          <Button type="button" variant={mode === 'login' ? 'default' : 'ghost'} onClick={() => setMode('login')}>Sign in</Button>
          <Button type="button" variant={mode === 'signup' ? 'default' : 'ghost'} onClick={() => setMode('signup')}>Create account</Button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {mode === 'signup' && <div className="space-y-2"><Label htmlFor="full-name">Full name</Label><Input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" /></div>}
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></div>
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-primary">{message}</p>}
          <Button className="w-full" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</Button>
        </form>
      </section>
    </main>
  );
}
