import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import DashboardLayout from '@/components/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleGuard from '@/components/RoleGuard';
import { AuthProvider } from '@/contexts/AuthContext';
import type { AppRole } from '@/lib/types';
import DashboardPage from '@/pages/DashboardPage';
import MembersPage from '@/pages/MembersPage';
import SoundRecordingsPage from '@/pages/SoundRecordingsPage';
import CompositionsPage from '@/pages/CompositionsPage';
import LicenseesPage from '@/pages/LicenseesPage';
import CollectionsPage from '@/pages/CollectionsPage';
import PoolsPage from '@/pages/PoolsPage';
import UsageLogsPage from '@/pages/UsageLogsPage';
import WeightingPage from '@/pages/WeightingPage';
import MatchingPage from '@/pages/MatchingPage';
import CalculationPage from '@/pages/CalculationPage';
import PaymentsPage from '@/pages/PaymentsPage';
import ReportsPage from '@/pages/ReportsPage';
import AuthPage from '@/pages/AuthPage';
import OnboardingPage from '@/pages/OnboardingPage';
import TeamPage from '@/pages/TeamPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();
const allRoles: AppRole[] = ['admin', 'finance', 'reviewer'];

function WorkspaceRoute({ children, roles = allRoles }: { children: React.ReactNode; roles?: AppRole[] }) {
  return (
    <ProtectedRoute>
      <RoleGuard allowed={roles}>
        <DashboardLayout>{children}</DashboardLayout>
      </RoleGuard>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/onboarding" element={<ProtectedRoute requireOrganization={false}><OnboardingPage /></ProtectedRoute>} />
            <Route path="/unauthorized" element={<ProtectedRoute><UnauthorizedPage /></ProtectedRoute>} />
            <Route path="/" element={<WorkspaceRoute><DashboardPage /></WorkspaceRoute>} />
            <Route path="/members" element={<WorkspaceRoute roles={['admin', 'finance']}><MembersPage /></WorkspaceRoute>} />
            <Route path="/compositions" element={<WorkspaceRoute roles={['admin', 'reviewer']}><CompositionsPage /></WorkspaceRoute>} />
            <Route path="/recordings" element={<WorkspaceRoute roles={['admin', 'reviewer']}><SoundRecordingsPage /></WorkspaceRoute>} />
            <Route path="/licensees" element={<WorkspaceRoute roles={['admin', 'finance']}><LicenseesPage /></WorkspaceRoute>} />
            <Route path="/collections" element={<WorkspaceRoute roles={['admin', 'finance']}><CollectionsPage /></WorkspaceRoute>} />
            <Route path="/pools" element={<WorkspaceRoute roles={['admin', 'finance']}><PoolsPage /></WorkspaceRoute>} />
            <Route path="/usage-logs" element={<WorkspaceRoute roles={['admin', 'reviewer']}><UsageLogsPage /></WorkspaceRoute>} />
            <Route path="/weighting" element={<WorkspaceRoute roles={['admin', 'reviewer']}><WeightingPage /></WorkspaceRoute>} />
            <Route path="/matching" element={<WorkspaceRoute roles={['admin', 'reviewer']}><MatchingPage /></WorkspaceRoute>} />
            <Route path="/calculation" element={<WorkspaceRoute roles={['admin']}><CalculationPage /></WorkspaceRoute>} />
            <Route path="/payments" element={<WorkspaceRoute roles={['admin', 'finance']}><PaymentsPage /></WorkspaceRoute>} />
            <Route path="/reports" element={<WorkspaceRoute><ReportsPage /></WorkspaceRoute>} />
            <Route path="/team" element={<WorkspaceRoute roles={['admin']}><TeamPage /></WorkspaceRoute>} />
            <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
