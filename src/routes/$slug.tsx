import * as React from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { Clock, ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";
import { getStorefront } from "@/lib/tenant.functions";
import { supabase } from "@/integrations/supabase/client";

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
  return <StorefrontView data={data} />;
}

/**
 * Reusable storefront renderer — used by /$slug route AND by the index route
 * when a tenant subdomain (e.g. dolliimarie.procschedule.com) is detected.
 */
export function StorefrontView({ data }: { data: any }) {
  return (
    <>
      <OwnerAdminOverlay ownerId={data.workspace.owner_id} />
      {data.workspace.slug === "dolliimarie" ? (
        <DolliimarieStorefront data={data} />
      ) : (
        <DefaultStorefront data={data} />
      )}
    </>
  );
}

/**
 * Client-side fetcher variant used by the subdomain-routed root path.
 * The /$slug file route preloads via loader; this component fetches at
 * mount time because hostname parsing can only happen on the client.
 */
export function TenantStorefrontBySlug({ slug }: { slug: string }) {
  const { data, isLoading, error } = useQuery(storefrontQuery(slug));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading storefront…</div>
      </div>
    );
  }
  if (error || !data?.workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Storefront not found</h1>
          <p className="text-muted-foreground mb-6">
            No business is registered at <code>{slug}</code>.
          </p>
          <a href="https://procschedule.com/signup" className="text-primary hover:underline">
            Claim this subdomain
          </a>
        </div>
      </div>
    );
  }
  return <StorefrontView data={data} />;
}

function OwnerAdminOverlay({ ownerId }: { ownerId?: string | null }) {
  const [isStorefrontOwner, setIsStorefrontOwner] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setIsStorefrontOwner(!!data.user && !!ownerId && data.user.id === ownerId);
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsStorefrontOwner(!!session?.user && !!ownerId && session.user.id === ownerId);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [ownerId]);

  if (!isStorefrontOwner) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 backdrop-blur-md bg-black/80 text-white border border-white/10 px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 transition-all hover:scale-105">
      <Sparkles className="h-4 w-4 text-amber-300" />
      <span className="hidden sm:inline text-xs font-medium opacity-90">
        You are viewing your public site
      </span>
      <button
        type="button"
        onClick={() => {
          window.location.href = "https://procschedule.com/dashboard/home";
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-white text-black text-xs font-semibold px-3 py-1.5 hover:bg-white/90 transition"
      >
        <LayoutDashboard className="h-3.5 w-3.5" />
        Go to Admin Dashboard
      </button>
    </div>
  );
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
   DEFAULT tenant storefront — AI design-tokens driven, real DB content
   ============================================================ */

type UiTokens = {
  card_layout_style?: "bento-grid" | "editorial-stack" | "modern-minimalist";
  border_radius_class?: "rounded-none" | "rounded-xl" | "rounded-full";
  shadow_intensity_class?: "shadow-none" | "shadow-sm" | "shadow-xl";
  glassmorphism_enabled?: boolean;
  button_hover_animation?: "scale-up" | "glow-border" | "slide-shimmer";
  spacing_density?: "compact" | "spacious" | "elegant-relaxed";
};

type HeroVisuals = {
  layout_alignment?: "left-split" | "center-column";
  headline_text?: string;
  subheadline_text?: string;
};

type LayoutConfig = {
  card_background_hex?: string;
  ui_tokens?: UiTokens;
  hero_visuals?: HeroVisuals;
};

function densityPadding(d?: UiTokens["spacing_density"]) {
  switch (d) {
    case "compact": return "p-4";
    case "elegant-relaxed": return "p-8";
    case "spacious":
    default: return "p-6";
  }
}

function densityGap(d?: UiTokens["spacing_density"]) {
  switch (d) {
    case "compact": return "gap-3";
    case "elegant-relaxed": return "gap-8";
    case "spacious":
    default: return "gap-5";
  }
}

function hoverClasses(a?: UiTokens["button_hover_animation"]) {
  switch (a) {
    case "glow-border":
      return "transition-all duration-300 hover:ring-2 hover:ring-offset-2 hover:ring-offset-transparent";
    case "slide-shimmer":
      return "relative overflow-hidden transition-all duration-300 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full";
    case "scale-up":
    default:
      return "transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.02]";
  }
}

function DefaultStorefront({ data }: { data: any }) {
  const { workspace, branding, categories, variants, lengthOptions, hairColors } = data;

  const primary = branding?.primary_hex ?? "#4f46e5";
  const accent = branding?.accent_hex ?? "#ec4899";
  const bg = branding?.background_hex ?? "#ffffff";
  const headingFont = branding?.heading_font ?? "Playfair Display";
  const bodyFont = branding?.body_font ?? "Inter";

  const layout: LayoutConfig = (branding?.layout_config as LayoutConfig) ?? {};
  const cardBg = layout.card_background_hex ?? "#ffffff";
  const tokens: UiTokens = layout.ui_tokens ?? {};
  const hero: HeroVisuals = layout.hero_visuals ?? {};

  const cardLayout = tokens.card_layout_style ?? "modern-minimalist";
  const radiusClass = tokens.border_radius_class ?? "rounded-xl";
  const shadowClass = tokens.shadow_intensity_class ?? "shadow-sm";
  const glass = tokens.glassmorphism_enabled === true;
  const hoverCls = hoverClasses(tokens.button_hover_animation);
  const pad = densityPadding(tokens.spacing_density);
  const gap = densityGap(tokens.spacing_density);

  const heroAlign = hero.layout_alignment ?? "center-column";
  const headlineText = hero.headline_text ?? branding?.hero_headline ?? workspace.name;
  const subheadText = hero.subheadline_text ?? branding?.hero_subhead ?? `Book your appointment with ${workspace.name}.`;

  const themeStyle = {
    fontFamily: `'${bodyFont}', system-ui, sans-serif`,
    backgroundColor: bg,
    color: `color-mix(in srgb, ${primary} 92%, black)`,
  } as React.CSSProperties;
  const headingStyle = { fontFamily: `'${headingFont}', Georgia, serif` };

  // Glassmorphism card style — applied via inline style + utility classes
  const cardClass = [
    radiusClass,
    shadowClass,
    pad,
    "border",
    glass ? "backdrop-blur-md bg-opacity-70 border-white/10" : "",
  ].filter(Boolean).join(" ");

  const cardStyle: React.CSSProperties = glass
    ? { backgroundColor: `${cardBg}b3`, borderColor: `${primary}26` }
    : { backgroundColor: cardBg, borderColor: `${primary}1f` };

  // Interactive state
  const [activeVariant, setActiveVariant] = React.useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedLengthId, setSelectedLengthId] = React.useState<string | null>(null);
  const [selectedColorId, setSelectedColorId] = React.useState<string | null>(null);

  const selectedLength = lengthOptions.find((l: any) => l.id === selectedLengthId);
  const selectedColor = hairColors.find((c: any) => c.id === selectedColorId);

  const basePrice = activeVariant?.price_cents ?? 0;
  const lengthPrice = selectedLength?.price_cents ?? 0;
  const currentTotalCents = basePrice + lengthPrice;
  const depositCents = Math.round(currentTotalCents * 0.25);

  const openServiceDrawer = (v: any) => { setActiveVariant(v); setDrawerOpen(true); };

  const bookingHref = `/booking/${workspace.slug}`;
  const bookingQuery = (() => {
    const p = new URLSearchParams();
    if (activeVariant) p.set("variant", activeVariant.id);
    if (selectedLengthId) p.set("length", selectedLengthId);
    if (selectedColor) p.set("color", selectedColor.code);
    const q = p.toString();
    return q ? `?${q}` : "";
  })();

  // Bento-grid sizing helper — alternates large/small to create asymmetry
  const bentoSpan = (i: number) => {
    const pattern = [
      "md:col-span-2 md:row-span-2",
      "md:col-span-1",
      "md:col-span-1",
      "md:col-span-1 md:row-span-2",
      "md:col-span-1",
      "md:col-span-1",
    ];
    return pattern[i % pattern.length];
  };

  return (
    <div className="min-h-screen" style={themeStyle}>
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;600;700&family=${encodeURIComponent(bodyFont)}:wght@400;500;600&display=swap`}
      />

      {/* ============ HERO ============ */}
      {heroAlign === "left-split" ? (
        <section className="relative grid md:grid-cols-2 min-h-[70vh] overflow-hidden">
          <div className="relative flex items-center px-6 md:px-16 py-20">
            <div>
              {branding?.logo_url && (
                <img src={branding.logo_url} alt={workspace.name} className="h-12 mb-8 object-contain" />
              )}
              <motion.h1
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-bold tracking-tight"
                style={{ ...headingStyle, color: primary }}
              >
                {headlineText}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-5 text-lg md:text-xl opacity-80 max-w-md"
              >
                {subheadText}
              </motion.p>
              <Link
                to="/booking/$slug" params={{ slug: workspace.slug }}
                className={`mt-8 inline-flex items-center gap-2 ${radiusClass} ${shadowClass} ${hoverCls} px-8 py-4 text-base font-medium text-white`}
                style={{ backgroundColor: primary }}
              >
                {branding?.cta_label ?? "Book now"} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div
            className="relative min-h-[40vh] md:min-h-full overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${primary}22, ${accent}22)` }}
          >
            {branding?.hero_image_url && (
              <img src={branding.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 30%, ${accent}40, transparent 60%)` }} />
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `radial-gradient(circle at 20% 20%, ${primary}33, transparent 50%), radial-gradient(circle at 80% 60%, ${accent}33, transparent 55%)`,
            }}
          />
          <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 md:pt-36 md:pb-28 text-center">
            {branding?.logo_url && (
              <img src={branding.logo_url} alt={workspace.name} className="h-16 mx-auto mb-8 object-contain" />
            )}
            <motion.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-bold tracking-tight"
              style={{ ...headingStyle, color: primary }}
            >
              {headlineText}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-lg md:text-xl opacity-80 max-w-2xl mx-auto"
            >
              {subheadText}
            </motion.p>
            <Link
              to="/booking/$slug" params={{ slug: workspace.slug }}
              className={`mt-10 inline-flex items-center gap-2 ${radiusClass} ${shadowClass} ${hoverCls} px-10 py-5 text-base font-medium text-white`}
              style={{ backgroundColor: primary }}
            >
              {branding?.cta_label ?? "Book now"} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ============ SERVICES (real DB data, styled by ui_tokens) ============ */}
      <section className="max-w-6xl mx-auto px-6 py-16 pb-32">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10" style={{ ...headingStyle, color: primary }}>
          Services
        </h2>

        {categories.length === 0 ? (
          <p className="text-center opacity-70">Services coming soon.</p>
        ) : cardLayout === "editorial-stack" ? (
          /* EDITORIAL STACK — centered single column premium list */
          <div className={`max-w-2xl mx-auto flex flex-col ${gap}`}>
            {categories.map((cat: any) => {
              const catVariants = variants.filter((v: any) => v.category_id === cat.id);
              if (catVariants.length === 0) return null;
              return (
                <div key={cat.id}>
                  <h3 className="text-2xl font-semibold mb-1 text-center" style={headingStyle}>{cat.name}</h3>
                  {cat.description && <p className="opacity-70 mb-5 text-center text-sm">{cat.description}</p>}
                  <div className={`flex flex-col ${gap}`}>
                    {catVariants.map((v: any) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => openServiceDrawer(v)}
                        className={`${cardClass} ${hoverCls} text-left w-full group`}
                        style={cardStyle}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg" style={headingStyle}>{v.name}</h4>
                            {v.description && <p className="text-sm opacity-70 mt-1">{v.description}</p>}
                            <div className="flex items-center gap-3 mt-3 text-sm opacity-70">
                              <Clock className="w-3.5 h-3.5" /> {v.duration_min} min
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold" style={{ color: accent }}>{formatPrice(v.price_cents)}</div>
                            <div className="text-xs opacity-60 mt-1">Customize →</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : cardLayout === "bento-grid" ? (
          /* BENTO GRID — asymmetric modular blocks */
          <div className={`grid grid-cols-1 md:grid-cols-3 auto-rows-[minmax(160px,auto)] ${gap}`}>
            {categories.flatMap((cat: any) =>
              variants
                .filter((v: any) => v.category_id === cat.id)
                .map((v: any, i: number) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => openServiceDrawer(v)}
                    className={`${cardClass} ${hoverCls} ${bentoSpan(i)} text-left flex flex-col justify-between group`}
                    style={cardStyle}
                  >
                    <div>
                      <span
                        className={`inline-block text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 ${radiusClass} mb-3`}
                        style={{ backgroundColor: `${accent}1f`, color: accent }}
                      >
                        {cat.name}
                      </span>
                      <h4 className="font-semibold text-xl leading-tight" style={headingStyle}>{v.name}</h4>
                      {v.description && <p className="text-sm opacity-70 mt-2 line-clamp-3">{v.description}</p>}
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <div className="flex items-center gap-1.5 text-xs opacity-70">
                        <Clock className="w-3 h-3" /> {v.duration_min} min
                      </div>
                      <div className="text-lg font-bold" style={{ color: primary }}>{formatPrice(v.price_cents)}</div>
                    </div>
                  </button>
                ))
            )}
          </div>
        ) : (
          /* MODERN MINIMALIST — clean two-column grid */
          <div className={`flex flex-col ${gap}`}>
            {categories.map((cat: any) => {
              const catVariants = variants.filter((v: any) => v.category_id === cat.id);
              if (catVariants.length === 0) return null;
              return (
                <div key={cat.id}>
                  <h3 className="text-2xl font-semibold mb-2" style={headingStyle}>{cat.name}</h3>
                  {cat.description && <p className="opacity-70 mb-5">{cat.description}</p>}
                  <div className={`grid sm:grid-cols-2 ${gap}`}>
                    {catVariants.map((v: any) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => openServiceDrawer(v)}
                        className={`${cardClass} ${hoverCls} text-left group`}
                        style={cardStyle}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg" style={headingStyle}>{v.name}</h4>
                            {v.description && <p className="text-sm opacity-70 mt-1">{v.description}</p>}
                            <div className="flex items-center gap-3 mt-3 text-sm opacity-70">
                              <Clock className="w-3.5 h-3.5" /> {v.duration_min} min
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold" style={{ color: accent }}>{formatPrice(v.price_cents)}</div>
                            <div className="text-xs opacity-60 mt-1">Customize →</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="border-t pt-8 pb-24 text-center text-sm opacity-60" style={{ borderColor: `${primary}15` }}>
        <p>Powered by <Link to="/signup" className="underline">ProcSchedule</Link></p>
      </footer>

      {/* ============ SERVICE OPTIONS DRAWER ============ */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 flex flex-col" style={{ backgroundColor: bg }}>
          <SheetHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: `${primary}15` }}>
            <SheetTitle style={{ ...headingStyle, color: primary }} className="text-2xl">
              {activeVariant?.name ?? "Customize"}
            </SheetTitle>
            {activeVariant?.description && (
              <p className="text-sm opacity-70 mt-1">{activeVariant.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm opacity-70">
              <Clock className="w-3.5 h-3.5" /> {activeVariant?.duration_min ?? 0} min
              <span>•</span>
              <span>Base {formatPrice(basePrice)}</span>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {/* Length add-on chips */}
            {lengthOptions.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-[0.2em] opacity-60 mb-3">Length</h4>
                <div className="flex flex-wrap gap-2">
                  {lengthOptions.map((l: any) => {
                    const active = selectedLengthId === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setSelectedLengthId(active ? null : l.id)}
                        className={`${radiusClass} ${hoverCls} border-2 px-4 py-2 text-sm font-medium`}
                        style={{
                          borderColor: active ? primary : `${primary}33`,
                          backgroundColor: active ? `${primary}14` : "transparent",
                          color: active ? primary : undefined,
                        }}
                      >
                        <span>{l.name}</span>
                        <span className="ml-2 text-xs opacity-70">
                          {l.price_cents === 0 ? "Base" : `+${formatPrice(l.price_cents)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color add-on chips */}
            {hairColors.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-[0.2em] opacity-60 mb-3">Color</h4>
                <div className="flex flex-wrap gap-3">
                  {hairColors.map((c: any) => {
                    const active = selectedColorId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedColorId(active ? null : c.id)}
                        className={`flex flex-col items-center gap-1.5 ${hoverCls}`}
                        title={c.label}
                      >
                        <div
                          className="w-11 h-11 rounded-full transition-all"
                          style={{
                            backgroundColor: c.swatch_hex,
                            boxShadow: active ? `0 0 0 3px ${bg}, 0 0 0 5px ${primary}` : `0 0 0 1px ${primary}30`,
                          }}
                        />
                        <span className={`text-[10px] tracking-wider transition ${active ? "font-bold" : "opacity-60"}`}>{c.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live total */}
            <div className={`${radiusClass} p-4`} style={{ backgroundColor: `${primary}10` }}>
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Base</span>
                <span className="font-medium">{formatPrice(basePrice)}</span>
              </div>
              {selectedLength && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="opacity-70">Length ({selectedLength.name})</span>
                  <span className="font-medium">+{formatPrice(selectedLength.price_cents)}</span>
                </div>
              )}
              <div className="border-t my-3" style={{ borderColor: `${primary}20` }} />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold" style={{ color: primary }}>{formatPrice(currentTotalCents)}</span>
              </div>
              <div className="flex justify-between text-xs opacity-70 mt-1">
                <span>Deposit due today (25%)</span>
                <span>{formatPrice(depositCents)}</span>
              </div>
            </div>
          </div>

          <div className="border-t p-4" style={{ borderColor: `${primary}15` }}>
            <a
              href={`${bookingHref}${bookingQuery}`}
              className={`flex items-center justify-center gap-2 w-full ${radiusClass} ${shadowClass} ${hoverCls} px-6 py-4 text-white font-semibold`}
              style={{ backgroundColor: primary }}
            >
              Secure Appointment Slot <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </SheetContent>
      </Sheet>

      {/* ============ STICKY MOBILE CHECKOUT BAR ============ */}
      {activeVariant && !drawerOpen && (
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3"
        >
          <div
            className={`mx-auto max-w-3xl ${radiusClass} ${shadowClass} ring-1 backdrop-blur-xl flex items-center gap-3 p-3`}
            style={{
              backgroundColor: `${bg}f0`,
              boxShadow: `0 10px 40px -10px ${primary}40`,
              borderColor: `${primary}25`,
            }}
          >
            <div className="flex-1 min-w-0 px-2">
              <div className="text-xs opacity-70 truncate">
                {activeVariant.name}
                {selectedLength && ` • ${selectedLength.name}`}
                {selectedColor && ` • #${selectedColor.code}`}
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-bold text-lg" style={{ color: primary }}>{formatPrice(currentTotalCents)}</span>
                <span className="text-[10px] opacity-60">deposit {formatPrice(depositCents)}</span>
              </div>
            </div>
            <a
              href={`${bookingHref}${bookingQuery}`}
              className={`relative inline-flex items-center gap-1.5 ${radiusClass} ${hoverCls} px-5 py-3 text-sm font-semibold text-white shadow-lg whitespace-nowrap`}
              style={{ backgroundColor: primary }}
            >
              <span
                className="absolute inset-0 rounded-[inherit] animate-ping opacity-40"
                style={{ backgroundColor: primary }}
              />
              <span className="relative">Secure Slot</span>
              <ArrowRight className="relative w-4 h-4" />
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}

