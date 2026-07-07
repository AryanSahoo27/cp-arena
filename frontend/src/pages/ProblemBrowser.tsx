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

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, ExternalLink, Code2, ChevronLeft, ChevronRight,
  X, Tag, SlidersHorizontal, RefreshCw, AlertCircle, Shuffle,
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
  <tr className="border-b border-zinc-900">
    {[50, 200, 300, 80, 80].map((w, i) => (
      <td key={i} className="px-4 py-3">
        <div
          className="h-3 rounded-sm bg-zinc-800 animate-pulse"
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

  // ── Sort state ─────────────────────────────────────────────────
  type SortCol = 'id' | 'rating' | 'solved' | null;
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortIndicator = (col: SortCol) =>
    sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // ── Pagination ────────────────────────────────────────────────
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

  // ── Client-side sort of the current page ──────────────────────────────
  const sortedProblems = useMemo(() => {
    if (!sortCol) return problems;
    return [...problems].sort((a, b) => {
      let av: number, bv: number;
      if (sortCol === 'id') {
        // sort lexicographically by problem id string
        const cmp = (a.id ?? '').localeCompare(b.id ?? '');
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortCol === 'rating') {
        av = a.rating ?? 0;
        bv = b.rating ?? 0;
      } else {
        av = a.solvedCount ?? 0;
        bv = b.solvedCount ?? 0;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [problems, sortCol, sortDir]);

  // ── Surprise Me ──────────────────────────────────────────────────
  const handleSurprise = () => {
    if (problems.length === 0) return;
    const pick = problems[Math.floor(Math.random() * problems.length)];
    const url = `https://codeforces.com/problemset/problem/${pick.contestId}/${pick.index}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto page-enter">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="mb-6 pb-4 border-b border-zinc-900">
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">Problem Browser</h1>
          <p className="text-zinc-500 text-sm">
            Browse {total > 0 ? total.toLocaleString() : '…'} Codeforces problems.
            Click any problem to open it on Codeforces.
          </p>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="border border-zinc-800 rounded-sm p-4 mb-5 space-y-3">

          {/* Row 1: Search + Surprise Me + Rating presets */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search problems by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 h-9"
                id="problem-search"
              />
            </div>

            {/* Surprise Me */}
            <button
              id="surprise-me-btn"
              onClick={handleSurprise}
              disabled={problems.length === 0 || loading}
              title="Open a random problem from the current results"
              className="flex items-center gap-1.5 px-3 h-9 rounded-sm text-xs font-medium
                         bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700
                         transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Shuffle size={13} />
              Surprise Me
            </button>

            {/* Rating presets */}
            <div className="flex gap-1 flex-wrap">
              {RATING_PRESETS.map((p) => {
                const active = minRating === p.min && maxRating === p.max;
                return (
                  <button
                    key={p.label}
                    onClick={() => { setMinRating(p.min); setMaxRating(p.max); setPage(1); }}
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors duration-100
                                ${
                                  active
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600'
                                }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Custom rating range + tag selector */}
          <div className="flex flex-wrap gap-2 items-start">
            {/* Min rating */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={13} className="text-zinc-400" />
              <input
                type="number"
                placeholder="Min rating"
                value={minRating}
                onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
                className="input-field w-28 h-8 text-xs"
                min={800}
                max={3500}
              />
              <span className="text-zinc-400 text-xs">–</span>
              <input
                type="number"
                placeholder="Max rating"
                value={maxRating}
                onChange={(e) => { setMaxRating(e.target.value); setPage(1); }}
                className="input-field w-28 h-8 text-xs"
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
                <Tag size={13} className="text-zinc-400 shrink-0" />
                {selectedTags.length === 0 ? (
                  <span className="text-zinc-400 text-xs">Filter by tags…</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag) => (
                      <span key={tag}
                            className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-400 border border-blue-800/50 rounded-sm px-2 py-0.5 text-xs font-medium">
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
                                bg-[#161616] border border-zinc-700 rounded-sm shadow-lg p-2">
                  <input
                    type="text"
                    placeholder="Search tags…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="input-field h-7 text-xs mb-1.5"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-hide">
                    {filteredTagOptions.length === 0 ? (
                      <p className="text-zinc-400 text-xs text-center py-2">No tags found</p>
                    ) : (
                      filteredTagOptions.map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => { e.stopPropagation(); toggleTag(tag); }}
                          className="w-full text-left px-2 py-1.5 rounded-sm text-xs text-zinc-400
                                     hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
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
                className="btn-ghost !px-3 !py-1.5 text-xs gap-1.5"
              >
                <X size={12} /> Clear
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
        <div className="border border-zinc-800 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  {/* Sortable: ID */}
                  <th
                    className="text-left px-4 py-2.5 text-zinc-500 font-medium text-xs uppercase tracking-wider w-24
                               cursor-pointer select-none hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort('id')}
                  >
                    ID{sortIndicator('id')}
                  </th>
                  {/* Not sortable: Name */}
                  <th className="text-left px-4 py-2.5 text-zinc-500 font-medium text-xs uppercase tracking-wider">
                    Problem Name
                  </th>
                  {/* Not sortable: Tags */}
                  <th className="text-left px-4 py-2.5 text-zinc-500 font-medium text-xs uppercase tracking-wider">
                    Tags
                  </th>
                  {/* Sortable: Rating */}
                  <th
                    className="text-right px-4 py-2.5 text-zinc-500 font-medium text-xs uppercase tracking-wider w-20
                               cursor-pointer select-none hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort('rating')}
                  >
                    Rating{sortIndicator('rating')}
                  </th>
                  {/* Sortable: Solved */}
                  <th
                    className="text-right px-4 py-2.5 text-zinc-500 font-medium text-xs uppercase tracking-wider w-24
                               cursor-pointer select-none hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort('solved')}
                  >
                    Solved{sortIndicator('solved')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)
                  : problems.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-zinc-400">
                        <Code2 size={28} className="mx-auto mb-3 opacity-30" />
                        <p>No problems found matching your filters.</p>
                      </td>
                    </tr>
                  )
                  : sortedProblems.map((problem) => {
                    const cfUrl = `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
                    return (
                      <tr
                        key={problem.id}
                        className="border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors group"
                      >
                        {/* ID */}
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-blue-400 font-semibold text-xs">
                            {problem.id}
                          </span>
                        </td>

                        {/* Name + external link */}
                        <td className="px-4 py-2.5">
                          <a
                            href={cfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-200 hover:text-blue-400 font-medium transition-colors
                                       flex items-center gap-1.5 group/link"
                          >
                            <span className="line-clamp-1">{problem.name}</span>
                            <ExternalLink size={11}
                              className="text-zinc-400 group-hover/link:text-blue-400 shrink-0 transition-colors" />
                          </a>
                        </td>

                        {/* Tags */}
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {problem.tags.slice(0, 4).map((tag) => (
                              <button
                                key={tag}
                                onClick={() => !selectedTags.includes(tag) && toggleTag(tag)}
                                className={`text-xs px-2 py-0.5 rounded-sm transition-colors border
                                            ${
                                              selectedTags.includes(tag)
                                              ? 'bg-blue-600/20 text-blue-400 border-blue-800/50'
                                              : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
                                            }`}
                              >
                                {tag}
                              </button>
                            ))}
                            {problem.tags.length > 4 && (
                              <span className="text-xs text-zinc-400 px-1">
                                +{problem.tags.length - 4}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Rating */}
                        <td className="px-4 py-2.5 text-right">
                          <RatingBadge rating={problem.rating} />
                        </td>

                        {/* Solved count */}
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-zinc-500 text-xs font-mono">
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-900">
              <p className="text-xs text-zinc-400">
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost !px-2.5 !py-1.5 disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-zinc-500 text-xs px-2 font-mono">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-ghost !px-2.5 !py-1.5 disabled:opacity-30"
                >
                  <ChevronRight size={14} />
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
