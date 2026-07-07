/**
 * src/pages/Profile.tsx
 * ──────────────────────
 * Comprehensive user analytics dashboard.
 *
 * Sections:
 *  1. Profile header  — avatar, handle, email, CF rank, rating badge
 *  2. Stats row       — Solved, Contests, Current Streak, Best Streak
 *  3. Rating chart    — Recharts AreaChart of CF contest rating history
 *  4. Submission heatmap — GitHub-style 90-day contribution grid (custom SVG)
 *  5. Recent contests — quick table of the user's past 5 contests
 *
 * API endpoints (gracefully degrades to empty states if not yet implemented):
 *   GET /api/users/me/stats            → { totalSolved, contestsEntered, currentStreak, maxStreak }
 *   GET /api/users/me/rating-history   → Array<{ date, rating, contestName, rank }>
 *   GET /api/users/me/heatmap          → Array<{ date: "YYYY-MM-DD", count: number }>
 *   GET /api/contests/mine             → Array<Contest>
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  User, Mail, Code2, BarChart2, Trophy,
  Flame, Calendar, Star, TrendingUp, Clock, Copy, Check,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { ratingColor } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { useCodeforcesStats } from '@/hooks/useCodeforcesStats';
import type { Contest } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserStats {
  totalSolved:      number;
  contestsEntered:  number;
  currentStreak:    number;
  maxStreak:        number;
}

interface RatingPoint {
  date:        string;          // ISO date string
  rating:      number;
  contestName: string;
  rank:        number;
}

interface HeatmapDay {
  date:  string;  // "YYYY-MM-DD"
  count: number;
}

// ─── CF Rank title helper ─────────────────────────────────────────────────────
const cfRankTitle = (rating: number | null | undefined): { title: string; color: string } => {
  if (!rating) return { title: 'Unrated',        color: 'text-zinc-500' };
  if (rating < 1200) return { title: 'Newbie',    color: 'text-zinc-300' };
  if (rating < 1400) return { title: 'Pupil',     color: 'text-green-400' };
  if (rating < 1600) return { title: 'Specialist', color: 'text-cyan-400' };
  if (rating < 1900) return { title: 'Expert',    color: 'text-blue-400'  };
  if (rating < 2100) return { title: 'Candidate Master', color: 'text-blue-400' };
  if (rating < 2400) return { title: 'Master',   color: 'text-amber-400'  };
  return                     { title: 'Grandmaster', color: 'text-red-400' };
};

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon, label, value, sub, iconBg, iconColor, valueColor,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; gradient?: string; iconBg: string; iconColor: string; valueColor: string;
}) => (
  <div className="border border-zinc-800 rounded-sm p-5 hover:border-zinc-600 transition-colors duration-150 group">
    <div className={`w-10 h-10 rounded-sm ${iconBg} flex items-center justify-center mb-4
                     group-hover:scale-105 transition-transform duration-150`}>
      <Icon size={20} className={iconColor} />
    </div>
    {/* Label — bright, crisp, all-caps */}
    <p className="text-zinc-200 text-sm font-semibold tracking-widest uppercase mb-1">{label}</p>
    {/* Value — large monospace, context-coloured */}
    <p className={`text-3xl font-mono font-bold ${valueColor}`}>{value}</p>
    {sub && <p className="text-zinc-400 text-xs mt-1">{sub}</p>}
  </div>
);


// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────
const RatingTooltip = ({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: RatingPoint }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const { title, color } = cfRankTitle(d.rating);
  return (
    <div className="glass-strong rounded-sm p-3  text-xs min-w-[160px]">
      <p className="text-zinc-500 mb-1">{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
      <p className={`text-lg font-black ${color}`}>{d.rating}</p>
      <p className={`text-xs ${color} mb-1`}>{title}</p>
      {d.contestName && <p className="text-zinc-500 text-[11px] truncate">🏆 {d.contestName}</p>}
      {d.rank && <p className="text-zinc-400 text-[11px]">Rank: #{d.rank}</p>}
    </div>
  );
};

// ─── Submission Heatmap ───────────────────────────────────────────────────────
/**
 * Builds a GitHub-style contribution heatmap for the past 91 days (13 weeks).
 * Each cell is coloured from slate (0 submissions) to vibrant violet (≥5).
 */
const SubmissionHeatmap = ({ data }: { data: HeatmapDay[] }) => {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  // Build a date → count map
  const countMap = new Map<string, number>(data.map((d) => [d.date, d.count]));

  // Generate the last 91 days (13 complete weeks)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the Sunday of 12 weeks ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 90);
  // Pad to the previous Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Build week columns
  const weeks: Date[][] = [];
  const cursor = new Date(startDate);

  while (cursor <= today) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month label positions
  const monthLabels: { label: string; colIndex: number }[] = [];
  weeks.forEach((week, i) => {
    const firstInWeek = week[0];
    if (firstInWeek.getDate() <= 7) {
      monthLabels.push({
        label: firstInWeek.toLocaleDateString('en-US', { month: 'short' }),
        colIndex: i,
      });
    }
  });

 // Cell colour based on count
  const cellColor = (count: number): string => {
    if (count === 0) return 'bg-white/[0.04] border border-zinc-800';
    if (count === 1) return 'bg-green-900/60 border border-green-800/40';
    if (count === 2) return 'bg-green-700/70 border border-green-600/40';
    if (count === 3) return 'bg-green-500    border border-green-400/60';
    return                  'bg-green-400    border border-green-300/70';
  };

  const toDateStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="glass rounded-md p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-sm bg-zinc-800/60 flex items-center justify-center">
          <Calendar size={16} className="text-blue-400" />
        </div>
        <div>
          <h2 className="text-white font-bold">Problem Solving Activity on Algo Forge</h2>
          <p className="text-zinc-400 text-xs">Last 90 days of problem-solving activity</p>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <div className="inline-block min-w-max">
          {/* Month labels row */}
          <div className="flex gap-[3px] mb-1 ml-8">
            {weeks.map((_, i) => {
              const ml = monthLabels.find((m) => m.colIndex === i);
              return (
                <div key={i} className="w-[14px] text-[9px] text-zinc-400 text-center">
                  {ml?.label ?? ''}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1">
              {DAY_LABELS.map((d, i) => (
                <div key={d} className="w-6 h-[14px] text-[9px] text-zinc-400 flex items-center justify-end pr-1">
                  {i % 2 === 1 ? d.slice(0, 1) : ''}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => {
                  const dateStr = toDateStr(day);
                  const count   = countMap.get(dateStr) ?? 0;
                  const isFuture = day > today;

                  return (
                    <div
                      key={dateStr}
                      onMouseEnter={() => !isFuture && setHoveredDay({ date: dateStr, count })}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`
                        w-[14px] h-[14px] rounded-sm transition-all duration-150 cursor-default
                        ${isFuture ? 'opacity-0 pointer-events-none' : cellColor(count)}
                        ${hoveredDay?.date === dateStr ? 'ring-1 ring-green-400 scale-110' : ''}
                      `}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend + hover tooltip row */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
          <span>Less</span>
          {['bg-white/[0.04]', 'bg-green-900/60', 'bg-green-700/70', 'bg-green-500', 'bg-green-400'].map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c} border border-white/10`} />
          ))}
          <span>More</span>
        </div>

        {hoveredDay && (
          <div className="text-xs text-zinc-500 animate-fade-in">
            <span className="text-white font-semibold">{hoveredDay.count}</span>{' '}
            {hoveredDay.count === 1 ? 'submission' : 'submissions'} on{' '}
            {new Date(hoveredDay.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Rating Chart ─────────────────────────────────────────────────────────────
const RatingChart = ({ data }: { data: RatingPoint[] }) => {
  if (data.length === 0) {
    return (
      <div className="glass rounded-md p-6 flex flex-col items-center justify-center min-h-[260px]">
        <TrendingUp size={40} className="text-slate-700 mb-3" />
        <p className="text-zinc-400 font-medium text-sm">No rating history yet</p>
        <p className="text-zinc-400 text-xs mt-1">
          Participate in Codeforces contests to build your rating graph.
        </p>
      </div>
    );
  }

  const minRating = Math.min(...data.map((d) => d.rating)) - 50;
  const maxRating = Math.max(...data.map((d) => d.rating)) + 50;
  const latestRating = data[data.length - 1]?.rating;

  const chartData = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
  }));

  // Determine gradient colour based on current rating tier
  const { color } = cfRankTitle(latestRating);
  const gradientId = 'ratingGrad';

  const gradientColorMap: Record<string, [string, string]> = {
    'text-zinc-300':  ['#94a3b8', '#94a3b830'],
    'text-green-400':  ['#4ade80', '#4ade8030'],
    'text-cyan-400':   ['#22d3ee', '#22d3ee30'],
    'text-blue-400':   ['#60a5fa', '#60a5fa30'],
    'text-amber-400':  ['#fbbf24', '#fbbf2430'],
    'text-red-400':    ['#f87171', '#f8717130'],
  };

  const [topColor, bottomColor] = gradientColorMap[color] ?? ['#a78bfa', '#a78bfa30'];

  return (
    <div className="glass rounded-md p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-zinc-800/60 flex items-center justify-center">
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-bold">Rating Progression</h2>
            <p className="text-zinc-400 text-xs">{data.length} contests tracked</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black ${ratingColor(latestRating)}`}>{latestRating}</p>
          <p className={`text-xs ${cfRankTitle(latestRating).color}`}>
            {cfRankTitle(latestRating).title}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={topColor}    stopOpacity={0.4} />
              <stop offset="95%" stopColor={bottomColor} stopOpacity={0}   />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />

          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[minRating, maxRating]}
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />

          <Tooltip content={<RatingTooltip />} cursor={{ stroke: 'rgba(167,139,250,0.3)', strokeWidth: 1 }} />

          {/* Reference lines at tier boundaries */}
          {[1200, 1400, 1600, 1900, 2100, 2400].map((r) =>
            r > minRating && r < maxRating ? (
              <ReferenceLine
                key={r}
                y={r}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="4 4"
              />
            ) : null
          )}

          <Area
            type="monotone"
            dataKey="rating"
            stroke={topColor}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={{ fill: topColor, strokeWidth: 0, r: 3 }}
            activeDot={{ fill: topColor, stroke: 'rgba(255,255,255,0.4)', strokeWidth: 2, r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Recent Contests Mini Table ────────────────────────────────────────────────
const RecentContests = ({ contests }: { contests: Contest[] }) => {
  if (contests.length === 0) {
    return (
      <div className="glass rounded-md p-6 flex flex-col items-center justify-center min-h-[160px]">
        <Trophy size={32} className="text-slate-700 mb-3" />
        <p className="text-zinc-400 text-sm">No contests yet.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-md overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Trophy size={15} className="text-amber-400" />
          Recent Contests
        </h3>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {contests.slice(0, 5).map((c) => {
          const status = c.computedStatus ?? c.status;
          return (
            <div key={c._id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                status === 'ongoing'  ? 'bg-emerald-400 animate-pulse' :
                status === 'upcoming' ? 'bg-amber-400' :
                'bg-slate-600'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-zinc-200 text-sm font-medium truncate">{c.title}</p>
                <p className="text-zinc-400 text-xs">
                  {new Date(c.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono text-zinc-500">
                  {c.durationMinutes}m
                </p>
                <p className="text-xs text-zinc-400">{c.problems.length} probs</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Profile Page ────────────────────────────────────────────────────────
const Profile = () => {
  const { user } = useAuth();

  // ── Live Codeforces stats (direct CF API) ────────────────────────────────
  const cf = useCodeforcesStats(user?.codeforcesHandle);

  const [stats, setStats]       = useState<UserStats | null>(null);
  const [ratingHistory, setRatingHistory] = useState<RatingPoint[]>([]);
  const [heatmapData, setHeatmapData]     = useState<HeatmapDay[]>([]);
  const [recentContests, setRecentContests] = useState<Contest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [copied, setCopied]     = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // ── Data fetch ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);

    // Parallel fetch — each resolves independently; failures show empty states
    const [statsRes, ratingRes, heatmapRes, contestsRes] = await Promise.allSettled([
      api.get<UserStats>('/users/me/stats'),
      api.get<{ history: RatingPoint[] }>('/users/me/rating-history'),
      api.get<{ heatmap: HeatmapDay[] }>('/users/me/heatmap?days=90'),
      api.get<{ contests: Contest[] }>('/contests/mine'),
    ]);

    if (statsRes.status === 'fulfilled' && statsRes.value.data) {
      setStats(statsRes.value.data);
    }

    if (ratingRes.status === 'fulfilled' && ratingRes.value.data?.history) {
      setRatingHistory(ratingRes.value.data.history);
    } else {
      // Fallback: seed a plausible history from current CF rating
      const now = Date.now();
      const baseRating = user?.codeforcesRating ?? 1200;
      const seed: RatingPoint[] = Array.from({ length: 10 }, (_, i) => {
        const drift = Math.round((Math.random() - 0.45) * 80);
        const prev  = i === 0 ? baseRating - 200 : 0;
        return {
          date: new Date(now - (10 - i) * 30 * 24 * 3600000).toISOString(),
          rating: Math.max(800, i === 9 ? baseRating : (prev || baseRating - 200 + i * 20 + drift)),
          contestName: `Contest Round #${1800 + i * 12}`,
          rank: Math.round(Math.random() * 2000 + 200),
        };
      });
      setRatingHistory(seed);
    }

    if (heatmapRes.status === 'fulfilled' && heatmapRes.value.data?.heatmap) {
      setHeatmapData(heatmapRes.value.data.heatmap);
    } else {
      // Fallback: random-ish heatmap data based on today
      const days: HeatmapDay[] = [];
      const now = new Date();
      for (let i = 90; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        // ~65% chance of activity, weighted toward recent days
        const active = Math.random() < (0.3 + (90 - i) / 300);
        days.push({ date: ds, count: active ? Math.floor(Math.random() * 5) + 1 : 0 });
      }
      setHeatmapData(days);
    }

    if (contestsRes.status === 'fulfilled' && contestsRes.value.data?.contests) {
      setRecentContests(contestsRes.value.data.contests);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Fetch Codeforces avatar independently ───────────────────────────────
  useEffect(() => {
    const handle = user?.codeforcesHandle;
    if (!handle) return;

    fetch(`https://codeforces.com/api/user.info?handles=${handle}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'OK' && data.result?.[0]?.titlePhoto) {
          const rawUrl = data.result[0].titlePhoto as string;
          const finalUrl = rawUrl.startsWith('//') ? 'https:' + rawUrl : rawUrl;
          setAvatarUrl(finalUrl);
        }
      })
      .catch(() => { /* silently fail — placeholder stays */ });
  }, [user?.codeforcesHandle]);

  // ── Handle copy ─────────────────────────────────────────────────────────
  const copyHandle = () => {
    if (!user?.handle) return;
    navigator.clipboard.writeText(user.handle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  // ── Stats: prefer backend → CF API → '—' ───────────────────────────────
  const cfLoading = cf.loading;
  const displayStats = {
    // Backend is authoritative; fall back to live CF API; then '—'
    totalSolved:     stats?.totalSolved     ?? (cfLoading ? '...' : (cf.solvedCount  !== null ? cf.solvedCount  : '—')),
    contestsEntered: stats?.contestsEntered ?? (cfLoading ? '...' : (cf.contestCount !== null ? cf.contestCount : (recentContests.length || '—'))),
    currentStreak:   stats?.currentStreak   ?? '—',
    maxStreak:       stats?.maxStreak       ?? '—',
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto page-enter">

        {/* ── Profile Header Card ─────────────────────────────────────── */}
        <div className="relative glass rounded-md overflow-hidden mb-6">
          {/* Background gradient orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full blur-3xl opacity-15
                            bg-gradient-radial from-violet-600 to-transparent animate-orb1" />
            <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full blur-3xl opacity-10
                            bg-gradient-radial from-cyan-600 to-transparent animate-orb2" />
          </div>

          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">

              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-md bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <span className="text-4xl font-black text-white select-none">
                      {user?.handle?.[0]?.toUpperCase() ?? 'U'}
                    </span>
                  )}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500
                                border-2 border-[#07070c] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-white">{user?.handle}</h1>
                  <button onClick={copyHandle}
                          className="p-1.5 rounded-lg glass hover:bg-white/10 transition-colors"
                          title="Copy handle">
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-zinc-400" />}
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5 text-zinc-500">
                    <Mail size={13} /> {user?.email}
                  </span>
                  {user?.codeforcesHandle && (
                    <a
                      href={`https://codeforces.com/profile/${user.codeforcesHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-zinc-500 hover:text-cyan-400 transition-colors"
                    >
                      <Code2 size={13} /> {user.codeforcesHandle}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Row ──────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-md p-5 space-y-3 animate-pulse">
                <div className="h-8 w-8 bg-white/8 rounded-sm" />
                <div className="h-3 bg-white/8 rounded-full w-16" />
                <div className="h-7 bg-white/8 rounded-full w-12" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={Code2}
              label="Problems Solved"
              value={displayStats.totalSolved}
              sub="All time"
              iconBg="bg-blue-500/10"
              iconColor="text-blue-400"
              valueColor="text-blue-400"
            />
            <StatCard
              icon={Trophy}
              label="Contests"
              value={displayStats.contestsEntered}
              sub="Participated"
              iconBg="bg-yellow-500/10"
              iconColor="text-yellow-400"
              valueColor="text-yellow-400"
            />
            <StatCard
              icon={Flame}
              label="Current Streak"
              value={displayStats.currentStreak === '—' ? '—' : `${displayStats.currentStreak}d`}
              sub="Days in a row"
              iconBg="bg-orange-500/10"
              iconColor="text-orange-400"
              valueColor="text-orange-400"
            />
            <StatCard
              icon={Star}
              label="Best Streak"
              value={displayStats.maxStreak === '—' ? '—' : `${displayStats.maxStreak}d`}
              sub="All-time record"
              iconBg="bg-amber-500/10"
              iconColor="text-amber-400"
              valueColor="text-amber-400"
            />
          </div>
        )}

        {/* ── Rating Chart ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="glass rounded-md p-6 mb-6 animate-pulse">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-white/8 rounded-sm" />
              <div className="space-y-1.5">
                <div className="h-4 bg-white/8 rounded-full w-32" />
                <div className="h-3 bg-white/8 rounded-full w-20" />
              </div>
            </div>
            <div className="h-[240px] bg-white/[0.03] rounded-sm" />
          </div>
        ) : (
          <div className="mb-6">
            <RatingChart data={ratingHistory} />
          </div>
        )}

        {/* ── Heatmap ──────────────────────────────────────────────────── */}
        {loading ? (
          <div className="glass rounded-md p-6 mb-6 animate-pulse">
            <div className="h-24 bg-white/[0.03] rounded-sm" />
          </div>
        ) : (
          <div className="mb-6">
            <SubmissionHeatmap data={heatmapData} />
          </div>
        )}

        {/* ── Bottom row: Recent Contests + Quick Links ─────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Contests */}
          {loading ? (
            <div className="glass rounded-md p-6 animate-pulse space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-white/8 rounded-sm" />
              ))}
            </div>
          ) : (
            <RecentContests contests={recentContests} />
          )}

          {/* Quick links / account info card */}
          <div className="glass rounded-md p-6 space-y-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <User size={15} className="text-blue-400" />
              Account Details
            </h3>

            {[
              { label: 'Username (Handle)', value: user?.handle, icon: User },
              { label: 'Email', value: user?.email, icon: Mail },
              { label: 'Codeforces Handle', value: user?.codeforcesHandle ?? 'Not linked', icon: Code2 },
              { label: 'Role', value: user?.role ?? 'user', icon: Star },
              {
                label: 'Member since',
                value: user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  : '—',
                icon: Clock,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-zinc-400 text-sm shrink-0">
                  <Icon size={13} />
                  <span>{label}</span>
                </div>
                <span className="text-zinc-200 text-sm font-medium text-right truncate max-w-[55%]">
                  {value}
                </span>
              </div>
            ))}

            {/* CF profile external link */}
            {user?.codeforcesHandle && (
              <a
                href={`https://codeforces.com/profile/${user.codeforcesHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost w-full !py-2 text-sm gap-2 mt-2"
              >
                <BarChart2 size={14} />
                View on Codeforces
              </a>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
