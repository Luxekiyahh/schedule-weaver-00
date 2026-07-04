import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Clock, ArrowRight, MapPin, MessageCircle, CalendarClock } from "lucide-react";

/**
 * ALLURING DOLLS — bespoke luxury storefront skin.
 *
 * Scoped to the "alluringdolls" slug only (see the branch in $slug.tsx).
 * Reads real, live catalog data (categories/variants/length options/hair
 * colors) from getStorefront — the same data pipeline every other tenant's
 * page uses. Only the presentation here is one-off.
 *
 * Design direction: an editorial luxury beauty house — near-black leather
 * backdrop with a CSS-only monochrome leopard emboss, layered ambient
 * lighting, brushed champagne-chrome display type (Cinzel / Cormorant),
 * capsule buttons and oversized rounded editorial cards.
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

  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  // Leopard leather emboss becomes more present as the page is explored.
  const leopardOpacity = useTransform(scrollYProgress, [0, 0.35, 1], [0.12, 0.32, 0.5]);

  return (
    <div className="ad-root relative min-h-screen overflow-clip">
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
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

        /* ---- Layered luxury lighting (fixed, behind content) ---- */
        .ad-lighting {
          position: fixed; inset: 0; z-index: -2; pointer-events: none;
          background:
            radial-gradient(120% 55% at 50% -8%, rgba(205,164,91,.14), transparent 60%),
            radial-gradient(90% 60% at 92% 8%, rgba(185,139,71,.10), transparent 55%),
            radial-gradient(90% 70% at 8% 100%, rgba(205,164,91,.08), transparent 60%),
            radial-gradient(140% 120% at 50% 50%, transparent 55%, rgba(0,0,0,.65) 100%);
        }
        /* ---- CSS-only monochrome leopard leather emboss ---- */
        .ad-leopard {
          position: fixed; inset: -20%; z-index: -1; pointer-events: none;
          filter: blur(1.5px) contrast(1.05);
          background-color: transparent;
          background-image:
            radial-gradient(38px 30px at 12% 18%, rgba(30,26,22,.9), rgba(30,26,22,0) 70%),
            radial-gradient(20px 16px at 12% 18%, rgba(9,8,9,.95), rgba(9,8,9,0) 72%),
            radial-gradient(44px 34px at 42% 34%, rgba(34,29,24,.85), rgba(34,29,24,0) 70%),
            radial-gradient(22px 18px at 42% 34%, rgba(9,8,9,.95), rgba(9,8,9,0) 72%),
            radial-gradient(40px 32px at 74% 22%, rgba(30,26,22,.85), rgba(30,26,22,0) 70%),
            radial-gradient(20px 16px at 74% 22%, rgba(9,8,9,.95), rgba(9,8,9,0) 72%),
            radial-gradient(48px 36px at 88% 56%, rgba(34,29,24,.82), rgba(34,29,24,0) 70%),
            radial-gradient(24px 18px at 88% 56%, rgba(9,8,9,.95), rgba(9,8,9,0) 72%),
            radial-gradient(42px 34px at 24% 62%, rgba(30,26,22,.85), rgba(30,26,22,0) 70%),
            radial-gradient(21px 17px at 24% 62%, rgba(9,8,9,.95), rgba(9,8,9,0) 72%),
            radial-gradient(46px 36px at 58% 78%, rgba(34,29,24,.82), rgba(34,29,24,0) 70%),
            radial-gradient(23px 18px at 58% 78%, rgba(9,8,9,.95), rgba(9,8,9,0) 72%),
            radial-gradient(40px 32px at 8% 90%, rgba(30,26,22,.8), rgba(30,26,22,0) 70%),
            radial-gradient(20px 16px at 8% 90%, rgba(9,8,9,.95), rgba(9,8,9,0) 72%),
            radial-gradient(44px 34px at 92% 92%, rgba(34,29,24,.8), rgba(34,29,24,0) 70%),
            radial-gradient(22px 18px at 92% 92%, rgba(9,8,9,.95), rgba(9,8,9,0) 72%);
          background-size: 420px 420px;
          background-repeat: repeat;
        }

        /* ---- Type ---- */
        .ad-display {
          font-family: 'Cinzel', serif;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }
        .ad-serif { font-family: 'Cormorant Garamond', serif; }

        /* ---- Brushed champagne chrome ---- */
        .ad-chrome {
          position: relative;
          display: inline-block;
          background: linear-gradient(
            100deg,
            var(--ad-gold-2) 0%,
            var(--ad-gold) 34%,
            var(--ad-gold-bright) 50%,
            var(--ad-gold) 66%,
            var(--ad-gold-2) 100%
          );
          background-size: 280% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 1px 0 rgba(0,0,0,.5), 0 0 24px rgba(205,164,91,.18);
          animation: ad-sweep 6s ease-in-out infinite;
        }
        @keyframes ad-sweep {
          0% { background-position: 100% 0; }
          50% { background-position: 0% 0; }
          100% { background-position: 100% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ad-chrome { animation: none; background-position: 0% 0; }
        }

        .ad-eyebrow {
          font-family: 'Inter', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.42em;
          font-size: 10.5px;
          color: var(--ad-smoke);
        }
        .ad-rule {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--ad-border) 20%, color-mix(in oklab, var(--ad-gold) 45%, transparent) 50%, var(--ad-border) 80%, transparent);
        }

        /* ---- Cards ---- */
        .ad-card {
          position: relative;
          background:
            linear-gradient(160deg, rgba(255,255,255,.03), transparent 40%),
            linear-gradient(180deg, var(--ad-bg2), color-mix(in oklab, var(--ad-bg2) 88%, #000 12%));
          border: 1px solid var(--ad-border);
          border-radius: 22px;
          box-shadow: 0 24px 60px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.04);
          transition: border-color .3s ease, transform .3s ease, box-shadow .3s ease;
        }
        .ad-product {
          position: relative;
          background:
            linear-gradient(160deg, rgba(255,255,255,.035), transparent 45%),
            linear-gradient(180deg, var(--ad-bg2), color-mix(in oklab, var(--ad-bg2) 86%, #000 14%));
          border: 1px solid var(--ad-border);
          border-radius: 18px;
          box-shadow: 0 18px 44px -28px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.04);
          transition: border-color .3s ease, transform .3s ease, box-shadow .3s ease;
        }
        .ad-product:hover {
          border-color: color-mix(in oklab, var(--ad-gold) 65%, transparent);
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 30px 60px -26px rgba(0,0,0,.95), 0 0 40px -12px var(--ad-glow), inset 0 1px 0 rgba(255,255,255,.06);
        }

        /* ---- Pills ---- */
        .ad-pill {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.55rem 1.4rem; border-radius: 999px;
          border: 1px solid var(--ad-border);
          background: linear-gradient(180deg, rgba(205,164,91,.06), transparent);
          color: var(--ad-gold);
          text-transform: uppercase; letter-spacing: 0.34em; font-size: 10.5px;
        }

        /* ---- Capsule buttons ---- */
        .ad-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.6rem;
          width: 100%; padding: 1.15rem 1.6rem; border-radius: 999px;
          background: linear-gradient(180deg, var(--ad-gold-bright), var(--ad-gold) 45%, var(--ad-gold-2));
          color: #1a1108;
          text-transform: uppercase; letter-spacing: 0.28em; font-size: 12px; font-weight: 600;
          box-shadow: 0 14px 34px -14px rgba(205,164,91,.55), inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.25);
          transition: transform .3s ease, box-shadow .3s ease, filter .3s ease;
        }
        .ad-cta:hover {
          transform: translateY(-2px) scale(1.01);
          filter: brightness(1.04);
          box-shadow: 0 20px 48px -14px rgba(205,164,91,.7), 0 0 48px -10px var(--ad-glow), inset 0 1px 0 rgba(255,255,255,.6), inset 0 -1px 0 rgba(0,0,0,.25);
        }

        .ad-swatch {
          width: 36px; height: 36px; border-radius: 999px;
          border: 1px solid var(--ad-border);
          box-shadow: 0 0 0 3px rgba(205,164,91,.1), 0 6px 14px -6px rgba(0,0,0,.8);
        }
      `}</style>

      <div className="ad-lighting" aria-hidden />
      <motion.div className="ad-leopard" aria-hidden style={reduce ? { opacity: 0.16 } : { opacity: leopardOpacity }} />

      {/* Hero */}
      <header className="relative px-5 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="ad-eyebrow">Belle Glade, FL</div>
          <h1 className="ad-display ad-chrome text-[3.25rem] sm:text-8xl mt-6 leading-[0.92]">
            {ws.name || "Alluring Dolls"}
          </h1>
          <p className="ad-serif mt-5 text-lg sm:text-xl italic text-[color:var(--ad-smoke)] max-w-md mx-auto leading-relaxed">
            {data.branding?.hero_subhead || "An intimate luxury beauty studio — bespoke installs, quiet glamour."}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[11px]">
            <a
              href="tel:5619758519"
              className="inline-flex items-center gap-1.5 text-[color:var(--ad-gold)] hover:opacity-80 transition uppercase tracking-[0.22em]"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Text (561) 975-8519
            </a>
            <span className="text-[color:var(--ad-border)]">✦</span>
            <span className="inline-flex items-center gap-1.5 text-[color:var(--ad-smoke)] uppercase tracking-[0.22em]">
              <CalendarClock className="w-3.5 h-3.5" /> Mon–Sat, 10–6
            </span>
          </div>
        </motion.div>
      </header>

      <div className="relative mx-auto max-w-[640px] px-5 pb-28">
        {/* Menu heading */}
        <div className="text-center">
          <div className="ad-rule" />
          <div className="mt-7 flex items-center justify-center">
            <span className="ad-pill">The Menu</span>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-12 space-y-16">
          {categories.length === 0 && (
            <p className="ad-serif text-center text-base text-[color:var(--ad-smoke)] italic">
              Services coming soon.
            </p>
          )}
          {categories.map((cat: any, i: number) => {
            const catVariants = variants.filter((v: any) => v.category_id === cat.id);
            if (catVariants.length === 0) return null;
            return (
              <motion.section
                key={cat.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: Math.min(i, 3) * 0.05 }}
              >
                <div className="flex flex-col items-center gap-4">
                  <AdStoreImage url={cat.image_url} size={72} />
                  <h2 className="ad-display ad-chrome text-3xl sm:text-4xl text-center">
                    {cat.name}
                  </h2>
                </div>
                {cat.description && (
                  <p className="ad-serif mt-3 text-center text-base text-[color:var(--ad-smoke)] italic">
                    {cat.description}
                  </p>
                )}
                <div className="mt-8 space-y-4">
                  {catVariants.map((v: any) => {
                    const dur = formatDuration(v.duration_min);
                    return (
                      <div key={v.id} className="ad-product p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <AdStoreImage url={v.image_url} size={52} />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[15px] font-medium tracking-wide text-[color:var(--ad-ivory)]">
                                {v.name}
                              </h3>
                              {v.description && (
                                <p className="mt-2 text-[13px] text-[color:var(--ad-smoke)] leading-relaxed">
                                  {v.description}
                                </p>
                              )}
                              {dur && (
                                <div className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ad-smoke)]">
                                  <Clock className="w-3 h-3" />
                                  <span>{dur}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-lg font-medium ad-chrome ad-serif">
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
          <motion.section
            className="mt-16"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55 }}
          >
            <div className="text-center">
              <span className="ad-pill">Extra Length</span>
            </div>
            <div className="mt-7 ad-card p-6 sm:p-7">
              <ul className="divide-y" style={{ borderColor: "var(--ad-border)" }}>
                {lengthOptions.map((l: any) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-[color:var(--ad-ivory)]">{l.name}</span>
                    <span className="ad-serif text-base font-medium text-[color:var(--ad-gold)]">
                      +{formatPrice(l.price_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        )}

        {/* Hair colors */}
        {hairColors.length > 0 && (
          <motion.section
            className="mt-16"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55 }}
          >
            <div className="text-center">
              <span className="ad-pill">Hair Colors</span>
            </div>
            <div className="mt-7 ad-card p-6 sm:p-7">
              <div className="flex flex-wrap gap-6 justify-center">
                {hairColors.map((c: any) => (
                  <div key={c.id} className="flex flex-col items-center gap-2">
                    <div
                      className="ad-swatch"
                      style={{ backgroundColor: c.swatch_hex }}
                      title={c.label}
                    />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ad-smoke)]">
                      {c.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Primary CTA */}
        <div className="mt-16">
          <Link to="/booking/$slug" params={{ slug: handle }} className="ad-cta">
            {data.branding?.cta_label ?? "Reserve Your Look"} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Good to know / policies */}
        <motion.section
          className="mt-20"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55 }}
        >
          <div className="text-center">
            <span className="ad-pill">Good to Know</span>
          </div>
          <div className="mt-7 ad-card p-7 sm:p-9">
            <dl className="space-y-6">
              {POLICIES.map((p, idx) => (
                <div key={p.label}>
                  <dt className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--ad-gold)]">
                    {p.label}
                  </dt>
                  <dd className="mt-2 text-sm text-[color:var(--ad-smoke)] leading-relaxed">
                    {p.detail}
                  </dd>
                  {idx < POLICIES.length - 1 && <div className="ad-rule mt-6 opacity-60" />}
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-7 text-center">
            <p className="ad-display ad-chrome text-xl tracking-[0.24em]">No Kids Allowed</p>
          </div>
        </motion.section>

        {/* Footer / contact */}
        <footer className="mt-20 text-center">
          <div className="ad-rule" />
          <p className="ad-display ad-chrome text-4xl mt-8">{ws.name || "Alluring Dolls"}</p>
          <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-[color:var(--ad-smoke)]">
            <MapPin className="w-3.5 h-3.5" /> Belle Glade, FL
          </p>
          <p className="mt-1.5 text-xs text-[color:var(--ad-smoke)]">
            Text only · (561) 975-8519 · Open Mon–Sat, 10am–6pm
          </p>
          <p className="mt-8 text-[10px] uppercase tracking-[0.22em] text-[color:var(--ad-smoke)]">
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
          backgroundColor: "color-mix(in oklab, var(--ad-bg) 82%, transparent)",
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

function AdStoreImage({ url, size }: { url?: string | null; size: number }) {
  if (!url) return null;
  const style = { width: size, height: size };
  return (
    <img
      src={url}
      alt=""
      style={style}
      className="rounded-2xl object-cover shrink-0 shadow-[0_10px_28px_-12px_rgba(0,0,0,.85)]"
    />
  );
}

