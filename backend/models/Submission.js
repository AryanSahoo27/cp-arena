const mongoose = require('mongoose');

/**
 * Submission Schema
 * Represents a single submission attempt by a participant during a contest.
 * Verdicts are synced from the Codeforces API.
 *
 * ICPC Penalty Calculation:
 *   - Each wrong attempt before AC adds 20 minutes penalty.
 *   - Penalty = timeOfFirstAC (mins from contest start) + (wrongAttempts × 20)
 */
const submissionSchema = new mongoose.Schema(
  {
    // Reference to the User who submitted
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Codeforces handle (denormalized for fast leaderboard queries)
    userHandle: {
      type: String,
      required: true,
      trim: true,
    },

    // Reference to the Contest this submission belongs to
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contest',
      required: true,
    },

    // Codeforces problem ID (e.g. '1500A', '800B')
    problemId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    // Codeforces submission ID (used to deduplicate API polling results)
    cfSubmissionId: {
      type: Number,
      default: null,
    },

    /**
     * Verdict from Codeforces API.
     * Common values: OK, WRONG_ANSWER, TIME_LIMIT_EXCEEDED,
     * MEMORY_LIMIT_EXCEEDED, COMPILATION_ERROR, RUNTIME_ERROR, etc.
     */
    verdict: {
      type: String,
      enum: [
        'OK',
        'WRONG_ANSWER',
        'TIME_LIMIT_EXCEEDED',
        'MEMORY_LIMIT_EXCEEDED',
        'RUNTIME_ERROR',
        'COMPILATION_ERROR',
        'PRESENTATION_ERROR',
        'IDLENESS_LIMIT_EXCEEDED',
        'SECURITY_VIOLATED',
        'CRASHED',
        'PENDING',
        'TESTING',
        'REJECTED',
        'SKIPPED',
        'CHALLENGED',
        'PARTIAL',
      ],
      default: 'PENDING',
    },

    // True if verdict === 'OK'
    isAccepted: {
      type: Boolean,
      default: false,
    },

    // Programming language used (e.g. 'GNU G++17 7.3.0')
    language: {
      type: String,
      trim: true,
      default: '',
    },

    // Unix timestamp (seconds) from CF API — when the submission was made
    creationTimeSeconds: {
      type: Number,
      required: true,
    },

    // Time offset from contest start (seconds) — for ICPC leaderboard
    timeFromContestStart: {
      type: Number,
      default: 0,
    },

    // Number of wrong attempts on this problem before this submission
    wrongAttemptsBefore: {
      type: Number,
      default: 0,
    },

    // ICPC penalty for this solved problem (in minutes)
    icpcPenalty: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes (critical for fast leaderboard queries) ─────────────────────────
submissionSchema.index({ contestId: 1, userHandle: 1 });
submissionSchema.index({ contestId: 1, problemId: 1 });
submissionSchema.index({ contestId: 1, isAccepted: 1 });
submissionSchema.index({ cfSubmissionId: 1 }, { unique: true, sparse: true });

// ─── Pre-save Hook: Auto-set isAccepted ─────────────────────────────────────
submissionSchema.pre('save', function (next) {
  this.isAccepted = this.verdict === 'OK';
  next();
});

module.exports = mongoose.model('Submission', submissionSchema);
