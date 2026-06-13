import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Wand2 as WandIcon, CalendarCheck, Send, X } from "lucide-react";
import {
  ArrowRight,
  CalendarRange,
  Sparkles,
  Wand2,
  Layers,
  Zap,
  ShieldCheck,
  PlayCircle,
  Home as HomeIcon,
  Bell,
  Scissors,
  ChevronRight,
  Code2,
  DollarSign,
  Users,
} from "lucide-react";
import { getTenantSlugFromHost } from "@/lib/subdomain";
import { TenantStorefrontBySlug } from "./$slug";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Proc Schedule — The Procedural Powerhouse for Complex Scheduling" },
      {
        name: "description",
        content:
          "AI-driven, multi-tenant scheduling for modern service teams. Deep service variations, custom add-ons, and instant automated messaging — built natively.",
      },
      { property: "og:title", content: "Proc Schedule — Procedural Scheduling for Service Teams" },
      {
        property: "og:description",
        content:
          "Replace rigid booking pages with an AI-driven, multi-tenant scheduling engine. Storefronts, automations, and analytics in one workspace.",
      },
    ],
  }),
});

function Landing() {
  const [tenantSlug, setTenantSlug] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setTenantSlug(getTenantSlugFromHost());
  }, []);

  // Avoid hydration mismatch — render nothing until we've inspected the hostname.
  if (tenantSlug === undefined) return null;

  if (tenantSlug) {
    return <TenantStorefrontBySlug slug={tenantSlug} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden selection:bg-indigo-500/30">
      <BackgroundFx />
      <Nav />
      <Hero />
      <DashboardMockup />
      <Features />
      <Footer />
    </div>
  );
}


/* ---------------- Background ---------------- */
function BackgroundFx() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.25),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_100%,rgba(236,72,153,0.15),transparent)]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
    </div>
  );
}

/* ---------------- Nav ---------------- */
function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a0f]/60 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/40 group-hover:scale-110 transition">
            <CalendarRange className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-lg">
            Proc<span className="text-indigo-400">Schedule</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#dashboard" className="hover:text-white transition">Dashboard</a>
          <Link to="/pricing" className="hover:text-white transition">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition rounded-lg hover:bg-white/5"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90 transition shadow-lg shadow-white/10"
          >
            Get Started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <section className="relative pt-20 sm:pt-28 pb-12 sm:pb-20 px-5 sm:px-8">
      <div className="max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-1.5 text-xs font-mono tracking-wider text-white/70 mb-6"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          AI-NATIVE · MULTI-TENANT · v2.0
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]"
        >
          The Procedural Powerhouse{" "}
          <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
            for Complex Scheduling.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-white/60 leading-relaxed"
        >
          Proc Schedule replaces rigid, cookie-cutter booking pages with an AI-driven,
          multi-tenant scheduling engine designed for modern service teams. Built natively to
          handle deep service variations, custom add-ons, and instant automated messaging.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            to="/signup"
            className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3.5 text-sm font-semibold shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition"
          >
            Launch Your Storefront
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
          </Link>
          <button
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-6 py-3.5 text-sm font-semibold transition backdrop-blur"
          >
            <PlayCircle className="w-4 h-4" /> Watch Demo
          </button>
        </motion.div>

        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/40">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> SOC-ready architecture</span>
          <span className="hidden sm:flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> 60s setup</span>
        </div>
      </div>
      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}

/* ---------------- Demo Modal ---------------- */
const DEMO_SCENES = [
  {
    key: "prompt",
    label: "01 · AI Brand Wizard",
    title: "Describe your business. Get a storefront.",
    caption: "Gemini generates colors, fonts, and copy in seconds.",
  },
  {
    key: "storefront",
    label: "02 · Themed Storefront",
    title: "Your brand, live at procschedule.com/you",
    caption: "Multi-tenant routing with per-workspace theming.",
  },
  {
    key: "booking",
    label: "03 · Deep Booking Flow",
    title: "Variants, add-ons, and length options — native.",
    caption: "Complex services without plugins or workarounds.",
  },
  {
    key: "automation",
    label: "04 · Instant Automations",
    title: "Confirmations fire the moment a booking lands.",
    caption: "Postgres webhooks → TanStack routes → SMS + email.",
  },
] as const;

function DemoModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    setIdx(0);
    const t = setInterval(() => setIdx((i) => (i + 1) % DEMO_SCENES.length), 4200);
    return () => clearInterval(t);
  }, [open]);

  const scene = DEMO_SCENES[idx];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl w-[95vw] p-0 border-white/10 bg-[#0a0a0f] text-white overflow-hidden [&>button]:hidden"
      >
        <VisuallyHidden>
          <DialogTitle>Proc Schedule product walkthrough</DialogTitle>
          <DialogDescription>An animated tour of the AI wizard, storefronts, booking, and automations.</DialogDescription>
        </VisuallyHidden>

        <div className="relative aspect-video w-full bg-gradient-to-br from-[#0b0b14] via-[#0a0a0f] to-[#120a1a]">
          {/* ambient glow */}
          <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />

          {/* close */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:bg-white/10 hover:text-white transition backdrop-blur"
            aria-label="Close demo"
          >
            <X className="w-4 h-4" />
          </button>

          {/* scene label */}
          <div className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-mono tracking-wider text-white/70 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
            </span>
            {scene.label}
          </div>

          {/* scene stage */}
          <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.key}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-3xl"
              >
                <DemoScene sceneKey={scene.key} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* caption */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.key + "-cap"}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <h3 className="text-lg sm:text-2xl font-semibold tracking-tight">{scene.title}</h3>
                <p className="mt-1 text-xs sm:text-sm text-white/60">{scene.caption}</p>
              </motion.div>
            </AnimatePresence>

            {/* progress dots */}
            <div className="mt-4 flex items-center gap-2">
              {DEMO_SCENES.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => setIdx(i)}
                  className="group relative h-1 flex-1 overflow-hidden rounded-full bg-white/10"
                  aria-label={`Go to ${s.label}`}
                >
                  <motion.span
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                    initial={{ width: "0%" }}
                    animate={{ width: i < idx ? "100%" : i === idx ? "100%" : "0%" }}
                    transition={{ duration: i === idx ? 4.2 : 0.3, ease: "linear" }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/40 px-6 py-4">
          <p className="text-xs text-white/50">No signup required · 60-second product tour</p>
          <Link
            to="/signup"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold shadow-lg shadow-indigo-500/30 hover:scale-[1.02] transition"
          >
            Start Building <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DemoScene({ sceneKey }: { sceneKey: string }) {
  if (sceneKey === "prompt") {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-5 sm:p-7 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-mono text-white/40">
          <WandIcon className="w-3.5 h-3.5 text-fuchsia-300" /> AI CONSOLE
        </div>
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 font-mono text-sm">
          <TypewriterLine text="A luxury hair extensions studio — warm cream, deep burgundy, editorial serif headings." />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {["#FAF6EF", "#7A1F2B", "#C9A86A", "#1A0E10"].map((c, i) => (
            <motion.div
              key={c}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="aspect-square rounded-lg border border-white/10"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (sceneKey === "storefront") {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#FAF6EF] text-[#1A0E10] overflow-hidden shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-black/10 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[11px] font-mono text-black/50">procschedule.com/dolliimarie</span>
        </div>
        <div className="px-6 py-8 sm:px-10 sm:py-10" style={{ fontFamily: "Georgia, serif" }}>
          <p className="text-[11px] font-mono tracking-[0.2em] text-[#7A1F2B]">DOLLIIMARIE · LUXURY EXTENSIONS</p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-3xl sm:text-5xl font-semibold leading-tight"
          >
            Hair, crafted like couture.
          </motion.h2>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#7A1F2B] px-5 py-2.5 text-sm font-semibold text-white">
            Book your consultation <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    );
  }

  if (sceneKey === "booking") {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-5 sm:p-7 backdrop-blur-xl shadow-2xl">
        <p className="text-xs font-mono text-white/40">SELECT SERVICE</p>
        <div className="mt-3 space-y-2">
          {[
            { name: "Full Install", price: "$650", dur: "4h" },
            { name: "Maintenance", price: "$280", dur: "2h", active: true },
            { name: "Color + Install", price: "$890", dur: "5h" },
          ].map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${s.active ? "border-fuchsia-400/60 bg-fuchsia-500/10" : "border-white/10 bg-white/5"}`}
            >
              <div>
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-white/50">{s.dur}</div>
              </div>
              <div className="text-sm font-mono text-white/80">{s.price}</div>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-white/50">
          <CalendarCheck className="w-4 h-4 text-indigo-300" /> Thu · Nov 14 · 2:30 PM
        </div>
      </div>
    );
  }

  // automation
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 sm:p-7 backdrop-blur-xl shadow-2xl font-mono text-xs sm:text-sm">
      <div className="flex items-center gap-2 text-white/40">
        <Send className="w-3.5 h-3.5 text-emerald-300" /> WEBHOOK PIPELINE
      </div>
      <div className="mt-4 space-y-2">
        {[
          { t: "00.00s", msg: "INSERT bookings → trigger fired", color: "text-indigo-300" },
          { t: "00.04s", msg: "POST /api/public/appointment-confirmation", color: "text-fuchsia-300" },
          { t: "00.12s", msg: "✓ SMS dispatched via Twilio", color: "text-emerald-300" },
          { t: "00.18s", msg: "✓ Email queued via Resend", color: "text-emerald-300" },
        ].map((l, i) => (
          <motion.div
            key={l.msg}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.25 }}
            className="flex items-start gap-3 rounded-md border border-white/5 bg-white/5 px-3 py-2"
          >
            <span className="text-white/40">{l.t}</span>
            <span className={l.color}>{l.msg}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TypewriterLine({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const t = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 28);
    return () => clearInterval(t);
  }, [text]);
  return (
    <span className="text-white/90">
      {text.slice(0, n)}
      <span className="ml-0.5 inline-block w-1.5 h-4 -mb-0.5 bg-fuchsia-400 animate-pulse" />
    </span>
  );
}

/* ---------------- Dashboard Mockup ---------------- */
function DashboardMockup() {
  return (
    <section id="dashboard" className="relative px-4 sm:px-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="max-w-6xl mx-auto"
      >
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-indigo-500/10 bg-gradient-to-br from-slate-900 to-slate-950">
          {/* Glow */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/20 via-transparent to-fuchsia-500/20 pointer-events-none" />

          {/* macOS chrome */}
          <div className="relative flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/40">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/90" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/90" />
              <div className="w-3 h-3 rounded-full bg-green-500/90" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-1 text-xs font-mono text-white/40 bg-white/5 px-3 py-1 rounded-md">
                procschedule.com/dashboard/home
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Code2 className="w-3 h-3" /> live
            </div>
          </div>

          {/* App body */}
          <div className="grid grid-cols-[180px_1fr] min-h-[460px] text-sm">
            {/* Sidebar */}
            <aside className="border-r border-white/10 bg-black/20 p-3 space-y-1">
              <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-white/30 font-mono">
                Workspace
              </div>
              {[
                { icon: HomeIcon, label: "Home", active: true },
                { icon: CalendarRange, label: "Calendar" },
                { icon: Scissors, label: "Services" },
                { icon: Bell, label: "Notifications" },
              ].map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                    active
                      ? "bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/10 text-white border border-indigo-500/30"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                </div>
              ))}
            </aside>

            {/* Main panel */}
            <main className="p-5 sm:p-7 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white/40 font-mono">FRIDAY · MAY 22</div>
                  <div className="text-xl sm:text-2xl font-semibold mt-1">Good morning, Melanie</div>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> All systems live
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Metric icon={DollarSign} label="Today's Revenue" value="$1,420" trend="+12%" />
                <Metric icon={Users} label="Active Staff" value="4" trend="on shift" />
                <Metric icon={CalendarRange} label="Bookings" value="11" trend="2 pending" />
                <Metric icon={Bell} label="Confirmations" value="100%" trend="auto-sent" />
              </div>

              {/* Today's Lineup */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Today's Lineup</div>
                  <div className="text-xs text-white/40 flex items-center gap-1">
                    View calendar <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
                <div className="space-y-2">
                  {LINEUP.map((a, i) => (
                    <motion.div
                      key={a.name}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
                        style={{ background: a.avatarBg }}
                      >
                        {a.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{a.name}</div>
                        <div className="text-xs text-white/40 truncate">{a.service}</div>
                      </div>
                      <div className="hidden sm:block text-xs font-mono text-white/50">{a.time}</div>
                      <StatusBadge status={a.status} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </main>
          </div>

          {/* Dev teaser strip */}
          <div className="border-t border-white/10 bg-black/40 px-5 py-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-white/40">
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-white/60">src/routes/</span>
              <span className="text-white/30">__root.tsx · dashboard.tsx · $slug.tsx · setup.tsx · api/</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> type-safe
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

const LINEUP = [
  {
    name: "Ayana Brooks",
    service: "Luxury Install · 22\" · Color #4",
    time: "10:00 AM",
    status: "confirmed" as const,
    initials: "AB",
    avatarBg: "linear-gradient(135deg,#6366f1,#a855f7)",
  },
  {
    name: "Jordan Reyes",
    service: "Maintenance Refresh",
    time: "12:30 PM",
    status: "in_progress" as const,
    initials: "JR",
    avatarBg: "linear-gradient(135deg,#ec4899,#f97316)",
  },
  {
    name: "Priya Shah",
    service: "Signature Install · 26\"",
    time: "3:00 PM",
    status: "pending" as const,
    initials: "PS",
    avatarBg: "linear-gradient(135deg,#10b981,#06b6d4)",
  },
  {
    name: "Camille Vega",
    service: "Color Consultation",
    time: "5:15 PM",
    status: "confirmed" as const,
    initials: "CV",
    avatarBg: "linear-gradient(135deg,#f59e0b,#ef4444)",
  },
];

function Metric({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 hover:border-white/10 transition">
      <div className="flex items-center justify-between mb-1.5">
        <Icon className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wide">{trend}</span>
      </div>
      <div className="text-lg font-semibold tracking-tight">{value}</div>
      <div className="text-[11px] text-white/40 mt-0.5">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "confirmed" | "in_progress" | "pending" }) {
  const styles = {
    confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    in_progress: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  }[status];
  const label = { confirmed: "Confirmed", in_progress: "In progress", pending: "Pending" }[status];
  return (
    <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${styles}`}>
      {label}
    </span>
  );
}

/* ---------------- Features ---------------- */
const FEATURES = [
  {
    icon: Wand2,
    title: "AI-Native Branding Infrastructure",
    body: "Describe your brand vibe and our AI customizes your public storefront's colors, dynamic Google typography, and layout — no coding or design degree required.",
    gradient: "from-indigo-500 to-fuchsia-500",
  },
  {
    icon: Layers,
    title: "Engineered for Complex Workflows",
    body: "Built for high-ticket industries like modern hair studios. Multi-level service categories, custom length add-ons, variant durations, and color swatches — natively, in a single booking flow.",
    gradient: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: Zap,
    title: "Event-Driven Automation Pipeline",
    body: "Zero reliance on fragile external automations. Database-layer webhooks stream into type-safe TanStack server routes for bulletproof, instant SMS and Resend HTML email confirmations.",
    gradient: "from-amber-500 to-rose-500",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-Grade Data Isolation",
    body: "Rigid multi-tenant security with Postgres row-level security on every table. Each workspace is hermetically sealed — your data never crosses tenant boundaries.",
    gradient: "from-emerald-500 to-cyan-500",
  },
];

function Features() {
  return (
    <section id="features" className="relative px-5 sm:px-8 py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-3">
            Why Proc Schedule Wins
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Built for what Calendly forgot.
          </h2>
          <p className="mt-4 text-white/60">
            Generic booking platforms collapse the moment your business gets interesting.
            Proc Schedule was designed from the database up for service teams that refuse to compromise.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, body, gradient }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08 }}
              className={`group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 hover:border-white/20 transition overflow-hidden ${
                i === 3 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <div
                className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl group-hover:opacity-20 transition`}
              />
              <div
                className={`relative inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} shadow-lg mb-4`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2 tracking-tight">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/10 to-transparent p-10 sm:p-14 text-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.2),transparent_60%)]" />
          <div className="relative">
            <h3 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Your storefront, live in 60 seconds.
            </h3>
            <p className="mt-3 text-white/60 max-w-lg mx-auto">
              No credit card. AI designs your brand. We handle the rest.
            </p>
            <Link
              to="/signup"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white text-black px-7 py-3.5 text-sm font-semibold hover:bg-white/90 transition shadow-2xl"
            >
              Launch Your Storefront <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer className="border-t border-white/5 px-5 sm:px-8 py-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center">
            <CalendarRange className="w-3 h-3" />
          </div>
          <span>© 2026 Proc Schedule. Engineered for service teams.</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/login" className="hover:text-white transition">Sign in</Link>
          <Link to="/signup" className="hover:text-white transition">Get started</Link>
        </div>
      </div>
    </footer>
  );
}
