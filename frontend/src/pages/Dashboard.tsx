/**
 * src/pages/Dashboard.tsx
 * ─────────────────────────
 * Main dashboard — shows user stats, quick-action cards, and recent activity.
 * Uses AppLayout for the shared sidebar.
 */

import { useNavigate } from 'react-router-dom';
import { Trophy, Zap, Code2, BarChart2, Plus, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    {
      label: 'Browse Problems',
      sub: 'Filter by tags and difficulty',
      icon: Code2,
      color: 'from-cyan-600/20 to-blue-600/20',
      iconBg: 'bg-cyan-500/15', iconColor: 'text-cyan-400',
      to: '/problems',
    },
    {
      label: 'View Contests',
      sub: 'Join or create a mashup',
      icon: Trophy,
      color: 'from-violet-600/20 to-indigo-600/20',
      iconBg: 'bg-violet-500/15', iconColor: 'text-violet-400',
      to: '/contests',
    },
    {
      label: 'Create Contest',
      sub: 'Host a custom ICPC arena',
      icon: Plus,
      color: 'from-emerald-600/20 to-teal-600/20',
      iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400',
      to: '/contests',
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto page-enter">

        {/* Welcome */}
        <div className="mb-10">
          <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-2">
            Welcome back
          </p>
          <h1 className="text-4xl font-black text-white mb-1">
            Hey, <span className="gradient-text">{user?.handle}</span> 👋
          </h1>
          <p className="text-slate-400 text-sm">
            Ready to compete? Pick an action below to get started.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Trophy,   label: 'Contests',    value: '—', sub: 'Join or create',      color: 'text-violet-400', bg: 'bg-violet-500/15' },
            { icon: Zap,      label: 'Solved',       value: '—', sub: 'via Codeforces',      color: 'text-amber-400',  bg: 'bg-amber-500/15'  },
            { icon: BarChart2, label: 'CF Rating',  value: user?.codeforcesRating || '—', sub: 'Current rating', color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
            { icon: Code2,    label: 'CF Handle',   value: user?.codeforcesHandle || 'Not linked', sub: user?.codeforcesHandle ? '✓ Linked' : 'Link in profile', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
          ].map(({ icon: Icon, label, value, sub, color, bg }) => (
            <div key={label} className="glass rounded-2xl p-5 hover:bg-white/[0.05] transition-all duration-200">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-black text-white truncate">{value}</p>
              <p className="text-slate-600 text-xs mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <h2 className="text-white font-bold mb-4 flex items-center gap-2">
          <Zap size={16} className="text-violet-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {quickActions.map(({ label, sub, icon: Icon, color, iconBg, iconColor, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className={`glass rounded-2xl p-6 text-left bg-gradient-to-br ${color}
                          hover:bg-white/[0.06] hover:border-violet-500/20 border border-white/[0.04]
                          transition-all duration-200 group`}
            >
              <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4
                               group-hover:scale-110 transition-transform`}>
                <Icon size={20} className={iconColor} />
              </div>
              <p className="text-white font-bold mb-1">{label}</p>
              <p className="text-slate-500 text-sm">{sub}</p>
              <ArrowRight size={16} className="text-slate-600 group-hover:text-violet-400 mt-4 transition-colors" />
            </button>
          ))}
        </div>

        {/* Coming soon */}
        <div className="glass rounded-2xl p-6 border border-violet-500/15 bg-gradient-to-br from-violet-600/5 to-indigo-600/5 text-center">
          <p className="text-slate-500 text-sm">
            📊 Analytics Dashboard, Head-to-Head comparisons, and Streak Tracker coming in Phase 5
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
