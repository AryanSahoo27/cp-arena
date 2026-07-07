/**
 * src/pages/Login.tsx
 * ─────────────────────
 * Login page — flat developer-tool aesthetic.
 * State, API calls, routing: unchanged.
 */

import React, { useState, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/utils/api';

// ─── Feature highlights shown on the left panel ───────────────────────────────
const FEATURES = [
  { label: 'ICPC Leaderboards', sub: 'Real-time penalty scoring'  },
  { label: 'Live Contests',     sub: 'Custom durations & problems' },
  { label: 'Team Battles',      sub: 'Invite friends & compete'    },
  { label: 'Analytics',         sub: 'Track your growth over time' },
];

// ─── Animated Orb Component — hidden in flat theme ────────────────────────────
const Orb = ({
  size, color, className,
}: {
  size: number; color: string; className?: string;
}) => (
  <div
    className={`hidden ${className}`}
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
    <div className="min-h-screen flex bg-[#0a0a0a] overflow-hidden">

      {/* ── LEFT BRAND PANEL ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden border-r border-zinc-900">

        {/* Hidden orbs */}
        <Orb size={500} color="transparent" className="animate-orb1 top-[-100px] left-[-100px]" />
        <Orb size={400} color="transparent" className="animate-orb2 bottom-[100px] right-[-80px]" />
        <Orb size={300} color="transparent" className="animate-orb3 top-[40%] left-[30%]" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-sm flex items-center justify-center">
              <span className="text-white font-black text-base">C</span>
            </div>
            <span className="text-zinc-100 font-bold text-lg tracking-tight">Algo Forge</span>
          </div>

          {/* Main copy */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="animate-fade-in-up">
              <p className="text-blue-500 text-xs font-semibold tracking-widest uppercase mb-4">
                Competitive Programming
              </p>
              <h1 className="text-5xl font-black text-zinc-100 leading-tight mb-6">
                Your next<br />
                <span className="text-blue-500">breakthrough</span><br />
                starts here.
              </h1>
              <p className="text-zinc-500 text-base leading-relaxed max-w-sm">
                Track progress, host contests, and stay motivated with friends.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-2 mt-10">
              {FEATURES.map(({ label, sub }) => (
                <div key={label}
                     className="border border-zinc-800 rounded-sm p-3 hover:border-zinc-600 transition-colors duration-150">
                  <p className="text-zinc-200 text-sm font-semibold">{label}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>


        </div>
      </div>

      {/* ── RIGHT FORM PANEL ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">

        {/* Mobile orbs — hidden */}
        <div className="lg:hidden">
          <Orb size={300} color="transparent" className="animate-orb1 top-0 right-0" />
          <Orb size={200} color="transparent" className="animate-orb2 bottom-0 left-0" />
        </div>

        <div className="w-full max-w-sm animate-fade-in-up relative z-10">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center">
              <span className="text-white font-black text-sm">C</span>
            </div>
            <span className="text-zinc-100 font-bold">Algo Forge</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1.5">Sign in</h2>
            <p className="text-zinc-500 text-sm">
              Enter your email or handle to continue.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="alert-error mb-5" role="alert">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Identifier */}
            <div>
              <label htmlFor={`${formId}-identifier`} className="form-label">
                Email or Handle
              </label>
              <div className="relative">
                <Mail size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                <input
                  id={`${formId}-identifier`}
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com or yourHandle"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="input-field pl-9"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor={`${formId}-password`} className="form-label">Password</label>
              <div className="relative">
                <Lock size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                <input
                  id={`${formId}-password`}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-9 pr-9"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-1"
              id="login-submit-btn"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider-text my-6">or</div>

          {/* Register CTA */}
          <p className="text-center text-zinc-500 text-sm">
            New to Algo Forge?{' '}
            <Link to="/register"
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Create an account →
            </Link>
          </p>


        </div>
      </div>
    </div>
  );
};

export default Login;
