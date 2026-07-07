/**
 * controllers/contestController.js
 * ──────────────────────────────────
 * Contest CRUD + Leaderboard + Problem Discovery
 *
 * Route handlers:
 *  createContest        POST   /api/contests
 *  getContests          GET    /api/contests
 *  getContestById       GET    /api/contests/:id
 *  joinContest          POST   /api/contests/:id/join
 *  getLeaderboard       GET    /api/contests/:id/leaderboard
 *  syncSubmissions      POST   /api/contests/:id/sync          (trigger manual sync)
 *  getProblems          GET    /api/problems
 *  getMyContests        GET    /api/contests/mine
 */

const Contest = require('../models/Contest');
const Submission = require('../models/Submission');
const User = require('../models/User');
const cfService = require('../services/codeforcesService');
const { computeICPCLeaderboard, getContestStats } = require('../utils/icpcScoring');

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE CONTEST
//  POST /api/contests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new custom contest.
 * The creator is automatically added as a participant.
 */
const createContest = async (req, res) => {
  try {
    const {
      title,
      description,
      startTime,
      durationMinutes,
      problems,
      isPrivate,
      scoringType,
    } = req.body;

    // ── Validate problems array ───────────────────────────────────────────────
    if (!problems || !Array.isArray(problems) || problems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one problem is required.',
      });
    }

    if (problems.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'A contest can have at most 10 problems.',
      });
    }

    // ── Build problems array with metadata ───────────────────────────────────
    // Accept either simple string IDs ["1500A","800B"]
    // OR rich objects [{ problemId:"1500A", name:"...", rating:1500 }]
    const normalizedProblems = problems.map((p, idx) => {
      if (typeof p === 'string') {
        return { problemId: p.toUpperCase(), order: idx };
      }
      return {
        problemId: p.problemId.toUpperCase(),
        name: p.name || '',
        rating: p.rating || 0,
        tags: p.tags || [],
        order: idx,
      };
    });

    // ── Validate start time is in the future ─────────────────────────────────
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start time.' });
    }

    // ── Create contest ────────────────────────────────────────────────────────
    const contest = await Contest.create({
      title,
      description,
      createdBy: req.user.id,
      startTime: start,
      durationMinutes: Number(durationMinutes),
      problems: normalizedProblems,
      participants: [req.user.id], // Creator auto-joins
      isPrivate: Boolean(isPrivate),
      scoringType: scoringType || 'icpc',
    });

    return res.status(201).json({
      success: true,
      message: 'Contest created successfully.',
      data: { contest },
    });
  } catch (err) {
    console.error('[createContest]', err.message);

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL CONTESTS (paginated)
//  GET /api/contests
// ─────────────────────────────────────────────────────────────────────────────

const getContests = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    // Build filter — only show public contests (or user's own)
    const filter = {
      $or: [
        { isPrivate: false },
        { createdBy: req.user.id },
        { participants: req.user.id },
      ],
    };

    if (status && ['upcoming', 'ongoing', 'ended'].includes(status)) {
      filter.status = status;
    }

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const [contests, total] = await Promise.all([
      Contest.find(filter)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'handle avatar')
        .lean(),
      Contest.countDocuments(filter),
    ]);

    // Auto-update status based on current time
    const now = new Date();
    const enriched = contests.map((c) => ({
      ...c,
      computedStatus:
        now < c.startTime
          ? 'upcoming'
          : now <= c.endTime
          ? 'ongoing'
          : 'ended',
      participantCount: c.participants?.length || 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        contests: enriched,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error('[getContests]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET SINGLE CONTEST
//  GET /api/contests/:id
// ─────────────────────────────────────────────────────────────────────────────

const getContestById = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate('createdBy', 'handle avatar codeforcesHandle')
      .populate('participants', 'handle avatar codeforcesHandle')
      .lean();

    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found.' });
    }

    // Restrict private contest access
    const userId = req.user.id;
    const isParticipant = contest.participants.some(
      (p) => p._id.toString() === userId
    );
    const isCreator = contest.createdBy._id.toString() === userId;

    if (contest.isPrivate && !isParticipant && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'This contest is private. Use an invite code to join.',
      });
    }

    return res.status(200).json({ success: true, data: { contest } });
  } catch (err) {
    console.error('[getContestById]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  JOIN CONTEST
//  POST /api/contests/:id/join
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Join a contest by ID.
 * For private contests, an inviteCode is required in the body.
 */
const joinContest = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);

    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found.' });
    }

    const userId = req.user.id;

    // Already joined?
    if (contest.participants.some((p) => p.toString() === userId)) {
      return res.status(409).json({ success: false, message: 'Already a participant.' });
    }

    // Private contest — check invite code
    if (contest.isPrivate) {
      const { inviteCode } = req.body;
      if (!inviteCode || inviteCode.toUpperCase() !== contest.inviteCode) {
        return res.status(403).json({
          success: false,
          message: 'Invalid invite code.',
        });
      }
    }

    // Contest already ended?
    if (new Date() > contest.endTime) {
      return res.status(400).json({
        success: false,
        message: 'This contest has already ended.',
      });
    }

    contest.participants.push(userId);
    await contest.save();

    return res.status(200).json({
      success: true,
      message: 'Joined contest successfully.',
      data: { inviteCode: contest.inviteCode },
    });
  } catch (err) {
    console.error('[joinContest]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SYNC SUBMISSIONS FROM CODEFORCES
//  POST /api/contests/:id/sync
// ─────────────────────────────────────────────────────────────────────────────

/**
 * For each participant, fetch their CF submissions during the contest window
 * and upsert them into our Submission collection.
 *
 * Called:
 *  - Manually (this endpoint)
 *  - Automatically by a future polling job (Phase 5)
 */
const syncSubmissions = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate('participants', 'handle codeforcesHandle _id');

    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found.' });
    }

    const contestStartSec = Math.floor(contest.startTime.getTime() / 1000);
    const contestEndSec = Math.floor(contest.endTime.getTime() / 1000);
    const problemIds = contest.problems.map((p) => p.problemId);

    let totalSynced = 0;
    const errors = [];

    // Process each participant
    for (const participant of contest.participants) {
      const cfHandle = participant.codeforcesHandle || participant.handle;

      try {
        const cfSubs = await cfService.getUserSubmissions(
          cfHandle,
          contestStartSec,
          contestEndSec,
          problemIds
        );

        // Upsert each submission by cfSubmissionId
        for (const cfSub of cfSubs) {
          const pid = `${cfSub.problem.contestId}${cfSub.problem.index}`;

          await Submission.findOneAndUpdate(
            { cfSubmissionId: cfSub.id },
            {
              $setOnInsert: {
                userId: participant._id,
                userHandle: cfHandle,
                contestId: contest._id,
                problemId: pid.toUpperCase(),
                cfSubmissionId: cfSub.id,
                language: cfSub.programmingLanguage || '',
                creationTimeSeconds: cfSub.creationTimeSeconds,
                timeFromContestStart: cfSub.creationTimeSeconds - contestStartSec,
              },
              $set: {
                verdict: cfSub.verdict,
                isAccepted: cfSub.verdict === 'OK',
              },
            },
            { upsert: true, new: true }
          );

          totalSynced += 1;
        }
      } catch (participantErr) {
        errors.push({ handle: cfHandle, error: participantErr.message });
        console.error(`[syncSubmissions] Failed for ${cfHandle}:`, participantErr.message);
      }

      // Small delay between handles to respect CF rate limits (~1 req/sec)
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    return res.status(200).json({
      success: true,
      message: `Synced ${totalSynced} submissions.`,
      data: { totalSynced, errors },
    });
  } catch (err) {
    console.error('[syncSubmissions]', err.message);
    return res.status(500).json({ success: false, message: 'Server error during sync.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET LIVE ICPC LEADERBOARD
//  GET /api/contests/:id/leaderboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute and return the live ICPC leaderboard for a contest.
 *
 * Process:
 *  1. Load all Submission records for this contest from our DB.
 *  2. Feed into computeICPCLeaderboard().
 *  3. Return ranked results + per-problem stats.
 *
 * The client can poll this endpoint every 30s during a live contest.
 */
const getLeaderboard = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id).lean();

    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found.' });
    }

    const contestStartSec = Math.floor(contest.startTime.getTime() / 1000);
    const contestEndSec = Math.floor(contest.endTime.getTime() / 1000);
    const problemIds = contest.problems.map((p) => p.problemId);

    // Load all submissions for this contest
    const rawSubs = await Submission.find({ contestId: contest._id })
      .select('userHandle problemId verdict creationTimeSeconds isAccepted')
      .lean();

    // Compute ICPC leaderboard
    const leaderboard = computeICPCLeaderboard(
      rawSubs,
      problemIds,
      contestStartSec,
      contestEndSec
    );

    // Compute contest-level stats
    const stats = getContestStats(leaderboard, problemIds);

    // Determine current contest phase
    const now = new Date();
    const phase =
      now < contest.startTime
        ? 'upcoming'
        : now <= contest.endTime
        ? 'ongoing'
        : 'ended';

    return res.status(200).json({
      success: true,
      data: {
        contestId: contest._id,
        title: contest.title,
        phase,
        startTime: contest.startTime,
        endTime: contest.endTime,
        problems: contest.problems,
        leaderboard,
        stats,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[getLeaderboard]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET MY CONTESTS
//  GET /api/contests/mine
// ─────────────────────────────────────────────────────────────────────────────

const getMyContests = async (req, res) => {
  try {
    const userId = req.user.id;

    const contests = await Contest.find({
      $or: [{ createdBy: userId }, { participants: userId }],
    })
      .sort({ startTime: -1 })
      .populate('createdBy', 'handle avatar')
      .lean();

    const now = new Date();
    const enriched = contests.map((c) => ({
      ...c,
      computedStatus:
        now < new Date(c.startTime)
          ? 'upcoming'
          : now <= new Date(c.endTime)
          ? 'ongoing'
          : 'ended',
      isCreator: c.createdBy._id.toString() === userId,
      participantCount: c.participants?.length || 0,
    }));

    return res.status(200).json({ success: true, data: { contests: enriched } });
  } catch (err) {
    console.error('[getMyContests]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PROBLEM DISCOVERY
//  GET /api/problems
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Browse Codeforces problemset with filtering support.
 *
 * Query params:
 *  - tags    : comma-separated CF tags (e.g. 'dp,graphs')
 *  - minRating: min difficulty (e.g. 800)
 *  - maxRating: max difficulty (e.g. 2000)
 *  - search  : partial name search
 *  - page    : page number (default 1)
 *  - limit   : page size (default 50, max 200)
 */
const getProblems = async (req, res) => {
  try {
    const {
      tags,
      minRating,
      maxRating,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const tagList = tags
      ? tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    // Fetch from CF API (cached for 10 minutes internally)
    const cfData = await cfService.getProblems(tagList);
    let { problems, problemStatistics } = cfData;

    // ── Apply filters ─────────────────────────────────────────────────────────
    if (minRating) {
      problems = problems.filter((p) => p.rating >= Number(minRating));
    }

    if (maxRating) {
      problems = problems.filter((p) => p.rating <= Number(maxRating));
    }

    if (search) {
      const q = search.toLowerCase();
      problems = problems.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Build a stats map for quick lookup
    const statsMap = new Map(
      (problemStatistics || []).map((s) => [`${s.contestId}${s.index}`, s])
    );

    // Enrich problems with solve count
    const enriched = problems.map((p) => {
      const key = `${p.contestId}${p.index}`;
      const stats = statsMap.get(key);
      return {
        id: key,
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        rating: p.rating || null,
        tags: p.tags || [],
        solvedCount: stats?.solvedCount || 0,
      };
    });

    // Sort by rating ascending (null ratings go last)
    enriched.sort((a, b) => {
      if (a.rating === null) return 1;
      if (b.rating === null) return -1;
      return a.rating - b.rating;
    });

    // ── Paginate ──────────────────────────────────────────────────────────────
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, parseInt(limit));
    const total = enriched.length;
    const sliced = enriched.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      data: {
        problems: sliced,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
        appliedFilters: { tags: tagList, minRating, maxRating, search },
      },
    });
  } catch (err) {
    console.error('[getProblems]', err.message);

    // CF API down — graceful degradation
    if (err.message.includes('Codeforces')) {
      return res.status(503).json({
        success: false,
        message: 'Codeforces API is temporarily unavailable. Please try again shortly.',
      });
    }

    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  createContest,
  getContests,
  getContestById,
  joinContest,
  syncSubmissions,
  getLeaderboard,
  getMyContests,
  getProblems,
};
