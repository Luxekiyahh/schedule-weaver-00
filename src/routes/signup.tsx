import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, X, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkSlugAvailable } from "@/lib/onboarding.functions";
import { finalizeTenantSignup } from "@/lib/tenant.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Create your storefront — ProcSchedule" },
      { name: "description", content: "Sign up and launch a beautiful booking storefront for your business." },
    ],
  }),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function SignupPage() {
  const navigate = useNavigate();
  const finalize = useServerFn(finalizeTenantSignup);
  const checkSlug = useServerFn(checkSlugAvailable);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(businessName));
  }, [businessName, slugTouched]);

  useEffect(() => {
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) || slug.length < 2) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const r = await checkSlug({ data: { slug } });
        setSlugStatus(r.available ? "ok" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [slug, checkSlug]);

  const canSubmit =
    !loading &&
    email &&
    password.length >= 8 &&
    businessName.trim() &&
    slugStatus === "ok";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data: auth, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: businessName },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (authErr) throw authErr;
      const userId = auth.user?.id;
      if (!userId) throw new Error("Signup did not return a user.");

      // The handle_new_user trigger creates a default workspace + membership.
      // Finalize: rename it, set branding, seed Dolliimarie if applicable.
      await finalize({ data: { userId, businessName: businessName.trim(), slug } });

      // If email confirmation is required, the session won't exist yet.
      if (!auth.session) {
        navigate({ to: "/login", search: { confirm: "1" } as never });
        return;
      }
      navigate({ to: "/$slug", params: { slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3" />
            Launch in minutes
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Create your storefront</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Your branded booking page, live at <span className="font-mono">your-name.procschedule.com</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Dolliimarie Hair Studio"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Your URL</Label>
            <div className="flex items-stretch rounded-md border focus-within:ring-1 focus-within:ring-ring overflow-hidden">
              <input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                placeholder="your-name"
                className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
                required
              />
              <span className="bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center">
                .procschedule.com
              </span>
              <div className="px-3 flex items-center">
                {slugStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {slugStatus === "ok" && <Check className="w-4 h-4 text-green-600" />}
                {(slugStatus === "taken" || slugStatus === "invalid") && <X className="w-4 h-4 text-destructive" />}
              </div>
            </div>
            {slugStatus === "taken" && <p className="text-xs text-destructive">This URL is taken.</p>}
            {slugStatus === "invalid" && (
              <p className="text-xs text-destructive">Use lowercase letters, numbers, and hyphens (min 2).</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</div>
          )}

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create my storefront
          </Button>

          <p className="text-center text-sm text-muted-foreground pt-2">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
