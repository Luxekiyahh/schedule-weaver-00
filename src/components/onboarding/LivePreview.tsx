import { Clock, MapPin, ShieldCheck, ImageIcon, Sparkles, Star } from "lucide-react";
import {
  type WizardState,
  getIndustry,
  DAYS,
  formatTimeLabel,
  durationToMinutes,
} from "./wizard-config";

/* ----------------------------------------------------------------------------
 * Dynamic dark-luxury preview.
 *
 * The foundation is ALWAYS a near-black base with soft-white text. The tenant's
 * brand colors are applied as ACCENTS only (buttons, underlines, borders,
 * highlights, hover/active states). The dark base never changes, so every
 * tenant gets an elevated, premium feel regardless of their logo colors.
 * ------------------------------------------------------------------------- */

const BASE = "#0A0A0A";
const DISPLAY_FONT = '"Cormorant Garamond", "Italiana", Georgia, serif';

function hexToRgba(hex: string, alpha: number): string {
  const m = (hex || "#888888").replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) || 0;
  const g = parseInt(m.slice(2, 4), 16) || 0;
  const b = parseInt(m.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h} hr`;
}

function Ornament({ accent }: { accent: string }) {
  return (
    <div className="my-7 flex items-center justify-center gap-3">
      <span className="h-px w-14" style={{ background: `linear-gradient(90deg, transparent, ${hexToRgba(accent, 0.6)}, transparent)` }} />
      <span className="text-[10px]" style={{ color: hexToRgba(accent, 0.85) }}>✦</span>
      <span className="h-px w-14" style={{ background: `linear-gradient(90deg, transparent, ${hexToRgba(accent, 0.6)}, transparent)` }} />
    </div>
  );
}

function PillHeading({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div className="my-6 flex justify-center">
      <span
        className="inline-flex items-center rounded-full px-6 py-2 text-[11px] font-medium uppercase tracking-[0.22em]"
        style={{
          fontFamily: DISPLAY_FONT,
          border: `1px solid ${hexToRgba(accent, 0.5)}`,
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.4))",
          color: hexToRgba(accent, 0.95),
          boxShadow: `0 0 20px ${hexToRgba(accent, 0.12)}, inset 0 0 10px ${hexToRgba(accent, 0.06)}`,
        }}
      >
        {children}
      </span>
    </div>
  );
}

export function LivePreview({ wizard, large = false }: { wizard: WizardState; large?: boolean }) {
  const accent = wizard.primaryColor || "#c8a25a";
  const support = wizard.secondaryColor || accent;
  const industry = getIndustry(wizard.industry);
  const name = wizard.businessName.trim() || "Your Business";
  const bio = wizard.bio.trim() || industry.bioPlaceholder;
  const initial = name.charAt(0).toUpperCase();

  const services = wizard.services.filter((s) => s.name.trim());
  const openDays = wizard.hours.filter((h) => h.open);
  const portfolio = wizard.portfolio;
  const trio = portfolio.slice(0, 3);
  const gallery = portfolio.slice(3, 9);
  const intake = wizard.intake.filter((q) => q.label.trim());

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${hexToRgba(accent, 0.4)}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.5) 100%)",
    boxShadow: `inset 0 0 16px ${hexToRgba(accent, 0.06)}`,
  };

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Client view — live preview
      </p>

      {/* Browser frame */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <div className="ml-3 flex-1 truncate rounded-md bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground">
            {(wizard.businessName ? wizard.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "your-business")}.procschedule.com
          </div>
        </div>

        <div
          className={`overflow-y-auto ${large ? "max-h-[70vh]" : "max-h-[60vh]"}`}
          style={{ backgroundColor: BASE, color: "#f5f3f0" }}
        >
          <div className="mx-auto max-w-[460px] px-6 pb-10">
            {/* Hero */}
            <div className="relative mt-8 overflow-hidden rounded-3xl px-6 py-10 text-center" style={cardStyle}>
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(70% 90% at 50% 0%, ${hexToRgba(accent, 0.28)}, transparent 70%), radial-gradient(80% 80% at 100% 100%, ${hexToRgba(support, 0.18)}, transparent 70%)`,
                }}
              />
              <div className="relative">
                <div
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full"
                  style={{ border: `2px solid ${hexToRgba(accent, 0.55)}`, boxShadow: `0 0 24px ${hexToRgba(accent, 0.25)}` }}
                >
                  {wizard.logoDataUrl ? (
                    <img src={wizard.logoDataUrl} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl" style={{ fontFamily: DISPLAY_FONT, color: accent }}>{initial}</span>
                  )}
                </div>
                <div
                  className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em]"
                  style={{ border: `1px solid ${hexToRgba(accent, 0.4)}`, color: hexToRgba(accent, 0.95) }}
                >
                  <Sparkles className="h-3 w-3" /> Reservations
                </div>
                <h1 className="text-4xl leading-none tracking-wide" style={{ fontFamily: DISPLAY_FONT, color: "#fbfaf8" }}>
                  {name}
                </h1>
                {wizard.ownerTitle.trim() && (
                  <p className="mt-2 text-xs uppercase tracking-[0.3em]" style={{ color: hexToRgba(accent, 0.9) }}>
                    {wizard.ownerTitle}
                  </p>
                )}
                <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-white/70">{bio}</p>
                <button
                  className="mt-6 rounded-full px-7 py-2.5 text-sm font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: accent, color: BASE, boxShadow: `0 8px 24px ${hexToRgba(accent, 0.35)}` }}
                >
                  Book your appointment
                </button>
              </div>
            </div>

            {/* Portfolio trio */}
            {trio.length > 0 && (
              <div className="mt-8 grid grid-cols-3 gap-3">
                {trio.map((p) => (
                  <div key={p.id} className="aspect-[3/4] overflow-hidden rounded-2xl" style={cardStyle}>
                    <img src={p.dataUrl} alt="Portfolio" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <Ornament accent={accent} />

            {/* Hours */}
            <PillHeading accent={accent}>Hours</PillHeading>
            <div className="rounded-2xl px-5 py-4" style={cardStyle}>
              <div className="space-y-1.5 text-sm">
                {DAYS.map((d) => {
                  const h = openDays.find((x) => x.dow === d.dow);
                  return (
                    <div key={d.dow} className="flex justify-between">
                      <span className="text-white/70">{d.label}</span>
                      <span style={{ color: h ? hexToRgba(accent, 0.95) : undefined }} className={h ? "" : "text-white/40"}>
                        {h ? `${formatTimeLabel(h.start)} – ${formatTimeLabel(h.end)}` : "Closed"}
                      </span>
                    </div>
                  );
                })}
              </div>
              {wizard.locationType === "studio" && wizard.address.trim() && (
                <p className="mt-3 flex items-center gap-1 text-xs text-white/55">
                  <MapPin className="h-3 w-3" style={{ color: accent }} /> {wizard.address}
                </p>
              )}
              {wizard.locationType === "mobile" && (
                <p className="mt-3 flex items-center gap-1 text-xs text-white/55">
                  <MapPin className="h-3 w-3" style={{ color: accent }} /> Mobile — we come to you
                </p>
              )}
            </div>

            <Ornament accent={accent} />

            {/* Booking Policy */}
            <PillHeading accent={accent}>Booking Policy</PillHeading>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 text-center" style={cardStyle}>
                <ShieldCheck className="mx-auto mb-2 h-5 w-5" style={{ color: accent }} />
                <h4 className="mb-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(accent, 0.95) }}>Deposit</h4>
                <p className="text-[11px] leading-relaxed text-white/60">
                  A non-refundable deposit of ${wizard.policies.deposit || "0"} secures your appointment.
                </p>
              </div>
              <div className="rounded-2xl p-4 text-center" style={cardStyle}>
                <Clock className="mx-auto mb-2 h-5 w-5" style={{ color: accent }} />
                <h4 className="mb-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(accent, 0.95) }}>Cancellation</h4>
                <p className="text-[11px] leading-relaxed text-white/60">
                  Please give {wizard.policies.cancellation} notice to reschedule.
                </p>
              </div>
              {wizard.policies.grace !== "None" && (
                <div className="rounded-2xl p-4 text-center" style={cardStyle}>
                  <Clock className="mx-auto mb-2 h-5 w-5" style={{ color: accent }} />
                  <h4 className="mb-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(accent, 0.95) }}>Late Policy</h4>
                  <p className="text-[11px] leading-relaxed text-white/60">{wizard.policies.grace} grace period for late arrivals.</p>
                </div>
              )}
              {wizard.policies.noGuests && (
                <div className="rounded-2xl p-4 text-center" style={cardStyle}>
                  <Star className="mx-auto mb-2 h-5 w-5" style={{ color: accent }} />
                  <h4 className="mb-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: hexToRgba(accent, 0.95) }}>Guests</h4>
                  <p className="text-[11px] leading-relaxed text-white/60">Please arrive alone — no additional guests.</p>
                </div>
              )}
              {wizard.policies.customNote.trim() && (
                <div className="col-span-2 rounded-2xl p-4 text-center" style={cardStyle}>
                  <p className="text-[11px] leading-relaxed text-white/60">{wizard.policies.customNote}</p>
                </div>
              )}
            </div>

            {/* Pre-Appointment / Intake */}
            {intake.length > 0 && (
              <>
                <Ornament accent={accent} />
                <PillHeading accent={accent}>Before You Book</PillHeading>
                <div className="grid grid-cols-2 gap-3">
                  {intake.map((q) => (
                    <div key={q.id} className="rounded-2xl p-4" style={cardStyle}>
                      <p className="text-[11px] leading-relaxed text-white/70">{q.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Portfolio gallery */}
            {gallery.length > 0 && (
              <>
                <Ornament accent={accent} />
                <PillHeading accent={accent}>The Portfolio</PillHeading>
                <div className="grid grid-cols-2 gap-3">
                  {gallery.map((p) => (
                    <div key={p.id} className="aspect-[3/4] overflow-hidden rounded-2xl" style={cardStyle}>
                      <img src={p.dataUrl} alt="Portfolio" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </>
            )}

            <Ornament accent={accent} />

            {/* Services */}
            <PillHeading accent={accent}>Choose Your Service</PillHeading>
            {services.length === 0 ? (
              <div className="rounded-2xl px-5 py-6 text-center" style={cardStyle}>
                <ImageIcon className="mx-auto mb-2 h-5 w-5 text-white/40" />
                <p className="text-sm text-white/50">Your services will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((s) => (
                  <div key={s.id} className="rounded-2xl p-5" style={cardStyle}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-lg leading-tight" style={{ fontFamily: DISPLAY_FONT, color: "#fbfaf8" }}>{s.name}</h4>
                        {s.description.trim() && (
                          <p className="mt-1 text-[11px] leading-relaxed text-white/55">{s.description}</p>
                        )}
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-white/50">
                          <Clock className="h-3 w-3" style={{ color: accent }} /> {fmtDuration(durationToMinutes(s))}
                        </p>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: accent }}>
                        {s.price ? `$${s.price}` : "—"}
                      </span>
                    </div>
                    {s.options.filter((o) => o.label.trim()).length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-3 text-[11px]" style={{ borderColor: hexToRgba(accent, 0.2) }}>
                        {s.options.filter((o) => o.label.trim()).map((o) => (
                          <div key={o.id} className="flex justify-between">
                            <span className="text-white/55">{o.label}</span>
                            <span style={{ color: hexToRgba(accent, 0.9) }}>{o.price ? `+$${o.price}` : "—"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Ornament accent={accent} />

            {/* Footer */}
            <div className="pb-2 text-center">
              <p className="text-lg tracking-[0.18em]" style={{ fontFamily: DISPLAY_FONT, color: hexToRgba(accent, 0.95) }}>
                {name}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-white/40">
                Booking by ProcSchedule
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
