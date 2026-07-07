/**
 * src/pages/Contests.tsx
 * ───────────────────────
 * Contest management dashboard with:
 *  - Tabbed view: Active Mashups | Past Contests | My Contests
 *  - "Create Contest" modal with full form
 *  - "Join Private Contest" with invite code input
 *  - Status badges, participant counts, countdown timers
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Lock, Unlock, Users, Clock, Trophy,
  ChevronRight, AlertCircle, X, Calendar,
  RefreshCw, Loader2, Hash,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/utils/api';
import type { Contest } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTimeLeft = (endTime: string): string => {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    ongoing:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    upcoming: 'bg-amber-500/15   text-amber-400   border-amber-500/20',
    ended:    'bg-slate-500/15   text-zinc-500   border-slate-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status] ?? map.ended}`}>
      {status === 'ongoing' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// ─── Contest Card ─────────────────────────────────────────────────────────────
const ContestCard = ({ contest, onClick }: { contest: Contest; onClick: () => void }) => {
  const status = contest.computedStatus ?? contest.status;
  return (
    <div
      onClick={onClick}
      className="glass rounded-md p-5 hover:bg-white/[0.06] transition-all duration-200
                 cursor-pointer group border border-zinc-800 hover:border-zinc-700
                 hover:"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge status={status} />
            {contest.isPrivate
              ? <Lock size={12} className="text-amber-400" />
              : <Unlock size={12} className="text-zinc-400" />
            }
          </div>
          <h3 className="text-white font-bold text-base line-clamp-1 group-hover:text-zinc-100 transition-colors">
            {contest.title}
          </h3>
        </div>
        <ChevronRight size={16} className="text-zinc-500 group-hover:text-blue-400 shrink-0 mt-1 transition-colors" />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-400 mb-3">
        <span className="flex items-center gap-1.5">
          <Calendar size={12} />
          {formatDate(contest.startTime)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={12} />
          {contest.durationMinutes}m
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={12} />
          {contest.participantCount ?? 0}
        </span>
        <span className="flex items-center gap-1.5">
          <Hash size={12} />
          {contest.problems.length} problems
        </span>
      </div>

      {/* Problems row */}
      <div className="flex flex-wrap gap-1.5">
        {contest.problems.slice(0, 6).map((p) => (
          <span key={p.problemId}
                className="font-mono text-xs px-2 py-0.5 rounded-sm bg-zinc-800 border border-zinc-700 text-zinc-300">
            {p.problemId}
          </span>
        ))}
        {contest.problems.length > 6 && (
          <span className="text-xs text-zinc-400 px-1 self-center">
            +{contest.problems.length - 6} more
          </span>
        )}
      </div>

      {/* Ongoing: show time left */}
      {status === 'ongoing' && (
        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-2">
          <Clock size={12} className="text-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-semibold">
            {formatTimeLeft(contest.endTime)}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Create Contest Modal ─────────────────────────────────────────────────────
interface CreateModalProps { onClose: () => void; onCreated: () => void }

const CreateContestModal = ({ onClose, onCreated }: CreateModalProps) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    startTime: '',
    durationMinutes: '120',
    problemInput: '',
    problems: [] as string[],
    isPrivate: false,
    scoringType: 'icpc' as 'icpc' | 'ioi',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((p) => ({ ...p, [field]: e.target.value }));
    };

  const addProblem = () => {
    const ids = form.problemInput
      .split(/[\s,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^\d+[A-Z]\d*$/.test(s));

    const unique = [...new Set([...form.problems, ...ids])];
    if (unique.length > 10) { setError('Maximum 10 problems per contest.'); return; }
    setForm((p) => ({ ...p, problems: unique, problemInput: '' }));
    setError(null);
  };

  const removeProblem = (pid: string) => {
    setForm((p) => ({ ...p, problems: p.problems.filter((x) => x !== pid) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) return setError('Title is required.');
    if (!form.startTime)    return setError('Start time is required.');
    if (form.problems.length === 0) return setError('Add at least one problem.');

    setLoading(true);
    try {
      await api.post('/contests', {
        title: form.title.trim(),
        description: form.description.trim(),
        startTime: new Date(form.startTime).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        problems: form.problems,
        isPrivate: form.isPrivate,
        scoringType: form.scoringType,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative glass-strong rounded-md w-full max-w-xl max-h-[90vh]
                      overflow-y-auto scrollbar-hide  animate-fade-in-up">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-white">Create Contest</h2>
              <p className="text-zinc-500 text-sm mt-0.5">Set up a custom ICPC-style mashup</p>
            </div>
            <button onClick={onClose}
                    className="w-8 h-8 rounded-sm glass flex items-center justify-center
                               text-zinc-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {error && (
            <div className="alert-error mb-4">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Title */}
            <div>
              <label className="form-label">Contest Title *</label>
              <input type="text" placeholder="e.g. Friday Night Mashup"
                     value={form.title} onChange={handleChange('title')}
                     className="input-field" maxLength={100} />
            </div>

            {/* Start time + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Start Time *</label>
                <input type="datetime-local" value={form.startTime}
                       onChange={handleChange('startTime')} className="input-field text-xs" />
              </div>
              <div>
                <label className="form-label">Duration (minutes) *</label>
                <input type="number" min={5} max={1440}
                       value={form.durationMinutes} onChange={handleChange('durationMinutes')}
                       className="input-field" />
              </div>
            </div>

            {/* Problems */}
            <div>
              <label className="form-label">
                Problems * <span className="text-zinc-400 font-normal">({form.problems.length}/10)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 1500A, 800B, 1900C1"
                  value={form.problemInput}
                  onChange={(e) => setForm((p) => ({ ...p, problemInput: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProblem(); } }}
                  className="input-field flex-1"
                  id="problem-ids-input"
                />
                <button type="button" onClick={addProblem}
                        className="btn-ghost !px-4 !py-2.5 shrink-0 text-sm">
                  Add
                </button>
              </div>
              <p className="text-zinc-400 text-xs mt-1.5">
                Comma-separated CF problem IDs. Press Enter or click Add.
              </p>

              {/* Problem chips */}
              {form.problems.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.problems.map((pid) => (
                    <span key={pid}
                          className="inline-flex items-center gap-1.5 bg-zinc-800/60 text-blue-300
                                     border border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold">
                      {pid}
                      <button type="button" onClick={() => removeProblem(pid)}
                              className="hover:text-red-400 transition-colors">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Settings row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Scoring</label>
                <select value={form.scoringType}
                        onChange={handleChange('scoringType')}
                        className="input-field text-sm">
                  <option value="icpc">ICPC (penalty)</option>
                  <option value="ioi">IOI (partial)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Visibility</label>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isPrivate: !p.isPrivate }))}
                  className={`w-full input-field text-sm flex items-center gap-2 justify-center cursor-pointer
                              ${form.isPrivate ? 'border-amber-500/40 text-amber-300' : 'text-zinc-300'}`}
                >
                  {form.isPrivate ? <><Lock size={14} /> Private</> : <><Unlock size={14} /> Public</>}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : 'Create Contest'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Join Private Modal ───────────────────────────────────────────────────────
interface JoinModalProps { onClose: () => void; onJoined: (id: string) => void }

const JoinPrivateModal = ({ onClose, onJoined }: JoinModalProps) => {
  const [contestId, setContestId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contestId.trim() || !inviteCode.trim()) {
      return setError('Both contest ID and invite code are required.');
    }
    setLoading(true);
    try {
      await api.post(`/contests/${contestId.trim()}/join`, { inviteCode: inviteCode.trim().toUpperCase() });
      onJoined(contestId.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join contest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-md w-full max-w-sm  animate-fade-in-up p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-white">Join Private Contest</h2>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-sm glass flex items-center justify-center text-zinc-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="alert-error mb-4 text-sm">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="form-label">Contest ID</label>
            <input type="text" placeholder="MongoDB ObjectId of the contest"
                   value={contestId} onChange={(e) => setContestId(e.target.value)}
                   className="input-field font-mono text-sm" />
          </div>
          <div>
            <label className="form-label">Invite Code</label>
            <input type="text" placeholder="e.g. A3B7C2D1E4"
                   value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                   className="input-field font-mono tracking-widest uppercase" maxLength={10} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm">
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'active' | 'past' | 'mine';

const TABS: { id: Tab; label: string }[] = [
  { id: 'active', label: 'Active & Upcoming' },
  { id: 'past',   label: 'Past Contests'     },
  { id: 'mine',   label: 'My Contests'       },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
const Contests = () => {
  const navigate = useNavigate();
  const [tab, setTab]             = useState<Tab>('active');
  const [contests, setContests]   = useState<Contest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin]   = useState(false);

  const fetchContests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (tab === 'mine') {
        res = await api.get<{ contests: Contest[] }>('/contests/mine');
        setContests(res.data?.contests ?? []);
      } else {
        res = await api.get<{ contests: Contest[]; pagination: object }>(
          `/contests?limit=50&${tab === 'active' ? 'status=upcoming&status=ongoing' : 'status=ended'}`
        );
        // Include both upcoming and ongoing for active tab
        const all = res.data?.contests ?? [];
        setContests(
          tab === 'active'
            ? all.filter((c) => {
                const s = c.computedStatus ?? c.status;
                return s === 'upcoming' || s === 'ongoing';
              })
            : all
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contests.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchContests(); }, [fetchContests]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto page-enter">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">Contests</h1>
            <p className="text-zinc-500 text-sm">
              Browse, create, and compete in custom ICPC mashups.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowJoin(true)} className="btn-ghost gap-2 text-sm">
              <Lock size={15} /> Join Private
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary gap-2 text-sm"
              id="create-contest-btn"
            >
              <Plus size={16} /> Create Contest
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 border border-zinc-800 rounded-sm w-fit mb-6">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors duration-150
                          ${tab === id
                            ? 'bg-blue-600 text-white'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="alert-error mb-6">
            <AlertCircle size={16} className="shrink-0" />
            <div>
              <p>{error}</p>
              <button onClick={fetchContests}
                      className="flex items-center gap-1 text-xs text-red-300 hover:text-white mt-1">
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-md p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-white/8 rounded-full w-20" />
                <div className="h-5 bg-white/8 rounded-full w-3/4" />
                <div className="h-3 bg-white/8 rounded-full w-1/2" />
              </div>
            ))}
          </div>
        ) : contests.length === 0 ? (
          <div className="glass rounded-md py-20 text-center">
            <Trophy size={40} className="mx-auto mb-4 text-zinc-400" />
            <p className="text-zinc-400 mb-2">No contests found.</p>
            {tab !== 'active' && (
              <button onClick={() => setTab('active')} className="text-blue-400 hover:text-blue-300 text-sm">
                Browse active contests →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {contests.map((contest) => (
              <ContestCard
                key={contest._id}
                contest={contest}
                onClick={() => navigate(`/contests/${contest._id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateContestModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchContests}
        />
      )}
      {showJoin && (
        <JoinPrivateModal
          onClose={() => setShowJoin(false)}
          onJoined={(id) => navigate(`/contests/${id}`)}
        />
      )}
    </AppLayout>
  );
};

export default Contests;
