import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardPage from "@/pages/DashboardPage";
import MembersPage from "@/pages/MembersPage";
import WorksPage from "@/pages/WorksPage";
import LicenseesPage from "@/pages/LicenseesPage";
import PoolsPage from "@/pages/PoolsPage";
import UsageLogsPage from "@/pages/UsageLogsPage";
import WeightingPage from "@/pages/WeightingPage";
import MatchingPage from "@/pages/MatchingPage";
import CalculationPage from "@/pages/CalculationPage";
import PaymentsPage from "@/pages/PaymentsPage";
import ReportsPage from "@/pages/ReportsPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout><DashboardPage /></DashboardLayout>} />
          <Route path="/members" element={<DashboardLayout><MembersPage /></DashboardLayout>} />
          <Route path="/works" element={<DashboardLayout><WorksPage /></DashboardLayout>} />
          <Route path="/licensees" element={<DashboardLayout><LicenseesPage /></DashboardLayout>} />
          <Route path="/pools" element={<DashboardLayout><PoolsPage /></DashboardLayout>} />
          <Route path="/usage-logs" element={<DashboardLayout><UsageLogsPage /></DashboardLayout>} />
          <Route path="/weighting" element={<DashboardLayout><WeightingPage /></DashboardLayout>} />
          <Route path="/matching" element={<DashboardLayout><MatchingPage /></DashboardLayout>} />
          <Route path="/calculation" element={<DashboardLayout><CalculationPage /></DashboardLayout>} />
          <Route path="/payments" element={<DashboardLayout><PaymentsPage /></DashboardLayout>} />
          <Route path="/reports" element={<DashboardLayout><ReportsPage /></DashboardLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
