const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const express = require('express');
const router = express.Router();

const {
  register,
  login,
  refreshAccessToken,
  logout,
  getMe,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

// ─── Validation Middleware Factories ────────────────────────────────────────

/** Validation rules for registration */
const registerValidation = [
  body('handle')
    .trim()
    .notEmpty().withMessage('Handle is required.')
    .isLength({ min: 3, max: 24 }).withMessage('Handle must be 3–24 characters.')
    .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Handle can only contain letters, numbers, _, ., -'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),

  body('codeforcesHandle')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 24 }).withMessage('Codeforces handle must be at most 24 characters.'),
];

/** Validation rules for login */
const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Email or handle is required.'),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

/**
 * Middleware: check validation results and short-circuit with 422 if invalid.
 */
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

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerValidation, validate, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login with email/handle + password, receive JWT tokens
 * @access  Public
 */
router.post('/login', loginValidation, validate, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Exchange refresh token for a new access token
 * @access  Public
 */
router.post('/refresh', refreshAccessToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Revoke refresh token (logout from current device)
 * @access  Private
 */
router.post('/logout', protect, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get('/me', protect, getMe);

module.exports = router;
