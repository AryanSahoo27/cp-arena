const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * generateTokens
 * Creates a short-lived access token and a long-lived refresh token.
 *
 * @param {string} userId - MongoDB ObjectId as string
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * Validates input, creates the user, and returns tokens.
 */
const register = async (req, res) => {
  try {
    const { handle, email, password, codeforcesHandle } = req.body;

    // ── Check for existing handle or email ──────────────────────────────────
    const existing = await User.findOne({ $or: [{ handle }, { email }] });

    if (existing) {
      const field = existing.handle === handle ? 'handle' : 'email';
      return res.status(409).json({
        success: false,
        message: `A user with this ${field} already exists.`,
      });
    }

    // ── Create user (password is hashed via pre-save hook in User model) ────
    const user = await User.create({
      handle,
      email,
      password,
      codeforcesHandle: codeforcesHandle || null,
    });

    // ── Generate tokens ──────────────────────────────────────────────────────
    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    // Store refresh token in DB (for rotation & revocation)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    user.refreshTokens.push({ token: refreshToken, expiresAt });
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: user.toPublicJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error('[register]', err.message);

    // Mongoose duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `${field} is already taken.`,
      });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Login an existing user with email or handle + password.
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    // 'identifier' can be either email OR handle

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email/handle and password.',
      });
    }

    // ── Find user (select password explicitly since it's excluded by default) ─
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { handle: identifier },
      ],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // ── Compare password ─────────────────────────────────────────────────────
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // ── Generate new tokens ──────────────────────────────────────────────────
    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    // Prune expired refresh tokens + add new one
    const now = new Date();
    user.refreshTokens = user.refreshTokens.filter((t) => t.expiresAt > now);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.refreshTokens.push({ token: refreshToken, expiresAt });
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: user.toPublicJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exchange a valid refresh token for a new access token.
 */
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required.' });
    }

    // Verify refresh token signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    // Find user and check token is still stored (not revoked)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const stored = user.refreshTokens.find((t) => t.token === refreshToken);
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked or expired.' });
    }

    // Issue a new access token
    const newAccessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    console.error('[refreshAccessToken]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Revoke a refresh token (logout from current device).
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove this specific refresh token
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('[logout]', err.message);
    return res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the currently authenticated user's profile.
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(200).json({ success: true, data: { user: user.toPublicJSON() } });
  } catch (err) {
    console.error('[getMe]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { register, login, refreshAccessToken, logout, getMe };
