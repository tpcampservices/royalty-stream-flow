import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Music, Building2, Layers, FileText,
  Scale, Calculator, GitMerge, CreditCard, BarChart3, Menu, X,
  ShieldCheck, LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import OrganizationSwitcher from '@/components/OrganizationSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/lib/types';

const allRoles: AppRole[] = ['admin', 'finance', 'reviewer'];
const navItems: { path: string; label: string; icon: typeof LayoutDashboard; roles: AppRole[] }[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: allRoles },
  { path: '/members', label: 'Members', icon: Users, roles: ['admin', 'finance'] },
  { path: '/recordings', label: 'Sound Recordings', icon: Music, roles: ['admin', 'reviewer'] },
  { path: '/licensees', label: 'Licensees', icon: Building2, roles: ['admin', 'finance'] },
  { path: '/pools', label: 'Pools & Tariffs', icon: Layers, roles: ['admin', 'finance'] },
  { path: '/usage-logs', label: 'Usage Logs', icon: FileText, roles: ['admin', 'reviewer'] },
  { path: '/weighting', label: 'Weighting Engine', icon: Scale, roles: ['admin', 'reviewer'] },
  { path: '/matching', label: 'Matching', icon: GitMerge, roles: ['admin', 'reviewer'] },
  { path: '/calculation', label: 'Calculation', icon: Calculator, roles: ['admin'] },
  { path: '/payments', label: 'Payments', icon: CreditCard, roles: ['admin', 'finance'] },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: allRoles },
  { path: '/team', label: 'Team & Roles', icon: ShieldCheck, roles: ['admin'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, currentRole, signOut } = useAuth();
  const visibleNav = navItems.filter((item) => currentRole && item.roles.includes(currentRole));
  const displayName = String(user?.user_metadata?.full_name || user?.email || 'Account');
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className={`${sidebarOpen ? 'w-64 md:w-64' : 'w-0 -ml-64 md:ml-0 md:w-16'} transition-all duration-300 flex-shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col`}>
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><Music className="w-4 h-4 text-primary-foreground" /></div>
            {sidebarOpen && <span className="font-heading font-bold text-sidebar-accent-foreground text-lg">TTCO Suite</span>}
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleNav.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'}`} end={item.path === '/'}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{initials || 'U'}</div>
            {sidebarOpen && <div className="flex-1 min-w-0"><p className="text-sm font-medium text-sidebar-accent-foreground truncate">{displayName}</p><p className="text-xs text-sidebar-foreground capitalize truncate">{currentRole}</p></div>}
          </div>
          {sidebarOpen && <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="min-h-16 border-b border-border flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <button type="button" aria-label="Toggle navigation" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground">{sidebarOpen ? <X className="w-5 h-5 md:hidden" /> : <Menu className="w-5 h-5" />}</button>
            <h1 className="font-heading font-semibold text-lg text-foreground">{navItems.find((item) => item.path === location.pathname)?.label || 'TTCO Licensing & Royalty Distribution Suite'}</h1>
          </div>
          <OrganizationSwitcher />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
