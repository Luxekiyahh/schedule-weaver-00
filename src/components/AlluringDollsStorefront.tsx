import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Clock, ArrowRight, MapPin, MessageCircle, CalendarClock } from "lucide-react";

/**
 * ALLURING DOLLS — bespoke storefront skin.
 *
 * Scoped to the "alluringdolls" slug only (see the branch in $slug.tsx).
 * Reads real, live catalog data (categories/variants/length options/hair
 * colors) from getStorefront, the same data pipeline every other tenant's
 * page uses — only the presentation here is one-off.
 *
 * Design direction: a dark vanity-mirror editorial — near-black + deep
 * bordeaux backdrop, antique champagne-gold accents, a wide-tracked
 * display face for the name with a slow light-sweep "glint" (not a hue
 * shimmer) as the signature move.
 */

function formatPrice(cents: number) {
  if (cents === 0) return "Included";
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDuration(min: number) {
  if (min <= 0) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr${h > 1 ? "s" : ""}` : `${h} hr ${m} min`;
}

const POLICIES: { label: string; detail: string }[] = [
  {
    label: "Deposit",
    detail: "$25 non-refundable deposit required to book. Remaining balance due in cash only.",
  },
  { label: "Same-day bookings", detail: "Same-day appointments carry a $25 fee." },
  { label: "Arrival", detail: "Come with hair completely blown out, dry & product-free." },
  {
    label: "Running late",
    detail:
      "15 minutes grace. After that your appointment is rescheduled or canceled — no late fees accepted to hold your spot.",
  },
  { label: "Once booked", detail: "Your hairstyle selection is final and cannot be changed." },
  {
    label: "Rescheduling",
    detail:
      "Allowed once, and only with 24+ hours notice. A second reschedule cancels the appointment.",
  },
  { label: "Guests", detail: "No extra guests, please." },
  {
    label: "Your own hair",
    detail:
      "Quick weave & sew-in services require you to bring your own hair — Sensual or Empire preferred.",
  },
];

export function AlluringDollsStorefront({ data }: { data: any }) {
  const ws = data.workspace;
  const categories = data.categories ?? [];
  const variants = data.variants ?? [];
  const lengthOptions = data.lengthOptions ?? [];
  const hairColors = data.hairColors ?? [];
  const handle = ws.slug;

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
          background-image:
            radial-gradient(ellipse 60% 40% at 50% 0%, color-mix(in oklab, var(--ad-wine) 55%, transparent), transparent 70%),
            radial-gradient(ellipse 50% 30% at 85% 100%, color-mix(in oklab, var(--ad-wine) 35%, transparent), transparent 70%);
        }
        .ad-display {
          font-family: 'Italiana', serif;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .ad-glint {
          position: relative;
          display: inline-block;
          background: linear-gradient(
            100deg,
            var(--ad-gold) 0%,
            var(--ad-gold) 40%,
            var(--ad-gold-bright) 50%,
            var(--ad-gold) 60%,
            var(--ad-gold) 100%
          );
          background-size: 280% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: ad-sweep 5.5s ease-in-out infinite;
        }
        @keyframes ad-sweep {
          0% { background-position: 100% 0; }
          50% { background-position: 0% 0; }
          100% { background-position: 100% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ad-glint { animation: none; background-position: 0% 0; }
        }
        .ad-eyebrow {
          font-family: 'Jost', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.38em;
          font-size: 10.5px;
          color: var(--ad-smoke);
        }
        .ad-rule {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--ad-border) 25%, var(--ad-border) 75%, transparent);
        }
        .ad-card {
          background: color-mix(in oklab, var(--ad-bg2) 92%, var(--ad-wine) 8%);
          border: 1px solid var(--ad-border);
          border-radius: 4px;
          transition: border-color .3s ease, transform .3s ease;
        }
        .ad-card:hover {
          border-color: color-mix(in oklab, var(--ad-gold) 55%, transparent);
          transform: translateY(-2px);
        }
        .ad-pill {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.5rem 1.3rem; border-radius: 999px;
          border: 1px solid var(--ad-border);
          color: var(--ad-gold);
          text-transform: uppercase; letter-spacing: 0.3em; font-size: 10.5px;
        }
        .ad-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.6rem;
          width: 100%; padding: 1.05rem 1.5rem; border-radius: 2px;
          background: var(--ad-gold);
          color: #1a1108;
          text-transform: uppercase; letter-spacing: 0.28em; font-size: 12px; font-weight: 600;
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .ad-cta:hover { transform: translateY(-1px); box-shadow: 0 12px 30px -8px color-mix(in oklab, var(--ad-gold) 60%, transparent); }
        .ad-swatch {
          width: 34px; height: 34px; border-radius: 999px;
          border: 1px solid var(--ad-border);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--ad-gold) 8%, transparent);
        }
      `}</style>

      {/* Hero */}
      <header className="relative px-5 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="ad-eyebrow">Belle Glade, FL</div>
          <h1 className="ad-display ad-glint text-5xl sm:text-7xl mt-5 leading-[0.95]">
            {ws.name || "Alluring Dolls"}
          </h1>
          {data.branding?.hero_subhead && (
            <p className="mt-6 text-sm sm:text-base text-[color:var(--ad-smoke)] max-w-md mx-auto leading-relaxed">
              {data.branding.hero_subhead}
            </p>
          )}
          <div className="mt-9 flex items-center justify-center gap-5 text-[11px]">
            <a
              href="tel:5619758519"
              className="inline-flex items-center gap-1.5 text-[color:var(--ad-gold)] hover:opacity-80 transition uppercase tracking-[0.2em]"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Text (561) 975-8519
            </a>
            <span className="text-[color:var(--ad-border)]">✦</span>
            <span className="inline-flex items-center gap-1.5 text-[color:var(--ad-smoke)] uppercase tracking-[0.2em]">
              <CalendarClock className="w-3.5 h-3.5" /> Mon–Sat, 10–6
            </span>
          </div>
        </motion.div>
      </header>

      <div className="mx-auto max-w-[600px] px-5 pb-24">
        {/* Menu heading */}
        <div className="text-center">
          <div className="ad-rule" />
          <div className="mt-6 flex items-center justify-center">
            <span className="ad-pill">The Menu</span>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-10 space-y-14">
          {categories.length === 0 && (
            <p className="text-center text-sm text-[color:var(--ad-smoke)] italic">
              Services coming soon.
            </p>
          )}
          {categories.map((cat: any, i: number) => {
            const catVariants = variants.filter((v: any) => v.category_id === cat.id);
            if (catVariants.length === 0) return null;
            return (
              <motion.section
                key={cat.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: Math.min(i, 3) * 0.05 }}
              >
                <div className="flex flex-col items-center gap-3">
                  <AdStoreImage url={cat.image_url} size={64} />
                  <h2
                    className="ad-display text-2xl sm:text-3xl text-center"
                    style={{ color: "var(--ad-gold)" }}
                  >
                    {cat.name}
                  </h2>
                </div>
                {cat.description && (
                  <p className="mt-2 text-center text-xs text-[color:var(--ad-smoke)] italic">
                    {cat.description}
                  </p>
                )}
                <div className="mt-6 space-y-3">
                  {catVariants.map((v: any) => {
                    const dur = formatDuration(v.duration_min);
                    return (
                      <div key={v.id} className="ad-card p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <AdStoreImage url={v.image_url} size={44} />
                            <div className="flex-1">
                              <h3
                                className="text-sm font-medium tracking-wide"
                                style={{ color: "var(--ad-ivory)" }}
                              >
                                {v.name}
                              </h3>
                              {v.description && (
                                <p className="mt-1.5 text-xs text-[color:var(--ad-smoke)] leading-relaxed">
                                  {v.description}
                                </p>
                              )}
                              {dur && (
                                <div className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ad-smoke)]">
                                  <Clock className="w-3 h-3" />
                                  <span>{dur}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div
                            className="text-base font-medium"
                            style={{ color: "var(--ad-gold)" }}
                          >
                            {formatPrice(v.price_cents)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </div>

        {/* Length add-ons */}
        {lengthOptions.length > 0 && (
          <section className="mt-14">
            <div className="text-center">
              <span className="ad-pill">Extra Length</span>
            </div>
            <div className="mt-6 ad-card p-5">
              <ul className="divide-y" style={{ borderColor: "var(--ad-border)" }}>
                {lengthOptions.map((l: any) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm" style={{ color: "var(--ad-ivory)" }}>
                      {l.name}
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--ad-gold)" }}>
                      +{formatPrice(l.price_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Hair colors */}
        {hairColors.length > 0 && (
          <section className="mt-14">
            <div className="text-center">
              <span className="ad-pill">Hair Colors</span>
            </div>
            <div className="mt-6 ad-card p-5">
              <div className="flex flex-wrap gap-5 justify-center">
                {hairColors.map((c: any) => (
                  <div key={c.id} className="flex flex-col items-center gap-2">
                    <div
                      className="ad-swatch"
                      style={{ backgroundColor: c.swatch_hex }}
                      title={c.label}
                    />
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ad-smoke)]">
                      {c.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Primary CTA */}
        <div className="mt-14">
          <Link to="/booking/$slug" params={{ slug: handle }} className="ad-cta">
            {data.branding?.cta_label ?? "Reserve Your Look"} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Good to know / policies */}
        <section className="mt-16">
          <div className="text-center">
            <span className="ad-pill">Good to Know</span>
          </div>
          <div className="mt-6 ad-card p-5 sm:p-6">
            <dl className="space-y-4">
              {POLICIES.map((p) => (
                <div key={p.label}>
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ad-gold)]">
                    {p.label}
                  </dt>
                  <dd className="mt-1 text-sm text-[color:var(--ad-smoke)] leading-relaxed">
                    {p.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-5 text-center">
            <p
              className="ad-display text-lg tracking-[0.2em]"
              style={{ color: "var(--ad-gold-bright)" }}
            >
              No Kids Allowed
            </p>
          </div>
        </section>

        {/* Footer / contact */}
        <footer className="mt-16 text-center">
          <div className="ad-rule" />
          <p className="ad-display ad-glint text-3xl mt-6">{ws.name || "Alluring Dolls"}</p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-[color:var(--ad-smoke)]">
            <MapPin className="w-3.5 h-3.5" /> 33 W Ave A, Apt 3A · Belle Glade, FL
          </p>
          <p className="mt-1 text-xs text-[color:var(--ad-smoke)]">
            Text only · (561) 975-8519 · Open Mon–Sat, 10am–6pm
          </p>
          <p className="mt-7 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ad-smoke)]">
            Powered by{" "}
            <Link
              to="/onboarding"
              className="underline underline-offset-4 hover:text-[color:var(--ad-gold)]"
            >
              ProcSchedule
            </Link>
          </p>
        </footer>
      </div>

      {/* Sticky mobile book bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md px-4 py-3 sm:hidden"
        style={{
          backgroundColor: "color-mix(in oklab, var(--ad-bg) 88%, transparent)",
          borderColor: "var(--ad-border)",
        }}
      >
        <Link to="/booking/$slug" params={{ slug: handle }} className="ad-cta">
          Book Now <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
