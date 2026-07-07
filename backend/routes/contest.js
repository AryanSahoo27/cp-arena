/**
 * routes/contest.js
 * ──────────────────
 * Contest & Problem Discovery Routes
 *
 * All routes require authentication (JWT) except where noted.
 *
 * Mounted at: /api/contests  and  /api/problems
 *
 * Route Summary:
 * ─────────────────────────────────────────────────────────────────
 * Contest Management
 *   POST   /api/contests              → Create a new contest
 *   GET    /api/contests              → List public + joined contests
 *   GET    /api/contests/mine         → List user's own contests
 *   GET    /api/contests/:id          → Get single contest details
 *   POST   /api/contests/:id/join     → Join a contest (with optional inviteCode)
 *   POST   /api/contests/:id/sync     → Trigger CF submission sync (manual)
 *   GET    /api/contests/:id/leaderboard → Live ICPC leaderboard
 *
 * Problem Discovery
 *   GET    /api/problems              → Browse CF problems with filters
 */

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');

const {
  createContest,
  getContests,
  getContestById,
  joinContest,
  syncSubmissions,
  getLeaderboard,
  getMyContests,
  getProblems,
} = require('../controllers/contestController');

// ─── Validation Helper ────────────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Create Contest Validation ────────────────────────────────────────────────
const createContestValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters.'),

  body('startTime')
    .notEmpty().withMessage('Start time is required.')
    .isISO8601().withMessage('Start time must be a valid ISO 8601 date.'),

  body('durationMinutes')
    .notEmpty().withMessage('Duration is required.')
    .isInt({ min: 5, max: 1440 }).withMessage('Duration must be 5–1440 minutes.'),

  body('problems')
    .isArray({ min: 1, max: 10 }).withMessage('Problems must be an array of 1–10 items.'),

  body('problems.*')
    .custom((problem) => {
      // Accept string ID or object with problemId
      const id = typeof problem === 'string' ? problem : problem?.problemId;
      if (!id || !/^\d+[A-Za-z]\d*$/.test(id)) {
        throw new Error(`Invalid problem ID format: "${id}". Expected format like "1500A".`);
      }
      return true;
    }),

  body('isPrivate')
    .optional()
    .isBoolean().withMessage('isPrivate must be true or false.'),

  body('scoringType')
    .optional()
    .isIn(['icpc', 'ioi']).withMessage('scoringType must be "icpc" or "ioi".'),
];

// ─── Leaderboard / Sync Route Guard ──────────────────────────────────────────
const contestIdValidation = [
  param('id').isMongoId().withMessage('Invalid contest ID.'),
];

// ═════════════════════════════════════════════════════════════════════════════
//  CONTEST ROUTES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/contests
 * @desc    Create a new contest
 * @access  Private
 */
router.post(
  '/',
  protect,
  createContestValidation,
  validate,
  createContest
);

/**
 * @route   GET /api/contests/mine
 * @desc    Get all contests created by or joined by the user
 * @access  Private
 * NOTE: Must be registered BEFORE /:id to avoid 'mine' being treated as an ObjectId
 */
router.get('/mine', protect, getMyContests);

/**
 * @route   GET /api/contests
 * @desc    Get paginated list of public/joined contests
 * @access  Private
 * @query   page, limit, status (upcoming|ongoing|ended), search
 */
router.get('/', protect, getContests);

/**
 * @route   GET /api/contests/:id
 * @desc    Get a single contest by ID
 * @access  Private (private contests require participation)
 */
router.get(
  '/:id',
  protect,
  contestIdValidation,
  validate,
  getContestById
);

/**
 * @route   POST /api/contests/:id/join
 * @desc    Join a contest (inviteCode required for private contests)
 * @access  Private
 * @body    { inviteCode?: string }
 */
router.post(
  '/:id/join',
  protect,
  contestIdValidation,
  validate,
  joinContest
);

/**
 * @route   POST /api/contests/:id/sync
 * @desc    Manually trigger Codeforces submission sync for all participants
 * @access  Private (creator or admin only — enforced in controller)
 */
router.post(
  '/:id/sync',
  protect,
  contestIdValidation,
  validate,
  syncSubmissions
);

/**
 * @route   GET /api/contests/:id/leaderboard
 * @desc    Get live ICPC leaderboard for a contest
 * @access  Private
 */
router.get(
  '/:id/leaderboard',
  protect,
  contestIdValidation,
  validate,
  getLeaderboard
);

// ═════════════════════════════════════════════════════════════════════════════
//  PROBLEM DISCOVERY ROUTES
//  Exported separately — mounted at /api/problems in server.js
// ═════════════════════════════════════════════════════════════════════════════

const problemsRouter = express.Router();

/**
 * @route   GET /api/problems
 * @desc    Browse Codeforces problemset with optional filters
 * @access  Private
 * @query   tags (comma-sep), minRating, maxRating, search, page, limit
 */
problemsRouter.get(
  '/',
  protect,
  [
    query('minRating')
      .optional()
      .isInt({ min: 800, max: 3500 }).withMessage('minRating must be 800–3500.'),
    query('maxRating')
      .optional()
      .isInt({ min: 800, max: 3500 }).withMessage('maxRating must be 800–3500.'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('page must be a positive integer.'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 }).withMessage('limit must be 1–200.'),
  ],
  validate,
  getProblems
);

module.exports = { contestRouter: router, problemsRouter };
