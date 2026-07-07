/**
 * routes/user.js
 * ───────────────
 * User analytics routes — all protected by JWT auth middleware.
 *
 * Mounted at: /api/users
 *
 * Routes:
 *   GET /api/users/me/stats          → aggregate problem/streak stats
 *   GET /api/users/me/rating-history → CF contest rating history
 *   GET /api/users/me/heatmap        → 90-day daily submission heatmap
 */

const express        = require('express');
const router         = express.Router();
const { protect }    = require('../middleware/authMiddleware');
const {
  getMyStats,
  getMyRatingHistory,
  getMyHeatmap,
} = require('../controllers/userController');

// All routes require authentication
router.use(protect);

// ── Analytics endpoints ───────────────────────────────────────────────────────

/**
 * GET /api/users/me/stats
 * Returns: { totalSolved, contestsEntered, currentStreak, maxStreak }
 */
router.get('/me/stats', getMyStats);

/**
 * GET /api/users/me/rating-history
 * Returns: { history: [{ date, rating, contestName, rank, change }] }
 * Pulled live from Codeforces API (cached 5 min).
 */
router.get('/me/rating-history', getMyRatingHistory);

/**
 * GET /api/users/me/heatmap?days=90
 * Returns: { heatmap: [{ date: "YYYY-MM-DD", count: number }] }
 */
router.get('/me/heatmap', getMyHeatmap);

module.exports = router;
