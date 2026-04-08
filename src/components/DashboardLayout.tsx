import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Music, Building2, Layers, FileText,
  Scale, Calculator, GitMerge, CreditCard, BarChart3, Menu, X, ChevronDown
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/members', label: 'Members', icon: Users },
  { path: '/works', label: 'Works Registry', icon: Music },
  { path: '/licensees', label: 'Licensees', icon: Building2 },
  { path: '/pools', label: 'Pools & Tariffs', icon: Layers },
  { path: '/usage-logs', label: 'Usage Logs', icon: FileText },
  { path: '/weighting', label: 'Weighting Engine', icon: Scale },
  { path: '/matching', label: 'Matching', icon: GitMerge },
  { path: '/calculation', label: 'Calculation', icon: Calculator },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 -ml-64'} md:ml-0 md:${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 flex-shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col`}>
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Music className="w-4 h-4 text-primary-foreground" />
            </div>
            {sidebarOpen && <span className="font-heading font-bold text-sidebar-accent-foreground text-lg">RoyaltyPro</span>}
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                }`
              }
              end={item.path === '/'}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">AD</div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-accent-foreground truncate">Admin User</p>
                <p className="text-xs text-sidebar-foreground truncate">Distribution Officer</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground">
              {sidebarOpen ? <X className="w-5 h-5 md:hidden" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="font-heading font-semibold text-lg text-foreground">
              {navItems.find(n => n.path === location.pathname)?.label || 'RoyaltyPro'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">Q1 2025</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
