import { useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Car,
  Loader2,
  Sparkles,
} from "lucide-react";
import logoAsset from "@/assets/luxe-allure-logo.png.asset.json";
import { isValidPhoneNumber, normalizePhoneToE164 } from "@/lib/phone";

/**
 * LUXE ALLURE ARTISTRY - bespoke booking experience.
 *
 * Presentation only. All data loading, slot generation and submission stay in
 * the shared engine (BookingPage in booking.$slug.tsx), exactly like the
 * Alluring Dolls skin, so no other tenant is affected.
 */

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
};
type Slot = { time: string; member_id: string };
export type LocationMode = "studio" | "travel";

const STEP_LABELS = ["Service", "Location", "Time", "Details"];

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
function durationLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

export function LuxeAllureBookingFlow(props: {
  workspaceName: string;
  timezone?: string | null;
  studioAddress?: string | null;
  services: Service[];
  depositRequired: boolean;
  depositLabel?: string | null;
  step: number;
  setStep: (n: number) => void;
  serviceId: string | null;
  setServiceId: (id: string) => void;
  locationMode: LocationMode;
  setLocationMode: (m: LocationMode) => void;
  travelAddress: string;
  setTravelAddress: (v: string) => void;
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
  const {
    workspaceName, timezone, studioAddress, services, depositRequired, depositLabel,
    step, setStep, serviceId, setServiceId, locationMode, setLocationMode,
    travelAddress, setTravelAddress, monthCursor, setMonthCursor,
    selectedDate, setSelectedDate, slotsLoading, slots, selectedSlot, setSelectedSlot,
    form, setForm, submitting, done, onSubmit,
  } = props;

  const service = services.find((s) => s.id === serviceId) ?? null;

  const days = useMemo(() => {
    const first = startOfMonth(monthCursor);
    const lead = first.getDay();
    const count = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= count; i++) {
      cells.push(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), i));
    }
    return cells;
  }, [monthCursor]);

  const today = ymd(new Date());
  const phoneOk = isValidPhoneNumber(form.phone);
  const detailsOk =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    phoneOk &&
    (locationMode === "studio" || travelAddress.trim().length > 4);

  const canAdvance =
    (step === 1 && !!service) ||
    (step === 2 && (locationMode === "studio" || travelAddress.trim().length > 4)) ||
    (step === 3 && !!selectedSlot);

  return (
    <div className="la-root relative min-h-screen">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Jost:wght@200;300;400;500&display=swap"
      />
      <style>{`
        .la-root {
          --la-cream: #FBF6F0;
          --la-sand: #F1E5D8;
          --la-nude: #E4CDB8;
          --la-champagne: #C8A87C;
          --la-gold: #A9865A;
          --la-ink: #2E2621;
          --la-muted: #7C6A5C;
          --la-line: rgba(169,134,90,.28);
          background: radial-gradient(120% 80% at 50% 0%, #FFFDFA 0%, var(--la-cream) 45%, var(--la-sand) 100%);
          color: var(--la-ink);
          font-family: 'Jost', system-ui, sans-serif;
          font-weight: 300;
          letter-spacing: .01em;
        }
        .la-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        .la-eyebrow {
          font-size: 11px; letter-spacing: .38em; text-transform: uppercase;
          color: var(--la-gold);
        }
        .la-card {
          background: rgba(255,253,250,.82);
          backdrop-filter: blur(6px);
          border: 1px solid var(--la-line);
          box-shadow: 0 30px 70px -50px rgba(90,64,40,.65);
        }
        .la-option {
          border: 1px solid var(--la-line);
          background: rgba(255,255,255,.55);
          transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s, border-color .35s, background .35s;
        }
        .la-option:hover { transform: translateY(-2px); border-color: var(--la-champagne); background: rgba(255,255,255,.85); }
        .la-option[data-selected="true"] {
          border-color: var(--la-gold);
          background: linear-gradient(135deg, rgba(232,213,190,.75), rgba(255,255,255,.9));
          box-shadow: 0 18px 40px -28px rgba(120,86,48,.8);
        }
        .la-btn {
          background: linear-gradient(120deg, var(--la-gold), var(--la-champagne) 55%, #E3CBA6);
          color: #FFFDF9;
          letter-spacing: .16em; text-transform: uppercase; font-size: 12px;
          transition: filter .3s, transform .3s, opacity .3s;
        }
        .la-btn:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
        .la-btn:disabled { opacity: .45; }
        .la-ghost {
          border: 1px solid var(--la-line); color: var(--la-muted);
          letter-spacing: .16em; text-transform: uppercase; font-size: 12px;
          transition: color .3s, border-color .3s;
        }
        .la-ghost:hover { color: var(--la-ink); border-color: var(--la-champagne); }
        .la-input {
          width: 100%; background: rgba(255,255,255,.7);
          border: 1px solid var(--la-line); border-radius: 2px;
          padding: 12px 14px; font-size: 14px; color: var(--la-ink);
          transition: border-color .3s, background .3s;
        }
        .la-input:focus { outline: none; border-color: var(--la-gold); background: #fff; }
        .la-label { font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--la-muted); }
        .la-day { border: 1px solid transparent; transition: all .25s; }
        .la-day:hover:not(:disabled) { border-color: var(--la-champagne); }
        .la-day[data-selected="true"] { background: var(--la-gold); color: #FFFDF9; }
        .la-day:disabled { opacity: .3; }
        .la-slot { border: 1px solid var(--la-line); background: rgba(255,255,255,.6); transition: all .25s; }
        .la-slot:hover { border-color: var(--la-champagne); }
        .la-slot[data-selected="true"] { background: var(--la-gold); color: #FFFDF9; border-color: var(--la-gold); }
        @keyframes la-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .la-rise { animation: la-rise .6s cubic-bezier(.2,.8,.2,1) both; }
      `}</style>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="order-2 lg:order-1 flex items-center px-7 py-14 sm:px-14 lg:py-24">
            <div className="la-rise">
              <p className="la-eyebrow">Makeup Artistry</p>
              <h1 className="la-serif mt-5 text-5xl leading-[1.05] sm:text-6xl">
                {workspaceName}
              </h1>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed" style={{ color: "var(--la-muted)" }}>
                Soft, luminous, camera-ready makeup, created for you. Studio appointments in a calm,
                private space, or on-location glam wherever your day begins.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-[.28em]" style={{ color: "var(--la-gold)" }}>
                <span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Soft glam</span>
                <span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Full glam</span>
                <span className="inline-flex items-center gap-2"><Car className="h-3.5 w-3.5" /> Travel available</span>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 relative flex min-h-[300px] items-center justify-center overflow-hidden bg-[#050505] px-7 py-14 lg:min-h-[560px]">
            <div aria-hidden className="absolute inset-5 border border-white/10" />
            <img
              src={logoAsset.url}
              alt="Luxe Allure Artistry logo"
              width={1693}
              height={1623}
              className="relative z-10 h-auto w-full max-w-[620px] object-contain"
            />
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-3xl px-6 pb-24">
        {/* Stepper */}
        {!done && (
          <div className="flex items-center justify-center gap-3 pb-10 pt-4">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const complete = step > n;
              return (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="grid h-7 w-7 place-items-center rounded-full text-[11px]"
                    style={{
                      background: complete ? "var(--la-gold)" : active ? "#fff" : "transparent",
                      color: complete ? "#FFFDF9" : active ? "var(--la-ink)" : "var(--la-muted)",
                      border: `1px solid ${complete || active ? "var(--la-gold)" : "var(--la-line)"}`,
                    }}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : n}
                  </div>
                  <span
                    className="hidden text-[10px] uppercase tracking-[.28em] sm:inline"
                    style={{ color: active ? "var(--la-ink)" : "var(--la-muted)" }}
                  >
                    {label}
                  </span>
                  {n < STEP_LABELS.length && (
                    <span className="h-px w-6 sm:w-10" style={{ background: "var(--la-line)" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {done ? (
          <div className="la-card la-rise rounded-sm p-12 text-center">
            <div
              className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full"
              style={{ border: "1px solid var(--la-gold)" }}
            >
              <Check className="h-6 w-6" style={{ color: "var(--la-gold)" }} />
            </div>
            <h2 className="la-serif text-3xl">One last step</h2>
            <p className="mt-4 text-sm" style={{ color: "var(--la-muted)" }}>
              {new Date(done.start_at).toLocaleString([], {
                weekday: "long", month: "long", day: "numeric",
                hour: "numeric", minute: "2-digit", timeZone: timezone || "UTC",
              })}
            </p>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ color: "var(--la-muted)" }}>
              A text was just sent to {form.phone || "your phone"}. Reply <strong>YES</strong> with the code
              in that message to lock in your appointment. Your confirmation email arrives at {form.email}
              {" "}right after.
            </p>
          </div>
        ) : (
          <div className="la-card rounded-sm p-7 sm:p-10">
            {/* STEP 1 - Service */}
            {step === 1 && (
              <div className="la-rise">
                <p className="la-eyebrow">Step one</p>
                <h2 className="la-serif mt-3 text-3xl">Choose your look</h2>
                {services.length === 0 ? (
                  <p className="mt-8 text-sm" style={{ color: "var(--la-muted)" }}>
                    No services available yet.
                  </p>
                ) : (
                  <div className="mt-8 space-y-4">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setServiceId(s.id)}
                        data-selected={serviceId === s.id}
                        className="la-option w-full rounded-sm p-6 text-left"
                      >
                        <div className="flex items-start justify-between gap-6">
                          <div>
                            <h3 className="la-serif text-2xl">{s.name}</h3>
                            {s.description && (
                              <p className="mt-2 max-w-md text-[13px] leading-relaxed" style={{ color: "var(--la-muted)" }}>
                                {s.description}
                              </p>
                            )}
                            <p className="mt-3 inline-flex items-center gap-2 text-[11px] uppercase tracking-[.22em]" style={{ color: "var(--la-muted)" }}>
                              <Clock className="h-3.5 w-3.5" /> {durationLabel(s.duration_minutes)}
                            </p>
                          </div>
                          <span className="la-serif shrink-0 text-2xl" style={{ color: "var(--la-gold)" }}>
                            {money(s.price_cents, s.currency)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 - Location */}
            {step === 2 && (
              <div className="la-rise">
                <p className="la-eyebrow">Step two</p>
                <h2 className="la-serif mt-3 text-3xl">Where shall we glam?</h2>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setLocationMode("studio")}
                    data-selected={locationMode === "studio"}
                    className="la-option rounded-sm p-6 text-left"
                  >
                    <Home className="h-5 w-5" style={{ color: "var(--la-gold)" }} />
                    <h3 className="la-serif mt-4 text-2xl">At the studio</h3>
                    <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--la-muted)" }}>
                      {studioAddress
                        ? studioAddress
                        : "A calm, private studio space. The full address is sent with your confirmation."}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode("travel")}
                    data-selected={locationMode === "travel"}
                    className="la-option rounded-sm p-6 text-left"
                  >
                    <Car className="h-5 w-5" style={{ color: "var(--la-gold)" }} />
                    <h3 className="la-serif mt-4 text-2xl">I travel to you</h3>
                    <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--la-muted)" }}>
                      Home, hotel or venue. Share the address and I will arrive fully set up.
                    </p>
                  </button>
                </div>

                {locationMode === "travel" && (
                  <div className="la-rise mt-7">
                    <label className="la-label" htmlFor="la-address">Your address</label>
                    <input
                      id="la-address"
                      className="la-input mt-2"
                      placeholder="Street, apt, city, state, ZIP"
                      value={travelAddress}
                      onChange={(e) => setTravelAddress(e.target.value)}
                    />
                    <p className="mt-2 text-[12px]" style={{ color: "var(--la-muted)" }}>
                      This address travels with your booking so the artist arrives at the right door.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 - Time */}
            {step === 3 && (
              <div className="la-rise">
                <p className="la-eyebrow">Step three</p>
                <h2 className="la-serif mt-3 text-3xl">Pick your moment</h2>

                <div className="mt-8 flex items-center justify-between">
                  <button
                    type="button"
                    className="la-ghost rounded-sm px-3 py-2"
                    onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="la-serif text-xl">
                    {monthCursor.toLocaleDateString([], { month: "long", year: "numeric" })}
                  </p>
                  <button
                    type="button"
                    className="la-ghost rounded-sm px-3 py-2"
                    onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[.2em]" style={{ color: "var(--la-muted)" }}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <span key={`${d}-${i}`} className="py-2">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((d, i) => {
                    if (!d) return <span key={`empty-${i}`} />;
                    const key = ymd(d);
                    const past = key < today;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={past}
                        data-selected={selectedDate === key}
                        onClick={() => setSelectedDate(key)}
                        className="la-day aspect-square rounded-full text-sm"
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8">
                  {!selectedDate ? (
                    <p className="text-sm" style={{ color: "var(--la-muted)" }}>Select a date to see available times.</p>
                  ) : slotsLoading ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--la-muted)" }}>
                      <Loader2 className="h-4 w-4 animate-spin" /> Finding openings…
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--la-muted)" }}>
                      No openings that day. Try another date.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots.map((s) => (
                        <button
                          key={`${s.time}-${s.member_id}`}
                          type="button"
                          onClick={() => setSelectedSlot(s)}
                          data-selected={selectedSlot?.time === s.time && selectedSlot?.member_id === s.member_id}
                          className="la-slot rounded-sm py-3 text-sm"
                        >
                          {fmtTime(s.time)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4 - Details */}
            {step === 4 && (
              <div className="la-rise">
                <p className="la-eyebrow">Step four</p>
                <h2 className="la-serif mt-3 text-3xl">Your details</h2>

                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="la-label" htmlFor="la-first">First name</label>
                    <input id="la-first" className="la-input mt-2" value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className="la-label" htmlFor="la-last">Last name</label>
                    <input id="la-last" className="la-input mt-2" value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                  <div>
                    <label className="la-label" htmlFor="la-email">Email</label>
                    <input id="la-email" type="email" className="la-input mt-2" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="la-label" htmlFor="la-phone">Mobile number</label>
                    <input
                      id="la-phone"
                      inputMode="tel"
                      className="la-input mt-2"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      onBlur={() => {
                        const n = normalizePhoneToE164(form.phone);
                        if (n) setForm({ ...form, phone: n });
                      }}
                    />
                    <p className="mt-2 text-[12px]" style={{ color: form.phone && !phoneOk ? "#B4402F" : "var(--la-muted)" }}>
                      {form.phone && !phoneOk
                        ? "Enter a valid mobile number, including area code."
                        : "You will get a text to confirm this appointment."}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="la-label" htmlFor="la-notes">Anything I should know?</label>
                  <textarea
                    id="la-notes"
                    rows={3}
                    className="la-input mt-2 resize-none"
                    placeholder="Occasion, inspiration photos, skin sensitivities, lashes…"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                {/* Summary */}
                {service && selectedSlot && selectedDate && (
                  <div className="mt-8 rounded-sm p-6" style={{ border: "1px solid var(--la-line)", background: "rgba(255,255,255,.6)" }}>
                    <p className="la-eyebrow">Your appointment</p>
                    <div className="mt-4 space-y-2 text-sm" style={{ color: "var(--la-muted)" }}>
                      <p><span style={{ color: "var(--la-ink)" }}>{service.name}</span> · {durationLabel(service.duration_minutes)} · {money(service.price_cents, service.currency)}</p>
                      <p>
                        {new Date(`${selectedDate}T00:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                        {" at "}
                        {fmtTime(selectedSlot.time)}
                      </p>
                      <p>
                        {locationMode === "studio"
                          ? `At the studio${studioAddress ? `, ${studioAddress}` : ""}`
                          : `On location: ${travelAddress}`}
                      </p>
                      {depositRequired && (
                        <p style={{ color: "var(--la-gold)" }}>
                          {depositLabel ?? "A deposit is collected now to hold your time."}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Nav */}
            <div className="mt-10 flex items-center justify-between">
              <button
                type="button"
                className="la-ghost inline-flex items-center gap-2 rounded-sm px-5 py-3 disabled:opacity-30"
                disabled={step === 1 || submitting}
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  className="la-btn inline-flex items-center gap-2 rounded-sm px-8 py-3"
                  disabled={!canAdvance}
                  onClick={() => setStep(step + 1)}
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="la-btn inline-flex items-center gap-2 rounded-sm px-8 py-3"
                  disabled={!detailsOk || submitting}
                  onClick={onSubmit}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {depositRequired ? "Pay deposit and book" : "Request appointment"}
                </button>
              )}
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-[10px] uppercase tracking-[.3em]" style={{ color: "var(--la-muted)" }}>
          {workspaceName}
        </p>
      </main>
    </div>
  );
}
