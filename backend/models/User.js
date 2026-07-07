const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Stores authentication credentials, Codeforces handle,
 * friend relationships, and refresh tokens for session management.
 */
const userSchema = new mongoose.Schema(
  {
    // Display name / Codeforces handle used in contests
    handle: {
      type: String,
      required: [true, 'Handle is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Handle must be at least 3 characters'],
      maxlength: [24, 'Handle must be at most 24 characters'],
      match: [/^[a-zA-Z0-9_.-]+$/, 'Handle can only contain letters, numbers, underscores, dots, and hyphens'],
    },

    // Email for login and notifications
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },

    // Hashed password (never stored in plain text)
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Excluded from queries by default
    },

    // Linked Codeforces handle (may differ from platform handle)
    codeforcesHandle: {
      type: String,
      trim: true,
      default: null,
    },

    // Codeforces rating fetched from their API
    codeforcesRating: {
      type: Number,
      default: 0,
    },

    // Friends list (self-referencing)
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Pending friend requests received
    friendRequests: [
      {
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        sentAt: { type: Date, default: Date.now },
      },
    ],

    // Refresh tokens for JWT session management (supports multiple devices)
    refreshTokens: [
      {
        token: { type: String },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
      },
    ],

    // Role: 'user' or 'admin'
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    // Profile avatar URL
    avatar: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
userSchema.index({ handle: 1 });
userSchema.index({ email: 1 });
userSchema.index({ codeforcesHandle: 1 });

// ─── Pre-save Hook: Hash Password ────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  // Only re-hash if password was actually modified
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Methods ────────────────────────────────────────────────────────

/**
 * Compare a plain-text password against the stored hash.
 * @param {string} candidatePassword - The password to check
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Return a safe public profile (strips sensitive fields).
 */
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    handle: this.handle,
    email: this.email,
    codeforcesHandle: this.codeforcesHandle,
    codeforcesRating: this.codeforcesRating,
    avatar: this.avatar,
    role: this.role,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
