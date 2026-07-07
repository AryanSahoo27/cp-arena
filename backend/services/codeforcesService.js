/**
 * services/codeforcesService.js
 * ──────────────────────────────
 * Codeforces Public API Integration Layer
 *
 * All functions are async and use Node's built-in fetch (v18+)
 * or fall back to https for Node 15 compatibility.
 *
 * Endpoints used:
 *  - https://codeforces.com/api/user.status       → fetch submissions
 *  - https://codeforces.com/api/user.info         → fetch user profile/rating
 *  - https://codeforces.com/api/problemset.problems → browse all problems
 *
 * Rate Limiting:
 *  CF API allows ~1 request/second per IP (unofficial limit).
 *  We use an in-memory LRU-like cache with TTLs to stay well under that.
 */

const https = require('https');

// ─── Simple In-Memory Cache ───────────────────────────────────────────────────
/**
 * cache: Map<string, { data: any, expiresAt: number }>
 * Key = cache key string, Value = { data, expiresAt (ms epoch) }
 */
const cache = new Map();

/**
 * Get a value from cache if still fresh.
 * @param {string} key
 * @returns {any|null}
 */
const cacheGet = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

/**
 * Store a value in cache with a TTL.
 * @param {string} key
 * @param {any} data
 * @param {number} ttlSeconds - Time-to-live in seconds
 */
const cacheSet = (key, data, ttlSeconds) => {
  cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
};

// ─── HTTP Utility ─────────────────────────────────────────────────────────────
/**
 * Perform a GET request and parse the JSON response.
 * Works on Node 15 (no native fetch) using https module.
 *
 * @param {string} url
 * @returns {Promise<any>}
 */
const httpGet = (url) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error('Failed to parse CF API response'));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Codeforces API request timed out'));
    });

    req.on('error', (err) => reject(err));
  });
};

// ─── CF API Base ──────────────────────────────────────────────────────────────
const CF_BASE = 'https://codeforces.com/api';

/**
 * Wrapper: call CF API, handle status field, cache result.
 *
 * @param {string} endpoint   - e.g. 'user.status'
 * @param {Record<string, string|number>} params
 * @param {number} ttlSeconds - Cache TTL (0 = no cache)
 * @returns {Promise<any>}    - CF API result field
 */
const callCF = async (endpoint, params = {}, ttlSeconds = 60) => {
  const query = new URLSearchParams(params).toString();
  const url = `${CF_BASE}/${endpoint}?${query}`;
  const cacheKey = url;

  // Return cached data if fresh
  if (ttlSeconds > 0) {
    const cached = cacheGet(cacheKey);
    if (cached !== null) return cached;
  }

  const json = await httpGet(url);

  if (json.status !== 'OK') {
    throw new Error(`Codeforces API error: ${json.comment || 'Unknown error'}`);
  }

  if (ttlSeconds > 0) {
    cacheSet(cacheKey, json.result, ttlSeconds);
  }

  return json.result;
};

// ═════════════════════════════════════════════════════════════════════════════
//  PUBLIC API FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * getUserSubmissions
 * ───────────────────
 * Fetch all (or recent N) submissions by a CF handle.
 * Filtered to only submissions made after contestStartTime.
 *
 * @param {string} handle           - CF handle
 * @param {number} contestStartTime - Unix timestamp (seconds) of contest start
 * @param {number} contestEndTime   - Unix timestamp (seconds) of contest end
 * @param {string[]} problemIds     - Array of problem IDs to filter (e.g. ['1500A','800B'])
 * @returns {Promise<CFSubmission[]>}
 */
const getUserSubmissions = async (handle, contestStartTime, contestEndTime, problemIds) => {
  // Fetch recent 500 submissions — enough for any contest duration
  const submissions = await callCF(
    'user.status',
    { handle, from: 1, count: 500 },
    30 // 30-second cache: frequent polling during live contest
  );

  const problemSet = new Set(problemIds.map((p) => p.toUpperCase()));

  // Filter to submissions within the contest window for the relevant problems
  return submissions.filter((sub) => {
    const pid = `${sub.problem.contestId}${sub.problem.index}`;
    const inTimeWindow =
      sub.creationTimeSeconds >= contestStartTime &&
      sub.creationTimeSeconds <= contestEndTime;
    return inTimeWindow && problemSet.has(pid.toUpperCase());
  });
};

/**
 * getUserInfo
 * ────────────
 * Fetch public profile info for one or more CF handles.
 *
 * @param {string|string[]} handles - Single handle or array
 * @returns {Promise<CFUser[]>}
 */
const getUserInfo = async (handles) => {
  const handleList = Array.isArray(handles) ? handles.join(';') : handles;
  return callCF('user.info', { handles: handleList }, 300); // 5-min cache
};

/**
 * getProblems
 * ────────────
 * Fetch all problems from the CF problemset.
 * Supports optional filtering by tags.
 *
 * @param {string[]} [tags]  - Optional tag filters (e.g. ['dp', 'graphs'])
 * @returns {Promise<{ problems: CFProblem[], problemStatistics: CFProblemStats[] }>}
 */
const getProblems = async (tags = []) => {
  const params = {};
  if (tags.length > 0) {
    params.tags = tags.join(';');
  }
  // Problems rarely change — cache for 10 minutes
  return callCF('problemset.problems', params, 600);
};

/**
 * validateCFHandle
 * ─────────────────
 * Check if a Codeforces handle is valid/exists.
 *
 * @param {string} handle
 * @returns {Promise<{ valid: boolean, user?: CFUser, error?: string }>}
 */
const validateCFHandle = async (handle) => {
  try {
    const [user] = await getUserInfo(handle);
    return { valid: true, user };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

/**
 * getUserRating
 * ──────────────
 * Fetch current rating for a single CF handle.
 *
 * @param {string} handle
 * @returns {Promise<number>} - Returns 0 if unrated
 */
const getUserRating = async (handle) => {
  try {
    const [user] = await getUserInfo(handle);
    return user.rating || 0;
  } catch {
    return 0;
  }
};

// ─── Cache Management ─────────────────────────────────────────────────────────

/**
 * clearCache
 * ───────────
 * Clear all cached CF API responses (or a specific key).
 * Useful for forcing a fresh fetch during live contests.
 *
 * @param {string} [key] - Optional specific cache key to clear
 */
const clearCache = (key) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

/**
 * getCacheStats
 * ─────────────
 * Return current cache size and keys (for debugging/monitoring).
 */
const getCacheStats = () => ({
  size: cache.size,
  keys: [...cache.keys()],
});

module.exports = {
  getUserSubmissions,
  getUserInfo,
  getProblems,
  validateCFHandle,
  getUserRating,
  callCF,
  clearCache,
  getCacheStats,
};
