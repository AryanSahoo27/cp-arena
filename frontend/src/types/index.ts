/**
 * src/types/index.ts
 * ───────────────────
 * Shared TypeScript types for CP Arena frontend.
 */

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  handle: string;
  email: string;
  codeforcesHandle: string | null;
  codeforcesRating: number;
  avatar: string | null;
  role: 'user' | 'admin';
  createdAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

// ─── Contest ──────────────────────────────────────────────────────────────────
export interface Problem {
  problemId: string;
  name: string;
  rating: number;
  tags: string[];
  order: number;
}

export interface Contest {
  _id: string;
  title: string;
  description: string;
  createdBy: { _id: string; handle: string; avatar: string | null };
  startTime: string;
  endTime: string;
  durationMinutes: number;
  problems: Problem[];
  participants: User[];
  isPrivate: boolean;
  inviteCode: string | null;
  status: 'upcoming' | 'ongoing' | 'ended';
  scoringType: 'icpc' | 'ioi';
  computedStatus?: 'upcoming' | 'ongoing' | 'ended';
  participantCount?: number;
  createdAt: string;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export interface ProblemResult {
  problemId: string;
  solved: boolean;
  wrongAttempts: number;
  solveTimeMinutes: number;
  penalty: number;
  firstACTime: number | null;
}

export interface LeaderboardEntry {
  handle: string;
  rank: number;
  solved: number;
  totalPenalty: number;
  problems: ProblemResult[];
  rankChange?: number;
}

// ─── CF Problem ───────────────────────────────────────────────────────────────
export interface CFProblem {
  id: string;
  contestId: number;
  index: string;
  name: string;
  rating: number | null;
  tags: string[];
  solvedCount: number;
}
