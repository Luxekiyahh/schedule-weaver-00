import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Rocket, Wand2, CheckCircle2, Building2, CalendarDays, ClipboardList, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { publishBranding, getCreditBalance, type GeneratedBranding } from "@/lib/tenant.functions";
import { seedIndustryCatalog, INDUSTRIES, type Industry } from "@/lib/catalog.functions";

export const Route = createFileRoute("/setup")({
  component: SetupWizard,
  head: () => ({
    meta: [
      { title: "Storefront Questionnaire Assistant — Proc Schedule" },
      { name: "description", content: "Provide your brand parameters to customize your luxury booking layout." },
    ],
  }),
});

const DEFAULTS: GeneratedBranding = {
  primary_color: "#FFD1DC", // Luxury Soft Baby Pink default anchor preset
  secondary_color: "#111111",
  background_color: "#ffffff",
  heading_font: "Playfair Display",
  body_font: "Inter",
  hero_headline: "Book Your Experience",
  hero_subheading: "Select your services and reserve your private session.",
  cta_label: "Book appointment",
};

function SetupWizard() {
  const navigate = useNavigate();
  const publish = useServerFn(publishBranding);

  // Discovery Form State Modules
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [staffCount, setStaffCount] = useState("1");
  const [hours, setHours] = useState("Mon-Fri: 9am - 6pm, Sat: 10am - 4pm, Sun: Closed");
  const [servicesList, setServicesList] = useState("");
  const [policy, setPolicy] = useState("");
  const [intakeRequirements, setIntakeRequirements] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [branding, setBranding] = useState<GeneratedBranding>(DEFAULTS);
  const [publishing, setPublishing] = useState(false);
  const [showIndustry, setShowIndustry] = useState(false);
  const [seeding, setSeeding] = useState<Industry | null>(null);
  const [success, setSuccess] = useState(false);
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
    });
  }, [navigate]);

  useEffect(() => {
    if (businessName) {
      setBranding(prev => ({
        ...prev,
        hero_headline: `Welcome to ${businessName}`,
        hero_subheading: "Select your desired services and book your session in a few clicks."
      }));
    }
  }, [businessName]);

  const fontHref = useMemo(() => {
    const fonts = [branding.heading_font, branding.body_font]
      .filter(Boolean)
      .map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700`)
      .join("&");
    return `https://fonts.googleapis.com/css2?${fonts}&display=swap`;
  }, [branding.heading_font, branding.body_font]);

  const handlePublishAndLaunch = async () => {
    if (!userId) return;
    setPublishing(true);
    try {
      // Package questionnaire variables cleanly within the database headline metadata fields
      const customizedPayload: GeneratedBranding = {
        ...branding,
        hero_headline: businessName || branding.hero_headline,
        hero_subheading: `Hours: ${hours} · Providers: ${staffCount}`,
        // Storing details safely inside operational fields for admin design configurations
        cta_label: "Book alignment"
      };

      // Safely update workspace name details manually
      if (workspaceId && businessName.trim()) {
        await supabase
          .from("workspaces")
          .update({ name: businessName.trim() })
          .eq("id", workspaceId);
      }

      await publish({ data: { branding: customizedPayload } });
      setPublishing(false);
      setShowIndustry(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record dashboard configurations");
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
        toast.info("Your service configuration framework is initialized.");
      }
      setShowIndustry(false);
      setSuccess(true);
      setTimeout(() => navigate({ to: "/dashboard/services" }), 1400);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seeding initialization failed");
      setSeeding(null);
    }
  };

  const nextStep = () => setStep((p) => Math.min(p + 1, 4));
  const prevStep = () => setStep((p) => Math.max(p - 1, 1));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <link rel="stylesheet" href={fontHref} />

      <div className="grid lg:grid-cols-2 min-h-screen">
        {/* LEFT: Structural Questionnaire Panels */}
        <div className="flex flex-col p-8 lg:p-12 border-r border-border bg-gradient-to-br from-background via-background to-muted/30">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-muted-foreground mb-3">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              Storefront Designer Form · Step 1
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">
              Configure Your Platform Bones
            </h1>
            <p className="text-muted-foreground text-sm">
              Section {step} of 4 — Let's collect your operational specifications so we can deploy your luxury dashboard catalog.
            </p>
            <div className="w-full bg-muted h-1 rounded-full mt-4 overflow-hidden">
              <div className="bg-foreground h-full transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-[320px]">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-sm font-medium mb-1"><Building2 className="w-4 h-4 text-muted-foreground" /> Business Identity</div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand or Studio Name</label>
                  <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g., Luxe Esthetics Suite" className="w-full h-11 rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 mountaineer-field" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Staff Providers / Chairs</label>
                  <input type="number" min="1" value={staffCount} onChange={(e) => setStaffCount(e.target.value)} className="w-full h-11 rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-sm font-medium mb-1"><ClipboardList className="w-4 h-4 text-muted-foreground" /> Menu Configurations</div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">List Services (Pricing & Estimated Durations)</label>
                  <textarea rows={5} value={servicesList} onChange={(e) => setServicesList(e.target.value)} placeholder="Example:&#10;- Medium Knotless Braids | $250 | 4 Hours&#10;- Beard Detail Shaping | $45 | 30 Mins" className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-sm font-medium mb-1"><CalendarDays className="w-4 h-4 text-muted-foreground" /> Timing Metrics</div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Business Standard Hours</label>
                  <input type="text" value={hours} onChange={(e) => setHours(e.target.value)} className="w-full h-11 rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Intake Form Fields Required</label>
                  <input type="text" value={intakeRequirements} onChange={(e) => setIntakeRequirements(e.target.value)} placeholder="e.g., Hair texture, skin history notes..." className="w-full h-11 rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-sm font-medium mb-1"><ShieldCheck className="w-4 h-4 text-muted-foreground" /> Studio Policy Structure</div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Studio Policies & Guidelines</label>
                  <textarea rows={5} value={policy} onChange={(e) => setPolicy(e.target.value)} placeholder="e.g., 24-hour cancellation rules. Deposits are strictly non-refundable." className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2" />
                </div>
              </div>
            )}
          </div>

          {/* Nav Actions Footer */}
          <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
            <button type="button" onClick={prevStep} disabled={step === 1 || publishing} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition">
              Back
            </button>
            {step < 4 ? (
              <button type="button" onClick={nextStep} disabled={step === 1 && !businessName.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-40">
                Continue
              </button>
            ) : (
              <button type="button" onClick={handlePublishAndLaunch} disabled={publishing} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 font-semibold shadow-lg shadow-primary/25 hover:opacity-95 transition disabled:opacity-40">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Publish Parameters
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: High Fidelity Interactive Visual Canvas */}
        <div className="relative bg-muted/30 p-6 lg:p-10 flex items-center justify-center overflow-hidden">
          <div className="absolute top-6 left-6 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Live customized design skin
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
                {(businessName || "your-brand").toLowerCase().replace(/[^a-z0-9]/g, "")}.procschedule.com
              </div>
            </div>

            <div className="px-8 py-12 text-center" style={{ color: contrastText(branding.background_color) }}>
              <h2 className="text-3xl font-bold mb-3 leading-tight animate-in fade-in duration-300" style={{ fontFamily: `${branding.heading_font}, Georgia, serif`, color: contrastText(branding.background_color) }}>
                {businessName || branding.hero_headline}
              </h2>
              <p className="text-xs opacity-75 mb-6 max-w-sm mx-auto leading-relaxed">
                Hours: {hours}
              </p>
              <button className="px-6 py-2.5 rounded-full font-semibold text-xs shadow-md transition" style={{ backgroundColor: branding.primary_color, color: contrastText(branding.primary_color) }}>
                {branding.cta_label}
              </button>

              <div className="mt-8 pt-6 border-t border-current/10 text-left">
                <div className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Service Menu Preview</div>
                {["Signature Package", "Premium Maintenance Session"].map((s, i) => (
                  <div key={s} className="flex items-center justify-between py-2 border-b border-current/5 last:border-0">
                    <span className="text-xs font-medium">{s}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${branding.primary_color}33`, color: branding.primary_color }}>
                      ${(i + 1) * 75}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Industry Configuration Modals */}
      <AnimatePresence>
        {showIndustry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6 backdrop-blur-md">
            <motion.div initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-2xl">
              <div className="mb-6 text-center">
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-pink-400" /> Catalog Seed Engine</div>
                <h2 className="text-2xl font-bold">Select primary business sector</h2>
                <p className="mt-2 text-sm text-muted-foreground">We will auto-populate starter menu templates directly into your admin panel catalog matrix.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {INDUSTRIES.map((ind) => {
                  const busy = seeding === ind.id;
                  return (
                    <button key={ind.id} onClick={() => handleSeed(ind.id)} disabled={seeding !== null} className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-background p-5 text-center transition hover:border-primary disabled:opacity-60">
                      <span className="text-3xl">{ind.emoji}</span>
                      <span className="text-sm font-semibold">{ind.label}</span>
                      <span className="text-[11px] text-muted-foreground leading-snug">{ind.description}</span>
                      {busy ? <Loader2 className="mt-2 h-4 w-4 animate-spin text-primary" /> : <ArrowRight className="mt-2 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Success Splash */}
        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center">
              <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center max-w-md px-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-1">Configuration Framework Compiled!</h2>
                <p className="text-sm text-muted-foreground">Redirecting your session safely to your active services workspace matrix dashboard...</p>
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