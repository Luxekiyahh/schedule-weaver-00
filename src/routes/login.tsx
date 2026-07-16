import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, Mail, AlertCircle, UserCheck, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveHomePathForUser, signOutAndReset } from "@/lib/auth-signout";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — ProcSchedule" },
      { name: "description", content: "Sign in to your ProcSchedule dashboard." },
    ],
  }),
});

type SessionUser = { id: string; email: string | null };

function Signet({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sg-gold-login" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E7C989" />
          <stop offset="0.5" stopColor="#C9A15A" />
          <stop offset="1" stopColor="#9C7A3C" />
        </linearGradient>
      </defs>
      <rect x="186" y="152" width="36" height="228" rx="18" fill="url(#sg-gold-login)" />
      <circle cx="262" cy="222" r="70" fill="#0E0C0D" stroke="url(#sg-gold-login)" strokeWidth="15" />
      <line x1="262" y1="222" x2="262" y2="180" stroke="#E7C989" strokeWidth="4" strokeLinecap="round" />
      <line x1="262" y1="222" x2="300" y2="222" stroke="#E7C989" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checkingSession, setCheckingSession] = useState(true);
  const [existingUser, setExistingUser] = useState<SessionUser | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data, error: userErr }) => {
      if (cancelled) return;
      if (userErr || !data.user) setExistingUser(null);
      else setExistingUser({ id: data.user.id, email: data.user.email ?? null });
      setCheckingSession(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function handleContinue() {
    if (!existingUser) return;
    setContinuing(true);
    try {
      const dest = await resolveHomePathForUser(existingUser.id);
      navigate({ to: dest });
    } finally {
      setContinuing(false);
    }
  }

  async function handleSignOutExisting() {
    setSigningOut(true);
    try {
      await signOutAndReset(queryClient);
      setExistingUser(null);
    } finally {
      setSigningOut(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter both your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      const currentEmail = currentUser.user?.email?.toLowerCase() ?? null;
      const enteredEmail = email.trim().toLowerCase();
      if (currentEmail && currentEmail !== enteredEmail) {
        await signOutAndReset(queryClient);
      }
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError || !data.user) {
        setError(
          authError?.message?.toLowerCase().includes("invalid")
            ? "The email or password you entered is incorrect. Please try again."
            : authError?.message ?? "We couldn't sign you in. Please try again.",
        );
        setLoading(false);
        return;
      }
      const dest = await resolveHomePathForUser(data.user.id);
      navigate({ to: dest });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 text-[#F3EEE6] font-[Montserrat,'Century_Gothic',sans-serif]"
      style={{ background: "linear-gradient(180deg, #141216 0%, #0A090B 100%)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-[#1A181C] border border-[#33302A] grid place-items-center mb-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)]">
            <Signet className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-[0.08em] uppercase text-[#F3EEE6]">Welcome back</h1>
          <p className="text-sm text-[#9C9488] mt-1.5 tracking-wide">Sign in to your ProcSchedule dashboard</p>
        </div>

        <div className="relative rounded-2xl border border-[#33302A] bg-[#141216]/80 backdrop-blur-xl p-7 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)]">
          <div
            className="absolute top-0 left-6 right-6 h-px"
            style={{ background: "linear-gradient(to right, transparent, #C9A15A, transparent)" }}
          />
          {checkingSession ? (
            <div className="flex items-center justify-center py-8 text-[#9C9488]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : existingUser ? (
            <div>
              <div className="flex items-start gap-3 rounded-lg border border-[#33302A] bg-[#0A090B] px-3.5 py-3">
                <UserCheck className="h-5 w-5 mt-0.5 shrink-0 text-[#C9A15A]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#F3EEE6]">You're already signed in</p>
                  <p className="text-sm text-[#9C9488] truncate">{existingUser.email ?? "Signed-in account"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleContinue}
                disabled={continuing || signingOut}
                className="mt-5 w-full h-11 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A090B] transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:brightness-110"
                style={{ background: "linear-gradient(to right, #E7C989, #C9A15A, #9C7A3C)" }}
              >
                {continuing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue to your dashboard
              </button>
              <button
                type="button"
                onClick={handleSignOutExisting}
                disabled={continuing || signingOut}
                className="mt-2 w-full h-11 rounded-full border border-[#33302A] hover:border-[#9C7A3C] hover:text-[#F3EEE6] text-[11px] font-medium uppercase tracking-[0.2em] text-[#9C9488] transition flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Sign out & use a different account
              </button>
              <p className="mt-4 text-xs text-[#9C9488]/70 text-center">
                Not you? Sign out first — that keeps your account private on this device.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-300"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#9C9488]">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9C9488]" />
                    <input
                      id="email" type="email" required autoComplete="email" autoFocus
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com" disabled={loading}
                      className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#33302A] bg-[#0A090B] text-sm text-[#F3EEE6] placeholder:text-[#9C9488]/60 outline-none transition focus:border-[#C9A15A] focus:ring-4 focus:ring-[#C9A15A]/15 disabled:opacity-60"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#9C9488]">Password</label>
                    <Link to="/forgot-password" className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#C9A15A]/80 hover:text-[#E7C989] transition">
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9C9488]" />
                    <input
                      id="password" type={showPassword ? "text" : "password"} required autoComplete="current-password"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" disabled={loading}
                      className="w-full h-11 pl-10 pr-10 rounded-lg border border-[#33302A] bg-[#0A090B] text-sm text-[#F3EEE6] placeholder:text-[#9C9488]/60 outline-none transition focus:border-[#C9A15A] focus:ring-4 focus:ring-[#C9A15A]/15 disabled:opacity-60"
                    />
                    <button
                      type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md text-[#9C9488] hover:text-[#F3EEE6] hover:bg-[#1A181C] transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full h-11 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A090B] transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:brightness-110"
                  style={{ background: "linear-gradient(to right, #E7C989, #C9A15A, #9C7A3C)" }}
                >
                  {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Signing in…</>) : "Sign in"}
                </button>
              </form>
            </>
          )}
        </div>

        {!existingUser && !checkingSession && (
          <p className="text-center text-sm text-[#9C9488] mt-6">
            Don't have an account?{" "}
            <Link to="/onboarding" className="font-medium text-[#E7C989] hover:text-[#C9A15A] transition">
              Set up your business
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
