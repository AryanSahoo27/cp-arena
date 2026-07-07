/**
 * src/pages/Login.tsx
 * ─────────────────────
 * Premium login page with:
 *  - Animated gradient orbs background
 *  - Split-panel layout (brand panel left, form right)
 *  - Email OR handle login via 'identifier' field
 *  - Loading state, server error display, field-level errors
 *  - Auto-redirect to /dashboard on success
 */

import React, { useState, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight,
  Zap, Trophy, Users, BarChart2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/utils/api';

// ─── Feature highlights shown on the left panel ───────────────────────────────
const FEATURES = [
  { icon: Trophy,   label: 'ICPC Leaderboards',   sub: 'Real-time penalty scoring' },
  { icon: Zap,      label: 'Live Contests',        sub: 'Custom durations & problems' },
  { icon: Users,    label: 'Team Battles',         sub: 'Invite friends & compete' },
  { icon: BarChart2, label: 'Analytics',           sub: 'Track your growth over time' },
];

// ─── Animated Orb Component ───────────────────────────────────────────────────
const Orb = ({
  size, color, className,
}: {
  size: number; color: string; className?: string;
}) => (
  <div
    className={`absolute rounded-full pointer-events-none blur-[80px] opacity-25 ${className}`}
    style={{ width: size, height: size, background: color }}
  />
);

// ─── Login Page ───────────────────────────────────────────────────────────────
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const formId = useId();

  // ── Form state ──────────────────────────────────────────────────────────
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#050508] overflow-hidden">

      {/* ── LEFT BRAND PANEL ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">

        {/* Background layers */}
        <div className="absolute inset-0 bg-hero-gradient" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(124,58,237,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(124,58,237,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Animated orbs */}
        <Orb size={500} color="radial-gradient(circle, #7c3aed, transparent)"
             className="animate-orb1 top-[-100px] left-[-100px]" />
        <Orb size={400} color="radial-gradient(circle, #06b6d4, transparent)"
             className="animate-orb2 bottom-[100px] right-[-80px]" />
        <Orb size={300} color="radial-gradient(circle, #4f46e5, transparent)"
             className="animate-orb3 top-[40%] left-[30%]" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-glow-purple">
              <span className="text-white font-black text-lg">C</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">CP Arena</span>
          </div>

          {/* Main copy */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="animate-fade-in-up">
              <p className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-4">
                Competitive Programming
              </p>
              <h1 className="text-5xl font-black text-white leading-tight mb-6">
                Compete.<br />
                <span className="gradient-text">Track.</span><br />
                Dominate.
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
                Host custom ICPC-style contests, track your performance,
                and battle friends on a live leaderboard.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3 mt-10 animate-fade-in-up"
                 style={{ animationDelay: '0.15s' }}>
              {FEATURES.map(({ icon: Icon, label, sub }) => (
                <div key={label}
                     className="glass rounded-2xl p-4 hover:bg-white/[0.06] transition-all duration-200 group">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center mb-3
                                  group-hover:bg-violet-500/30 transition-colors">
                    <Icon size={16} className="text-violet-400" />
                  </div>
                  <p className="text-white text-sm font-semibold">{label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stat bar */}
          <div className="flex gap-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {[['10K+', 'Contests'], ['50K+', 'Problems'], ['∞', 'Rivalries']].map(
              ([num, lbl]) => (
                <div key={lbl}>
                  <p className="text-2xl font-black gradient-text">{num}</p>
                  <p className="text-slate-500 text-xs">{lbl}</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">

        {/* Mobile orbs */}
        <div className="lg:hidden">
          <Orb size={300} color="radial-gradient(circle, #7c3aed, transparent)"
               className="animate-orb1 top-0 right-0" />
          <Orb size={200} color="radial-gradient(circle, #06b6d4, transparent)"
               className="animate-orb2 bottom-0 left-0" />
        </div>

        <div className="w-full max-w-md animate-slide-in-right relative z-10">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-black">C</span>
            </div>
            <span className="text-white font-bold text-lg">CP Arena</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white mb-2">Welcome back</h2>
            <p className="text-slate-400">
              Sign in with your email or handle to continue.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="alert-error mb-6 animate-fade-in-up" role="alert">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Identifier */}
            <div>
              <label htmlFor={`${formId}-identifier`} className="form-label">
                Email or Handle
              </label>
              <div className="relative">
                <Mail size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id={`${formId}-identifier`}
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com or yourHandle"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="input-field pl-11"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={`${formId}-password`} className="form-label mb-0">
                  Password
                </label>
                <button type="button"
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id={`${formId}-password`}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-11"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2"
              id="login-submit-btn"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider-text my-6">or</div>

          {/* Register CTA */}
          <p className="text-center text-slate-400 text-sm">
            New to CP Arena?{' '}
            <Link to="/register"
                  className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Create an account →
            </Link>
          </p>

          {/* Terms footer */}
          <p className="text-center text-slate-600 text-xs mt-8 leading-relaxed">
            By signing in you agree to our{' '}
            <span className="text-slate-500 hover:text-slate-400 cursor-pointer transition-colors">
              Terms of Service
            </span>{' '}
            and{' '}
            <span className="text-slate-500 hover:text-slate-400 cursor-pointer transition-colors">
              Privacy Policy
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
