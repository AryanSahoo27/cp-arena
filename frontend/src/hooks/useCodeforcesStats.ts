/**
 * src/hooks/useCodeforcesStats.ts
 * ────────────────────────────────
 * Fetches live Codeforces stats for a given handle directly from the
 * public Codeforces API (no auth required, CORS-enabled for GET requests).
 *
 * Returns:
 *  - rating       : current CF rating (from user.info)
 *  - maxRating    : all-time peak rating
 *  - contestCount : number of rated contests participated in (user.rating)
 *  - solvedCount  : unique problems solved (verdict === 'OK', from user.status)
 *  - rank         : CF rank string (e.g. "Expert")
 *  - loading      : true while any fetch is in-flight
 *  - error        : error message string, or null
 */

import { useState, useEffect } from 'react';

export interface CFStats {
  rating:       number | null;
  maxRating:    number | null;
  contestCount: number | null;
  solvedCount:  number | null;
  rank:         string | null;
  avatarUrl:    string | null;
  loading:      boolean;
  error:        string | null;
}

const CF_BASE = 'https://codeforces.com/api';

// Simple in-memory cache so navigating back doesn't re-fetch
const cache = new Map<string, Omit<CFStats, 'loading' | 'error'>>();

export function useCodeforcesStats(handle: string | null | undefined): CFStats {
  const [state, setState] = useState<CFStats>({
    rating: null, maxRating: null, contestCount: null,
    solvedCount: null, rank: null, avatarUrl: null,
    loading: false, error: null,
  });

  useEffect(() => {
    if (!handle) {
      setState((s) => ({ ...s, loading: false, error: null }));
      return;
    }

    // Return cached result instantly
    if (cache.has(handle)) {
      setState({ ...cache.get(handle)!, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        // ── 1. user.info → rating, maxRating, rank ──────────────────────────
        const infoRes = await fetch(`${CF_BASE}/user.info?handles=${handle}`);
        const infoJson = await infoRes.json();
        if (infoJson.status !== 'OK') throw new Error(infoJson.comment ?? 'CF API error');
        const info = infoJson.result[0];
        const rating    = info.rating    ?? null;
        const maxRating = info.maxRating ?? null;
        const rank      = info.rank      ?? null;
        const avatarUrl = info.titlePhoto ? `https:${info.titlePhoto}` : null;

        // ── 2 & 3: user.rating + user.status in parallel ────────────────────
        const [ratingRes, statusRes] = await Promise.allSettled([
          fetch(`${CF_BASE}/user.rating?handle=${handle}`).then((r) => r.json()),
          fetch(`${CF_BASE}/user.status?handle=${handle}&from=1&count=10000`).then((r) => r.json()),
        ]);

        // contest count = number of rated round entries
        const contestCount =
          ratingRes.status === 'fulfilled' && ratingRes.value.status === 'OK'
            ? (ratingRes.value.result as unknown[]).length
            : null;

        // solved count = unique problems with verdict OK
        let solvedCount: number | null = null;
        if (statusRes.status === 'fulfilled' && statusRes.value.status === 'OK') {
          const seen = new Set<string>();
          for (const sub of statusRes.value.result as Array<{
            verdict: string;
            problem: { contestId?: number; index: string };
          }>) {
            if (sub.verdict === 'OK') {
              seen.add(`${sub.problem.contestId ?? 0}-${sub.problem.index}`);
            }
          }
          solvedCount = seen.size;
        }

        const result = { rating, maxRating, contestCount, solvedCount, rank, avatarUrl };
        cache.set(handle, result);

        if (!cancelled) {
          setState({ ...result, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to fetch CF stats',
          }));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [handle]);

  return state;
}
