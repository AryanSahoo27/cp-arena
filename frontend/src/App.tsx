/**
 * src/App.tsx
 * ────────────
 * Root router — all routes including Phase 4 additions.
 *
 * Route tree:
 *   /                  → redirect to /dashboard
 *   /login             → Login           (public)
 *   /register          → Register        (public)
 *   /dashboard         → Dashboard       (protected)
 *   /contests          → Contests list   (protected)
 *   /contests/:id      → Contest Arena   (protected)
 *   /problems          → Problem Browser (protected)
 *   /profile           → Profile         (protected — Phase 5)
 *   *                  → 404
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import FullPageLoader from '@/components/ui/FullPageLoader';

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
const Login          = lazy(() => import('@/pages/Login'));
const Register       = lazy(() => import('@/pages/Register'));
const Dashboard      = lazy(() => import('@/pages/Dashboard'));
const Contests       = lazy(() => import('@/pages/Contests'));
const ContestArena   = lazy(() => import('@/pages/ContestArena'));
const ProblemBrowser = lazy(() => import('@/pages/ProblemBrowser'));
const Profile        = lazy(() => import('@/pages/Profile'));

// ─── Route Guards ────────────────────────────────────────────────────────────

/** Block unauthenticated access — redirect to /login */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading)       return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/** Redirect logged-in users away from auth pages */
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading)      return <FullPageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// ─── App ─────────────────────────────────────────────────────────────────────
const App = () => (
  <Suspense fallback={<FullPageLoader />}>
    <Routes>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public */}
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Protected — Phase 3 */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* Protected — Phase 4 */}
      <Route path="/contests"     element={<ProtectedRoute><Contests /></ProtectedRoute>} />
      <Route path="/contests/:id" element={<ProtectedRoute><ContestArena /></ProtectedRoute>} />
      <Route path="/problems"     element={<ProtectedRoute><ProblemBrowser /></ProtectedRoute>} />
      <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 page-enter">
            <span className="text-8xl font-black gradient-text">404</span>
            <p className="text-slate-400 text-lg">This page doesn't exist.</p>
            <a href="/dashboard" className="btn-primary">Go Home</a>
          </div>
        }
      />
    </Routes>
  </Suspense>
);

export default App;
