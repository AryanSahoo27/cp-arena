const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * Contest Schema
 * Represents a custom competitive programming contest created by a user.
 * Problems reference Codeforces problem IDs (e.g., '1500A', '800B').
 */
const contestSchema = new mongoose.Schema(
  {
    // Human-readable contest title
    title: {
      type: String,
      required: [true, 'Contest title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title must be at most 100 characters'],
    },

    // Optional description / rules
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
      default: '',
    },

    // Contest creator
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // When the contest starts (UTC)
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },

    // Duration in minutes (used to derive endTime)
    durationMinutes: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [5, 'Contest must be at least 5 minutes'],
      max: [1440, 'Contest cannot exceed 24 hours'],
    },

    // Derived end time (startTime + durationMinutes)
    endTime: {
      type: Date,
    },

    /**
     * Problems: array of Codeforces problem identifiers.
     * Format: "<contestId><problemIndex>" e.g. "1500A", "800B", "1900C1"
     */
    problems: [
      {
        problemId: {
          type: String,
          required: true,
          uppercase: true,
          trim: true,
          match: [/^\d+[A-Z]\d*$/, 'Invalid Codeforces problem ID format (e.g. 1500A)'],
        },
        name: { type: String, default: '' },        // Fetched from CF API
        rating: { type: Number, default: 0 },       // CF difficulty rating
        tags: [{ type: String }],                   // CF problem tags
        order: { type: Number, default: 0 },        // Display order (A, B, C …)
      },
    ],

    // Registered participants (User ObjectIds)
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Whether this contest requires an invite code to join
    isPrivate: {
      type: Boolean,
      default: false,
    },

    // Auto-generated unique invite code for private contests
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // Only indexed when present
      default: null,
    },

    // Contest lifecycle status
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'ended'],
      default: 'upcoming',
    },

    // Scoring type (ICPC-style by default)
    scoringType: {
      type: String,
      enum: ['icpc', 'ioi'],
      default: 'icpc',
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
contestSchema.index({ createdBy: 1 });
contestSchema.index({ startTime: 1 });
contestSchema.index({ status: 1 });
contestSchema.index({ inviteCode: 1 });

// ─── Pre-save Hook: Compute endTime & set inviteCode ────────────────────────
contestSchema.pre('save', function (next) {
  // Auto-compute endTime from startTime + durationMinutes
  if (this.startTime && this.durationMinutes) {
    this.endTime = new Date(
      this.startTime.getTime() + this.durationMinutes * 60 * 1000
    );
  }

  // Generate an invite code for private contests
  if (this.isPrivate && !this.inviteCode) {
    this.inviteCode = uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase();
  }

  next();
});

// ─── Virtual: isActive ───────────────────────────────────────────────────────
contestSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.startTime <= now && now <= this.endTime;
});

module.exports = mongoose.model('Contest', contestSchema);
