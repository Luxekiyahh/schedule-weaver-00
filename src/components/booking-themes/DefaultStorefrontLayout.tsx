import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Sparkles, ArrowRight, CalendarCheck } from "lucide-react";
import type { StorefrontThemeProps } from "./types";
import { money } from "./types";

/**
 * Default storefront skin — the original /book/$slug presentation, extracted
 * verbatim so workspaces without a theme_id keep today's look.
 */
export function DefaultStorefrontLayout({
  workspace,
  categories,
  variants,
  lengthOptions,
  slug,
  primary,
  secondary,
  fontStack,
}: StorefrontThemeProps) {
  const themeVars = {
    "--brand": primary,
    "--brand-2": secondary,
    fontFamily: fontStack,
  } as CSSProperties;

  return (
    <div className="min-h-screen bg-background text-foreground" style={themeVars}>
      {/* Hero */}
      <header
        className="relative overflow-hidden px-6 py-16 text-white sm:py-20"
        style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
      >
        <div className="mx-auto max-w-4xl text-center">
          {workspace.logo_url ? (
            <img
              src={workspace.logo_url}
              alt={`${workspace.name} logo`}
              className="mx-auto mb-6 h-20 w-20 rounded-2xl object-cover shadow-lg"
            />
          ) : null}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl" style={{ fontFamily: fontStack }}>
            {workspace.name}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Choose a service below to start booking your appointment.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            This business hasn't published any services yet.
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((cat) => {
              const items = variants.filter((v) => v.category_id === cat.id);
              return (
                <section key={cat.id}>
                  <div className="mb-5">
                    <h2 className="text-2xl font-semibold" style={{ fontFamily: fontStack }}>
                      {cat.name}
                    </h2>
                    {cat.description ? (
                      <p className="mt-1 text-muted-foreground">{cat.description}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {items.map((v) => (
                      <div
                        key={v.id}
                        className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                      >
                        <div>
                          <h3 className="font-medium">{v.name}</h3>
                          {v.description ? (
                            <p className="mt-1 text-sm text-muted-foreground">{v.description}</p>
                          ) : null}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{money(v.price_cents)}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {v.duration_min} min
                            </span>
                          </div>
                          <Link
                            to="/booking/$slug"
                            params={{ slug }}
                            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-white transition-opacity group-hover:opacity-90"
                            style={{ background: primary }}
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
                <h2 className="mb-4 text-lg font-semibold">Length & sizing options</h2>
                <div className="flex flex-wrap gap-2">
                  {lengthOptions.map((l) => (
                    <span
                      key={l.id}
                      className="rounded-full border border-border bg-muted px-3 py-1.5 text-sm"
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

        <div className="mt-12 flex justify-center">
          <Link
            to="/booking/$slug"
            params={{ slug }}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          >
            <CalendarCheck className="h-5 w-5" />
            Start booking
          </Link>
        </div>
      </main>
    </div>
  );
}
