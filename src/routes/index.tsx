import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { CalendarCheck, X } from "lucide-react";
import {
  ArrowRight,
  CalendarRange,
  PlayCircle,
  Palette,
  Repeat,
  ShieldCheck,
  FolderLock,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { getTenantSlugFromHost } from "@/lib/subdomain";
import { TenantStorefrontBySlug } from "./$slug";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ProcSchedule — A Custom Booking Site for Service Professionals" },
      {
        name: "description",
        content:
          "Stop sending clients to a generic calendar. We custom-code a high-converting booking and client-retention site for your business for a flat $100 setup.",
      },
      { property: "og:title", content: "ProcSchedule — Custom Booking Sites for Professionals" },
      {
        property: "og:description",
        content:
          "The ultimate booking and retention engine for consultants, contractors, and creatives. A done-for-you scheduling site for a flat $100 setup.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
    <div className="min-h-screen bg-[#f8f7f4] text-[#141414] selection:bg-[#141414]/10">
      <Nav />
      <Hero />
      <BookingMockup />
      <Features />
      <Footer />
    </div>
  );
}

/* ---------------- Nav ---------------- */
function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#f8f7f4]/80 border-b border-[#141414]/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 rounded-lg bg-[#141414] flex items-center justify-center group-hover:scale-105 transition">
            <CalendarRange className="w-4 h-4 text-[#f8f7f4]" />
          </div>
          <span className="font-semibold tracking-tight text-lg">ProcSchedule</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-[#141414]/60">
          <a href="#features" className="hover:text-[#141414] transition">Features</a>
          <a href="#dashboard" className="hover:text-[#141414] transition">Preview</a>
          <Link to="/pricing" className="hover:text-[#141414] transition">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-[#141414]/70 hover:text-[#141414] transition rounded-lg hover:bg-[#141414]/5"
          >
            Sign In
          </Link>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#141414] text-[#f8f7f4] px-4 py-2 text-sm font-semibold hover:bg-[#141414]/90 transition"
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
    <section className="relative pt-20 sm:pt-28 pb-12 sm:pb-16 px-5 sm:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-4xl sm:text-6xl lg:text-[4.25rem] font-semibold tracking-tight leading-[1.04]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Stop Sending Your Clients to a Generic Calendar.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-[#141414]/60 leading-relaxed"
        >
          The ultimate booking and retention engine for service professionals. Skip the DIY website
          builders—we custom-code a high-converting scheduling site for your business for a flat
          <span className="font-semibold text-[#141414]"> $100 setup.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            to="/onboarding"
            className="group inline-flex items-center gap-2 rounded-xl bg-[#141414] text-[#f8f7f4] px-6 py-3.5 text-sm font-semibold hover:bg-[#141414]/90 hover:scale-[1.02] transition"
          >
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
          </Link>
          <button
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#141414]/15 bg-white hover:bg-[#141414]/5 px-6 py-3.5 text-sm font-semibold transition"
          >
            <PlayCircle className="w-4 h-4" /> Watch Demo
          </button>
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#141414]/45">
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Custom-coded, not a template</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Deposits from day one</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Flat $100 setup</span>
        </div>
      </div>
      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}

/* ---------------- Demo Modal ---------------- */
const DEMO_SCENES = [
  {
    key: "brand",
    label: "01 · Your Branded Site",
    title: "A booking site that looks like your business.",
    caption: "Custom-coded storefront with your colors, fonts, and voice.",
  },
  {
    key: "booking",
    label: "02 · Effortless Booking",
    title: "Clients pick a service and pay a deposit.",
    caption: "Consultations, inspections, and project work — booked in seconds.",
  },
  {
    key: "retention",
    label: "03 · Automatic Follow-Ups",
    title: "The right message at the right moment.",
    caption: "Service-specific rebook nudges keep clients coming back.",
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
      <DialogContent className="max-w-4xl w-[95vw] p-0 border-[#141414]/10 bg-[#f8f7f4] text-[#141414] overflow-hidden [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>ProcSchedule product walkthrough</DialogTitle>
          <DialogDescription>An animated tour of branded sites, booking, and retention.</DialogDescription>
        </VisuallyHidden>

        <div className="relative aspect-video w-full bg-white">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#141414]/10 bg-white text-[#141414]/60 hover:bg-[#141414]/5 hover:text-[#141414] transition"
            aria-label="Close demo"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 rounded-full border border-[#141414]/10 bg-[#f8f7f4] px-3 py-1.5 text-[11px] tracking-wide text-[#141414]/60">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#141414] opacity-40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#141414]" />
            </span>
            {scene.label}
          </div>

          <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.key}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-2xl"
              >
                <DemoScene sceneKey={scene.key} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[#f8f7f4] to-transparent p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.key + "-cap"}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <h3 className="text-lg sm:text-2xl font-semibold tracking-tight">{scene.title}</h3>
                <p className="mt-1 text-xs sm:text-sm text-[#141414]/55">{scene.caption}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 flex items-center gap-2">
              {DEMO_SCENES.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => setIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-[#141414]" : "w-4 bg-[#141414]/20"}`}
                  aria-label={`Go to ${s.label}`}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DemoScene({ sceneKey }: { sceneKey: string }) {
  if (sceneKey === "brand") {
    return (
      <div className="rounded-2xl border border-[#141414]/10 bg-white overflow-hidden shadow-xl">
        <div className="flex items-center gap-1.5 border-b border-[#141414]/10 px-4 py-2.5">
          <span className="ml-1 text-[11px] text-[#141414]/45">procschedule.com/your-business</span>
        </div>
        <div className="px-6 py-8 sm:px-10 sm:py-10" style={{ fontFamily: "Georgia, serif" }}>
          <p className="text-[11px] tracking-[0.2em] text-[#141414]/50">STRATEGY & CONSULTING</p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight"
          >
            Expertise, on your schedule.
          </motion.h2>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#141414] px-5 py-2.5 text-sm font-semibold text-[#f8f7f4]">
            Book a consultation <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    );
  }

  if (sceneKey === "booking") {
    return (
      <div className="rounded-2xl border border-[#141414]/10 bg-white p-5 sm:p-7 shadow-xl">
        <p className="text-xs uppercase tracking-wide text-[#141414]/45">Select a service</p>
        <div className="mt-3 space-y-2">
          {[
            { name: "Strategy Consultation", price: "$250", dur: "60 min" },
            { name: "Site Inspection", price: "$180", dur: "45 min", active: true },
            { name: "Project Review", price: "$320", dur: "90 min" },
          ].map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${s.active ? "border-[#141414] bg-[#141414]/5" : "border-[#141414]/10 bg-white"}`}
            >
              <div>
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-[#141414]/45">{s.dur}</div>
              </div>
              <div className="text-sm font-medium text-[#141414]/80">{s.price}</div>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-[#141414]/55">
          <CalendarCheck className="w-4 h-4" /> Thu · Nov 14 · 2:30 PM
        </div>
      </div>
    );
  }

  // retention
  return (
    <div className="rounded-2xl border border-[#141414]/10 bg-white p-5 sm:p-7 shadow-xl">
      <p className="text-xs uppercase tracking-wide text-[#141414]/45">Automated follow-ups</p>
      <div className="mt-4 space-y-2">
        {[
          { t: "Day 0", msg: "Booking confirmed — deposit received" },
          { t: "Day 1", msg: "Thank-you note + prep details sent" },
          { t: "Day 30", msg: "Service-specific rebook nudge sent" },
          { t: "Day 45", msg: "Review request sent to happy client" },
        ].map((l, i) => (
          <motion.div
            key={l.msg}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.25 }}
            className="flex items-start gap-3 rounded-md border border-[#141414]/10 bg-[#f8f7f4] px-3 py-2 text-sm"
          >
            <span className="text-[#141414]/40 font-medium w-12 shrink-0">{l.t}</span>
            <span className="text-[#141414]/80">{l.msg}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Booking Mockup ---------------- */
function BookingMockup() {
  return (
    <section id="dashboard" className="relative px-4 sm:px-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="max-w-5xl mx-auto"
      >
        <div className="relative rounded-2xl overflow-hidden border border-[#141414]/10 shadow-[0_30px_60px_-20px_rgba(20,20,20,0.25)] bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-[#141414]/10">
            <div>
              <div className="text-xs uppercase tracking-widest text-[#141414]/40">Your schedule</div>
              <div className="text-lg sm:text-xl font-semibold mt-0.5">Upcoming appointments</div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#141414]/50 bg-[#141414]/5 border border-[#141414]/10 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live bookings
            </div>
          </div>

          <div className="grid md:grid-cols-[minmax(0,1fr)_320px]">
            {/* Appointments list */}
            <div className="p-5 sm:p-7 space-y-3 border-b md:border-b-0 md:border-r border-[#141414]/10">
              {LINEUP.map((a, i) => (
                <motion.div
                  key={a.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#f8f7f4] border border-[#141414]/5 hover:border-[#141414]/15 transition"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold bg-[#141414] text-[#f8f7f4]">
                    {a.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{a.service}</div>
                    <div className="text-xs text-[#141414]/45 truncate">{a.name} · {a.time}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </motion.div>
              ))}
            </div>

            {/* Mini calendar */}
            <div className="p-5 sm:p-7">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold">November 2026</div>
                <div className="flex items-center gap-1 text-[#141414]/40">
                  <ChevronLeft className="w-4 h-4" />
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#141414]/40 mb-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                  const active = [12, 14, 21].includes(day);
                  const today = day === 14;
                  return (
                    <div
                      key={day}
                      className={`aspect-square flex items-center justify-center rounded-md ${
                        today
                          ? "bg-[#141414] text-[#f8f7f4] font-semibold"
                          : active
                          ? "bg-[#141414]/10 text-[#141414] font-medium"
                          : "text-[#141414]/55"
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 rounded-xl border border-[#141414]/10 bg-[#f8f7f4] p-4">
                <div className="text-xs uppercase tracking-wide text-[#141414]/40">This week</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">6</span>
                  <span className="text-xs text-[#141414]/50">appointments booked</span>
                </div>
                <div className="mt-1 text-xs text-[#141414]/50">$1,380 in deposits collected</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

const LINEUP = [
  {
    name: "Marcus Bell",
    service: "Strategy Consultation",
    time: "10:00 AM",
    status: "confirmed" as const,
    initials: "MB",
  },
  {
    name: "Dana Okafor",
    service: "Site Inspection",
    time: "12:30 PM",
    status: "confirmed" as const,
    initials: "DO",
  },
  {
    name: "Priya Shah",
    service: "Discovery Call",
    time: "3:00 PM",
    status: "pending" as const,
    initials: "PS",
  },
  {
    name: "Liam Carter",
    service: "Project Review",
    time: "5:15 PM",
    status: "confirmed" as const,
    initials: "LC",
  },
];

function StatusBadge({ status }: { status: "confirmed" | "pending" }) {
  const styles = {
    confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-600/20",
    pending: "bg-amber-500/10 text-amber-700 border-amber-600/20",
  }[status];
  const label = { confirmed: "Confirmed", pending: "Pending" }[status];
  return (
    <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${styles}`}>
      {label}
    </span>
  );
}

/* ---------------- Features ---------------- */
const FEATURES = [
  {
    icon: Palette,
    title: "The Done-For-You Booking Site",
    body: "No clunky templates or coding required. We build you a fully branded, conversion-optimized storefront ready to accept deposits on day one.",
  },
  {
    icon: Repeat,
    title: "Smart Lifecycle Automations",
    body: "Trigger automated follow-ups based on the exact service booked, creating a seamless sales machine that brings clients back.",
  },
  {
    icon: ShieldCheck,
    title: "Strict No-Show Protection",
    body: "Dynamic deposit rules that adapt to client history. Automatically require 100% upfront payments from clients with a history of late cancellations.",
  },
  {
    icon: FolderLock,
    title: "Secure Client Portfolios",
    body: "Keep comprehensive records, project files, and private notes attached directly to the client's booking profile.",
  },
];

function Features() {
  return (
    <section id="features" className="relative px-5 sm:px-8 py-24 border-t border-[#141414]/10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs uppercase tracking-widest text-[#141414]/45 mb-3">
            Why ProcSchedule
          </div>
          <h2
            className="text-3xl sm:text-5xl font-semibold tracking-tight"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Everything you need to book and retain clients.
          </h2>
          <p className="mt-4 text-[#141414]/60">
            A custom booking site plus the retention tools that turn one-time appointments into
            loyal, repeat clients — built for consultants, contractors, and creatives.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.08 }}
              className="group relative rounded-2xl border border-[#141414]/10 bg-white p-7 hover:border-[#141414]/25 hover:shadow-[0_20px_40px_-24px_rgba(20,20,20,0.3)] transition"
            >
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#141414] mb-4">
                <Icon className="w-5 h-5 text-[#f8f7f4]" />
              </div>
              <h3 className="text-lg font-semibold mb-2 tracking-tight">{title}</h3>
              <p className="text-sm text-[#141414]/60 leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 relative rounded-3xl overflow-hidden bg-[#141414] text-[#f8f7f4] p-10 sm:p-14 text-center"
        >
          <div className="relative">
            <h3
              className="text-3xl sm:text-4xl font-semibold tracking-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Your custom booking site, built for a flat $100 setup.
            </h3>
            <p className="mt-3 text-[#f8f7f4]/70 max-w-lg mx-auto">
              Skip the DIY builders. We design, code, and launch a high-converting scheduling site
              for your business — you just start taking bookings.
            </p>
            <Link
              to="/onboarding"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#f8f7f4] text-[#141414] px-7 py-3.5 text-sm font-semibold hover:bg-white transition"
            >
              Get Started <ArrowRight className="w-4 h-4" />
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
    <footer className="border-t border-[#141414]/10 px-5 sm:px-8 py-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#141414]/45">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#141414] flex items-center justify-center">
            <CalendarRange className="w-3 h-3 text-[#f8f7f4]" />
          </div>
          <span>© 2026 ProcSchedule. Booking & retention for service professionals.</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/login" className="hover:text-[#141414] transition">Sign in</Link>
          <Link to="/pricing" className="hover:text-[#141414] transition">Pricing</Link>
          <Link to="/onboarding" className="hover:text-[#141414] transition">Get started</Link>
        </div>
      </div>
    </footer>
  );
}
