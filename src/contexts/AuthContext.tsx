import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, OrganizationMembership } from '@/lib/types';

const STORAGE_KEY = 'ttco-current-organization';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  memberships: OrganizationMembership[];
  currentMembership: OrganizationMembership | null;
  currentOrganizationId: string | null;
  currentRole: AppRole | null;
  setCurrentOrganizationId: (organizationId: string) => void;
  refreshOrganizations: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [currentOrganizationId, setCurrentOrganizationIdState] = useState<string | null>(null);

  const loadMemberships = useCallback(async (userId?: string) => {
    if (!userId) {
      setMemberships([]);
      setCurrentOrganizationIdState(null);
      return;
    }

    const { data: membershipRows, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (membershipError) throw membershipError;

    const organizationIds = (membershipRows ?? []).map((row) => row.organization_id);
    if (!organizationIds.length) {
      setMemberships([]);
      setCurrentOrganizationIdState(null);
      return;
    }

    const { data: organizations, error: organizationError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .in('id', organizationIds);

    if (organizationError) throw organizationError;

    const organizationById = new Map((organizations ?? []).map((organization) => [organization.id, organization]));
    const nextMemberships = (membershipRows ?? []).flatMap((membership) => {
      const organization = organizationById.get(membership.organization_id);
      return organization
        ? [{
            organization_id: membership.organization_id,
            role: membership.role,
            organization,
          }]
        : [];
    });

    setMemberships(nextMemberships);
    setCurrentOrganizationIdState((current) => {
      const saved = localStorage.getItem(STORAGE_KEY);
      const candidate = current ?? saved;
      const selected = nextMemberships.some((membership) => membership.organization_id === candidate)
        ? candidate
        : nextMemberships[0]?.organization_id ?? null;
      if (selected) localStorage.setItem(STORAGE_KEY, selected);
      return selected;
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        let verifiedSession = data.session;
        if (verifiedSession) {
          const { data: verifiedUser, error: verificationError } = await supabase.auth.getUser();
          if (verificationError || verifiedUser.user.id !== verifiedSession.user.id) verifiedSession = null;
        }

        if (!mounted) return;
        setSession(verifiedSession);
        await loadMemberships(verifiedSession?.user.id);
      } catch {
        setMemberships([]);
        setCurrentOrganizationIdState(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') return;
      setSession(nextSession);
      // Supabase recommends keeping auth callbacks synchronous. Run database reads
      // after the callback returns to avoid blocking another auth operation.
      window.setTimeout(() => {
        void loadMemberships(nextSession?.user.id)
          .catch(() => {
            setMemberships([]);
            setCurrentOrganizationIdState(null);
          })
          .finally(() => setLoading(false));
      }, 0);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadMemberships]);

  const setCurrentOrganizationId = useCallback((organizationId: string) => {
    if (!memberships.some((membership) => membership.organization_id === organizationId)) return;
    localStorage.setItem(STORAGE_KEY, organizationId);
    setCurrentOrganizationIdState(organizationId);
  }, [memberships]);

  const refreshOrganizations = useCallback(
    () => loadMemberships(session?.user.id),
    [loadMemberships, session?.user.id],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.organization_id === currentOrganizationId) ?? null,
    [currentOrganizationId, memberships],
  );

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    memberships,
    currentMembership,
    currentOrganizationId,
    currentRole: currentMembership?.role ?? null,
    setCurrentOrganizationId,
    refreshOrganizations,
    signOut,
  }), [
    session,
    loading,
    memberships,
    currentMembership,
    currentOrganizationId,
    setCurrentOrganizationId,
    refreshOrganizations,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
