/**
 * src/pages/ContestArena.tsx
 * ───────────────────────────
 * Live contest room — the centrepiece of Algo Forge.
 *
 * Layout:
 *  ┌─ Left Column (1/3) ────────────────────────────────────────┐
 *  │  Contest metadata · Live countdown · Problem shortcuts     │
 *  └────────────────────────────────────────────────────────────┘
 *  ┌─ Right / Main Area (2/3) ──────────────────────────────────┐
 *  │  Sync button · ICPC leaderboard table                      │
 *  └────────────────────────────────────────────────────────────┘
 *
 * Leaderboard Cell Colours:
 *  ✅ Accepted   → green  (shows +Mm ±WA)
 *  ❌ Attempted  → red    (shows ✗N wrong attempts)
 *  ⬜ Untouched  → empty
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, Users, RefreshCw, ExternalLink, Trophy,
  Zap, AlertCircle, ChevronLeft, CheckCircle2,
  Loader2, RotateCcw, Hash,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/utils/api';
import type { Contest, LeaderboardEntry, ProblemResult } from '@/types';

// ─── Countdown Hook ───────────────────────────────────────────────────────────
const useCountdown = (endTime: string | null) => {
  const [remaining, setRemaining] = useState('');
  const [isOver, setIsOver]       = useState(false);

  useEffect(() => {
    if (!endTime) return;

    const tick = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('00:00:00');
        setIsOver(true);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return { remaining, isOver };
};

// ─── Phase badge ──────────────────────────────────────────────────────────────
const PhaseBadge = ({ phase }: { phase: string }) => {
  const map: Record<string, string> = {
    ongoing:  'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
    upcoming: 'text-amber-400   bg-amber-500/15   border-amber-500/25',
    ended:    'text-zinc-500   bg-slate-500/15   border-slate-500/25',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${map[phase] ?? map.ended}`}>
      {phase === 'ongoing' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {phase.toUpperCase()}
    </span>
  );
};

// ─── ICPC Problem Cell ────────────────────────────────────────────────────────
const ProblemCell = ({ result }: { result?: ProblemResult }) => {
  if (!result) return <td className="px-3 py-2.5 text-center text-slate-700 text-xs">—</td>;

  if (result.solved) {
    return (
      <td className="px-3 py-2.5 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-emerald-400 font-bold text-xs font-mono">
            +{result.solveTimeMinutes}m
          </span>
          {result.wrongAttempts > 0 && (
            <span className="text-emerald-600 text-[10px] font-mono">
              +{result.wrongAttempts}
            </span>
          )}
        </div>
      </td>
    );
  }

  if (result.wrongAttempts > 0) {
    return (
      <td className="px-3 py-2.5 text-center">
        <span className="text-red-400 font-bold text-xs font-mono">
          ✗{result.wrongAttempts}
        </span>
      </td>
    );
  }

  return <td className="px-3 py-2.5 text-center text-slate-700 text-xs">·</td>;
};

// ─── Rank badge ───────────────────────────────────────────────────────────────
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <span className="text-amber-400 font-black text-sm">🥇</span>;
  if (rank === 2) return <span className="text-zinc-300 font-black text-sm">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-black text-sm">🥉</span>;
  return <span className="text-zinc-500 font-bold text-sm font-mono">#{rank}</span>;
};

// ─── Leaderboard Table ────────────────────────────────────────────────────────
interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  problemIds: string[];
}

const LeaderboardTable = ({ entries, problemIds }: LeaderboardTableProps) => {
  if (entries.length === 0) {
    return (
      <div className="glass rounded-md py-16 text-center">
        <Trophy size={40} className="mx-auto mb-4 text-slate-700 opacity-50" />
        <p className="text-zinc-600">No submissions yet.</p>
        <p className="text-zinc-700 text-sm mt-1">
          Sync Codeforces submissions to populate the leaderboard.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-zinc-500 font-semibold text-xs uppercase tracking-wider w-16">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-zinc-500 font-semibold text-xs uppercase tracking-wider">
                Handle
              </th>
              <th className="px-4 py-3 text-center text-zinc-500 font-semibold text-xs uppercase tracking-wider w-16">
                Solved
              </th>
              <th className="px-4 py-3 text-center text-zinc-500 font-semibold text-xs uppercase tracking-wider w-20">
                Penalty
              </th>
              {/* Per-problem columns */}
              {problemIds.map((pid, i) => (
                <th key={pid}
                    className="px-3 py-3 text-center text-zinc-500 font-semibold text-xs uppercase tracking-wider w-20">
                  <a
                    href={`https://codeforces.com/problemset/problem/${pid.match(/^(\d+)/)?.[1]}/${pid.replace(/^\d+/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {String.fromCharCode(65 + i)}
                  </a>
                  <div className="text-[9px] text-zinc-700 font-mono">{pid}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, _idx) => {
              const problemMap = new Map(entry.problems.map((p) => [p.problemId, p]));
              const isTopThree = entry.rank <= 3;

              return (
                <tr
                  key={entry.handle}
                  className={`border-b border-zinc-800 transition-colors
                               ${isTopThree ? 'bg-amber-500/[0.03]' : ''}
                               hover:bg-white/[0.04]`}
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RankBadge rank={entry.rank} />
                      {entry.rankChange !== undefined && entry.rankChange !== 0 && (
                        <span className={`text-[10px] font-bold ${entry.rankChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {entry.rankChange > 0 ? `↑${entry.rankChange}` : `↓${Math.abs(entry.rankChange)}`}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Handle */}
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${isTopThree ? 'text-white' : 'text-zinc-200'}`}>
                      {entry.handle}
                    </span>
                  </td>

                  {/* Solved */}
                  <td className="px-4 py-3 text-center">
                    <span className={`font-black text-lg ${entry.solved > 0 ? 'text-blue-400' : 'text-zinc-700'}`}>
                      {entry.solved}
                    </span>
                  </td>

                  {/* Penalty */}
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-zinc-500 text-sm">
                      {entry.totalPenalty}
                    </span>
                  </td>

                  {/* Per-problem cells */}
                  {problemIds.map((pid) => (
                    <ProblemCell key={pid} result={problemMap.get(pid)} />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ContestArena = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Contest + leaderboard state ────────────────────────────────────────
  const [contest, setContest]     = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [phase, setPhase]         = useState<string>('upcoming');
  const [stats, setStats]         = useState<Record<string, unknown> | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [contestLoading, setContestLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // ── Load contest details ────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setContestLoading(true);
      try {
        const res = await api.get<{ contest: Contest }>(`/contests/${id}`);
        setContest(res.data?.contest ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Contest not found.');
      } finally {
        setContestLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Fetch leaderboard ────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    if (!id) return;
    setLbLoading(true);
    try {
      const res = await api.get<{
        leaderboard: LeaderboardEntry[];
        phase: string;
        stats: Record<string, unknown>;
        lastUpdated: string;
      }>(`/contests/${id}/leaderboard`);

      setLeaderboard(res.data?.leaderboard ?? []);
      setPhase(res.data?.phase ?? 'upcoming');
      setStats(res.data?.stats ?? null);
      setLastUpdated(res.data?.lastUpdated ?? null);
    } catch (err) {
      console.warn('[leaderboard]', err);
    } finally {
      setLbLoading(false);
    }
  }, [id]);

  // Initial fetch + 30-second auto-refresh during active contest
  useEffect(() => {
    fetchLeaderboard();

    if (phase === 'ongoing') {
      pollRef.current = setInterval(fetchLeaderboard, 30000);
    }

    return () => clearInterval(pollRef.current);
  }, [fetchLeaderboard, phase]);

  // ── Countdown ─────────────────────────────────────────────────────────
  const { remaining, isOver } = useCountdown(contest?.endTime ?? null);

  // ── Sync Codeforces submissions ────────────────────────────────────────
  const handleSync = async () => {
    if (!id) return;
    setSyncLoading(true);
    setSyncError(null);
    setSyncSuccess(false);
    try {
      await api.post(`/contests/${id}/sync`, {});
      setSyncSuccess(true);
      await fetchLeaderboard();
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed. Codeforces API may be slow.');
    } finally {
      setSyncLoading(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (contestLoading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-white/8 rounded-full w-72" />
          <div className="h-4 bg-white/8 rounded-full w-48" />
          <div className="grid lg:grid-cols-3 gap-6 mt-6">
            <div className="h-64 bg-white/8 rounded-md" />
            <div className="lg:col-span-2 h-64 bg-white/8 rounded-md" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="alert-error">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <p className="font-semibold">{error}</p>
              <button onClick={() => navigate('/contests')}
                      className="text-sm text-red-300 hover:text-white mt-1 flex items-center gap-1">
                <ChevronLeft size={13} /> Back to contests
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const problemIds = contest?.problems.map((p) => p.problemId) ?? [];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto page-enter">

        {/* ── Back + Header ─────────────────────────────────────────── */}
        <div className="mb-6">
          <button onClick={() => navigate('/contests')}
                  className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 text-sm mb-4 transition-colors">
            <ChevronLeft size={15} /> All contests
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <PhaseBadge phase={phase} />
                {contest?.isPrivate && (
                  <span className="text-xs text-amber-400 flex items-center gap-1">
                    🔒 Private
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black text-white">{contest?.title}</h1>
              {contest?.description && (
                <p className="text-zinc-500 text-sm mt-1">{contest.description}</p>
              )}
            </div>

            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={syncLoading}
              id="sync-submissions-btn"
              className={`btn-primary gap-2 !px-5 !py-3 text-sm relative overflow-hidden
                          ${syncSuccess ? '!from-emerald-600 !to-emerald-500 ' : ''}`}
            >
              {syncLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Syncing CF…</>
              ) : syncSuccess ? (
                <><CheckCircle2 size={16} /> Synced!</>
              ) : (
                <><RotateCcw size={16} /> Sync Codeforces</>
              )}
            </button>
          </div>

          {/* Sync error */}
          {syncError && (
            <div className="alert-error mt-3 text-sm animate-fade-in-up">
              <AlertCircle size={14} className="shrink-0" />
              <span>{syncError}</span>
            </div>
          )}
        </div>

        {/* ── Two-column layout ─────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Countdown */}
            <div className={`glass rounded-md p-5 border
                             ${phase === 'ongoing'
                               ? 'border-zinc-700 bg-transparent to-indigo-600/5'
                               : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className={phase === 'ongoing' ? 'text-blue-400' : 'text-zinc-600'} />
                <span className="text-zinc-500 text-sm font-medium">
                  {phase === 'upcoming' ? 'Starts in'
                   : phase === 'ongoing' ? 'Time remaining'
                   : 'Contest ended'}
                </span>
              </div>
              {phase !== 'ended' ? (
                <div className={`text-4xl font-black font-mono tracking-tight
                                 ${isOver ? 'text-zinc-600' : phase === 'ongoing' ? 'text-blue-300 animate-pulse-glow' : 'text-amber-300'}`}>
                  {remaining || '--:--:--'}
                </div>
              ) : (
                <p className="text-zinc-500 text-lg font-semibold">Finished</p>
              )}
              {phase === 'ongoing' && (
                <p className="text-zinc-700 text-xs mt-2">
                  Leaderboard auto-refreshes every 30s
                </p>
              )}
            </div>

            {/* Contest meta */}
            <div className="glass rounded-md p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm mb-3">Contest Info</h3>
              <div className="space-y-2.5 text-sm">
                {[
                  {
                    label: 'Start',
                    value: contest?.startTime
                      ? new Date(contest.startTime).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
                      : '—',
                  },
                  { label: 'Duration', value: `${contest?.durationMinutes}m` },
                  { label: 'Scoring',  value: (contest?.scoringType ?? 'icpc').toUpperCase() },
                  { label: 'Host',     value: contest?.createdBy?.handle ?? '—' },
                  {
                    label: 'Participants',
                    value: (
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {contest?.participants?.length ?? 0}
                      </span>
                    ),
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-zinc-600">{label}</span>
                    <span className="text-zinc-200 font-medium">{value}</span>
                  </div>
                ))}

                {/* Invite code */}
                {contest?.inviteCode && (
                  <div className="pt-2 border-t border-zinc-800">
                    <p className="text-zinc-600 text-xs mb-1.5">Invite Code</p>
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                      <span className="font-mono font-bold text-amber-300 tracking-widest text-sm flex-1">
                        {contest.inviteCode}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(contest.inviteCode!)}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Problem shortcuts */}
            <div className="glass rounded-md p-5">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Hash size={14} className="text-blue-400" />
                Problems
              </h3>
              <div className="space-y-2">
                {contest?.problems.sort((a, b) => a.order - b.order).map((p, i) => {
                  const cfUrl = `https://codeforces.com/problemset/problem/${p.problemId.match(/^(\d+)/)?.[1]}/${p.problemId.replace(/^\d+/, '')}`;
                  return (
                    <a
                      key={p.problemId}
                      href={cfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-sm hover:bg-white/8 transition-colors group"
                    >
                      <span className="w-6 h-6 rounded-lg bg-zinc-800/60 flex items-center justify-center
                                       text-blue-400 font-bold text-xs shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-200 text-xs font-medium group-hover:text-white transition-colors truncate">
                          {p.name || p.problemId}
                        </p>
                        {p.rating > 0 && (
                          <p className="text-zinc-700 text-[10px] font-mono">{p.rating}</p>
                        )}
                      </div>
                      <ExternalLink size={12} className="text-slate-700 group-hover:text-blue-400 shrink-0 transition-colors" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Leaderboard ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Leaderboard header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-zinc-800/60 flex items-center justify-center">
                  <Trophy size={16} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold">Live Leaderboard</h2>
                  {lastUpdated && (
                    <p className="text-zinc-700 text-xs">
                      Updated {new Date(lastUpdated).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Stats */}
                {stats && (
                  <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-600">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {(stats as { totalParticipants?: number }).totalParticipants ?? 0} participants
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap size={12} />
                      {leaderboard.filter((e) => e.solved > 0).length} solvers
                    </span>
                  </div>
                )}

                {/* Manual refresh */}
                <button
                  onClick={fetchLeaderboard}
                  disabled={lbLoading}
                  className="btn-ghost !px-3 !py-2"
                  title="Refresh leaderboard"
                >
                  <RefreshCw size={14} className={lbLoading ? 'animate-spin text-blue-400' : ''} />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-zinc-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
                Accepted (+Mm = time, +W = wrong attempts)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
                Attempted (✗N wrong attempts)
              </span>
            </div>

            {/* Table */}
            {lbLoading && leaderboard.length === 0 ? (
              <div className="glass rounded-md p-8 text-center">
                <Loader2 size={24} className="mx-auto animate-spin text-blue-400 mb-3" />
                <p className="text-zinc-600 text-sm">Loading leaderboard…</p>
              </div>
            ) : (
              <LeaderboardTable entries={leaderboard} problemIds={problemIds} />
            )}

            {/* Sync hint */}
            <div className="glass rounded-sm px-4 py-3 flex items-center gap-3 text-xs text-zinc-600">
              <RotateCcw size={13} className="text-violet-500 shrink-0" />
              <p>
                Click <strong className="text-zinc-300">Sync Codeforces</strong> to pull the latest
                submissions from each participant's CF account. Sync respects CF API rate limits (1 req/s per handle).
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ContestArena;
