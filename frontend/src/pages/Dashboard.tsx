/**
 * src/pages/Dashboard.tsx
 * ─────────────────────────
 * Main dashboard — flat developer-tool aesthetic.
 * Stats are live from the Codeforces public API via useCodeforcesStats.
 * State, navigation, routing: unchanged.
 */

import { useNavigate } from 'react-router-dom';
import { Trophy, Zap, Code2, BarChart2, Plus, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCodeforcesStats } from '@/hooks/useCodeforcesStats';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Live Codeforces stats ────────────────────────────────────────────────
  const cf = useCodeforcesStats(user?.codeforcesHandle);

  // Display helpers: show '...' while loading, '—' if unavailable
  const cfLoading = cf.loading;
  const contestVal = cfLoading ? '...' : (cf.contestCount !== null ? String(cf.contestCount) : '—');
  const solvedVal  = cfLoading ? '...' : (cf.solvedCount  !== null ? String(cf.solvedCount)  : '—');
  const ratingVal  = cfLoading ? '...' : (cf.rating       !== null ? String(cf.rating)       : user?.codeforcesRating ? String(user.codeforcesRating) : '—');

  // ── Stat cards ──────────────────────────────────────────────────────────
  const stats = [
    {
      icon: Trophy,
      label: 'Contests',
      value: contestVal,
      sub: cf.contestCount !== null ? 'Rated rounds' : 'Join or create',
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-400',
      valueColor: 'text-yellow-400',
    },
    {
      icon: Zap,
      label: 'Solved',
      value: solvedVal,
      sub: cf.solvedCount !== null ? 'Unique problems' : 'via Codeforces',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-400',
      valueColor: 'text-green-400',
    },
    {
      icon: BarChart2,
      label: 'CF Rating',
      value: ratingVal,
      sub: cf.rank ? cf.rank.charAt(0).toUpperCase() + cf.rank.slice(1) : 'Current rating',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      valueColor: 'text-blue-400',
    },
    {
      icon: Code2,
      label: 'CF Handle',
      value: user?.codeforcesHandle || 'Not linked',
      sub: user?.codeforcesHandle ? '✓ Linked' : 'Link in profile',
      iconBg: 'bg-zinc-700/50',
      iconColor: 'text-zinc-300',
      valueColor: 'text-white',
    },
  ];

  // ── Quick action tiles ────────────────────────────────────────────────────
  const quickActions = [
    {
      label: 'Browse Problems',
      sub: 'Filter by tags and difficulty',
      icon: Code2,
      iconBg: 'bg-zinc-800',
      iconColor: 'text-zinc-400',
      to: '/problems',
    },
    {
      label: 'View Contests',
      sub: 'Join or create a mashup',
      icon: Trophy,
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-400',
      to: '/contests',
    },
    {
      label: 'Create Contest',
      sub: 'Host a custom ICPC arena',
      icon: Plus,
      iconBg: 'bg-blue-600/20',
      iconColor: 'text-blue-400',
      to: '/contests',
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto page-enter font-['Inter',system-ui,sans-serif]">

        {/* ── Welcome ────────────────────────────────────────────────── */}
        <div className="mb-8 pb-6 border-b border-zinc-900">
          <p className="text-blue-500 text-xs font-semibold tracking-widest uppercase mb-1.5">
            Welcome back
          </p>
          <h1 className="text-3xl font-bold text-zinc-100 mb-1">
            Hey, <span className="text-blue-400">{user?.handle}</span> 👋
          </h1>
          <p className="text-zinc-400 text-sm">
            Ready to compete? Pick an action below to get started.
          </p>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {stats.map(({ icon: Icon, label, value, sub, iconBg, iconColor, valueColor }) => (
            <div
              key={label}
              className="border border-zinc-800 rounded-sm p-4 hover:border-zinc-600 transition-colors duration-150"
            >
              {/* Icon chip */}
              <div className={`w-8 h-8 rounded-sm ${iconBg} flex items-center justify-center mb-3`}>
                <Icon size={15} className={iconColor} />
              </div>

              {/* Label */}
              <p className="text-zinc-200 text-sm font-semibold tracking-widest uppercase mb-1">
                {label}
              </p>

              {/* Value — large monospace, context-coloured */}
              <p className={`text-3xl font-mono font-bold truncate ${valueColor}`}>
                {value}
              </p>

              {/* Subtitle */}
              <p className="text-zinc-400 text-xs mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* CF API error notice (non-blocking) */}
        {cf.error && user?.codeforcesHandle && (
          <p className="text-xs text-zinc-600 mb-6 text-center">
            ⚠ Could not fetch live CF stats: {cf.error}
          </p>
        )}

        {/* ── Quick Actions ───────────────────────────────────────────── */}
        <h2 className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {quickActions.map(({ label, sub, icon: Icon, iconBg, iconColor, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="border border-zinc-800 rounded-sm p-5 text-left
                         hover:border-zinc-600 hover:bg-zinc-900/50
                         transition-colors duration-150 group"
            >
              <div className={`w-8 h-8 rounded-sm ${iconBg} flex items-center justify-center mb-4`}>
                <Icon size={16} className={iconColor} />
              </div>
              <p className="text-zinc-100 font-bold text-sm mb-0.5">{label}</p>
              <p className="text-zinc-400 text-sm">{sub}</p>
              <ArrowRight size={14} className="text-zinc-600 group-hover:text-blue-400 mt-3 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
