/**
 * utils/icpcScoring.js
 * ─────────────────────
 * ICPC-Style Leaderboard Scoring Engine
 *
 * ICPC Scoring Rules:
 * ────────────────────
 * 1. Rank by number of problems SOLVED (descending).
 * 2. Tiebreak by total PENALTY (ascending).
 * 3. Penalty for a solved problem =
 *      (minutes from contest start to first AC)
 *      + (20 minutes × number of wrong attempts before first AC)
 * 4. Unsolved problems contribute ZERO penalty.
 * 5. All times are relative to contest start.
 *
 * Example:
 *   Contest starts at T=0.
 *   User solves Problem A at T+45min with 2 wrong attempts:
 *     Penalty = 45 + (2 × 20) = 85 minutes
 */

// ─── Constants ────────────────────────────────────────────────────────────────
const WRONG_ATTEMPT_PENALTY_MINUTES = 20;

/**
 * @typedef {Object} RawSubmission
 * @property {string} userHandle
 * @property {string} problemId        - e.g. '1500A'
 * @property {string} verdict          - CF verdict string
 * @property {number} creationTimeSeconds - Unix timestamp
 */

/**
 * @typedef {Object} ProblemResult
 * @property {string}  problemId
 * @property {boolean} solved
 * @property {number}  wrongAttempts   - Attempts before first AC
 * @property {number}  solveTimeMinutes- Minutes from contest start to AC
 * @property {number}  penalty         - ICPC penalty for this problem
 * @property {number|null} firstACTime - Unix timestamp of AC, or null
 */

/**
 * @typedef {Object} LeaderboardEntry
 * @property {string}         handle
 * @property {number}         rank
 * @property {number}         solved
 * @property {number}         totalPenalty
 * @property {ProblemResult[]} problems    - Per-problem breakdown
 */

// ─── Core Scoring Engine ──────────────────────────────────────────────────────

/**
 * computeICPCLeaderboard
 * ───────────────────────
 * Given raw submissions for a contest, compute the full ICPC leaderboard.
 *
 * @param {RawSubmission[]} submissions  - All submissions for the contest
 * @param {string[]}        problemIds   - Ordered list of contest problem IDs
 * @param {number}          contestStartTime - Unix timestamp (seconds) of start
 * @param {number}          contestEndTime   - Unix timestamp (seconds) of end
 * @returns {LeaderboardEntry[]} - Sorted leaderboard (rank 1 = best)
 */
const computeICPCLeaderboard = (
  submissions,
  problemIds,
  contestStartTime,
  contestEndTime
) => {
  // ── Step 1: Group submissions by handle ──────────────────────────────────
  /** @type {Map<string, RawSubmission[]>} */
  const byHandle = new Map();

  for (const sub of submissions) {
    // Ignore submissions outside contest window
    if (
      sub.creationTimeSeconds < contestStartTime ||
      sub.creationTimeSeconds > contestEndTime
    ) {
      continue;
    }

    const handle = sub.userHandle;
    if (!byHandle.has(handle)) byHandle.set(handle, []);
    byHandle.get(handle).push(sub);
  }

  // ── Step 2: Per-user, per-problem analysis ────────────────────────────────
  /** @type {LeaderboardEntry[]} */
  const entries = [];

  for (const [handle, userSubs] of byHandle.entries()) {
    let totalSolved = 0;
    let totalPenalty = 0;
    const problemResults = [];

    for (const pid of problemIds) {
      const result = scoreProblemForUser(
        userSubs,
        pid,
        contestStartTime,
        contestEndTime
      );

      if (result.solved) {
        totalSolved += 1;
        totalPenalty += result.penalty;
      }

      problemResults.push(result);
    }

    entries.push({
      handle,
      rank: 0,          // Assigned after sorting
      solved: totalSolved,
      totalPenalty,
      problems: problemResults,
    });
  }

  // ── Step 3: Sort & assign ranks ──────────────────────────────────────────
  entries.sort((a, b) => {
    // Primary: more solved = better
    if (b.solved !== a.solved) return b.solved - a.solved;
    // Secondary: less penalty = better
    return a.totalPenalty - b.totalPenalty;
  });

  // Assign ranks (with tie handling)
  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (
      i > 0 &&
      (entries[i].solved !== entries[i - 1].solved ||
        entries[i].totalPenalty !== entries[i - 1].totalPenalty)
    ) {
      currentRank = i + 1;
    }
    entries[i].rank = currentRank;
  }

  return entries;
};

/**
 * scoreProblemForUser
 * ────────────────────
 * Calculate ICPC result for a single user on a single problem.
 *
 * @param {RawSubmission[]} userSubs       - All subs for this user
 * @param {string}          problemId      - e.g. '1500A'
 * @param {number}          contestStartTime
 * @param {number}          contestEndTime
 * @returns {ProblemResult}
 */
const scoreProblemForUser = (
  userSubs,
  problemId,
  contestStartTime,
  contestEndTime
) => {
  const pid = problemId.toUpperCase();

  // Filter to subs for this specific problem, sorted by time ASC
  const problemSubs = userSubs
    .filter((s) => s.problemId.toUpperCase() === pid)
    .sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds);

  let wrongAttempts = 0;
  let firstACTime = null;
  let solveTimeMinutes = 0;

  for (const sub of problemSubs) {
    if (sub.verdict === 'OK') {
      firstACTime = sub.creationTimeSeconds;
      solveTimeMinutes = Math.floor(
        (sub.creationTimeSeconds - contestStartTime) / 60
      );
      break; // Stop at first AC
    }

    // Only count wrong verdicts that are "attempted" (not compiling issues in some rulesets)
    // Standard ICPC: CE does NOT count as a wrong attempt, all others do
    if (sub.verdict !== 'COMPILATION_ERROR') {
      wrongAttempts += 1;
    }
  }

  const solved = firstACTime !== null;
  const penalty = solved
    ? solveTimeMinutes + wrongAttempts * WRONG_ATTEMPT_PENALTY_MINUTES
    : 0;

  return {
    problemId: pid,
    solved,
    wrongAttempts,
    solveTimeMinutes: solved ? solveTimeMinutes : 0,
    penalty,
    firstACTime,
  };
};

// ─── Leaderboard Diff Utility ─────────────────────────────────────────────────

/**
 * computeRankChanges
 * ───────────────────
 * Compare two leaderboard snapshots and return delta information.
 * Useful for highlighting rank changes in the UI (↑ / ↓ / —).
 *
 * @param {LeaderboardEntry[]} previous
 * @param {LeaderboardEntry[]} current
 * @returns {Array<LeaderboardEntry & { rankChange: number }>}
 */
const computeRankChanges = (previous, current) => {
  const prevMap = new Map(previous.map((e) => [e.handle, e.rank]));

  return current.map((entry) => {
    const prevRank = prevMap.get(entry.handle);
    const rankChange =
      prevRank !== undefined ? prevRank - entry.rank : 0; // positive = moved up

    return { ...entry, rankChange };
  });
};

/**
 * getContestStats
 * ────────────────
 * Aggregate statistics for a finished contest.
 *
 * @param {LeaderboardEntry[]} leaderboard
 * @param {string[]} problemIds
 * @returns {Object} - Summary stats
 */
const getContestStats = (leaderboard, problemIds) => {
  const totalParticipants = leaderboard.length;
  if (totalParticipants === 0) {
    return { totalParticipants: 0, problemStats: [] };
  }

  const problemStats = problemIds.map((pid) => {
    const solveCount = leaderboard.filter((entry) =>
      entry.problems.find((p) => p.problemId === pid && p.solved)
    ).length;

    const solvers = leaderboard
      .map((entry) => {
        const p = entry.problems.find((pr) => pr.problemId === pid);
        return p && p.solved ? { handle: entry.handle, time: p.solveTimeMinutes } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);

    const firstBlood = solvers.length > 0 ? solvers[0] : null;

    return {
      problemId: pid,
      solveCount,
      solveRate:
        totalParticipants > 0
          ? ((solveCount / totalParticipants) * 100).toFixed(1) + '%'
          : '0%',
      firstBlood,
    };
  });

  const winner = leaderboard[0] || null;

  return {
    totalParticipants,
    winner: winner ? { handle: winner.handle, solved: winner.solved } : null,
    problemStats,
  };
};

module.exports = {
  computeICPCLeaderboard,
  scoreProblemForUser,
  computeRankChanges,
  getContestStats,
  WRONG_ATTEMPT_PENALTY_MINUTES,
};
