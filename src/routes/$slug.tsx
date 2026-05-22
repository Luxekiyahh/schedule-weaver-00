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
   DEFAULT tenant storefront — premium, conversion-optimized
   ============================================================ */

type LayoutConfig = {
  hero_style?: "split_screen" | "minimalist_centered" | "ambient_glow";
  card_corners?: "sharp" | "rounded" | "hyper_rounded";
  enable_sticky_booking_bar?: boolean;
  enable_portfolio_gallery?: boolean;
};

const GALLERY_SETS: Record<string, { src: string; tag: string }[]> = {
  hair: [
    { src: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&q=80&auto=format&fit=crop", tag: "Luxury Sew-In • 22\"" },
    { src: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80&auto=format&fit=crop", tag: "Honey Blonde • Tape-In" },
    { src: "https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800&q=80&auto=format&fit=crop", tag: "Natural Black • K-Tip" },
    { src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&auto=format&fit=crop", tag: "Chestnut Layers • 20\"" },
    { src: "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=800&q=80&auto=format&fit=crop", tag: "Platinum Install • 24\"" },
    { src: "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=800&q=80&auto=format&fit=crop", tag: "Burgundy Tips • 18\"" },
  ],
  nail: [
    { src: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format&fit=crop", tag: "Almond • Nude" },
    { src: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80&auto=format&fit=crop", tag: "French Tip Set" },
    { src: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800&q=80&auto=format&fit=crop", tag: "Chrome Detail" },
    { src: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&q=80&auto=format&fit=crop", tag: "Stiletto • Red" },
  ],
  spa: [
    { src: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80&auto=format&fit=crop", tag: "Deep Tissue" },
    { src: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80&auto=format&fit=crop", tag: "Hot Stone" },
    { src: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80&auto=format&fit=crop", tag: "Aromatherapy" },
    { src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&auto=format&fit=crop", tag: "Facial Glow" },
  ],
  default: [
    { src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80&auto=format&fit=crop", tag: "Signature Service" },
    { src: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&q=80&auto=format&fit=crop", tag: "Premium Finish" },
    { src: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80&auto=format&fit=crop", tag: "Client Favorite" },
    { src: "https://images.unsplash.com/photo-1554519515-242161756769?w=800&q=80&auto=format&fit=crop", tag: "Best Seller" },
  ],
};

function pickGallerySet(workspace: any, categories: any[]) {
  const haystack = (workspace.name + " " + categories.map((c) => c.name).join(" ")).toLowerCase();
  if (/hair|extension|salon|braid/.test(haystack)) return GALLERY_SETS.hair;
  if (/nail|manicure|pedicure/.test(haystack)) return GALLERY_SETS.nail;
  if (/spa|massage|facial|wellness/.test(haystack)) return GALLERY_SETS.spa;
  return GALLERY_SETS.default;
}

function radiusClass(corners?: LayoutConfig["card_corners"]) {
  switch (corners) {
    case "sharp": return "rounded-none";
    case "hyper_rounded": return "rounded-[2rem]";
    case "rounded":
    default: return "rounded-2xl";
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
  const heroStyle = layout.hero_style ?? "minimalist_centered";
  const radius = radiusClass(layout.card_corners);
  const showGallery = layout.enable_portfolio_gallery !== false;
  const showStickyBar = layout.enable_sticky_booking_bar !== false;

  const themeStyle = {
    fontFamily: `${bodyFont}, system-ui, sans-serif`,
    backgroundColor: bg,
  } as React.CSSProperties;
  const headingStyle = { fontFamily: `${headingFont}, Georgia, serif` };

  // Interactive selection state
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

  const openServiceDrawer = (v: any) => {
    setActiveVariant(v);
    setDrawerOpen(true);
  };

  const galleryImages = pickGallerySet(workspace, categories);

  const bookingHref = `/booking/${workspace.slug}`;
  const bookingQuery = (() => {
    const params = new URLSearchParams();
    if (activeVariant) params.set("variant", activeVariant.id);
    if (selectedLengthId) params.set("length", selectedLengthId);
    if (selectedColor) params.set("color", selectedColor.code);
    const q = params.toString();
    return q ? `?${q}` : "";
  })();

  return (
    <div className="min-h-screen" style={themeStyle}>
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;700&family=${encodeURIComponent(bodyFont)}:wght@400;500;600&display=swap`}
      />

      {/* ============ HERO ============ */}
      {heroStyle === "split_screen" ? (
        <section className="relative grid md:grid-cols-2 min-h-[80vh] overflow-hidden">
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
                {branding?.hero_headline ?? workspace.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-5 text-lg md:text-xl opacity-80 max-w-md"
              >
                {branding?.hero_subhead ?? `Book your appointment with ${workspace.name}.`}
              </motion.p>
              <Link
                to="/booking/$slug" params={{ slug: workspace.slug }}
                className={`mt-8 inline-flex items-center gap-2 ${radius} px-8 py-4 text-base font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105`}
                style={{ backgroundColor: primary }}
              >
                {branding?.cta_label ?? "Book now"} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="relative min-h-[40vh] md:min-h-full overflow-hidden">
            <img
              src={branding?.hero_image_url ?? galleryImages[0].src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
          </div>
        </section>
      ) : heroStyle === "ambient_glow" ? (
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background: `radial-gradient(circle at 20% 20%, ${primary}55, transparent 50%), radial-gradient(circle at 80% 60%, ${accent}44, transparent 55%)`,
            }}
          />
          <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-28 md:pt-36 md:pb-44 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-bold tracking-tight"
              style={{ ...headingStyle, color: primary }}
            >
              {branding?.hero_headline ?? workspace.name}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-lg md:text-2xl opacity-80 max-w-2xl mx-auto"
            >
              {branding?.hero_subhead ?? `Book your appointment with ${workspace.name}.`}
            </motion.p>
            <Link
              to="/booking/$slug" params={{ slug: workspace.slug }}
              className={`mt-10 inline-flex items-center gap-2 ${radius} px-10 py-5 text-base font-medium text-white shadow-2xl hover:shadow-xl transition-all hover:scale-105`}
              style={{ backgroundColor: primary }}
            >
              {branding?.cta_label ?? "Book now"} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      ) : (
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
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold tracking-tight"
              style={{ ...headingStyle, color: primary }}
            >
              {branding?.hero_headline ?? workspace.name}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-lg md:text-xl opacity-80 max-w-2xl mx-auto"
            >
              {branding?.hero_subhead ?? `Book your appointment with ${workspace.name}.`}
            </motion.p>
            <Link
              to="/booking/$slug" params={{ slug: workspace.slug }}
              className={`mt-8 inline-flex items-center gap-2 ${radius} px-8 py-4 text-base font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105`}
              style={{ backgroundColor: primary }}
            >
              {branding?.cta_label ?? "Book now"} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ============ INSPIRATION GALLERY ============ */}
      {showGallery && (
        <section className="max-w-6xl mx-auto px-6 py-14">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] opacity-60">Book the Look</p>
              <h2 className="mt-2 text-3xl md:text-4xl font-bold" style={{ ...headingStyle, color: primary }}>
                Inspiration Gallery
              </h2>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-5 md:overflow-visible">
            {galleryImages.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className={`group relative shrink-0 w-[78%] sm:w-[55%] md:w-auto snap-center overflow-hidden ${radius} shadow-md`}
                style={{ aspectRatio: i % 3 === 1 ? "3/4" : "4/5" }}
              >
                <img src={img.src} alt={img.tag} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-x-0 bottom-0 p-5 translate-y-3 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <p className="text-white text-sm font-medium mb-3">{img.tag}</p>
                  <button
                    onClick={() => {
                      const first = variants[0];
                      if (first) openServiceDrawer(first);
                    }}
                    className={`inline-flex items-center gap-2 ${radius} px-4 py-2 text-xs font-semibold text-white backdrop-blur bg-white/15 ring-1 ring-white/30 hover:bg-white/25 transition`}
                  >
                    Book This Look <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ============ SERVICES ============ */}
      <section className="max-w-5xl mx-auto px-6 py-12 pb-32">
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
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => openServiceDrawer(v)}
                        className={`group ${radius} border bg-white/60 backdrop-blur p-5 text-left hover:shadow-lg transition-all hover:-translate-y-0.5`}
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
            {lengthOptions.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-[0.2em] opacity-60 mb-3">Length</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {lengthOptions.map((l: any) => {
                    const active = selectedLengthId === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setSelectedLengthId(active ? null : l.id)}
                        className={`${radius} border-2 p-3 text-left transition-all ${active ? "shadow-md scale-[1.02]" : "hover:border-opacity-60"}`}
                        style={{
                          borderColor: active ? primary : `${primary}25`,
                          backgroundColor: active ? `${primary}08` : "transparent",
                        }}
                      >
                        <div className="font-semibold text-sm">{l.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: accent }}>
                          {l.price_cents === 0 ? "Base" : `+${formatPrice(l.price_cents)}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                        className="flex flex-col items-center gap-1.5 group"
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

            <div className={`${radius} p-4`} style={{ backgroundColor: `${primary}08` }}>
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
              className={`flex items-center justify-center gap-2 w-full ${radius} px-6 py-4 text-white font-semibold shadow-lg`}
              style={{ backgroundColor: primary }}
            >
              Secure Appointment Slot <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </SheetContent>
      </Sheet>

      {/* ============ STICKY MOBILE CHECKOUT BAR ============ */}
      {showStickyBar && activeVariant && !drawerOpen && (
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3"
        >
          <div
            className={`mx-auto max-w-3xl ${radius} shadow-2xl ring-1 backdrop-blur-xl flex items-center gap-3 p-3`}
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
              className={`relative inline-flex items-center gap-1.5 ${radius} px-5 py-3 text-sm font-semibold text-white shadow-lg whitespace-nowrap`}
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
