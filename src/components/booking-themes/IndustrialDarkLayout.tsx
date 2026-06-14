import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, ArrowRight, Zap, CalendarCheck } from "lucide-react";
import type { StorefrontThemeProps } from "./types";
import { money } from "./types";

/**
 * Industrial Dark skin — high-contrast, technical, monochrome base. Branding
 * tokens (primary_color, font_family, logo_url) are injected dynamically.
 */
export function IndustrialDarkLayout({
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
    <div className="min-h-screen bg-[#0c0d10] text-zinc-100" style={{ fontFamily: fontStack }}>
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-zinc-800 px-6 py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative mx-auto max-w-5xl">
          {workspace.logo_url ? (
            <img
              src={workspace.logo_url}
              alt={`${workspace.name} logo`}
              className="mb-6 h-16 w-16 rounded-md object-cover ring-1 ring-zinc-700"
            />
          ) : null}
          <div
            className="mb-4 inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: primary, borderColor: primary }}
          >
            <Zap className="h-3 w-3" /> Booking
          </div>
          <h1 className="text-4xl font-bold uppercase tracking-tight sm:text-6xl" style={heading}>
            {workspace.name}
          </h1>
          <p className="mt-4 max-w-xl text-zinc-400">
            Select a service module below to schedule your appointment.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        {categories.length === 0 ? (
          <div className="border border-dashed border-zinc-700 p-12 text-center text-zinc-500">
            No services published yet.
          </div>
        ) : (
          <div className="space-y-16">
            {categories.map((cat) => {
              const items = variants.filter((v) => v.category_id === cat.id);
              return (
                <section key={cat.id}>
                  <div className="mb-6 flex items-center gap-4">
                    <h2 className="text-2xl font-bold uppercase tracking-tight" style={heading}>
                      {cat.name}
                    </h2>
                    <div className="h-px flex-1" style={{ backgroundColor: primary }} />
                  </div>
                  {cat.description ? (
                    <p className="mb-5 text-sm text-zinc-400">{cat.description}</p>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {items.map((v) => (
                      <div
                        key={v.id}
                        className="group flex flex-col justify-between border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-600"
                        style={{ borderLeft: `3px solid ${primary}` }}
                      >
                        <div>
                          <h3 className="font-semibold text-zinc-100">{v.name}</h3>
                          {v.description ? (
                            <p className="mt-1 text-sm text-zinc-400">{v.description}</p>
                          ) : null}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 text-sm text-zinc-400">
                            <span className="font-semibold" style={{ color: primary }}>
                              {money(v.price_cents)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {v.duration_min} min
                            </span>
                          </div>
                          <Link
                            to="/booking/$slug"
                            params={{ slug }}
                            className="inline-flex items-center gap-1 rounded-sm px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-black transition-opacity group-hover:opacity-90"
                            style={{ backgroundColor: primary }}
                          >
                            Book <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {lengthOptions.length > 0 ? (
              <section>
                <h2 className="mb-4 text-lg font-bold uppercase tracking-tight" style={heading}>
                  Length &amp; sizing options
                </h2>
                <div className="flex flex-wrap gap-2">
                  {lengthOptions.map((l) => (
                    <span
                      key={l.id}
                      className="rounded-sm border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300"
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
            className="inline-flex items-center gap-2 rounded-sm px-8 py-3.5 font-semibold uppercase tracking-wide text-black shadow-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            <CalendarCheck className="h-5 w-5" />
            Start booking
          </Link>
        </div>
      </main>
    </div>
  );
}
