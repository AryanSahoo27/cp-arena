/**
 * controllers/userController.js
 * ──────────────────────────────
 * Handlers for user profile analytics endpoints.
 *
 * Routes served:
 *   GET /api/users/me/stats          → solved count, streaks, contest count
 *   GET /api/users/me/rating-history → CF rating progression from CF API
 *   GET /api/users/me/heatmap        → daily submission counts (last N days)
 */

const Submission  = require('../models/Submission');
const Contest     = require('../models/Contest');
const cfService   = require('../services/codeforcesService');

// ─── GET /api/users/me/stats ──────────────────────────────────────────────────
/**
 * Returns aggregate problem-solving stats for the authenticated user.
 * - totalSolved:      distinct accepted problems across all tracked submissions
 * - contestsEntered: contests the user has participated in
 * - currentStreak:   consecutive days with ≥1 accepted submission (up to today)
 * - maxStreak:       longest ever streak
 */
const getMyStats = async (req, res) => {
  try {
    const handle = req.user.handle;

    // ── Total unique problems solved (distinct problemIds with AC verdict) ─
    const solvedDocs = await Submission.distinct('problemId', {
      userHandle: handle,
      verdict: 'OK',
    });
    const totalSolved = solvedDocs.length;

    // ── Contests participated ──────────────────────────────────────────────
    const user = req.user; // populated by authMiddleware
    const contestsEntered = await Contest.countDocuments({
      participants: user._id || user.id,
    });

    // ── Build set of days with accepted submissions for streak calc ────────
    const acSubmissions = await Submission.find(
      { userHandle: handle, verdict: 'OK' },
      { creationTimeSeconds: 1 }
    ).lean();

    // Build a Set of "YYYY-MM-DD" strings for each AC day
    const acDays = new Set(
      acSubmissions.map((s) => {
        const d = new Date(s.creationTimeSeconds * 1000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    );

    // Sort unique AC days ascending
    const sortedDays = [...acDays].sort();

    let currentStreak = 0;
    let maxStreak     = 0;
    let streak        = 0;

    // Walk through sorted days, counting consecutive day gaps
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        streak = 1;
      } else {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        const diffDays = Math.round((curr - prev) / 86400000);
        streak = diffDays === 1 ? streak + 1 : 1;
      }
      if (streak > maxStreak) maxStreak = streak;
    }

    // Check if streak extends to today or yesterday (still active)
    const today     = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr  = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr   = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const lastDay   = sortedDays[sortedDays.length - 1];
    currentStreak = (lastDay === todayStr || lastDay === yestStr) ? streak : 0;

    return res.json({
      success: true,
      data: {
        totalSolved,
        contestsEntered,
        currentStreak,
        maxStreak,
      },
    });
  } catch (err) {
    console.error('[getMyStats]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
};

// ─── GET /api/users/me/rating-history ────────────────────────────────────────
/**
 * Returns the user's Codeforces contest rating history.
 * Fetched live from cf API using the user's linked CF handle.
 * Cached in codeforcesService for 5 minutes.
 */
const getMyRatingHistory = async (req, res) => {
  const cfHandle = req.user.codeforcesHandle;

  if (!cfHandle) {
    return res.json({ success: true, data: { history: [] } });
  }

  try {
    // CF API: user.rating → array of { contestId, contestName, handle, rank, ratingUpdateTimeSeconds, oldRating, newRating }
    const cfHistory = await cfService.callCF(
      'user.rating',
      { handle: cfHandle },
      300 // 5-minute cache
    );

    const history = cfHistory.map((entry) => ({
      date:        new Date(entry.ratingUpdateTimeSeconds * 1000).toISOString(),
      rating:      entry.newRating,
      contestName: entry.contestName,
      rank:        entry.rank,
      change:      entry.newRating - entry.oldRating,
    }));

    return res.json({ success: true, data: { history } });
  } catch (err) {
    console.error('[getMyRatingHistory]', err.message);
    // Return empty rather than crashing — CF API might be slow
    return res.json({ success: true, data: { history: [] } });
  }
};

// ─── GET /api/users/me/heatmap?days=90 ───────────────────────────────────────
/**
 * Returns daily accepted submission counts for the last N days.
 * Used to render the GitHub-style contribution heatmap.
 */
const getMyHeatmap = async (req, res) => {
  try {
    const handle   = req.user.handle;
    const days     = Math.min(365, Math.max(7, parseInt(req.query.days) || 90));
    const since    = Math.floor((Date.now() - days * 86400 * 1000) / 1000); // unix seconds

    // Fetch all submissions in range (all verdicts — to also count WA attempts if desired)
    const submissions = await Submission.find(
      {
        userHandle: handle,
        verdict: 'OK', // only accepted for heatmap
        creationTimeSeconds: { $gte: since },
      },
      { creationTimeSeconds: 1, problemId: 1 }
    ).lean();

    // Group into daily buckets: { "YYYY-MM-DD" → count }
    const dayMap = new Map();
    for (const sub of submissions) {
      const d = new Date(sub.creationTimeSeconds * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }

    // Build an array for every day in range (0 for no activity)
    const heatmap = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      heatmap.push({ date: key, count: dayMap.get(key) || 0 });
    }

    return res.json({ success: true, data: { heatmap } });
  } catch (err) {
    console.error('[getMyHeatmap]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch heatmap data.' });
  }
};

module.exports = { getMyStats, getMyRatingHistory, getMyHeatmap };
