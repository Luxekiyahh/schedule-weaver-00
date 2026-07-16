import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Calendar, Loader2, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset your password" },
      { name: "description", content: "Send yourself a password reset link to regain access to your account." },
    ],
  }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
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
            Reset your password
          </h1>
          <p className="text-sm text-[#141414]/50 mt-1.5 text-center">
            Enter your email and we'll send you a secure reset link.
          </p>
        </div>

        <div className="bg-white border border-[#141414]/10 rounded-2xl shadow-sm shadow-[#141414]/[0.03] p-7">
          {sent ? (
            <div className="text-center py-4">
              <div className="mx-auto h-10 w-10 rounded-full bg-emerald-50 grid place-items-center mb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-base font-semibold text-[#141414]">Check your inbox</h2>
              <p className="text-sm text-[#141414]/60 mt-1.5">
                If an account exists for <span className="font-medium text-[#141414]">{email}</span>, a reset link is on its way. It may take a minute to arrive.
              </p>
              <Link
                to="/login"
                className="inline-block mt-5 text-sm font-medium text-[#141414] hover:underline"
              >
                Back to sign in
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-[#141414] hover:bg-[#141414]/90 text-[#f8f7f4] text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-[#141414] hover:underline">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
