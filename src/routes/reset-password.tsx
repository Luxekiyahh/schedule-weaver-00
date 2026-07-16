import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Calendar, Eye, EyeOff, Loader2, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Set a new password" },
      { name: "description", content: "Choose a new password to finish resetting your account." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY on load when the URL hash carries a
    // valid recovery token. It also sets a temporary session used for updateUser.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "INITIAL_SESSION" && session && window.location.hash.includes("type=recovery"))) {
        setValidLink(true);
      }
      setReady(true);
    });

    // Fallback: check existing session in case the event already fired.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && window.location.hash.includes("type=recovery")) {
        setValidLink(true);
      }
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => navigate({ to: "/dashboard/home" }), 1200);
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
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-[#141414] grid place-items-center mb-4">
            <Calendar className="h-6 w-6 text-[#f8f7f4]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#141414]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Set a new password
          </h1>
          <p className="text-sm text-[#141414]/50 mt-1.5">Pick something you'll remember.</p>
        </div>

        <div className="bg-white border border-[#141414]/10 rounded-2xl shadow-sm shadow-[#141414]/[0.03] p-7">
          {!ready ? (
            <div className="flex items-center justify-center py-8 text-[#141414]/50">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <div className="mx-auto h-10 w-10 rounded-full bg-emerald-50 grid place-items-center mb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-base font-semibold text-[#141414]">Password updated</h2>
              <p className="text-sm text-[#141414]/60 mt-1.5">Redirecting you to your dashboard…</p>
            </div>
          ) : !validLink ? (
            <div className="text-center py-4">
              <div className="mx-auto h-10 w-10 rounded-full bg-rose-50 grid place-items-center mb-3">
                <AlertCircle className="h-5 w-5 text-rose-600" />
              </div>
              <h2 className="text-base font-semibold text-[#141414]">This link is invalid or expired</h2>
              <p className="text-sm text-[#141414]/60 mt-1.5">
                Reset links expire after a short time. Request a fresh one below.
              </p>
              <Link
                to="/forgot-password"
                className="inline-block mt-5 h-10 px-4 rounded-lg bg-[#141414] text-[#f8f7f4] text-sm font-medium leading-10"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3.5 py-3 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
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

                <div className="space-y-1.5">
                  <label htmlFor="confirm" className="text-sm font-medium text-slate-700">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      disabled={loading}
                      className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#141414] focus:ring-4 focus:ring-[#141414]/10 disabled:opacity-60"
                    />
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
                      Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
