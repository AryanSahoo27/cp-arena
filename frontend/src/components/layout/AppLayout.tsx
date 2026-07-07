/**
 * src/components/layout/AppLayout.tsx
 * ──────────────────────────────────────
 * Persistent shell layout with sidebar navigation, used by all protected pages.
 * Sidebar collapses to icon-only on narrow screens via a toggle button.
 */

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Trophy, Code2,
  ChevronLeft, ChevronRight, LogOut, User, Menu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ─── Nav items definition ─────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contests',  icon: Trophy,          label: 'Contests'  },
  { to: '/problems',  icon: Code2,           label: 'Problems'  },
  { to: '/profile',   icon: User,            label: 'Profile'   },
] as const;

// ─── Rating → colour (Codeforces convention) ──────────────────────────────────
export const ratingColor = (rating: number | null): string => {
  if (!rating) return 'text-zinc-500';
  if (rating < 1200) return 'text-zinc-400';
  if (rating < 1400) return 'text-green-400';
  if (rating < 1600) return 'text-cyan-400';
  if (rating < 1900) return 'text-blue-400';
  if (rating < 2100) return 'text-violet-400';
  if (rating < 2400) return 'text-amber-400';
  return 'text-red-400';
};

// ─── Component ────────────────────────────────────────────────────────────────
interface AppLayoutProps { children: React.ReactNode }

const AppLayout = ({ children }: AppLayoutProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const sidebarW = collapsed ? 'w-[60px]' : 'w-52';

  return (
    <div className="min-h-screen flex bg-[#0a0a0a]">

      {/* ── Mobile overlay ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40
          flex flex-col border-r border-zinc-900
          bg-[#0d0d0d] transition-all duration-150 ease-in-out
          ${sidebarW}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo row */}
        <div className={`flex items-center gap-2.5 px-4 py-4 border-b border-zinc-900 min-h-[57px]
                         ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-7 h-7 bg-blue-600 flex items-center justify-center rounded-sm shrink-0">
            <span className="text-white font-black text-sm">C</span>
          </div>
          {!collapsed && (
            <span className="text-zinc-100 font-bold tracking-tight whitespace-nowrap text-sm">
              Algo Forge
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-sm transition-colors duration-100 text-sm font-medium
                 ${isActive
                   ? 'text-blue-400 bg-zinc-800/80'
                   : 'text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/60'}
                 ${collapsed ? 'justify-center px-0 py-2.5' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-2 py-3 border-t border-zinc-900 space-y-0.5">

          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium
                        text-zinc-500 hover:text-red-400 hover:bg-zinc-800/60 transition-colors duration-100
                        ${collapsed ? 'justify-center px-0 py-2.5' : ''}`}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`hidden lg:flex w-full items-center gap-3 px-3 py-1.5 rounded-sm text-xs
                        text-zinc-700 hover:text-zinc-400 hover:bg-zinc-800/40 transition-colors duration-100
                        ${collapsed ? 'justify-center px-0' : ''}`}
          >
            {collapsed ? <ChevronRight size={13} /> : <><ChevronLeft size={13} /><span>Collapse</span></>}
          </button>
        </div>


      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-900 bg-[#0d0d0d]">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-sm border border-zinc-800 hover:border-zinc-600 transition-colors"
          >
            <Menu size={16} className="text-zinc-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
              <span className="text-white font-black text-xs">C</span>
            </div>
            <span className="text-zinc-100 font-bold text-sm">Algo Forge</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
