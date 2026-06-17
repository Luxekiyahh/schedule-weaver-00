import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Rocket, Wand2, CheckCircle2, Lock, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { publishBranding, getCreditBalance, type GeneratedBranding } from "@/lib/tenant.functions";
import { seedIndustryCatalog, INDUSTRIES, type Industry } from "@/lib/catalog.functions";

export const Route = createFileRoute("/setup")({
  component: SetupWizard,
  head: () => ({
    meta: [
      { title: "AI Setup Wizard — Proc Schedule" },
      { name: "description", content: "Describe your brand and let AI design your storefront." },
    ],
  }),
});

const SUGGESTIONS: Array<{ label: string; prompt: string }> = [
  {
    label: "Soft Baby Pink Luxury",
    prompt:
      "A high-end, minimalist luxury nail salon with soft baby pink accents, clean white backgrounds, and elegant serif typography.",
  },
  {
    label: "Moody Dark & Neon Green",
    prompt:
      "A moody, dark barbershop with deep charcoal and black backgrounds, sharp neon green accents, and bold modern sans-serif type.",
  },
  {
    label: "Earthy Clean Wellness",
    prompt:
      "A calming, earthy wellness spa with sage greens, warm beige neutrals, soft cream backgrounds, and a serene editorial tone.",
  },
];

const DEFAULTS: GeneratedBranding = {
  primary_color: "#4f46e5",
  secondary_color: "#ec4899",
  background_color: "#ffffff",
  heading_font: "Playfair Display",
  body_font: "Inter",
  hero_headline: "Book Your Appointment",
  hero_subheading: "Reserve your spot in just a few clicks.",
  cta_label: "Book now",
};

function SetupWizard() {
  const navigate = useNavigate();
  const publish = useServerFn(publishBranding);
  const fetchCredits = useServerFn(getCreditBalance);

  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [branding, setBranding] = useState<GeneratedBranding>(DEFAULTS);
  const [credits, setCredits] = useState<number | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showIndustry, setShowIndustry] = useState(false);
  const [seeding, setSeeding] = useState<Industry | null>(null);
  const seedFn = useServerFn(seedIndustryCatalog);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigate({ to: "/login" });
        return;
      }
      setUserId(data.user.id);
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", data.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (mem) setWorkspaceId(mem.workspace_id);
      fetchCredits({ data: {} })
        .then((r) => setCredits(r.credits))
        .catch(() => setCredits(0));
    });
  }, [navigate, fetchCredits]);

  const fontHref = useMemo(() => {
    const fonts = [branding.heading_font, branding.body_font]
      .filter(Boolean)
      .map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700`)
      .join("&");
    return `https://fonts.googleapis.com/css2?${fonts}&display=swap`;
  }, [branding.heading_font, branding.body_font]);

  const outOfCredits = credits !== null && credits <= 0;

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.trim().length < 8) {
      setError("Describe your brand in at least a sentence.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Please sign in again.");

      const resp = await fetch("/api/public/generate-branding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (resp.status === 402) {
        setCredits(0);
        setError(null);
        return;
      }
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || "Generation failed.");
      }

      const json = (await resp.json()) as {
        branding: {
          primary_color: string;
          secondary_color: string;
          background_color: string;
          font_family: string;
          hero_headline: string;
          hero_subheading: string;
          card_style: string;
        };
        credits: number;
      };

      setBranding({
        primary_color: json.branding.primary_color,
        secondary_color: json.branding.secondary_color,
        background_color: json.branding.background_color,
        heading_font: json.branding.font_family,
        body_font: json.branding.font_family,
        hero_headline: json.branding.hero_headline,
        hero_subheading: json.branding.hero_subheading,
        cta_label: "Book now",
      });
      setCredits(json.credits);
      setHasGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!userId) return;
    setPublishing(true);
    setError(null);
    try {
      await publish({ data: { branding } });
      setPublishing(false);
      setShowIndustry(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
      setPublishing(false);
    }
  };

  const handleSeed = async (industry: Industry) => {
    if (!workspaceId || seeding) return;
    setSeeding(industry);
    try {
      const res = await seedFn({ data: { workspaceId, industry } });
      if (res.seeded) {
        toast.success("Your starter catalog is live! 🎉");
      } else {
        toast.info("You already have a catalog — taking you to it.");
      }
      setShowIndustry(false);
      setSuccess(true);
      setTimeout(() => navigate({ to: "/admin/services" }), 1400);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seeding failed");
      setSeeding(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <link rel="stylesheet" href={fontHref} />

      <div className="grid lg:grid-cols-2 min-h-screen">
        {/* LEFT: AI Console */}
        <div className="flex flex-col p-8 lg:p-12 border-r border-border bg-gradient-to-br from-background via-background to-muted/30">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-muted-foreground mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              AI Design Engine · Step 2
            </div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
                Design Your Storefront with AI
              </h1>
              {credits !== null && (
                <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  {credits} {credits === 1 ? "credit" : "credits"}
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-lg">
              Describe the vibe in plain English. We'll generate colors, type, and copy you can publish in one click.
            </p>
          </div>

          {outOfCredits ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-8 shadow-xl"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-5">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">You've used all your free design credits</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Upgrade to <span className="font-semibold text-foreground">Proc Schedule Pro</span> to unlock unlimited AI generations, custom domains, and text reminders.
              </p>
              <button
                onClick={() => navigate({ to: "/dashboard/home" })}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3.5 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition"
              >
                <Sparkles className="w-5 h-5" />
                Buy Credits / Upgrade
              </button>
            </motion.div>
          ) : (
            <>
              <label className="text-sm font-medium mb-2">Brand brief</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your studio's look and feel (e.g., A high-end, minimalist luxury nail salon with soft baby pink accents, clean white backgrounds, and elegant serif typography)..."
                rows={6}
                className="w-full rounded-xl border border-input bg-card/50 backdrop-blur px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition disabled:opacity-50"
                disabled={generating || publishing}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs uppercase tracking-widest text-muted-foreground self-center mr-1">
                  Try
                </span>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setPrompt(s.prompt)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent hover:text-accent-foreground transition"
                    title={s.prompt}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating || publishing || credits === null}
                className="mt-6 group relative inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3.5 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating brand vibe…
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                    />
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>
                      ✨ Generate (Costs 1 Credit)
                      {credits !== null && ` — ${credits} Credits Remaining`}
                    </span>
                  </>
                )}
              </button>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handlePublish}
                disabled={!hasGenerated || publishing || generating}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition px-6 py-3.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:text-foreground disabled:hover:border-primary/30"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Publishing…
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" /> Publish & Launch Storefront
                  </>
                )}
              </motion.button>
            </>
          )}

          {hasGenerated && !outOfCredits && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 grid grid-cols-3 gap-3 text-xs"
            >
              {[
                ["Primary", branding.primary_color],
                ["Accent", branding.secondary_color],
                ["Background", branding.background_color],
              ].map(([label, hex]) => (
                <div key={label} className="rounded-lg border border-border p-3 bg-card">
                  <div
                    className="h-10 rounded-md mb-2 border border-border/50"
                    style={{ backgroundColor: hex }}
                  />
                  <div className="font-medium">{label}</div>
                  <div className="text-muted-foreground font-mono">{hex}</div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* RIGHT: Live Preview */}
        <div className="relative bg-muted/30 p-6 lg:p-10 flex items-center justify-center overflow-hidden">
          <div className="absolute top-6 left-6 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Live storefront preview
          </div>

          <motion.div
            key={`${branding.primary_color}-${branding.heading_font}`}
            initial={{ opacity: 0.6, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border"
            style={{
              backgroundColor: branding.background_color,
              fontFamily: `${branding.body_font}, system-ui, sans-serif`,
            }}
          >
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-black/5 border-b border-black/5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
              <div className="ml-3 text-[10px] font-mono opacity-50">
                procschedule.com/your-studio
              </div>
            </div>

            <div
              className="px-8 py-14 text-center"
              style={{ color: contrastText(branding.background_color) }}
            >
              <h2
                className="text-4xl font-bold mb-4 leading-tight"
                style={{
                  fontFamily: `${branding.heading_font}, Georgia, serif`,
                  color: contrastText(branding.background_color),
                }}
              >
                {branding.hero_headline}
              </h2>
              <p className="text-sm opacity-75 mb-7 max-w-sm mx-auto leading-relaxed">
                {branding.hero_subheading}
              </p>
              <button
                className="px-7 py-3 rounded-full font-semibold text-sm shadow-lg transition hover:scale-105"
                style={{
                  backgroundColor: branding.primary_color,
                  color: contrastText(branding.primary_color),
                }}
              >
                {branding.cta_label}
              </button>

              <div className="mt-10 pt-6 border-t border-current/10 text-left">
                <div className="text-xs uppercase tracking-widest opacity-50 mb-3">Services</div>
                {["Signature Service", "Premium Experience", "Quick Refresh"].map((s, i) => (
                  <div
                    key={s}
                    className="flex items-center justify-between py-2.5 border-b border-current/10 last:border-0"
                  >
                    <span className="text-sm font-medium">{s}</span>
                    <span
                      className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{
                        backgroundColor: `${branding.secondary_color}22`,
                        color: branding.secondary_color,
                      }}
                    >
                      ${(i + 1) * 45}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showIndustry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-2xl"
            >
              <div className="mb-6 text-center">
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> Final step · Step 3
                </div>
                <h2 className="text-3xl font-bold">What's your business type?</h2>
                <p className="mt-2 text-muted-foreground">
                  We'll instantly seed a tailored starter catalog so you're ready to take bookings.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {INDUSTRIES.map((ind) => {
                  const busy = seeding === ind.id;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => handleSeed(ind.id)}
                      disabled={seeding !== null}
                      className="group relative flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-background p-6 text-center transition hover:border-primary hover:shadow-lg disabled:opacity-60"
                    >
                      <span className="text-4xl">{ind.emoji}</span>
                      <span className="font-semibold">{ind.label}</span>
                      <span className="text-xs text-muted-foreground">{ind.description}</span>
                      {busy ? (
                        <Loader2 className="mt-2 h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <ArrowRight className="mt-2 h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center max-w-md px-6"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/15 mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </motion.div>
              <h2 className="text-3xl font-bold mb-2">You're live!</h2>
              <p className="text-muted-foreground">
                Your customized digital storefront is officially live. Taking you to your service catalog…
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function contrastText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#111";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#111111" : "#ffffff";
}
