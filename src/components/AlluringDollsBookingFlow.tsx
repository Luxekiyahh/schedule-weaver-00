import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  
  Loader2,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * ALLURING DOLLS — bespoke booking-flow skin.
 *
 * Mirrors the exact same 4-step shape (Service → Provider → Time → Details)
 * as the shared /booking/$slug flow, with all data-fetching, slot logic,
 * and submission handled by the parent (BookingPage in booking.$slug.tsx)
 * — this component only owns presentation. That keeps the shared booking
 * engine completely untouched for every other tenant.
 */

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  category_id: string | null;
  image_url: string | null;
};
type Category = { id: string; name: string; description?: string | null; image_url?: string | null };
type LengthOption = { id: string; name: string; price_cents: number; duration_min: number };
type HairColor = { id: string; code: string; label: string | null; swatch_hex: string | null };
type Provider = { member_id: string; name: string };
type Slot = { time: string; member_id: string };

const ANY = "__any__";

function money(cents: number, ccy = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(cents / 100);
}
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const STEP_LABELS = ["Service", "Provider", "Time", "Details"];

export function AlluringDollsBookingFlow({
  workspaceName,
  services,
  categories,
  lengthOptions,
  hairColors,
  selectedColorId,
  setSelectedColorId,
  selectedAddOns,
  setSelectedAddOns,
  addOnTotalCents,
  depositRequired,
  eligibleProviders,
  step,
  setStep,
  serviceId,
  setServiceId,
  providerId,
  setProviderId,
  monthCursor,
  setMonthCursor,
  selectedDate,
  setSelectedDate,
  slotsLoading,
  slots,
  selectedSlot,
  setSelectedSlot,
  form,
  setForm,
  submitting,
  done,
  onSubmit,
}: {
  workspaceName: string;
  services: Service[];
  categories: Category[];
  lengthOptions: LengthOption[];
  hairColors: HairColor[];
  selectedColorId: string | null;
  setSelectedColorId: (id: string | null) => void;
  selectedAddOns: string[];
  setSelectedAddOns: (updater: (prev: string[]) => string[]) => void;
  addOnTotalCents: number;
  depositRequired: boolean;
  eligibleProviders: Provider[];
  step: number;
  setStep: (n: number) => void;
  serviceId: string | null;
  setServiceId: (id: string) => void;
  providerId: string;
  setProviderId: (id: string) => void;
  monthCursor: Date;
  setMonthCursor: (d: Date) => void;
  selectedDate: string | null;
  setSelectedDate: (d: string) => void;
  slotsLoading: boolean;
  slots: Slot[];
  selectedSlot: Slot | null;
  setSelectedSlot: (s: Slot) => void;
  form: { firstName: string; lastName: string; email: string; phone: string; notes: string };
  setForm: (f: { firstName: string; lastName: string; email: string; phone: string; notes: string }) => void;
  submitting: boolean;
  done: { start_at: string } | null;
  onSubmit: () => void;
}) {
  const service = services.find((s) => s.id === serviceId) ?? null;


  return (
    <div className="ad-root relative min-h-screen overflow-clip">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap"
      />
      <style>{`
        .ad-root {
          --ad-bg: #090809;
          --ad-bg2: #151214;
          --ad-gold: #CDA45B;
          --ad-gold-2: #B98B47;
          --ad-gold-bright: #F3E0AD;
          --ad-ivory: #F8F5EF;
          --ad-smoke: #C8B7A0;
          --ad-border: rgba(205,164,91,.25);
          --ad-glow: rgba(205,164,91,.18);
          background-color: var(--ad-bg);
          color: var(--ad-ivory);
          font-family: 'Inter', system-ui, sans-serif;
          isolation: isolate;
        }
        .ad-lighting {
          position: fixed; inset: 0; z-index: -2; pointer-events: none;
          background:
            radial-gradient(120% 55% at 50% -8%, rgba(205,164,91,.14), transparent 60%),
            radial-gradient(90% 60% at 92% 8%, rgba(185,139,71,.10), transparent 55%),
            radial-gradient(90% 70% at 8% 100%, rgba(205,164,91,.08), transparent 60%),
            radial-gradient(140% 120% at 50% 50%, transparent 55%, rgba(0,0,0,.65) 100%);
        }
        .ad-leopard {
          position: fixed; inset: -20%; z-index: -1; pointer-events: none; opacity: .5;
          filter: blur(0.8px) contrast(1.15);
          background-image:
            radial-gradient(38px 30px at 12% 18%, rgba(120,92,54,.55), rgba(120,92,54,0) 70%),
            radial-gradient(20px 16px at 12% 18%, rgba(20,16,12,.95), rgba(20,16,12,0) 72%),
            radial-gradient(44px 34px at 42% 34%, rgba(132,102,60,.5), rgba(132,102,60,0) 70%),
            radial-gradient(22px 18px at 42% 34%, rgba(20,16,12,.95), rgba(20,16,12,0) 72%),
            radial-gradient(40px 32px at 74% 22%, rgba(120,92,54,.5), rgba(120,92,54,0) 70%),
            radial-gradient(20px 16px at 74% 22%, rgba(20,16,12,.95), rgba(20,16,12,0) 72%),
            radial-gradient(48px 36px at 88% 56%, rgba(132,102,60,.48), rgba(132,102,60,0) 70%),
            radial-gradient(24px 18px at 88% 56%, rgba(20,16,12,.95), rgba(20,16,12,0) 72%),
            radial-gradient(42px 34px at 24% 62%, rgba(120,92,54,.5), rgba(120,92,54,0) 70%),
            radial-gradient(21px 17px at 24% 62%, rgba(20,16,12,.95), rgba(20,16,12,0) 72%),
            radial-gradient(46px 36px at 58% 78%, rgba(132,102,60,.48), rgba(132,102,60,0) 70%),
            radial-gradient(23px 18px at 58% 78%, rgba(20,16,12,.95), rgba(20,16,12,0) 72%);
          background-size: 420px 420px;
          background-repeat: repeat;
        }
        .ad-display { font-family: 'Cinzel', serif; text-transform: uppercase; letter-spacing: 0.12em; }
        .ad-serif { font-family: 'Cormorant Garamond', serif; }
        .ad-chrome {
          background: linear-gradient(100deg, var(--ad-gold-2) 0%, var(--ad-gold) 34%, var(--ad-gold-bright) 50%, var(--ad-gold) 66%, var(--ad-gold-2) 100%);
          background-size: 280% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          text-shadow: 0 1px 0 rgba(0,0,0,.5), 0 0 24px rgba(205,164,91,.18);
          animation: ad-sweep 6s ease-in-out infinite;
        }
        @keyframes ad-sweep { 0% { background-position: 100% 0; } 50% { background-position: 0% 0; } 100% { background-position: 100% 0; } }
        @media (prefers-reduced-motion: reduce) { .ad-chrome { animation: none; background-position: 0% 0; } }
        .ad-card {
          background: linear-gradient(160deg, rgba(255,255,255,.03), transparent 40%), linear-gradient(180deg, var(--ad-bg2), color-mix(in oklab, var(--ad-bg2) 88%, #000 12%));
          border: 1px solid var(--ad-border); border-radius: 22px;
          box-shadow: 0 24px 60px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.04);
        }
        .ad-row {
          background: linear-gradient(160deg, rgba(255,255,255,.03), transparent 45%), linear-gradient(180deg, var(--ad-bg2), color-mix(in oklab, var(--ad-bg2) 86%, #000 14%));
          border: 1px solid var(--ad-border); border-radius: 16px;
          transition: border-color .3s ease, transform .3s ease, box-shadow .3s ease;
        }
        .ad-row:hover { border-color: color-mix(in oklab, var(--ad-gold) 60%, transparent); transform: translateY(-2px); box-shadow: 0 20px 44px -26px rgba(0,0,0,.9), 0 0 32px -14px var(--ad-glow); }
        .ad-row[data-active="true"] { border-color: var(--ad-gold); box-shadow: 0 0 0 1px color-mix(in oklab, var(--ad-gold) 40%, transparent), 0 0 34px -12px var(--ad-glow); }
        .ad-input {
          background: color-mix(in oklab, var(--ad-bg2) 90%, transparent) !important;
          border-color: var(--ad-border) !important; color: var(--ad-ivory) !important;
          border-radius: 12px !important; transition: border-color .25s ease, box-shadow .25s ease !important;
        }
        .ad-input::placeholder { color: var(--ad-smoke); }
        .ad-input:focus, .ad-input:focus-visible {
          border-color: var(--ad-gold) !important;
          box-shadow: 0 0 0 3px rgba(205,164,91,.18) !important; outline: none !important;
        }
        .ad-label { text-transform: uppercase; letter-spacing: 0.22em; font-size: 10.5px; color: var(--ad-smoke); }
        .ad-cta-btn {
          background: linear-gradient(180deg, var(--ad-gold-bright), var(--ad-gold) 45%, var(--ad-gold-2)) !important;
          color: #1a1108 !important; border: none !important; border-radius: 999px !important;
          box-shadow: 0 14px 34px -14px rgba(205,164,91,.55), inset 0 1px 0 rgba(255,255,255,.5) !important;
          transition: transform .3s ease, box-shadow .3s ease, filter .3s ease !important;
        }
        .ad-cta-btn:hover { transform: translateY(-2px); filter: brightness(1.04); box-shadow: 0 20px 48px -14px rgba(205,164,91,.7), 0 0 48px -10px var(--ad-glow), inset 0 1px 0 rgba(255,255,255,.6) !important; }
        .ad-ghost-btn { color: var(--ad-smoke) !important; border-radius: 999px !important; }
        .ad-ghost-btn:hover { color: var(--ad-ivory) !important; background: transparent !important; }
      `}</style>

      <div className="ad-lighting" aria-hidden />
      <div className="ad-leopard" aria-hidden />


      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        {/* Header */}
        <header className="text-center">
          <div
            className="ad-eyebrow"
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              fontSize: "10px",
              color: "var(--ad-smoke)",
            }}
          >
            Book Online
          </div>
          <h1 className="ad-display ad-chrome text-4xl sm:text-5xl mt-4">
            {workspaceName}
          </h1>

        </header>

        {/* Stepper */}
        {!done && (
          <div className="mt-9 flex items-center justify-center gap-2">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const complete = step > n;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition"
                    style={{
                      backgroundColor: complete || active ? "var(--ad-gold)" : "transparent",
                      color: complete || active ? "#1a1108" : "var(--ad-smoke)",
                      border: complete || active ? "none" : "1px solid var(--ad-border)",
                    }}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : n}
                  </div>
                  <span
                    className="hidden text-[11px] uppercase tracking-[0.15em] sm:inline"
                    style={{ color: active ? "var(--ad-ivory)" : "var(--ad-smoke)" }}
                  >
                    {label}
                  </span>
                  {n < STEP_LABELS.length && (
                    <div
                      className="h-px w-6 sm:w-8"
                      style={{ backgroundColor: "var(--ad-border)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation */}
        {done ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ad-card mt-10 p-10 text-center"
          >
            <div
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full"
              style={{
                backgroundColor: "color-mix(in oklab, var(--ad-gold) 18%, transparent)",
                border: "1px solid var(--ad-border)",
              }}
            >
              <Check className="h-7 w-7" style={{ color: "var(--ad-gold)" }} />
            </div>
            <h2 className="ad-display text-2xl" style={{ color: "var(--ad-gold)" }}>
              You're Booked
            </h2>
            <p className="mt-3 text-sm" style={{ color: "var(--ad-ivory)" }}>
              {new Date(done.start_at).toLocaleString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZone: "UTC",
              })}
            </p>
            <p className="mt-3 text-sm" style={{ color: "var(--ad-smoke)" }}>
              We just texted {form.phone || "your phone"}. Reply <strong>YES</strong> (with the code in the message) to confirm your appointment. A confirmation email will go to {form.email} once confirmed.
            </p>
            <p className="mt-6 text-xs leading-relaxed" style={{ color: "var(--ad-smoke)" }}>
              A $25 non-refundable deposit secures your spot — remaining balance is cash only. Come
              with hair completely blown out, dry &amp; product-free. You're allowed 15 minutes
              grace; after that the appointment may be rescheduled or canceled.
            </p>
          </motion.div>
        ) : (
          <div className="ad-card mt-8 overflow-hidden">
            <AnimatePresence mode="wait">
              {/* STEP 1: Service */}
              {step === 1 && (
                <motion.div
                  key="s1"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                  className="p-6 sm:p-8"
                >
                  <h2 className="ad-display text-lg" style={{ color: "var(--ad-gold)" }}>
                    Choose a Service
                  </h2>
                  {services.length === 0 ? (
                    <p className="mt-6 text-sm" style={{ color: "var(--ad-smoke)" }}>
                      No services available yet.
                    </p>
                  ) : (
                    <div className="mt-5">
                      <AdCategoryAccordion
                        services={services}
                        categories={categories}
                        selectedId={serviceId}
                        onSelect={(id) => {
                          setServiceId(id);
                          setProviderId(ANY);
                        }}
                      />
                    </div>
                  )}
                  <div className="mt-6 flex justify-end">
                    <Button disabled={!serviceId} onClick={() => setStep(2)} className="ad-cta-btn">
                      Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Provider */}
              {step === 2 && (
                <motion.div
                  key="s2"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                  className="p-6 sm:p-8"
                >
                  <h2 className="ad-display text-lg" style={{ color: "var(--ad-gold)" }}>
                    Choose a Stylist
                  </h2>
                  <div className="mt-5 space-y-3">
                    <AdProviderRow
                      icon={<Users className="h-4 w-4" />}
                      name="Any available stylist"
                      description="We'll match you with the first open slot."
                      active={providerId === ANY}
                      onClick={() => setProviderId(ANY)}
                    />
                    {eligibleProviders.length === 0 ? (
                      <p className="text-sm" style={{ color: "var(--ad-smoke)" }}>
                        No stylists linked to this service yet.
                      </p>
                    ) : (
                      eligibleProviders.map((p) => (
                        <AdProviderRow
                          key={p.member_id}
                          icon={<User className="h-4 w-4" />}
                          name={p.name}
                          active={providerId === p.member_id}
                          onClick={() => setProviderId(p.member_id)}
                        />
                      ))
                    )}
                  </div>
                  <AdFooterNav
                    onBack={() => setStep(1)}
                    onNext={() => setStep(3)}
                    nextDisabled={eligibleProviders.length === 0 && providerId === ANY}
                  />
                </motion.div>
              )}

              {/* STEP 3: Date & Time */}
              {step === 3 && (
                <motion.div
                  key="s3"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                  className="p-6 sm:p-8"
                >
                  <h2 className="ad-display text-lg" style={{ color: "var(--ad-gold)" }}>
                    Pick a Date &amp; Time
                  </h2>
                  <AdMonthCalendar
                    cursor={monthCursor}
                    setCursor={setMonthCursor}
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                  />
                  <div className="mt-6">
                    {!selectedDate ? (
                      <p className="text-sm" style={{ color: "var(--ad-smoke)" }}>
                        Select a date to see open times.
                      </p>
                    ) : slotsLoading ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <Skeleton key={i} className="h-9 bg-white/5" />
                        ))}
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-sm" style={{ color: "var(--ad-smoke)" }}>
                        No open times that day. Try another date.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slots.map((s) => {
                          const active =
                            selectedSlot?.time === s.time &&
                            selectedSlot?.member_id === s.member_id;
                          return (
                            <button
                              key={`${s.time}-${s.member_id}`}
                              onClick={() => setSelectedSlot(s)}
                              className="rounded-full px-3 py-2 text-sm font-medium transition"
                              style={{
                                backgroundColor: active ? "var(--ad-gold)" : "transparent",
                                color: active ? "#1a1108" : "var(--ad-ivory)",
                                border: `1px solid ${active ? "var(--ad-gold)" : "var(--ad-border)"}`,
                              }}
                            >
                              {fmtTime(s.time)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <AdFooterNav
                    onBack={() => setStep(2)}
                    onNext={() => setStep(4)}
                    nextDisabled={!selectedSlot}
                  />
                </motion.div>
              )}

              {/* STEP 4: Details */}
              {step === 4 && (
                <motion.div
                  key="s4"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                  className="p-6 sm:p-8"
                >
                  <h2 className="ad-display text-lg" style={{ color: "var(--ad-gold)" }}>
                    Your Details
                  </h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <AdField label="First name">
                      <Input
                        className="ad-input"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      />
                    </AdField>
                    <AdField label="Last name">
                      <Input
                        className="ad-input"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      />
                    </AdField>
                    <div className="sm:col-span-2">
                      <AdField label="Email">
                        <Input
                          className="ad-input"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </AdField>
                    </div>
                    <div className="sm:col-span-2">
                      <AdField label="Mobile number">
                        <Input
                          className="ad-input"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="e.g. (555) 123-4567"
                        />
                      </AdField>
                    </div>
                    <div className="sm:col-span-2">
                      <AdField label="Notes (optional)">
                        <Textarea
                          className="ad-input"
                          rows={3}
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          placeholder="Anything we should know?"
                        />
                      </AdField>
                    </div>
                  </div>

                  {/* Add-ons (ticker buttons) */}
                  {lengthOptions.length > 0 && (
                    <div className="mt-6">
                      <div className="ad-label">Add-ons (optional)</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {lengthOptions.map((o) => {
                          const on = selectedAddOns.includes(o.id);
                          return (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() =>
                                setSelectedAddOns((prev) =>
                                  prev.includes(o.id)
                                    ? prev.filter((x) => x !== o.id)
                                    : [...prev, o.id],
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition"
                              style={{
                                backgroundColor: on ? "var(--ad-gold)" : "transparent",
                                color: on ? "#1a1108" : "var(--ad-ivory)",
                                border: `1px solid ${on ? "var(--ad-gold)" : "var(--ad-border)"}`,
                              }}
                            >
                              {on && <Check className="h-3.5 w-3.5" />}
                              {o.name}
                              {o.price_cents > 0 && ` +${money(o.price_cents, service?.currency)}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Hair color */}
                  {hairColors.length > 0 && (
                    <div className="mt-6">
                      <div className="ad-label">Hair Color (optional)</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {hairColors.map((c) => {
                          const on = selectedColorId === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setSelectedColorId(on ? null : c.id)}
                              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition"
                              style={{
                                backgroundColor: on ? "var(--ad-gold)" : "transparent",
                                color: on ? "#1a1108" : "var(--ad-ivory)",
                                border: `1px solid ${on ? "var(--ad-gold)" : "var(--ad-border)"}`,
                              }}
                            >
                              <span
                                className="inline-block h-3.5 w-3.5 rounded-full"
                                style={{
                                  background: c.swatch_hex ?? "#000",
                                  border: "1px solid rgba(205,164,91,.5)",
                                }}
                              />
                              {c.code}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Summary */}

                  <div className="ad-card mt-6 p-4 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: "var(--ad-smoke)" }}>Service</span>
                      <span style={{ color: "var(--ad-ivory)" }}>{service?.name}</span>
                    </div>
                    {selectedColorId && (
                      <div className="mt-2 flex items-center justify-between">
                        <span style={{ color: "var(--ad-smoke)" }}>Hair Color</span>
                        <span className="inline-flex items-center gap-2" style={{ color: "var(--ad-ivory)" }}>
                          {(() => {
                            const c = hairColors.find((c) => c.id === selectedColorId);
                            return (
                              <>
                                <span
                                  className="inline-block h-4 w-4 rounded-full"
                                  style={{
                                    background: c?.swatch_hex ?? "#000",
                                    border: "1px solid rgba(205,164,91,.5)",
                                  }}
                                />
                                <span className="font-medium">{c?.code}</span>
                                {c?.label && (
                                  <span style={{ color: "var(--ad-smoke)" }}>({c.label})</span>
                                )}
                              </>
                            );
                          })()}
                        </span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between">
                      <span style={{ color: "var(--ad-smoke)" }}>When</span>
                      <span style={{ color: "var(--ad-ivory)" }}>
                        {selectedDate &&
                          selectedSlot &&
                          new Date(`${selectedDate}T${selectedSlot.time}`).toLocaleString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between font-medium">
                      <span style={{ color: "var(--ad-smoke)" }}>Total</span>
                      <span style={{ color: "var(--ad-gold)" }}>
                        {service && money(service.price_cents + addOnTotalCents, service.currency)}
                      </span>
                    </div>
                    <div
                      className="mt-3 border-t pt-3 text-xs leading-relaxed"
                      style={{ borderColor: "var(--ad-border)", color: "var(--ad-smoke)" }}
                    >
                      {depositRequired
                        ? "A deposit is required now to hold this appointment; the remaining balance is due at your visit."
                        : "A $25 non-refundable deposit is required to hold this appointment; remaining balance is cash only."}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={() => setStep(3)}
                      disabled={submitting}
                      className="ad-ghost-btn"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button
                      className="ad-cta-btn"
                      disabled={
                        submitting ||
                        !form.firstName ||
                        !form.lastName ||
                        !form.email ||
                        !form.phone ||
                        !selectedSlot ||
                        !service
                      }
                      onClick={onSubmit}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {depositRequired ? "Continue to Deposit" : "Confirm Booking"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <p
          className="mt-10 text-center text-[10px] uppercase tracking-[0.2em]"
          style={{ color: "var(--ad-smoke)" }}
        >
          Powered by ProcSchedule
        </p>
      </div>
    </div>
  );
}

function AdFooterNav({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <Button variant="ghost" onClick={onBack} className="ad-ghost-btn">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <Button onClick={onNext} disabled={nextDisabled} className="ad-cta-btn">
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AdProviderRow({
  icon,
  name,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  description?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-active={active}
      className="ad-row flex w-full items-center gap-3 p-4 text-left"
    >
      <div
        className="grid h-9 w-9 place-items-center rounded-full"
        style={{
          backgroundColor: active
            ? "var(--ad-gold)"
            : "color-mix(in oklab, var(--ad-bg2) 80%, var(--ad-gold) 5%)",
          color: active ? "#1a1108" : "var(--ad-smoke)",
        }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium" style={{ color: "var(--ad-ivory)" }}>
          {name}
        </div>
        {description && (
          <div className="text-xs" style={{ color: "var(--ad-smoke)" }}>
            {description}
          </div>
        )}
      </div>
      <div
        className="grid h-5 w-5 place-items-center rounded-full"
        style={{
          border: `1px solid ${active ? "var(--ad-gold)" : "var(--ad-border)"}`,
          backgroundColor: active ? "var(--ad-gold)" : "transparent",
        }}
      >
        {active && <Check className="h-3 w-3" style={{ color: "#1a1108" }} />}
      </div>
    </button>
  );
}

function AdField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="ad-label">{label}</Label>
      {children}
    </div>
  );
}

function AdMonthCalendar({
  cursor,
  setCursor,
  selected,
  onSelect,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  selected: string | null;
  onSelect: (d: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthName = cursor.toLocaleString([], { month: "long", year: "numeric" });
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leading = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const minMonth = startOfMonth(today);
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return (
    <div className="ad-card mt-5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          className="grid h-8 w-8 place-items-center rounded-full transition disabled:opacity-30"
          style={{ color: "var(--ad-smoke)" }}
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          disabled={cursor <= minMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: "var(--ad-ivory)" }}
        >
          <CalendarIcon className="h-4 w-4" style={{ color: "var(--ad-gold)" }} /> {monthName}
        </div>
        <button
          className="grid h-8 w-8 place-items-center rounded-full transition disabled:opacity-30"
          style={{ color: "var(--ad-smoke)" }}
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          disabled={cursor >= maxMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div
        className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider"
        style={{ color: "var(--ad-smoke)" }}
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = ymd(d);
          const isPast = d < today;
          const isSelected = selected === iso;
          const isToday = ymd(d) === ymd(today);
          return (
            <button
              key={i}
              disabled={isPast}
              onClick={() => onSelect(iso)}
              className="h-9 rounded-lg text-sm transition"
              style={{
                backgroundColor: isSelected ? "var(--ad-gold)" : "transparent",
                color: isSelected
                  ? "#1a1108"
                  : isPast
                    ? "color-mix(in oklab, var(--ad-smoke) 40%, transparent)"
                    : isToday
                      ? "var(--ad-gold-bright)"
                      : "var(--ad-ivory)",
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Category dropdowns (Alluring Dolls skin) with optional image placeholders.
function AdCategoryAccordion({
  services,
  categories,
  selectedId,
  onSelect,
}: {
  services: Service[];
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const byCat = new Map<string, Service[]>();
    for (const s of services) {
      const key = s.category_id ?? "__uncat__";
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(s);
    }
    const ordered: { cat: Category; items: Service[] }[] = [];
    for (const c of categories) {
      const items = byCat.get(c.id);
      if (items && items.length) ordered.push({ cat: c, items });
    }
    const uncat = byCat.get("__uncat__");
    if (uncat && uncat.length)
      ordered.push({ cat: { id: "__uncat__", name: "Services" }, items: uncat });
    return ordered;
  }, [services, categories]);

  const initialOpen = useMemo(() => {
    const sel = services.find((s) => s.id === selectedId);
    const key = sel?.category_id ?? groups[0]?.cat.id;
    return key ? new Set([key]) : new Set<string>();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [open, setOpen] = useState<Set<string>>(initialOpen);
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const flat = groups.length === 1 && groups[0].cat.id === "__uncat__";
  if (flat) {
    return (
      <div className="space-y-3">
        {groups[0].items.map((s) => (
          <AdServiceRow key={s.id} s={s} active={selectedId === s.id} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(({ cat, items }) => {
        const isOpen = open.has(cat.id);
        return (
          <div
            key={cat.id}
            className="overflow-hidden rounded"
            style={{ border: "1px solid var(--ad-border)" }}
          >
            <button
              type="button"
              onClick={() => toggle(cat.id)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <AdImage url={cat.image_url} />
              <div className="flex-1">
                <div
                  className="ad-display text-base"
                  style={{ color: "var(--ad-gold)", letterSpacing: "0.06em" }}
                >
                  {cat.name}
                </div>
                <div
                  className="text-[11px] uppercase tracking-wider"
                  style={{ color: "var(--ad-smoke)" }}
                >
                  {items.length} option{items.length > 1 ? "s" : ""}
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                style={{ color: "var(--ad-smoke)" }}
              />
            </button>
            {isOpen && (
              <div className="space-y-3 p-3" style={{ borderTop: "1px solid var(--ad-border)" }}>
                {items.map((s) => (
                  <AdServiceRow key={s.id} s={s} active={selectedId === s.id} onSelect={onSelect} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AdImage({ url }: { url?: string | null }) {
  if (!url) return null;
  return <img src={url} alt="" className="h-11 w-11 rounded object-cover" />;
}


function AdServiceRow({
  s,
  active,
  onSelect,
}: {
  s: Service;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(s.id)}
      data-active={active}
      className="ad-row group flex w-full items-start gap-3 p-4 text-left"
    >
      <AdImage url={s.image_url} />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium" style={{ color: "var(--ad-ivory)" }}>
            {s.name}
          </h3>
          <span className="text-base font-medium" style={{ color: "var(--ad-gold)" }}>
            {money(s.price_cents, s.currency)}
          </span>
        </div>
        {s.description && (
          <p className="mt-1 text-xs line-clamp-2" style={{ color: "var(--ad-smoke)" }}>
            {s.description}
          </p>
        )}
        <div
          className="mt-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider"
          style={{ color: "var(--ad-smoke)" }}
        >
          <Clock className="h-3 w-3" /> {s.duration_minutes} min
        </div>
      </div>
      <div
        className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full transition"
        style={{
          border: `1px solid ${active ? "var(--ad-gold)" : "var(--ad-border)"}`,
          backgroundColor: active ? "var(--ad-gold)" : "transparent",
        }}
      >
        {active && <Check className="h-3 w-3" style={{ color: "#1a1108" }} />}
      </div>
    </button>
  );
}
