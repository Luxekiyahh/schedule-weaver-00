import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Calendar, Eye, EyeOff, Loader2, Lock, Mail, AlertCircle, UserCheck, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveHomePathForUser, signOutAndReset } from "@/lib/auth-signout";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — Welcome back" },
      { name: "description", content: "Sign in to access your business calendar and manage your bookings." },
    ],
  }),
});

type SessionUser = { id: string; email: string | null };

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Identity-gate state — we never auto-navigate a background session away
  // from this page. If someone else's session is sitting in this browser, we
  // surface it and require an explicit "Continue" or "Sign out" click.
  const [checkingSession, setCheckingSession] = useState(true);
  const [existingUser, setExistingUser] = useState<SessionUser | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // getUser() revalidates with the auth server — do not trust a raw session.
    supabase.auth.getUser().then(({ data, error: userErr }) => {
      if (cancelled) return;
      if (userErr || !data.user) {
        setExistingUser(null);
      } else {
        setExistingUser({ id: data.user.id, email: data.user.email ?? null });
      }
      setCheckingSession(false);
    });
    return () => {
      cancelled = true;
    };
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
      // If somehow a session lingers when the form is submitted (e.g. gate
      // race), or the entered email differs from the currently-signed-in
      // user, clear the old session first so we never end up mixing users.
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
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-[#141414] grid place-items-center mb-4">
            <Calendar className="h-6 w-6 text-[#f8f7f4]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#141414]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Welcome back</h1>
          <p className="text-sm text-[#141414]/50 mt-1.5">Sign in to access your business calendar</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#141414]/10 rounded-2xl shadow-sm shadow-[#141414]/[0.03] p-7">
          {checkingSession ? (
            <div className="flex items-center justify-center py-8 text-[#141414]/50">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : existingUser ? (
            <div>
              <div className="flex items-start gap-3 rounded-lg border border-[#141414]/10 bg-[#f8f7f4] px-3.5 py-3">
                <UserCheck className="h-5 w-5 mt-0.5 shrink-0 text-[#141414]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#141414]">You're already signed in</p>
                  <p className="text-sm text-[#141414]/60 truncate">
                    {existingUser.email ?? "Signed-in account"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={continuing || signingOut}
                className="mt-5 w-full h-11 rounded-lg bg-[#141414] hover:bg-[#141414]/90 text-[#f8f7f4] text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              >
                {continuing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue to your dashboard
              </button>

              <button
                type="button"
                onClick={handleSignOutExisting}
                disabled={continuing || signingOut}
                className="mt-2 w-full h-11 rounded-lg border border-[#141414]/15 hover:bg-[#141414]/5 text-[#141414] text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Sign out & use a different account
              </button>

              <p className="mt-4 text-xs text-[#141414]/50 text-center">
                Not you? Sign out first — that keeps your account private on this device.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3.5 py-3 text-sm text-rose-700"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                      disabled={loading}
                      className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#141414] focus:ring-4 focus:ring-[#141414]/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
                    <Link to="/forgot-password" className="text-xs font-medium text-[#141414]/60 hover:text-[#141414] hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#141414] focus:ring-4 focus:ring-[#141414]/10 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-[#141414] hover:bg-[#141414]/90 text-[#f8f7f4] text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        {!existingUser && !checkingSession && (
          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{" "}
            <Link to="/onboarding" className="font-medium text-[#141414] hover:underline transition">
              Set up your business
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
