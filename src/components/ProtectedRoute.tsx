import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({
  children,
  requireOrganization = true,
}: {
  children: React.ReactNode;
  requireOrganization?: boolean;
}) {
  const { user, loading, memberships } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading secure workspace…</div>;
  }

  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  if (requireOrganization && memberships.length === 0) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
