import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/lib/types';

export default function RoleGuard({ children, allowed }: { children: React.ReactNode; allowed: AppRole[] }) {
  const { currentRole } = useAuth();
  if (!currentRole || !allowed.includes(currentRole)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
