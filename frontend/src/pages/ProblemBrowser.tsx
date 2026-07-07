/**
 * src/pages/ProblemBrowser.tsx
 * ──────────────────────────────
 * Browse the full Codeforces problemset with live server-side filtering.
 *
 * Features:
 *  - Search by name
 *  - Rating range sliders (min / max)
 *  - Multi-select tag pills
 *  - Paginated table with CF links
 *  - Rating-coloured difficulty badges
 *  - Skeleton loading state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, ExternalLink, Code2, ChevronLeft, ChevronRight,
  X, Tag, SlidersHorizontal, RefreshCw, AlertCircle,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { ratingColor } from '@/components/layout/AppLayout';
import api from '@/utils/api';
import type { CFProblem } from '@/types';

// ─── Common CF tags ────────────────────────────────────────────────────────────
const CF_TAGS = [
  'dp', 'graphs', 'greedy', 'math', 'implementation',
  'binary search', 'data structures', 'strings', 'trees',
  'number theory', 'geometry', 'combinatorics', 'two pointers',
  'sorting', 'brute force', 'dfs and similar', 'bitmasks',
];

// ─── Rating range presets ─────────────────────────────────────────────────────
const RATING_PRESETS = [
  { label: 'All',    min: '',    max: ''    },
  { label: '800–1200', min: '800',  max: '1200' },
  { label: '1200–1600', min: '1200', max: '1600' },
  { label: '1600–2000', min: '1600', max: '2000' },
  { label: '2000–2400', min: '2000', max: '2400' },
  { label: '2400+',  min: '2400', max: '3500' },
];

// ─── Rating Badge ─────────────────────────────────────────────────────────────
const RatingBadge = ({ rating }: { rating: number | null }) => {
  if (!rating) return <span className="text-slate-600 text-xs">—</span>;
  return (
    <span className={`text-xs font-bold ${ratingColor(rating)}`}>
      {rating}
    </span>
  );
};

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="border-b border-white/[0.04]">
    {[50, 200, 300, 80, 80].map((w, i) => (
      <td key={i} className="px-4 py-3">
        <div
          className="h-4 rounded-full bg-white/[0.06] animate-pulse"
          style={{ width: w }}
        />
      </td>
    ))}
  </tr>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ProblemBrowser = () => {
  // ── Filter state ────────────────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [minRating, setMinRating]   = useState('');
  const [maxRating, setMaxRating]   = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput]     = useState('');
  const [showTagMenu, setShowTagMenu] = useState(false);

  // ── Pagination ───────────────────────────────────────────────────────────
  const [page, setPage]    = useState(1);
  const LIMIT = 50;

  // ── Data state ───────────────────────────────────────────────────────────
  const [problems, setProblems]   = useState<CFProblem[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const tagMenuRef  = useRef<HTMLDivElement>(null);

  // ── Click-outside to close tag menu ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) {
        setShowTagMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch problems ───────────────────────────────────────────────────────
  const fetchProblems = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    if (search)             params.set('search', search);
    if (minRating)          params.set('minRating', minRating);
    if (maxRating)          params.set('maxRating', maxRating);
    if (selectedTags.length) params.set('tags', selectedTags.join(','));

    try {
      const res = await api.get<{
        problems: CFProblem[];
        pagination: { total: number; pages: number; page: number };
      }>(`/problems?${params}`);

      setProblems(res.data?.problems ?? []);
      setTotal(res.data?.pagination.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  }, [search, minRating, maxRating, selectedTags]);

  // Debounce search + re-fetch on filter change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchProblems(1);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [fetchProblems]);

  // Re-fetch on page change
  useEffect(() => {
    if (page > 1) fetchProblems(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tag helpers ──────────────────────────────────────────────────────────
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(1);
  };

  const removeTag = (tag: string) => toggleTag(tag);

  const filteredTagOptions = CF_TAGS.filter(
    (t) => t.includes(tagInput.toLowerCase()) && !selectedTags.includes(t)
  );

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto page-enter">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-1">Problem Browser</h1>
          <p className="text-slate-400 text-sm">
            Browse {total > 0 ? total.toLocaleString() : '…'} Codeforces problems.
            Click any problem to open it on Codeforces.
          </p>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="glass rounded-2xl p-5 mb-6 space-y-4">

          {/* Row 1: Search + Rating presets */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search problems by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10 h-10"
                id="problem-search"
              />
            </div>

            {/* Rating presets */}
            <div className="flex gap-1.5 flex-wrap">
              {RATING_PRESETS.map((p) => {
                const active = minRating === p.min && maxRating === p.max;
                return (
                  <button
                    key={p.label}
                    onClick={() => { setMinRating(p.min); setMaxRating(p.max); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                                ${active
                                  ? 'bg-violet-600 text-white shadow-glow-purple'
                                  : 'glass text-slate-400 hover:text-slate-200 hover:bg-white/8'}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Custom rating range + tag selector */}
          <div className="flex flex-wrap gap-3 items-start">
            {/* Min rating */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-slate-500" />
              <input
                type="number"
                placeholder="Min rating"
                value={minRating}
                onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
                className="input-field w-28 h-9 text-xs"
                min={800}
                max={3500}
              />
              <span className="text-slate-600 text-xs">–</span>
              <input
                type="number"
                placeholder="Max rating"
                value={maxRating}
                onChange={(e) => { setMaxRating(e.target.value); setPage(1); }}
                className="input-field w-28 h-9 text-xs"
                min={800}
                max={3500}
              />
            </div>

            {/* Tag multi-select */}
            <div className="relative flex-1 min-w-[200px]" ref={tagMenuRef}>
              <div
                className="input-field h-9 flex items-center gap-2 cursor-pointer flex-wrap min-h-9"
                onClick={() => setShowTagMenu((v) => !v)}
              >
                <Tag size={13} className="text-slate-500 shrink-0" />
                {selectedTags.length === 0 ? (
                  <span className="text-slate-500 text-xs">Filter by tags…</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag) => (
                      <span key={tag}
                            className="inline-flex items-center gap-1 bg-violet-500/20 text-violet-300 rounded-md px-2 py-0.5 text-xs font-medium">
                        {tag}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                          className="hover:text-white transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropdown */}
              {showTagMenu && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[240px] z-50
                                glass-strong rounded-xl shadow-card border border-white/10 p-2">
                  <input
                    type="text"
                    placeholder="Search tags…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="input-field h-8 text-xs mb-2"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-hide">
                    {filteredTagOptions.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-2">No tags found</p>
                    ) : (
                      filteredTagOptions.map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => { e.stopPropagation(); toggleTag(tag); }}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-300
                                     hover:bg-violet-500/15 hover:text-violet-300 transition-colors"
                        >
                          {tag}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Clear filters */}
            {(search || minRating || maxRating || selectedTags.length > 0) && (
              <button
                onClick={() => {
                  setSearch(''); setMinRating(''); setMaxRating('');
                  setSelectedTags([]); setPage(1);
                }}
                className="btn-ghost !px-3 !py-2 text-xs gap-1.5"
              >
                <X size={13} /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && (
          <div className="alert-error mb-4 animate-fade-in-up">
            <AlertCircle size={16} className="shrink-0" />
            <div>
              <p className="font-medium">{error}</p>
              <button onClick={() => fetchProblems(page)}
                      className="text-xs text-red-300 hover:text-white flex items-center gap-1 mt-1">
                <RefreshCw size={11} /> Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────── */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider w-24">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    Problem Name
                  </th>
                  <th className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider w-20">
                    Rating
                  </th>
                  <th className="text-right px-4 py-3 text-slate-400 font-semibold text-xs uppercase tracking-wider w-24">
                    Solved
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)
                  : problems.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-slate-500">
                        <Code2 size={32} className="mx-auto mb-3 opacity-30" />
                        <p>No problems found matching your filters.</p>
                      </td>
                    </tr>
                  )
                  : problems.map((problem) => {
                    const cfUrl = `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
                    return (
                      <tr
                        key={problem.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
                      >
                        {/* ID */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-violet-400 font-semibold text-xs">
                            {problem.id}
                          </span>
                        </td>

                        {/* Name + external link */}
                        <td className="px-4 py-3">
                          <a
                            href={cfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-200 hover:text-violet-300 font-medium transition-colors
                                       flex items-center gap-1.5 group/link"
                          >
                            <span className="line-clamp-1">{problem.name}</span>
                            <ExternalLink size={12}
                              className="text-slate-600 group-hover/link:text-violet-400 shrink-0 transition-colors" />
                          </a>
                        </td>

                        {/* Tags */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {problem.tags.slice(0, 4).map((tag) => (
                              <button
                                key={tag}
                                onClick={() => !selectedTags.includes(tag) && toggleTag(tag)}
                                className={`text-xs px-2 py-0.5 rounded-md transition-colors
                                            ${selectedTags.includes(tag)
                                              ? 'bg-violet-500/25 text-violet-300'
                                              : 'bg-white/[0.05] text-slate-500 hover:bg-violet-500/15 hover:text-violet-400'}`}
                              >
                                {tag}
                              </button>
                            ))}
                            {problem.tags.length > 4 && (
                              <span className="text-xs text-slate-600 px-1">
                                +{problem.tags.length - 4}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Rating */}
                        <td className="px-4 py-3 text-right">
                          <RatingBadge rating={problem.rating} />
                        </td>

                        {/* Solved count */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-slate-400 text-xs font-mono">
                            {problem.solvedCount > 0
                              ? problem.solvedCount.toLocaleString()
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <p className="text-xs text-slate-500">
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost !px-2.5 !py-1.5 disabled:opacity-30"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-slate-400 text-xs px-2 font-mono">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-ghost !px-2.5 !py-1.5 disabled:opacity-30"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProblemBrowser;
