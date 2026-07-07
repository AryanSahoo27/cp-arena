/**
 * src/pages/Register.tsx
 * ───────────────────────
 * Registration page — flat developer-tool aesthetic.
 * State, validation, API calls, routing: unchanged.
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
    { score: 0, label: '',         color: 'bg-zinc-800',  width: 'w-0'    },
    { score: 1, label: 'Weak',     color: 'bg-red-500',   width: 'w-1/4'  },
    { score: 2, label: 'Fair',     color: 'bg-amber-500', width: 'w-2/4'  },
    { score: 3, label: 'Good',     color: 'bg-blue-500',  width: 'w-3/4'  },
    { score: 4, label: 'Strong',   color: 'bg-green-500', width: 'w-full' },
  ];

  return levels[score] as StrengthInfo;
};

// ─── Animated Orb — hidden in flat theme ─────────────────────────────────────
const Orb = ({ size, color, className }: { size: number; color: string; className?: string }) => (
  <div
    className={`hidden ${className}`}
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
      <p className="mt-1.5 text-xs text-zinc-600">{hint}</p>
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
    <div className="min-h-screen flex bg-[#0a0a0a] overflow-hidden">

      {/* ── LEFT BRAND PANEL ───────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] relative flex-col justify-between p-12 overflow-hidden border-r border-zinc-900">
        <Orb size={450} color="transparent" className="animate-orb1 top-[-80px] right-[-80px]" />
        <Orb size={350} color="transparent" className="animate-orb2 bottom-[60px] left-[-60px]" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-sm flex items-center justify-center">
              <span className="text-white font-black text-base">C</span>
            </div>
            <span className="text-zinc-100 font-bold text-lg tracking-tight">Algo Forge</span>
          </div>

          {/* Centered content */}
          <div className="flex-1 flex flex-col justify-center gap-8">
            <div className="animate-fade-in-up">
              <p className="text-blue-500 text-xs font-semibold tracking-widest uppercase mb-4">
                AlgoForge
              </p>
              <h1 className="text-4xl font-black text-zinc-100 leading-tight mb-4">
                Your next<br />
                <span className="text-blue-500">breakthrough</span><br />
                starts here.
              </h1>
              <p className="text-zinc-500 leading-relaxed text-sm">
                Track progress, host contests, and stay motivated with friends.
              </p>
            </div>

            {/* Security info */}
            <div className="border border-zinc-800 rounded-sm p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 border border-zinc-700 rounded-sm flex items-center justify-center">
                  <Shield size={14} className="text-green-400" />
                </div>
                <p className="text-zinc-200 font-semibold text-sm">Secure & Private</p>
              </div>
              <ul className="space-y-1.5">
                {[
                  'Passwords hashed with bcrypt (12 rounds)',
                  'JWT access + refresh token rotation',
                  'Your CF handle is never stored insecurely',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-zinc-500 text-xs">
                    <CheckCircle2 size={11} className="text-green-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Stat */}
            <div>
              <p className="text-3xl font-black text-blue-400">Free Forever</p>
              <p className="text-zinc-600 text-sm mt-1">No credit card required.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ───────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative overflow-y-auto">

        {/* Mobile orbs — hidden */}
        <div className="lg:hidden">
          <Orb size={250} color="transparent" className="animate-orb1 top-0 right-0" />
          <Orb size={200} color="transparent" className="animate-orb2 bottom-0 left-0" />
        </div>

        <div className="w-full max-w-sm animate-fade-in-up relative z-10">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center">
              <span className="text-white font-black text-sm">C</span>
            </div>
            <span className="text-zinc-100 font-bold">Algo Forge</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1.5">Create account</h2>
            <p className="text-zinc-500 text-sm">
              Set up your profile in under 60 seconds.
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="alert-error mb-5" role="alert">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-3.5">

            {/* Handle */}
            <Field
              id={`${formId}-handle`}
              label="Handle (your username on Algo Forge)"
              hint="3–24 chars. Letters, numbers, _, ., - only."
              error={fieldErrors.handle}
            >
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                <input
                  id={`${formId}-handle`}
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. tourist"
                  value={form.handle}
                  onChange={handleChange('handle')}
                  className={`input-field pl-9 ${fieldErrors.handle ? 'border-red-800' : ''}`}
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
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                <input
                  id={`${formId}-email`}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange('email')}
                  className={`input-field pl-9 ${fieldErrors.email ? 'border-red-800' : ''}`}
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
                <Code2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                <input
                  id={`${formId}-cf`}
                  type="text"
                  placeholder="Your Codeforces handle"
                  value={form.codeforcesHandle}
                  onChange={handleChange('codeforcesHandle')}
                  className={`input-field pl-9 ${fieldErrors.codeforcesHandle ? 'border-red-800' : ''}`}
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
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                <input
                  id={`${formId}-password`}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange('password')}
                  className={`input-field pl-9 pr-9 ${fieldErrors.password ? 'border-red-800' : ''}`}
                  disabled={isLoading}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                        aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Password strength bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="h-0.5 w-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`}
                    />
                  </div>
                  <p className={`text-xs mt-1 font-medium ${
                    strength.score <= 1 ? 'text-red-400'
                    : strength.score === 2 ? 'text-amber-400'
                    : strength.score === 3 ? 'text-blue-400'
                    : 'text-green-400'
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
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                <input
                  id={`${formId}-confirm`}
                  type={showConfPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  className={`input-field pl-9 pr-9 ${fieldErrors.confirmPassword ? 'border-red-800' : ''}`}
                  disabled={isLoading}
                />
                <button type="button" onClick={() => setShowConfPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                        aria-label={showConfPw ? 'Hide' : 'Show'}>
                  {showConfPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Passwords match indicator */}
              {form.confirmPassword && !fieldErrors.confirmPassword && (
                <p className="flex items-center gap-1 text-xs text-green-400 mt-1.5">
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
              className="btn-primary w-full !mt-5"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Login CTA */}
          <p className="text-center text-zinc-500 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login"
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
