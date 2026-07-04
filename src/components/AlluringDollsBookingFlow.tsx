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
  ImageIcon,
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
};
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
  form: { firstName: string; lastName: string; email: string; notes: string };
  setForm: (f: { firstName: string; lastName: string; email: string; notes: string }) => void;
  submitting: boolean;
  done: { start_at: string } | null;
  onSubmit: () => void;
}) {
  const service = services.find((s) => s.id === serviceId) ?? null;

  return (
    <div className="ad-root min-h-screen">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Italiana&family=Jost:wght@300;400;500;600&display=swap"
      />
      <style>{`
        .ad-root {
          --ad-bg: #0b0a0d;
          --ad-bg2: #161116;
          --ad-wine: #3a0d18;
          --ad-gold: #cba35c;
          --ad-gold-bright: #f3e0ad;
          --ad-ivory: #f3ede2;
          --ad-smoke: #a8978a;
          --ad-border: color-mix(in oklab, var(--ad-gold) 22%, transparent);
          background-color: var(--ad-bg);
          color: var(--ad-ivory);
          font-family: 'Jost', system-ui, sans-serif;
          background-image: radial-gradient(ellipse 60% 35% at 50% 0%, color-mix(in oklab, var(--ad-wine) 50%, transparent), transparent 70%);
        }
        .ad-display { font-family: 'Italiana', serif; text-transform: uppercase; letter-spacing: 0.1em; }
        .ad-card { background: color-mix(in oklab, var(--ad-bg2) 92%, var(--ad-wine) 8%); border: 1px solid var(--ad-border); border-radius: 4px; }
        .ad-row { background: color-mix(in oklab, var(--ad-bg2) 92%, var(--ad-wine) 8%); border: 1px solid var(--ad-border); border-radius: 4px; transition: border-color .25s ease, transform .2s ease; }
        .ad-row:hover { border-color: color-mix(in oklab, var(--ad-gold) 50%, transparent); }
        .ad-row[data-active="true"] { border-color: var(--ad-gold); box-shadow: 0 0 0 1px color-mix(in oklab, var(--ad-gold) 35%, transparent); }
        .ad-input { background: color-mix(in oklab, var(--ad-bg2) 90%, transparent) !important; border-color: var(--ad-border) !important; color: var(--ad-ivory) !important; }
        .ad-input::placeholder { color: var(--ad-smoke); }
        .ad-label { text-transform: uppercase; letter-spacing: 0.22em; font-size: 10.5px; color: var(--ad-smoke); }
        .ad-cta-btn { background: var(--ad-gold) !important; color: #1a1108 !important; border: none !important; }
        .ad-cta-btn:hover { opacity: 0.92; }
        .ad-ghost-btn { color: var(--ad-smoke) !important; }
        .ad-ghost-btn:hover { color: var(--ad-ivory) !important; background: transparent !important; }
      `}</style>

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
          <h1 className="ad-display text-3xl sm:text-4xl mt-3" style={{ color: "var(--ad-gold)" }}>
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
            <p className="mt-1 text-sm" style={{ color: "var(--ad-smoke)" }}>
              A confirmation has been recorded for {form.email}.
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
                    <div className="mt-5 space-y-3">
                      {services.map((s) => {
                        const active = serviceId === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              setServiceId(s.id);
                              setProviderId(ANY);
                            }}
                            data-active={active}
                            className="ad-row group flex w-full items-start gap-4 p-4 text-left"
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <h3
                                  className="text-sm font-medium"
                                  style={{ color: "var(--ad-ivory)" }}
                                >
                                  {s.name}
                                </h3>
                                <span
                                  className="text-base font-medium"
                                  style={{ color: "var(--ad-gold)" }}
                                >
                                  {money(s.price_cents, s.currency)}
                                </span>
                              </div>
                              {s.description && (
                                <p
                                  className="mt-1 text-xs line-clamp-2"
                                  style={{ color: "var(--ad-smoke)" }}
                                >
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
                              className="mt-1 grid h-5 w-5 place-items-center rounded-full transition"
                              style={{
                                border: `1px solid ${active ? "var(--ad-gold)" : "var(--ad-border)"}`,
                                backgroundColor: active ? "var(--ad-gold)" : "transparent",
                              }}
                            >
                              {active && <Check className="h-3 w-3" style={{ color: "#1a1108" }} />}
                            </div>
                          </button>
                        );
                      })}
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

                  {/* Summary */}
                  <div className="ad-card mt-6 p-4 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: "var(--ad-smoke)" }}>Service</span>
                      <span style={{ color: "var(--ad-ivory)" }}>{service?.name}</span>
                    </div>
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
                        {service && money(service.price_cents, service.currency)}
                      </span>
                    </div>
                    <div
                      className="mt-3 border-t pt-3 text-xs leading-relaxed"
                      style={{ borderColor: "var(--ad-border)", color: "var(--ad-smoke)" }}
                    >
                      A $25 non-refundable deposit is required to hold this appointment; remaining
                      balance is cash only.
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
                      Confirm Booking
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
