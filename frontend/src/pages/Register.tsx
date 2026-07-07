/**
 * src/pages/Register.tsx
 * ───────────────────────
 * Registration page with:
 *  - 5 fields: Handle, Email, Codeforces Handle, Password, Confirm Password
 *  - Real-time password strength indicator
 *  - Field-level validation feedback
 *  - Same premium split-panel layout as Login
 *  - Auto-redirect to /dashboard after successful registration
 */

import React, { useState, useId, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Mail, Lock, User, Code2,
  AlertCircle, CheckCircle2, ArrowRight, Shield,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/utils/api';

// ─── Password Strength ────────────────────────────────────────────────────────
interface StrengthInfo {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  width: string;
}

const getPasswordStrength = (pw: string): StrengthInfo => {
  let score = 0;
  if (pw.length >= 8)                     score++;
  if (/[A-Z]/.test(pw))                   score++;
  if (/[0-9]/.test(pw))                   score++;
  if (/[^A-Za-z0-9]/.test(pw))           score++;

  const levels: StrengthInfo[] = [
    { score: 0, label: '',         color: 'bg-slate-700',  width: 'w-0'    },
    { score: 1, label: 'Weak',     color: 'bg-red-500',    width: 'w-1/4'  },
    { score: 2, label: 'Fair',     color: 'bg-amber-500',  width: 'w-2/4'  },
    { score: 3, label: 'Good',     color: 'bg-blue-500',   width: 'w-3/4'  },
    { score: 4, label: 'Strong',   color: 'bg-emerald-500',width: 'w-full' },
  ];

  return levels[score] as StrengthInfo;
};

// ─── Animated Orb ─────────────────────────────────────────────────────────────
const Orb = ({ size, color, className }: { size: number; color: string; className?: string }) => (
  <div
    className={`absolute rounded-full pointer-events-none blur-[80px] opacity-20 ${className}`}
    style={{ width: size, height: size, background: color }}
  />
);

// ─── Field wrapper ────────────────────────────────────────────────────────────
const Field = ({
  id, label, hint, error, children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label htmlFor={id} className="form-label">
      {label}
    </label>
    {children}
    {hint && !error && (
      <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
    )}
    {error && (
      <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
        <AlertCircle size={11} />
        {error}
      </p>
    )}
  </div>
);

// ─── Register Page ────────────────────────────────────────────────────────────
const Register = () => {
  const navigate  = useNavigate();
  const { register } = useAuth();
  const formId = useId();

  // ── Form state ─────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    handle:           '',
    email:            '',
    codeforcesHandle: '',
    password:         '',
    confirmPassword:  '',
  });
  const [showPw, setShowPw]         = useState(false);
  const [showConfPw, setShowConfPw] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<typeof form>>({});

  // ── Password strength ───────────────────────────────────────────────────
  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  // ── Field change handler ────────────────────────────────────────────────
  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear field error on change
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      setServerError(null);
    };

  // ── Client-side validation ──────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Partial<typeof form> = {};

    if (!form.handle.trim()) {
      errs.handle = 'Handle is required.';
    } else if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(form.handle)) {
      errs.handle = '3–24 chars: letters, numbers, _, ., -';
    }

    if (!form.email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      errs.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      errs.password = 'Password is required.';
    } else if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsLoading(true);
    try {
      await register({
        handle: form.handle.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        codeforcesHandle: form.codeforcesHandle.trim() || undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        // Map field-level server errors
        if (err.data?.errors?.length) {
          const mapped: Partial<typeof form> = {};
          for (const e of err.data.errors) {
            if (e.field in form) {
              mapped[e.field as keyof typeof form] = e.message;
            }
          }
          setFieldErrors(mapped);
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#050508] overflow-hidden">

      {/* ── LEFT BRAND PANEL ───────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `
              linear-gradient(rgba(124,58,237,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(124,58,237,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        <Orb size={450} color="radial-gradient(circle, #7c3aed, transparent)"
             className="animate-orb1 top-[-80px] right-[-80px]" />
        <Orb size={350} color="radial-gradient(circle, #06b6d4, transparent)"
             className="animate-orb2 bottom-[60px] left-[-60px]" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-glow-purple">
              <span className="text-white font-black text-lg">C</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">CP Arena</span>
          </div>

          {/* Centered content */}
          <div className="flex-1 flex flex-col justify-center gap-8">
            <div className="animate-fade-in-up">
              <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-4">
                Join the Arena
              </p>
              <h1 className="text-4xl font-black text-white leading-tight mb-4">
                Your journey to the{' '}
                <span className="gradient-text">top starts here.</span>
              </h1>
              <p className="text-slate-400 leading-relaxed">
                Create your account, link your Codeforces profile, and start competing in
                custom ICPC-style contests with friends.
              </p>
            </div>

            {/* Security badge */}
            <div className="glass rounded-2xl p-5 animate-fade-in-up"
                 style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Shield size={16} className="text-emerald-400" />
                </div>
                <p className="text-white font-semibold text-sm">Secure & Private</p>
              </div>
              <ul className="space-y-2">
                {[
                  'Passwords hashed with bcrypt (12 rounds)',
                  'JWT access + refresh token rotation',
                  'Your CF handle is never stored insecurely',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-400 text-xs">
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Stat */}
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <p className="text-4xl font-black gradient-text">Free Forever</p>
              <p className="text-slate-500 text-sm mt-1">No credit card required.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ───────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative overflow-y-auto">

        {/* Mobile orbs */}
        <div className="lg:hidden">
          <Orb size={250} color="radial-gradient(circle, #7c3aed, transparent)"
               className="animate-orb1 top-0 right-0" />
          <Orb size={200} color="radial-gradient(circle, #06b6d4, transparent)"
               className="animate-orb2 bottom-0 left-0" />
        </div>

        <div className="w-full max-w-md animate-slide-in-right relative z-10">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-black">C</span>
            </div>
            <span className="text-white font-bold text-lg">CP Arena</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white mb-2">Create account</h2>
            <p className="text-slate-400 text-sm">
              Set up your profile in under 60 seconds.
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="alert-error mb-6 animate-fade-in-up" role="alert">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Handle */}
            <Field
              id={`${formId}-handle`}
              label="Handle (your username on CP Arena)"
              hint="3–24 chars. Letters, numbers, _, ., - only."
              error={fieldErrors.handle}
            >
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id={`${formId}-handle`}
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. tourist"
                  value={form.handle}
                  onChange={handleChange('handle')}
                  className={`input-field pl-11 ${fieldErrors.handle ? 'border-red-500/50' : ''}`}
                  disabled={isLoading}
                />
              </div>
            </Field>

            {/* Email */}
            <Field
              id={`${formId}-email`}
              label="Email address"
              error={fieldErrors.email}
            >
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id={`${formId}-email`}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange('email')}
                  className={`input-field pl-11 ${fieldErrors.email ? 'border-red-500/50' : ''}`}
                  disabled={isLoading}
                />
              </div>
            </Field>

            {/* Codeforces Handle */}
            <Field
              id={`${formId}-cf`}
              label="Codeforces Handle"
              hint="Used to sync your submissions & rating. E.g. tourist"
              error={fieldErrors.codeforcesHandle}
            >
              <div className="relative">
                <Code2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id={`${formId}-cf`}
                  type="text"
                  placeholder="Your Codeforces handle"
                  value={form.codeforcesHandle}
                  onChange={handleChange('codeforcesHandle')}
                  className={`input-field pl-11 ${fieldErrors.codeforcesHandle ? 'border-red-500/50' : ''}`}
                  disabled={isLoading}
                />
              </div>
            </Field>

            {/* Password */}
            <Field
              id={`${formId}-password`}
              label="Password"
              error={fieldErrors.password}
            >
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id={`${formId}-password`}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange('password')}
                  className={`input-field pl-11 pr-11 ${fieldErrors.password ? 'border-red-500/50' : ''}`}
                  disabled={isLoading}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
                    />
                  </div>
                  <p className={`text-xs mt-1 font-medium ${
                    strength.score <= 1 ? 'text-red-400'
                    : strength.score === 2 ? 'text-amber-400'
                    : strength.score === 3 ? 'text-blue-400'
                    : 'text-emerald-400'
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </Field>

            {/* Confirm Password */}
            <Field
              id={`${formId}-confirm`}
              label="Confirm Password"
              error={fieldErrors.confirmPassword}
            >
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id={`${formId}-confirm`}
                  type={showConfPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  className={`input-field pl-11 pr-11 ${fieldErrors.confirmPassword ? 'border-red-500/50' : ''}`}
                  disabled={isLoading}
                />
                <button type="button" onClick={() => setShowConfPw((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        aria-label={showConfPw ? 'Hide' : 'Show'}>
                  {showConfPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Passwords match indicator */}
              {form.confirmPassword && !fieldErrors.confirmPassword && (
                <p className="flex items-center gap-1 text-xs text-emerald-400 mt-1.5">
                  <CheckCircle2 size={11} />
                  Passwords match
                </p>
              )}
            </Field>

            {/* Submit */}
            <button
              type="submit"
              id="register-submit-btn"
              disabled={isLoading}
              className="btn-primary w-full !mt-6"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Login CTA */}
          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login"
                  className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
