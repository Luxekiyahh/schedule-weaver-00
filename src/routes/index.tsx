import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { CalendarCheck, X } from "lucide-react";
import { ArrowRight, PlayCircle, Palette, Repeat, ShieldCheck, FolderLock } from "lucide-react";
import { getTenantSlugFromHost } from "@/lib/subdomain";
import { TenantStorefrontBySlug } from "./$slug";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ProcSchedule — Scheduling, Refined" },
      {
        name: "description",
        content:
          "A boutique booking and retention engine for service professionals. Custom-coded, deposits from day one, flat $100 setup.",
      },
      { property: "og:title", content: "ProcSchedule — Scheduling, Refined" },
      {
        property: "og:description",
        content:
          "A bespoke booking OS for consultants, contractors, and creatives. Custom-coded, deposits from day one, flat $100 setup.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/* ---------------- Brand tokens (locked) ----------------
   ink-950 #0A090B · ink-900 #141216 · ink-800 #1A181C · line #33302A
   gold-100 #E7C989 · gold-500 #C9A15A · gold-700 #9C7A3C
   parchment #F3EEE6 · muted #9C9488
--------------------------------------------------------- */

function Landing() {
  const [tenantSlug, setTenantSlug] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setTenantSlug(getTenantSlugFromHost());
  }, []);

  if (tenantSlug === undefined) return null;
  if (tenantSlug) return <TenantStorefrontBySlug slug={tenantSlug} />;

  return (
    <div
      className="min-h-screen text-[#9C9488] font-[Montserrat,'Century_Gothic','Avenir_Next',sans-serif] selection:bg-[#C9A15A]/30 selection:text-[#F3EEE6] overflow-x-hidden"
      style={{ background: "linear-gradient(180deg, #141216 0%, #0A090B 100%)" }}
    >
      <Nav />
      <Hero />
      <Pillars />
      <BookingMockup />
      <Features />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ---------------- Signet (P + clock) ---------------- */
function Signet({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sg-gold" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E7C989" />
          <stop offset="0.5" stopColor="#C9A15A" />
          <stop offset="1" stopColor="#9C7A3C" />
        </linearGradient>
      </defs>
      <rect x="186" y="152" width="36" height="228" rx="18" fill="url(#sg-gold)" />
      <circle cx="262" cy="222" r="70" fill="#0E0C0D" stroke="url(#sg-gold)" strokeWidth="15" />
      <circle cx="262" cy="158" r="3.4" fill="#C9A15A" />
      <circle cx="326" cy="222" r="3.4" fill="#C9A15A" />
      <circle cx="262" cy="286" r="3.4" fill="#C9A15A" />
      <circle cx="198" cy="222" r="3.4" fill="#C9A15A" />
      <line x1="262" y1="222" x2="262" y2="184" stroke="url(#sg-gold)" strokeWidth="9" strokeLinecap="round" />
      <line x1="262" y1="222" x2="292" y2="203" stroke="url(#sg-gold)" strokeWidth="9" strokeLinecap="round" />
      <circle cx="262" cy="222" r="7" fill="#E7C989" />
    </svg>
  );
}

function Wordmark({ size = "text-sm" }: { size?: string }) {
  return (
    <span
      className={`uppercase font-semibold tracking-[0.25em] ${size}`}
      style={{ fontFamily: "Montserrat, 'Century Gothic', 'Avenir Next', sans-serif" }}
    >
      <span
        className="font-semibold"
        style={{
          background: "linear-gradient(to right, #E7C989, #C9A15A, #9C7A3C)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        PROC
      </span>
      <span className="ml-1 text-[#F3EEE6] font-normal">SCHEDULE</span>
    </span>
  );
}

/* ---------------- Nav ---------------- */
function Nav() {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl border-b border-[#33302A]/60"
      style={{ background: "rgba(10,9,11,0.75)" }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-[10px] bg-[#1A181C] border border-[#33302A] flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] group-hover:border-[#9C7A3C] transition">
            <Signet className="w-5 h-5" />
          </div>
          <Wordmark />
        </Link>
        <nav className="hidden md:flex items-center gap-9 text-[11px] uppercase tracking-[0.2em] text-[#9C9488]">
          <a href="#features" className="hover:text-[#F3EEE6] transition">Features</a>
          <a href="#dashboard" className="hover:text-[#F3EEE6] transition">Preview</a>
          <Link to="/pricing" className="hover:text-[#F3EEE6] transition">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-[#9C9488] hover:text-[#F3EEE6] transition rounded-md"
          >
            Sign In
          </Link>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[11px] uppercase tracking-[0.2em] font-bold text-[#0A090B] hover:brightness-110 transition"
            style={{ background: "linear-gradient(to right, #E7C989, #C9A15A, #9C7A3C)" }}
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
    <section className="relative px-5 sm:px-8 pt-20 sm:pt-28 pb-16 overflow-hidden">
      {/* Ticking clock watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-start justify-center opacity-[0.06]">
        <div className="relative w-[720px] h-[720px] rounded-full border border-[#E7C989]/30 mt-16">
          <div
            className="absolute top-1/2 left-1/2 w-px h-[300px] bg-[#E7C989] origin-top -translate-x-1/2"
            style={{ animation: "ps-tick 60s linear infinite" }}
          />
          <div
            className="absolute top-1/2 left-1/2 w-px h-[220px] bg-[#E7C989]/60 origin-top -translate-x-1/2"
            style={{ animation: "ps-tick 8s linear infinite" }}
          />
        </div>
      </div>

      <div className="relative max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Signet plinth */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 w-20 h-20 rounded-[22%] bg-[#1A181C] border border-[#33302A] flex items-center justify-center shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]"
        >
          <Signet className="w-11 h-11" />
        </motion.div>

        {/* Tagline */}
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.45em] font-medium text-[#C9A15A] mb-6">
          Scheduling, Refined
        </p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[#F3EEE6] text-4xl sm:text-5xl lg:text-6xl font-light leading-[1.1] tracking-tight max-w-3xl"
        >
          A booking engine as considered as the service you deliver.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 max-w-2xl text-base sm:text-lg text-[#9C9488] leading-relaxed font-light"
        >
          Stop routing clients through a generic calendar. We custom-code a boutique booking &
          retention site for your business — deposits from day one, for a flat
          <span className="text-[#F3EEE6] font-medium"> $100 setup.</span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-3"
        >
          <Link
            to="/onboarding"
            className="group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[11px] uppercase tracking-[0.25em] font-bold text-[#0A090B] hover:brightness-110 transition shadow-[0_20px_60px_-15px_rgba(201,161,90,0.4)]"
            style={{ background: "linear-gradient(to right, #E7C989, #C9A15A, #9C7A3C)" }}
          >
            Begin Setup
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </Link>
          <button
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#33302A] bg-[#1A181C]/60 hover:border-[#9C7A3C] hover:text-[#F3EEE6] px-8 py-3.5 text-[11px] uppercase tracking-[0.25em] font-medium text-[#9C9488] transition"
          >
            <PlayCircle className="w-4 h-4" /> Watch Demo
          </button>
        </motion.div>

        {/* Trust hairline */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[10px] uppercase tracking-[0.3em] text-[#9C9488]/80">
          <TrustItem>Custom-coded, not a template</TrustItem>
          <span className="h-3 w-px bg-[#33302A]" />
          <TrustItem>Deposits from day one</TrustItem>
          <span className="h-3 w-px bg-[#33302A]" />
          <TrustItem>Flat $100 setup</TrustItem>
        </div>
      </div>

      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />

      {/* Local keyframes */}
      <style>{`
        @keyframes ps-tick { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
        @keyframes ps-tick-step { 0%,24% { transform: rotate(0deg) } 25%,49% { transform: rotate(90deg) } 50%,74% { transform: rotate(180deg) } 75%,100% { transform: rotate(270deg) } }
      `}</style>
    </section>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-1 h-1 rounded-full bg-[#C9A15A]" />
      {children}
    </span>
  );
}

/* ---------------- Pillars ---------------- */
function Pillars() {
  const items = [
    { k: "Structure", t: "Flat $100 setup", b: "One transparent initiation fee. We design, code, and launch your bespoke scheduling environment — no hidden layers." },
    { k: "Cashflow", t: "Deposits from day one", b: "Every appointment is backed by a deposit. Protect your calendar and your craft with intelligent no-show rules." },
    { k: "Aesthetic", t: "A boutique OS", b: "A quiet, high-end interface that mirrors the premium nature of your service — never template-SaaS clutter." },
  ];
  return (
    <section className="relative px-5 sm:px-8 py-24 border-t border-[#33302A]/60">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12 md:gap-16">
        {items.map((it, i) => (
          <motion.div
            key={it.t}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: i * 0.1 }}
            className="space-y-5"
          >
            <span
              className="text-[10px] tracking-[0.4em] uppercase font-bold"
              style={{
                background: "linear-gradient(to right, #E7C989, #C9A15A, #9C7A3C)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {it.k}
            </span>
            <h3 className="text-2xl text-[#F3EEE6] font-light tracking-tight">{it.t}</h3>
            <p className="text-sm leading-relaxed text-[#9C9488]">{it.b}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Booking Mockup ---------------- */
function BookingMockup() {
  return (
    <section id="dashboard" className="relative px-4 sm:px-8 pb-24 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="max-w-5xl mx-auto"
      >
        <div className="relative">
          {/* Gold hairline plinth */}
          <div className="absolute -inset-px rounded-2xl pointer-events-none opacity-40"
               style={{ background: "linear-gradient(180deg, rgba(201,161,90,0.35), transparent)" }} />
          <div className="relative rounded-2xl overflow-hidden border border-[#33302A] bg-[#0F0D11] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-[#33302A]">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-[#9C9488]">Your schedule</div>
                <div className="text-lg sm:text-xl font-light text-[#F3EEE6] mt-1">Upcoming appointments</div>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#9C9488] bg-[#141216] border border-[#33302A] px-3 py-1.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live bookings
              </div>
            </div>

            <div className="grid md:grid-cols-[minmax(0,1fr)_320px]">
              {/* Appointments list */}
              <div className="p-5 sm:p-7 space-y-3 border-b md:border-b-0 md:border-r border-[#33302A]">
                {LINEUP.map((a, i) => (
                  <motion.div
                    key={a.name}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#141216] border border-[#33302A] hover:border-[#9C7A3C]/60 transition"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-[#0A090B]"
                      style={{ background: "linear-gradient(135deg, #E7C989, #9C7A3C)" }}
                    >
                      {a.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-[#F3EEE6] text-sm">{a.service}</div>
                      <div className="text-[11px] text-[#9C9488] truncate tracking-wide">{a.name} · {a.time}</div>
                    </div>
                    <StatusBadge status={a.status} />
                  </motion.div>
                ))}
              </div>

              {/* Mini calendar */}
              <div className="p-5 sm:p-7">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-[#F3EEE6] tracking-wide">November 2026</div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-[#9C9488]/70 mb-1">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
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
                            ? "text-[#0A090B] font-semibold"
                            : active
                            ? "bg-[#C9A15A]/10 text-[#F3EEE6] font-medium border border-[#C9A15A]/30"
                            : "text-[#9C9488]/70"
                        }`}
                        style={today ? { background: "linear-gradient(135deg, #E7C989, #C9A15A)" } : undefined}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 rounded-xl border border-[#33302A] bg-[#141216] p-4">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-[#9C9488]">This week</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-light text-[#F3EEE6]">6</span>
                    <span className="text-[11px] text-[#9C9488]">appointments booked</span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#C9A15A]">$1,380 in deposits collected</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bracket accent */}
          <div className="absolute -bottom-5 -right-5 w-24 h-24 border-r border-b border-[#C9A15A]/40 rounded-br-2xl pointer-events-none" />
        </div>
      </motion.div>
    </section>
  );
}

const LINEUP = [
  { name: "Marcus Bell", service: "Strategy Consultation", time: "10:00 AM", status: "confirmed" as const, initials: "MB" },
  { name: "Dana Okafor", service: "Site Inspection", time: "12:30 PM", status: "confirmed" as const, initials: "DO" },
  { name: "Priya Shah", service: "Discovery Call", time: "3:00 PM", status: "pending" as const, initials: "PS" },
  { name: "Liam Carter", service: "Project Review", time: "5:15 PM", status: "confirmed" as const, initials: "LC" },
];

function StatusBadge({ status }: { status: "confirmed" | "pending" }) {
  const styles = {
    confirmed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    pending: "bg-[#C9A15A]/10 text-[#E7C989] border-[#C9A15A]/40",
  }[status];
  const label = { confirmed: "Confirmed", pending: "Pending" }[status];
  return (
    <span className={`text-[9px] uppercase tracking-[0.2em] font-medium px-2.5 py-1 rounded-full border ${styles}`}>
      {label}
    </span>
  );
}

/* ---------------- Features ---------------- */
const FEATURES = [
  { icon: Palette, title: "The Done-For-You Booking Site", body: "No clunky templates or coding required. We build a fully branded, conversion-optimized storefront ready to accept deposits on day one." },
  { icon: Repeat, title: "Smart Lifecycle Automations", body: "Trigger service-specific follow-ups automatically — a quiet retention engine that brings clients back at the right moment." },
  { icon: ShieldCheck, title: "Strict No-Show Protection", body: "Dynamic deposit rules that adapt to client history. Require 100% upfront from clients with a pattern of late cancellations." },
  { icon: FolderLock, title: "Secure Client Portfolios", body: "Records, project files, and private notes attached directly to each client's booking profile — quietly organized." },
];

function Features() {
  return (
    <section id="features" className="relative px-5 sm:px-8 py-24 border-t border-[#33302A]/60">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-[10px] uppercase tracking-[0.4em] text-[#C9A15A] mb-4">
            Why ProcSchedule
          </div>
          <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-[#F3EEE6] leading-[1.1]">
            Everything you need to book &amp; retain clients.
          </h2>
          <p className="mt-5 text-[#9C9488] font-light">
            A custom booking site paired with retention tools that turn one-time appointments into
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
              className="group relative rounded-2xl border border-[#33302A] bg-[#141216] p-7 hover:border-[#9C7A3C]/70 hover:shadow-[0_30px_60px_-30px_rgba(201,161,90,0.25)] transition"
            >
              <div
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-5 border border-[#33302A] bg-[#1A181C]"
              >
                <Icon className="w-5 h-5 text-[#C9A15A]" />
              </div>
              <h3 className="text-lg font-medium mb-2 tracking-tight text-[#F3EEE6]">{title}</h3>
              <p className="text-sm text-[#9C9488] leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCta() {
  return (
    <section className="px-5 sm:px-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-5xl mx-auto relative rounded-3xl overflow-hidden border border-[#33302A] p-10 sm:p-16 text-center"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(201,161,90,0.12), transparent 60%), #0F0D11" }}
      >
        <div className="mx-auto w-14 h-14 rounded-[22%] bg-[#1A181C] border border-[#33302A] flex items-center justify-center mb-8">
          <Signet className="w-8 h-8" />
        </div>
        <h3 className="text-3xl sm:text-4xl font-light tracking-tight text-[#F3EEE6] leading-tight">
          Your custom booking site — built for a flat $100 setup.
        </h3>
        <p className="mt-4 text-[#9C9488] max-w-lg mx-auto font-light">
          Skip the DIY builders. We design, code, and launch a high-converting scheduling site for
          your business — you just start taking bookings.
        </p>
        <Link
          to="/onboarding"
          className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[11px] uppercase tracking-[0.25em] font-bold text-[#0A090B] hover:brightness-110 transition"
          style={{ background: "linear-gradient(to right, #E7C989, #C9A15A, #9C7A3C)" }}
        >
          Begin Setup <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer className="border-t border-[#33302A]/60 px-5 sm:px-8 py-10">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-[0.25em] text-[#9C9488]/70">
        <div className="flex items-center gap-3">
          <Signet className="w-5 h-5" />
          <span>© 2026 ProcSchedule · Scheduling, refined.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/login" className="hover:text-[#F3EEE6] transition">Sign in</Link>
          <Link to="/pricing" className="hover:text-[#F3EEE6] transition">Pricing</Link>
          <Link to="/onboarding" className="hover:text-[#F3EEE6] transition">Get started</Link>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Demo Modal ---------------- */
const DEMO_SCENES = [
  { key: "brand", label: "01 · Your Branded Site", title: "A booking site that looks like your business.", caption: "Custom-coded storefront with your colors, fonts, and voice." },
  { key: "booking", label: "02 · Effortless Booking", title: "Clients pick a service and pay a deposit.", caption: "Consultations, inspections, and project work — booked in seconds." },
  { key: "retention", label: "03 · Automatic Follow-Ups", title: "The right message at the right moment.", caption: "Service-specific rebook nudges keep clients coming back." },
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
      <DialogContent className="max-w-4xl w-[95vw] p-0 border-[#33302A] bg-[#0F0D11] text-[#F3EEE6] overflow-hidden [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>ProcSchedule product walkthrough</DialogTitle>
          <DialogDescription>An animated tour of branded sites, booking, and retention.</DialogDescription>
        </VisuallyHidden>

        <div className="relative aspect-video w-full bg-[#0A090B]">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#33302A] bg-[#141216] text-[#9C9488] hover:text-[#F3EEE6] hover:border-[#9C7A3C] transition"
            aria-label="Close demo"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 rounded-full border border-[#33302A] bg-[#141216] px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-[#9C9488]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C9A15A] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#C9A15A]" />
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

          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[#0A090B] to-transparent p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.key + "-cap"}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <h3 className="text-lg sm:text-2xl font-light tracking-tight text-[#F3EEE6]">{scene.title}</h3>
                <p className="mt-1 text-xs sm:text-sm text-[#9C9488]">{scene.caption}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 flex items-center gap-2">
              {DEMO_SCENES.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => setIdx(i)}
                  className={`h-1 rounded-full transition-all ${i === idx ? "w-8 bg-[#C9A15A]" : "w-4 bg-[#33302A]"}`}
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
      <div className="rounded-2xl border border-[#33302A] bg-[#141216] overflow-hidden shadow-xl">
        <div className="flex items-center gap-1.5 border-b border-[#33302A] px-4 py-2.5">
          <span className="ml-1 text-[10px] uppercase tracking-[0.25em] text-[#9C9488]">procschedule.com/your-business</span>
        </div>
        <div className="px-6 py-10 sm:px-10">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#C9A15A]">Strategy & Consulting</p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-3xl sm:text-4xl font-light leading-tight text-[#F3EEE6]"
          >
            Expertise, on your schedule.
          </motion.h2>
          <div
            className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] font-bold text-[#0A090B]"
            style={{ background: "linear-gradient(to right, #E7C989, #C9A15A, #9C7A3C)" }}
          >
            Book a consultation <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    );
  }

  if (sceneKey === "booking") {
    return (
      <div className="rounded-2xl border border-[#33302A] bg-[#141216] p-5 sm:p-7 shadow-xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#9C9488]">Select a service</p>
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
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${s.active ? "border-[#C9A15A]/60 bg-[#C9A15A]/5" : "border-[#33302A] bg-[#0F0D11]"}`}
            >
              <div>
                <div className="text-sm font-medium text-[#F3EEE6]">{s.name}</div>
                <div className="text-[11px] text-[#9C9488]">{s.dur}</div>
              </div>
              <div className="text-sm font-medium text-[#E7C989]">{s.price}</div>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-[11px] text-[#9C9488]">
          <CalendarCheck className="w-4 h-4 text-[#C9A15A]" /> Thu · Nov 14 · 2:30 PM
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#33302A] bg-[#141216] p-5 sm:p-7 shadow-xl">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#9C9488]">Automated follow-ups</p>
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
            className="flex items-start gap-3 rounded-md border border-[#33302A] bg-[#0F0D11] px-3 py-2 text-sm"
          >
            <span className="text-[#C9A15A] font-medium w-14 shrink-0 text-[11px] uppercase tracking-[0.2em]">{l.t}</span>
            <span className="text-[#F3EEE6]/85">{l.msg}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
