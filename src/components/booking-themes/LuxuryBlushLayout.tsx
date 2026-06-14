import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, ArrowRight, Sparkles, CalendarHeart } from "lucide-react";
import type { StorefrontThemeProps } from "./types";
import { money } from "./types";

/**
 * Luxury Blush skin — soft, elegant, light. Branding tokens (primary_color,
 * font_family, logo_url) are injected dynamically; layout is fixed.
 */
export function LuxuryBlushLayout({
  workspace,
  categories,
  variants,
  lengthOptions,
  slug,
  primary,
  fontStack,
}: StorefrontThemeProps) {
  const heading: CSSProperties = { fontFamily: fontStack };

  return (
    <div className="min-h-screen bg-[#fff5f8] text-[#3a2730]" style={{ fontFamily: fontStack }}>
      {/* Hero */}
      <header className="relative px-6 pb-12 pt-16 text-center sm:pt-24">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-25"
          style={{ background: `radial-gradient(60% 100% at 50% 0%, ${primary}, transparent)` }}
        />
        <div className="relative mx-auto max-w-3xl">
          {workspace.logo_url ? (
            <img
              src={workspace.logo_url}
              alt={`${workspace.name} logo`}
              className="mx-auto mb-6 h-20 w-20 rounded-full object-cover shadow-lg ring-4 ring-white"
            />
          ) : null}
          <div
            className="mx-auto mb-5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] shadow-sm"
            style={{ color: primary }}
          >
            <Sparkles className="h-3 w-3" /> Reservations
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl" style={heading}>
            {workspace.name}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[#7d6770]">
            A curated experience awaits. Select a service to begin your booking.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20">
        {categories.length === 0 ? (
          <div className="rounded-3xl border border-[#f0d9e2] bg-white/70 p-12 text-center text-[#7d6770]">
            This atelier hasn't published any services yet.
          </div>
        ) : (
          <div className="space-y-14">
            {categories.map((cat) => {
              const items = variants.filter((v) => v.category_id === cat.id);
              return (
                <section key={cat.id}>
                  <div className="mb-6 text-center">
                    <h2 className="text-3xl font-semibold" style={heading}>
                      {cat.name}
                    </h2>
                    <div className="mx-auto mt-3 h-px w-16" style={{ backgroundColor: primary }} />
                    {cat.description ? (
                      <p className="mt-3 text-sm text-[#7d6770]">{cat.description}</p>
                    ) : null}
                  </div>
                  <div className="space-y-4">
                    {items.map((v) => (
                      <div
                        key={v.id}
                        className="group flex items-center justify-between gap-4 rounded-3xl border border-[#f3e1e8] bg-white p-6 shadow-[0_8px_30px_-18px_rgba(233,79,138,0.45)] transition-all hover:-translate-y-0.5"
                      >
                        <div className="flex-1">
                          <h3 className="text-lg font-medium" style={heading}>
                            {v.name}
                          </h3>
                          {v.description ? (
                            <p className="mt-1 text-sm text-[#7d6770]">{v.description}</p>
                          ) : null}
                          <div className="mt-3 flex items-center gap-4 text-sm text-[#9a838c]">
                            <span className="font-semibold" style={{ color: primary }}>
                              {money(v.price_cents)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {v.duration_min} min
                            </span>
                          </div>
                        </div>
                        <Link
                          to="/booking/$slug"
                          params={{ slug }}
                          className="inline-flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: primary }}
                        >
                          Reserve <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {lengthOptions.length > 0 ? (
              <section className="text-center">
                <h2 className="mb-4 text-xl font-semibold" style={heading}>
                  Length &amp; sizing options
                </h2>
                <div className="flex flex-wrap justify-center gap-2">
                  {lengthOptions.map((l) => (
                    <span
                      key={l.id}
                      className="rounded-full border bg-white px-4 py-1.5 text-sm"
                      style={{ borderColor: primary, color: primary }}
                    >
                      {l.name}
                      {l.price_cents > 0 ? ` (+${money(l.price_cents)})` : ""}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}

        <div className="mt-16 flex justify-center">
          <Link
            to="/booking/$slug"
            params={{ slug }}
            className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            <CalendarHeart className="h-5 w-5" />
            Begin booking
          </Link>
        </div>
      </main>
    </div>
  );
}
