import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import { getStorefront } from "@/lib/tenant.functions";

const storefrontQuery = (slug: string) =>
  queryOptions({
    queryKey: ["storefront", slug],
    queryFn: () => getStorefront({ data: { slug } }),
  });

export const Route = createFileRoute("/$slug")({
  loader: async ({ params, context }) => {
    const slug = params.slug.toLowerCase();
    const data = await context.queryClient.ensureQueryData(storefrontQuery(slug));
    if (!data.workspace) throw notFound();
    return data;
  },
  component: StorefrontPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Storefront not found</h1>
        <p className="text-muted-foreground mb-6">No business is registered at this URL.</p>
        <Link to="/signup" className="text-primary hover:underline">
          Claim this URL
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
    </div>
  ),
  head: ({ params, loaderData }) => {
    const ws = loaderData?.workspace;
    const b = loaderData?.branding;
    const title = b?.hero_headline ?? ws?.name ?? params.slug;
    const description = b?.hero_subhead ?? `Book an appointment with ${ws?.name ?? params.slug}.`;
    return {
      meta: [
        { title: `${title} — Book online` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(b?.hero_image_url ? [{ property: "og:image", content: b.hero_image_url }] : []),
      ],
    };
  },
});

function formatPrice(cents: number) {
  if (cents === 0) return "Included";
  return `$${(cents / 100).toFixed(0)}`;
}

function StorefrontPage() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(storefrontQuery(params.slug));
  if (!data.workspace) return null;

  if (data.workspace.slug === "dolliimarie") {
    return <DolliimarieStorefront data={data} />;
  }
  return <DefaultStorefront data={data} />;
}

/* ============================================================
   DOLLIIMARIE — Luxury black + gold, script-driven, mobile-first
   ============================================================ */
function DolliimarieStorefront({ data }: { data: any }) {
  const { workspace, branding, categories, variants, lengthOptions, hairColors } = data;
  const handle = workspace.slug;

  return (
    <div className="dm-root min-h-screen">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Allura&family=Inter:wght@300;400;500;600&display=swap"
      />
      <style>{`
        .dm-root {
          --dm-bg: oklch(0.08 0.01 30);
          --dm-fg: oklch(0.95 0.02 80);
          --dm-primary: oklch(0.78 0.13 80);
          --dm-primary-glow: oklch(0.88 0.10 85);
          --dm-muted: oklch(0.65 0.03 70);
          --dm-card: oklch(0.11 0.01 30);
          --dm-border: color-mix(in oklab, oklch(0.78 0.13 80) 30%, transparent);
          --dm-gradient-gold: linear-gradient(135deg,#b8862f 0%,#f3d27a 35%,#fff4c2 50%,#f3d27a 65%,#8a5e1f 100%);
          --dm-shadow: 0 10px 40px -10px color-mix(in oklab, oklch(0.78 0.13 80) 40%, transparent);
          background-color: var(--dm-bg);
          color: var(--dm-fg);
          font-family: 'Inter', system-ui, sans-serif;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(243,210,122,0.06), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(243,210,122,0.05), transparent 40%),
            radial-gradient(circle at 50% 110%, rgba(243,210,122,0.04), transparent 50%);
        }
        .dm-script { font-family: 'Allura', cursive; font-weight: 400; }
        .dm-text-gold {
          background: var(--dm-gradient-gold);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: dm-shimmer 6s ease-in-out infinite;
        }
        @keyframes dm-shimmer {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .dm-card {
          background: var(--dm-card);
          border: 1px solid var(--dm-border);
          border-radius: 18px;
          padding: 1.25rem;
          box-shadow: var(--dm-shadow);
        }
        .dm-pill {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0.45rem 1.1rem; border-radius: 999px;
          border: 1px solid var(--dm-border);
          color: var(--dm-primary);
          text-transform: uppercase; letter-spacing: 0.32em;
          font-size: 11px; font-weight: 500;
        }
        .dm-ornament { color: color-mix(in oklab, var(--dm-primary) 60%, transparent); letter-spacing: 0.6em; }
        .dm-cta {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 0.95rem 1.25rem; border-radius: 999px;
          border: 1px solid var(--dm-border);
          color: var(--dm-primary);
          text-transform: uppercase; letter-spacing: 0.32em; font-size: 11px;
          transition: all .3s ease;
        }
        .dm-cta:hover { background: color-mix(in oklab, var(--dm-primary) 8%, transparent); transform: translateY(-1px); }
        .dm-eyebrow { text-transform: uppercase; letter-spacing: 0.5em; font-size: 10px; color: var(--dm-muted); }
        .dm-label { text-transform: uppercase; letter-spacing: 0.32em; font-size: 11px; color: var(--dm-muted); }
        .dm-price { color: var(--dm-primary); font-weight: 500; letter-spacing: 0.1em; }
        .dm-divider {
          display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0;
          color: color-mix(in oklab, var(--dm-primary) 50%, transparent);
        }
        .dm-divider::before, .dm-divider::after {
          content: ""; flex: 1; height: 1px;
          background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--dm-primary) 40%, transparent), transparent);
        }
        .dm-swatch {
          width: 36px; height: 36px; border-radius: 999px;
          border: 1px solid var(--dm-border);
          box-shadow: 0 0 0 2px color-mix(in oklab, var(--dm-primary) 10%, transparent);
        }
      `}</style>

      <div className="mx-auto max-w-[560px] px-5 py-10">
        {/* Header */}
        <header className="text-center">
          <div className="dm-eyebrow">Welcome to {workspace.name}</div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="dm-script dm-text-gold text-7xl md:text-8xl leading-none mt-4"
          >
            {branding?.hero_headline ?? workspace.name}
          </motion.h1>
          <nav className="mt-6 flex items-center justify-center gap-4 dm-label">
            <Link to="/$slug" params={{ slug: handle }} className="hover:text-[color:var(--dm-primary)] transition">Home</Link>
            <span className="text-[color:var(--dm-border)]">·</span>
            <Link to="/booking/$slug" params={{ slug: handle }} className="hover:text-[color:var(--dm-primary)] transition">Services</Link>
          </nav>
        </header>

        {branding?.hero_subhead && (
          <p className="mt-8 text-center text-sm text-[color:var(--dm-muted)] italic max-w-sm mx-auto leading-relaxed">
            {branding.hero_subhead}
          </p>
        )}

        {/* Ornament + Menu heading */}
        <div className="mt-12 text-center">
          <div className="dm-ornament text-sm">✦ ✦ ✦</div>
          <div className="mt-4 flex items-center justify-center">
            <span className="dm-pill">The Menu</span>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-8 space-y-10">
          {categories.length === 0 && (
            <p className="text-center text-sm text-[color:var(--dm-muted)] italic">Services coming soon.</p>
          )}
          {categories.map((cat: any) => {
            const catVariants = variants.filter((v: any) => v.category_id === cat.id);
            if (catVariants.length === 0) return null;
            return (
              <section key={cat.id}>
                <h2 className="dm-script dm-text-gold text-4xl text-center leading-none">{cat.name}</h2>
                {cat.description && (
                  <p className="mt-2 text-center text-xs text-[color:var(--dm-muted)] italic">{cat.description}</p>
                )}
                <div className="dm-divider"><span>✦</span></div>
                <div className="space-y-4">
                  {catVariants.map((v: any) => (
                    <div key={v.id} className="dm-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="dm-label text-[color:var(--dm-fg)]">{v.name}</h3>
                          {v.description && (
                            <p className="mt-2 text-xs text-[color:var(--dm-muted)] italic leading-relaxed">{v.description}</p>
                          )}
                          <div className="mt-3 flex items-center gap-1.5 dm-label">
                            <Clock className="w-3 h-3" />
                            <span>{v.duration_min} min</span>
                          </div>
                        </div>
                        <div className="dm-price text-lg">{formatPrice(v.price_cents)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Length options */}
        {lengthOptions.length > 0 && (
          <section className="mt-12">
            <div className="text-center">
              <span className="dm-pill">Length</span>
            </div>
            <div className="mt-5 dm-card">
              <ul className="divide-y" style={{ borderColor: "var(--dm-border)" }}>
                {lengthOptions.map((l: any) => (
                  <li key={l.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <span className="dm-label text-[color:var(--dm-fg)]">{l.name}</span>
                    <span className="dm-price text-sm">+{formatPrice(l.price_cents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Hair colors */}
        {hairColors.length > 0 && (
          <section className="mt-12">
            <div className="text-center">
              <span className="dm-pill">Color</span>
            </div>
            <div className="mt-5 dm-card">
              <div className="flex flex-wrap gap-4 justify-center">
                {hairColors.map((c: any) => (
                  <div key={c.id} className="flex flex-col items-center gap-2">
                    <div className="dm-swatch" style={{ backgroundColor: c.swatch_hex }} title={c.label} />
                    <span className="dm-label text-[10px]">{c.code}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mt-12">
          <Link to="/booking/$slug" params={{ slug: handle }} className="dm-cta">
            <span>{branding?.cta_label ?? "Reserve your seat"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-14 text-center">
          <div className="dm-ornament text-sm">✦</div>
          <p className="dm-script dm-text-gold text-3xl mt-2 leading-none">@{handle}</p>
          <p className="mt-6 dm-label text-[10px]">
            Powered by{" "}
            <Link to="/signup" className="underline underline-offset-4 hover:text-[color:var(--dm-primary)]">
              ProcSchedule
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ============================================================
   DEFAULT tenant storefront (unchanged behavior for others)
   ============================================================ */
function DefaultStorefront({ data }: { data: any }) {
  const { workspace, branding, categories, variants, lengthOptions, hairColors } = data;

  const primary = branding?.primary_hex ?? "#4f46e5";
  const accent = branding?.accent_hex ?? "#ec4899";
  const bg = branding?.background_hex ?? "#ffffff";
  const headingFont = branding?.heading_font ?? "Playfair Display";
  const bodyFont = branding?.body_font ?? "Inter";

  const themeStyle = {
    fontFamily: `${bodyFont}, system-ui, sans-serif`,
    backgroundColor: bg,
  } as React.CSSProperties;

  const headingStyle = { fontFamily: `${headingFont}, Georgia, serif` };
  const hasExtensions = lengthOptions.length > 0 || hairColors.length > 0;

  return (
    <div className="min-h-screen" style={themeStyle}>
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;700&family=${encodeURIComponent(bodyFont)}:wght@400;500;600&display=swap`}
      />

      <section className="relative overflow-hidden">
        {branding?.hero_image_url && (
          <div className="absolute inset-0">
            <img src={branding.hero_image_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent, ${bg} 90%)` }} />
          </div>
        )}
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-40 text-center">
          {branding?.logo_url && (
            <img src={branding.logo_url} alt={workspace.name} className="h-16 mx-auto mb-8 object-contain" />
          )}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold tracking-tight"
            style={{ ...headingStyle, color: primary }}
          >
            {branding?.hero_headline ?? workspace.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg md:text-xl opacity-80 max-w-2xl mx-auto"
          >
            {branding?.hero_subhead ?? `Book your appointment with ${workspace.name}.`}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Link
              to="/booking/$slug"
              params={{ slug: workspace.slug }}
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
              style={{ backgroundColor: primary }}
            >
              {branding?.cta_label ?? "Book now"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ ...headingStyle, color: primary }}>
          Services
        </h2>

        {categories.length === 0 ? (
          <p className="text-center opacity-70">Services coming soon.</p>
        ) : (
          <div className="space-y-12">
            {categories.map((cat: any) => {
              const catVariants = variants.filter((v: any) => v.category_id === cat.id);
              return (
                <div key={cat.id}>
                  <h3 className="text-2xl font-semibold mb-2" style={headingStyle}>{cat.name}</h3>
                  {cat.description && <p className="opacity-70 mb-6">{cat.description}</p>}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {catVariants.map((v: any) => (
                      <Link
                        key={v.id}
                        to="/booking/$slug"
                        params={{ slug: workspace.slug }}
                        className="group rounded-2xl border bg-white/60 backdrop-blur p-5 hover:shadow-lg transition-all hover:-translate-y-0.5"
                        style={{ borderColor: `${primary}20` }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg" style={headingStyle}>{v.name}</h4>
                            {v.description && <p className="text-sm opacity-70 mt-1">{v.description}</p>}
                            <div className="flex items-center gap-3 mt-3 text-sm opacity-70">
                              <Clock className="w-3.5 h-3.5" />
                              {v.duration_min} min
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold" style={{ color: accent }}>
                              {formatPrice(v.price_cents)}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasExtensions && (
          <div className="mt-16 grid md:grid-cols-2 gap-8">
            {lengthOptions.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4" style={headingStyle}>Length add-ons</h3>
                <div className="flex flex-wrap gap-2">
                  {lengthOptions.map((l: any) => (
                    <div key={l.id} className="px-4 py-2 rounded-full border text-sm" style={{ borderColor: `${primary}30` }}>
                      <span className="font-medium">{l.name}</span>
                      <span className="ml-2 opacity-70">+{formatPrice(l.price_cents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hairColors.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4" style={headingStyle}>Color options</h3>
                <div className="flex flex-wrap gap-3">
                  {hairColors.map((c: any) => (
                    <div key={c.id} className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded-full border-2 shadow-sm"
                        style={{ backgroundColor: c.swatch_hex, borderColor: `${primary}30` }}
                        title={c.label}
                      />
                      <span className="text-xs opacity-70">{c.code}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-16 text-center">
          <Link
            to="/booking/$slug"
            params={{ slug: workspace.slug }}
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
            style={{ backgroundColor: primary }}
          >
            {branding?.cta_label ?? "Book now"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t mt-16 py-8 text-center text-sm opacity-60" style={{ borderColor: `${primary}15` }}>
        <p>
          Powered by{" "}
          <Link to="/signup" className="underline">ProcSchedule</Link>
        </p>
      </footer>
    </div>
  );
}
