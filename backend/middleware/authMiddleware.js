const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect
 * ────────
 * Middleware that verifies the Bearer JWT in the Authorization header.
 * On success, attaches { id, role } to req.user and calls next().
 * On failure, returns 401 with a descriptive error.
 *
 * Usage:
 *   router.get('/protected-route', protect, handlerFn);
 */
const protect = async (req, res, next) => {
  try {
    // ── 1. Extract token from Authorization header ───────────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // ── 2. Verify token signature and expiry ─────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please refresh your session.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'TOKEN_INVALID',
      });
    }

    // ── 3. Confirm user still exists in DB ───────────────────────────────────
    const user = await User.findById(decoded.id).select('_id role handle email codeforcesHandle codeforcesRating');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    // ── 4. Attach user context to request ────────────────────────────────────
    req.user = {
      id:                 user._id.toString(),
      _id:               user._id,
      handle:            user.handle,
      email:             user.email,
      role:              user.role,
      codeforcesHandle:  user.codeforcesHandle  || null,
      codeforcesRating:  user.codeforcesRating  || 0,
    };

    next();
  } catch (err) {
    console.error('[authMiddleware]', err.message);
    return res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
};

/**
 * restrictTo
 * ───────────
 * Role-based access control middleware.
 * Must be used AFTER `protect`.
 *
 * Usage:
 *   router.delete('/admin-only', protect, restrictTo('admin'), handlerFn);
 *
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'user')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: [${roles.join(', ')}].`,
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
