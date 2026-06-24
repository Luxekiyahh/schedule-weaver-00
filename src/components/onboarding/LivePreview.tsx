import { Clock, MapPin, ShieldCheck, ImageIcon } from "lucide-react";
import {
  type WizardState,
  getIndustry,
  DAYS,
  formatTimeLabel,
  durationToMinutes,
} from "./wizard-config";

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h} hr`;
}

export function LivePreview({ wizard, large = false }: { wizard: WizardState; large?: boolean }) {
  const primary = wizard.primaryColor;
  const secondary = wizard.secondaryColor;
  const industry = getIndustry(wizard.industry);
  const name = wizard.businessName.trim() || "Your Business";
  const bio = wizard.bio.trim() || industry.bioPlaceholder;
  const initial = name.charAt(0).toUpperCase();

  const services = wizard.services.filter((s) => s.name.trim());
  const openDays = wizard.hours.filter((h) => h.open);
  const portfolio = wizard.portfolio;

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
          className={`overflow-y-auto bg-white ${large ? "max-h-[70vh]" : "max-h-[60vh]"}`}
          style={{ color: "#1a1a1a" }}
        >
          {/* Header / hero */}
          <div
            className="px-6 py-10 text-center"
            style={{ background: `linear-gradient(135deg, ${hexToRgba(primary, 0.95)}, ${hexToRgba(secondary, 0.9)})` }}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/90 shadow-lg">
              {wizard.logoDataUrl ? (
                <img src={wizard.logoDataUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold" style={{ color: primary }}>
                  {initial}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white drop-shadow-sm" style={{ fontFamily: "Georgia, serif" }}>
              {name}
            </h1>
            {wizard.ownerTitle.trim() && (
              <p className="mt-1 text-sm text-white/85">{wizard.ownerTitle}</p>
            )}
            <p className="mx-auto mt-3 max-w-xs text-sm text-white/90">{bio}</p>
            <button
              className="mt-5 rounded-full px-6 py-2 text-sm font-semibold shadow-md"
              style={{ backgroundColor: "#fff", color: primary }}
            >
              Book your appointment
            </button>
          </div>

          {/* Gallery */}
          {portfolio.length > 0 && (
            <div className="px-6 py-6">
              <div className="grid grid-cols-3 gap-2">
                {portfolio.slice(0, 9).map((p) => (
                  <div key={p.id} className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <img src={p.dataUrl} alt="Portfolio" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          <div className="px-6 py-6">
            <h2 className="mb-3 text-lg font-semibold" style={{ fontFamily: "Georgia, serif", color: primary }}>
              Services
            </h2>
            {services.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-gray-400">
                <ImageIcon className="h-4 w-4" /> Your services will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" /> {fmtDuration(durationToMinutes(s))}
                      </p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: secondary }}>
                      {s.price ? `$${s.price}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hours */}
          <div className="px-6 py-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold" style={{ fontFamily: "Georgia, serif", color: primary }}>
              <Clock className="h-4 w-4" /> Hours
            </h2>
            <div className="space-y-1 text-sm">
              {DAYS.map((d) => {
                const h = openDays.find((x) => x.dow === d.dow);
                return (
                  <div key={d.dow} className="flex justify-between text-gray-600">
                    <span>{d.label}</span>
                    <span>{h ? `${formatTimeLabel(h.start)} – ${formatTimeLabel(h.end)}` : "Closed"}</span>
                  </div>
                );
              })}
            </div>
            {wizard.locationType === "studio" && wizard.address.trim() && (
              <p className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" /> {wizard.address}
              </p>
            )}
            {wizard.locationType === "mobile" && (
              <p className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" /> Mobile — we come to you
              </p>
            )}
          </div>

          {/* Policy */}
          <div className="px-6 pb-8 pt-2">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold" style={{ fontFamily: "Georgia, serif", color: primary }}>
              <ShieldCheck className="h-4 w-4" /> Booking Policy
            </h2>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li>• A non-refundable deposit of ${wizard.policies.deposit || "0"} is required to book.</li>
              <li>• Cancellations require {wizard.policies.cancellation} notice.</li>
              {wizard.policies.grace !== "None" && <li>• Grace period for late arrivals: {wizard.policies.grace}.</li>}
              {wizard.policies.noGuests && <li>• No additional guests allowed.</li>}
              {wizard.policies.customNote.trim() && <li>• {wizard.policies.customNote}</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
