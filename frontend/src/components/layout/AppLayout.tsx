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
  if (!rating) return 'text-slate-400';
  if (rating < 1200) return 'text-slate-300';
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const sidebarW = collapsed ? 'w-[68px]' : 'w-56';

  return (
    <div className="min-h-screen flex bg-[#050508]">

      {/* ── Mobile overlay ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40
          flex flex-col border-r border-white/[0.06]
          bg-[#07070c] transition-all duration-200 ease-in-out
          ${sidebarW}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo row */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/[0.06] min-h-[65px]
                         ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-glow-purple shrink-0">
            <span className="text-white font-black text-sm">C</span>
          </div>
          {!collapsed && (
            <span className="text-white font-bold tracking-tight whitespace-nowrap">
              CP Arena
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium
                 ${isActive
                   ? 'text-violet-300 bg-violet-500/12 hover:bg-violet-500/16'
                   : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}
                 ${collapsed ? 'justify-center px-0 py-3' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-2 py-4 border-t border-white/[0.06] space-y-1">

          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        text-slate-400 hover:text-red-400 hover:bg-red-500/8 transition-all duration-150
                        ${collapsed ? 'justify-center px-0 py-3' : ''}`}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-xl text-xs
                        text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-all duration-150
                        ${collapsed ? 'justify-center px-0' : ''}`}
          >
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </div>

        {/* User badge */}
        {!collapsed && (
          <div className="px-3 pb-4">
            <div className="glass rounded-xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600/40 to-indigo-600/40 flex items-center justify-center shrink-0">
                <span className="text-violet-300 font-bold text-xs">
                  {user?.handle?.[0]?.toUpperCase() ?? 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user?.handle}</p>
                <p className={`text-xs truncate ${ratingColor(user?.codeforcesRating ?? null)}`}>
                  {user?.codeforcesRating ? `CF ${user.codeforcesRating}` : 'Unrated'}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl glass hover:bg-white/8 transition-colors"
          >
            <Menu size={18} className="text-slate-300" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">C</span>
            </div>
            <span className="text-white font-bold text-sm">CP Arena</span>
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
