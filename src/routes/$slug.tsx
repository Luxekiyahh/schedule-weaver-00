import * as React from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { Clock, ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";
import { getStorefront } from "@/lib/tenant.functions";
import { supabase } from "@/integrations/supabase/client";
import { getTenantUrl, TENANT_ROOT_DOMAIN } from "@/lib/subdomain";

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
        <Link to="/onboarding" className="text-primary hover:underline">
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

  // Canonicalize path-form links: procschedule.com/<slug> -> <slug>.procschedule.com.
  // Only on the apex tenant host; subdomain and preview hosts are left alone.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // The *.procschedule.com wildcard cert is live, so always forward apex
    // path-form visits to the tenant subdomain.
    const host = window.location.hostname.toLowerCase();
    if (host === TENANT_ROOT_DOMAIN || host === `www.${TENANT_ROOT_DOMAIN}`) {
      window.location.replace(getTenantUrl(params.slug, host, "active"));
    }
  }, [params.slug]);

  if (!data.workspace) return null;
  return <StorefrontView data={data} />;
}


/**
 * Reusable storefront renderer — used by /$slug route AND by the index route
 * when a tenant subdomain (e.g. dolliimarie.procschedule.com) is detected.
 */
export function StorefrontView({ data }: { data: any }) {
  const ws = data.workspace;

  // Keep the bespoke Dolliimarie page exactly as-is.
  if (ws.slug === "dolliimarie") {
    return (
      <>
        <OwnerAdminOverlay ownerId={ws.owner_id} />
        <DolliimarieStorefront data={data} />
      </>
    );
  }

  // Theme-aware: render the skin the tenant selected during onboarding, using
  // the same prop contract as /book/$slug.
  const themeProps: StorefrontThemeProps = {
    workspace: {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      theme_id: ws.theme_id ?? null,
      primary_color: ws.primary_color ?? null,
      secondary_color: ws.secondary_color ?? null,
      font_family: ws.font_family ?? null,
      logo_url: ws.logo_url ?? null,
    },
    categories: data.categories ?? [],
    variants: data.variants ?? [],
    lengthOptions: data.lengthOptions ?? [],
    slug: ws.slug,
    primary: ws.primary_color || "#4f46e5",
    secondary: ws.secondary_color || "#ec4899",
    fontStack: fontFamilyStack(ws.font_family),
  };

  let ThemedLayout: (props: StorefrontThemeProps) => JSX.Element;
  switch (ws.theme_id) {
    case "luxury-blush":
      ThemedLayout = LuxuryBlushLayout;
      break;
    case "industrial-dark":
      ThemedLayout = IndustrialDarkLayout;
      break;
    default:
      ThemedLayout = DefaultStorefrontLayout;
  }

  return (
    <>
      <OwnerAdminOverlay ownerId={ws.owner_id} />
      <ThemedLayout {...themeProps} />
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
          <a href="https://procschedule.com/onboarding" className="text-primary hover:underline">
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
            <Link to="/onboarding" className="underline underline-offset-4 hover:text-[color:var(--dm-primary)]">
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

/* ============================================================
   DEFAULT tenant storefront — Luxury baby-pink shell (Dolliimarie-inspired)
   Pulls workspace name + services dynamically. Editorial copy lives in
   branding.layout_config (JSONB) so owners can edit from the dashboard.
   ============================================================ */

type EditorialCard = { title: string; body: string };
type Testimonial = { quote: string; author: string; service?: string };

const DEFAULT_POLICY: EditorialCard[] = [
  { title: "Payment", body: "A non-refundable 25% deposit secures your appointment. The remaining balance is due at the end of your service in cash, card, or Zelle." },
  { title: "Guest Policy", body: "Please arrive alone. Due to limited studio space, additional guests and children cannot be accommodated during your appointment." },
  { title: "Late Arrival", body: "A 15-minute grace period is offered. After 15 minutes, your appointment is forfeited and your deposit is non-refundable." },
  { title: "Cancellation", body: "Cancellations must be made at least 48 hours in advance. Late cancellations and no-shows forfeit the full deposit." },
];

const DEFAULT_PREP: EditorialCard[] = [
  { title: "Clean, Detangled Hair", body: "Arrive with freshly washed, fully blow-dried and detangled hair. A clean foundation makes every install last longer." },
  { title: "Bring Inspiration", body: "Save 2–3 reference photos of the look you love. Color, length, parting — the more clarity, the more magic." },
  { title: "All Hair Included", body: "Premium braiding hair is provided in every service. No extra trips, no last-minute store runs. Just show up." },
  { title: "Comfort First", body: "Wear something comfortable and bring earbuds, a charger, and a snack. You're in the chair, settle in." },
];

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { quote: "Hands down the cleanest install I've ever had. The parts are surgical and they lasted me 8 full weeks.", author: "Jasmine R.", service: "Knotless Braids" },
  { quote: "The whole experience felt like a spa day. Calm energy, perfect playlist, beautiful hair.", author: "Amara K.", service: "Boho Knotless" },
  { quote: "I drive two hours for these appointments and it is worth every single mile. Truly an artist.", author: "Devyn S.", service: "Stitch Feed-Ins" },
  { quote: "Booked 6 weeks out and never disappointed. The professionalism is unmatched.", author: "Imani T.", service: "Goddess Locs" },
  { quote: "My scalp didn't hurt once. Lightweight, gorgeous, and the color was exactly what I asked for.", author: "Camille B.", service: "Knotless Braids" },
  { quote: "Finally a stylist who actually listens. I felt seen from the consultation to the final reveal.", author: "Nia L.", service: "Boho Styles" },
];

function DefaultStorefront({ data }: { data: any }) {
  const { workspace, branding, categories, variants, lengthOptions, hairColors } = data;

  const layout: any = (branding?.layout_config as any) ?? {};
  const editorial: any = layout.editorial ?? {};

  const heroHeadline: string = editorial.hero_headline ?? branding?.hero_headline ?? "Your Hair. But, Better.";
  const bio: string = editorial.bio
    ?? branding?.hero_subhead
    ?? `${workspace.name} is a boutique studio specializing in protective styles that feel as luxurious as they look. Every appointment is a one-on-one experience — no double-bookings, no rushed installs, just careful, intentional work.`;

  const policyCards: EditorialCard[] = Array.isArray(editorial.policy) && editorial.policy.length > 0
    ? editorial.policy : DEFAULT_POLICY;
  const prepCards: EditorialCard[] = Array.isArray(editorial.preparation) && editorial.preparation.length > 0
    ? editorial.preparation : DEFAULT_PREP;
  const gallery: string[] = Array.isArray(editorial.gallery) ? editorial.gallery : [];
  const testimonials: Testimonial[] = Array.isArray(editorial.testimonials) && editorial.testimonials.length > 0
    ? editorial.testimonials : DEFAULT_TESTIMONIALS;

  // Interactive checkout state
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

  return (
    <div className="lx-root min-h-screen">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap"
      />
      <style>{`
        .lx-root {
          --lx-bg: #fdf7f5;
          --lx-bg-soft: #fbeef0;
          --lx-fg: #2b1f24;
          --lx-muted: #8a6f78;
          --lx-pink: #f4c2c9;
          --lx-pink-deep: #e89aa6;
          --lx-pink-ink: #c87080;
          --lx-border: rgba(232, 154, 166, 0.28);
          --lx-card: rgba(255, 255, 255, 0.72);
          --lx-shadow: 0 20px 60px -30px rgba(200, 112, 128, 0.35);
          background-color: var(--lx-bg);
          color: var(--lx-fg);
          font-family: 'Inter', system-ui, sans-serif;
          background-image:
            radial-gradient(ellipse at 10% 0%, rgba(244, 194, 201, 0.35), transparent 55%),
            radial-gradient(ellipse at 90% 30%, rgba(251, 238, 240, 0.9), transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(244, 194, 201, 0.25), transparent 60%);
        }
        .lx-serif { font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif; }
        .lx-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.38em;
          font-size: 10.5px;
          color: var(--lx-pink-ink);
          font-weight: 500;
        }
        .lx-card {
          background: var(--lx-card);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid var(--lx-border);
          border-radius: 22px;
          box-shadow: var(--lx-shadow);
        }
        .lx-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.6rem;
          padding: 1rem 2.25rem; border-radius: 999px;
          background: linear-gradient(135deg, var(--lx-pink-deep), var(--lx-pink));
          color: #fff; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; font-size: 11px;
          box-shadow: 0 14px 30px -10px rgba(200, 112, 128, 0.55);
          transition: transform .3s ease, box-shadow .3s ease;
        }
        .lx-cta:hover { transform: translateY(-2px); box-shadow: 0 18px 36px -10px rgba(200, 112, 128, 0.65); }
        .lx-ghost-cta {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.85rem 1.75rem; border-radius: 999px;
          border: 1px solid var(--lx-border); color: var(--lx-pink-ink);
          font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase;
          background: rgba(255,255,255,0.5); backdrop-filter: blur(8px);
          transition: all .25s ease;
        }
        .lx-ghost-cta:hover { background: #fff; border-color: var(--lx-pink-deep); }
        .lx-ornament { color: var(--lx-pink-deep); letter-spacing: 0.7em; font-size: 12px; }
        .lx-divider {
          display: flex; align-items: center; justify-content: center; gap: 1rem;
          color: var(--lx-pink-deep); margin: 2.5rem 0;
        }
        .lx-divider::before, .lx-divider::after {
          content: ""; flex: 1; height: 1px; max-width: 120px;
          background: linear-gradient(90deg, transparent, var(--lx-pink-deep), transparent);
        }
        .lx-service-card {
          background: rgba(255,255,255,0.78);
          backdrop-filter: blur(14px);
          border: 1px solid var(--lx-border);
          border-radius: 18px;
          padding: 1.4rem;
          transition: all .35s ease;
          text-align: left;
          width: 100%;
        }
        .lx-service-card:hover {
          transform: translateY(-3px);
          border-color: var(--lx-pink-deep);
          box-shadow: 0 24px 50px -20px rgba(200, 112, 128, 0.45);
        }
      `}</style>

      {/* ============ HERO ============ */}
      <section className="relative">
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-12 md:pt-28 md:pb-16 text-center">
          {branding?.logo_url && (
            <img src={branding.logo_url} alt={workspace.name} className="h-14 mx-auto mb-6 object-contain" />
          )}
          <div className="lx-eyebrow">Welcome to {workspace.name}</div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
            className="lx-serif italic font-light text-5xl md:text-7xl mt-5 leading-[1.05]"
            style={{ color: "var(--lx-fg)" }}
          >
            {heroHeadline}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-8 text-base md:text-lg leading-relaxed text-[color:var(--lx-muted)] max-w-xl mx-auto"
          >
            {bio}
          </motion.p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a href={`#services`} className="lx-cta">
              {branding?.cta_label ?? "Book Your Appointment"} <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a href="#policy" className="lx-ghost-cta">The Fine Print</a>
          </div>
        </div>
      </section>

      {/* ============ HERO IMAGE STRIP ============ */}
      {branding?.hero_image_url && (
        <div className="max-w-5xl mx-auto px-6">
          <div className="lx-card overflow-hidden p-0" style={{ borderRadius: 28 }}>
            <img src={branding.hero_image_url} alt="" className="w-full h-[42vh] md:h-[58vh] object-cover" />
          </div>
        </div>
      )}

      {/* ============ BOOKING POLICY ============ */}
      <section id="policy" className="max-w-6xl mx-auto px-6 pt-24">
        <div className="text-center">
          <div className="lx-ornament">✦ ✦ ✦</div>
          <div className="lx-eyebrow mt-4">Before You Book</div>
          <h2 className="lx-serif italic text-4xl md:text-5xl mt-3">Booking Policy</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {policyCards.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="lx-card p-7"
            >
              <div className="lx-eyebrow mb-3">0{i + 1}</div>
              <h3 className="lx-serif text-2xl mb-3" style={{ color: "var(--lx-pink-ink)" }}>{c.title}</h3>
              <p className="text-sm leading-relaxed text-[color:var(--lx-muted)]">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ PRE-APPOINTMENT INSTRUCTIONS ============ */}
      <section className="max-w-6xl mx-auto px-6 pt-24">
        <div className="text-center">
          <div className="lx-ornament">✦ ✦ ✦</div>
          <div className="lx-eyebrow mt-4">The Day Of</div>
          <h2 className="lx-serif italic text-4xl md:text-5xl mt-3">Pre-Appointment Instructions</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {prepCards.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="lx-card p-7"
            >
              <div className="lx-eyebrow mb-3">0{i + 1}</div>
              <h3 className="lx-serif text-2xl mb-3" style={{ color: "var(--lx-pink-ink)" }}>{c.title}</h3>
              <p className="text-sm leading-relaxed text-[color:var(--lx-muted)]">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ SERVICES (live DB data) ============ */}
      <section id="services" className="max-w-6xl mx-auto px-6 pt-24 pb-12">
        <div className="text-center">
          <div className="lx-ornament">✦ ✦ ✦</div>
          <div className="lx-eyebrow mt-4">The Menu</div>
          <h2 className="lx-serif italic text-4xl md:text-5xl mt-3">Choose Your Service</h2>
          <p className="mt-4 text-sm text-[color:var(--lx-muted)] max-w-md mx-auto">
            Tap any service to customize length, color, and add-ons before securing your slot.
          </p>
        </div>

        <div className="mt-14">
          {categories.length === 0 ? (
            <p className="text-center italic text-[color:var(--lx-muted)]">Services coming soon.</p>
          ) : (
            <div className="space-y-16">
              {categories.map((cat: any) => {
                const catVariants = variants.filter((v: any) => v.category_id === cat.id);
                if (catVariants.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <div className="text-center">
                      <h3 className="lx-serif italic text-3xl md:text-4xl" style={{ color: "var(--lx-fg)" }}>{cat.name}</h3>
                      {cat.description && (
                        <p className="mt-2 text-sm text-[color:var(--lx-muted)] max-w-lg mx-auto">{cat.description}</p>
                      )}
                      <div className="lx-divider"><span>✦</span></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {catVariants.map((v: any) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => openServiceDrawer(v)}
                          className="lx-service-card group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="lx-serif text-2xl leading-tight" style={{ color: "var(--lx-fg)" }}>{v.name}</h4>
                              {v.description && (
                                <p className="text-sm mt-2 text-[color:var(--lx-muted)] leading-relaxed">{v.description}</p>
                              )}
                              <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[color:var(--lx-muted)]">
                                <Clock className="w-3 h-3" />
                                <span>{v.duration_min} min</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="lx-serif text-2xl" style={{ color: "var(--lx-pink-ink)" }}>
                                {formatPrice(v.price_cents)}
                              </div>
                              <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[color:var(--lx-pink-ink)] opacity-70 group-hover:opacity-100 transition">
                                Customize →
                              </div>
                            </div>
                          </div>

                          {/* Quick-glance add-on chips */}
                          {(lengthOptions.length > 0 || hairColors.length > 0) && (
                            <div className="mt-5 pt-4 border-t flex flex-wrap items-center gap-2" style={{ borderColor: "var(--lx-border)" }}>
                              {lengthOptions.slice(0, 4).map((l: any) => (
                                <span
                                  key={l.id}
                                  className="inline-flex items-center text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
                                  style={{ backgroundColor: "rgba(244,194,201,0.25)", color: "var(--lx-pink-ink)" }}
                                >
                                  {l.name}
                                </span>
                              ))}
                              {hairColors.slice(0, 5).map((c: any) => (
                                <span
                                  key={c.id}
                                  title={c.label}
                                  className="w-4 h-4 rounded-full ring-1 ring-white"
                                  style={{ backgroundColor: c.swatch_hex }}
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============ LOOKBOOK GALLERY ============ */}
      {gallery.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pt-24">
          <div className="text-center">
            <div className="lx-ornament">✦ ✦ ✦</div>
            <div className="lx-eyebrow mt-4">The Lookbook</div>
            <h2 className="lx-serif italic text-4xl md:text-5xl mt-3">Recent Work</h2>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-4">
            {gallery.map((src, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="lx-card overflow-hidden p-0 aspect-[4/5]"
                style={{ borderRadius: 18 }}
              >
                <img src={src} alt={`Look ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ============ TESTIMONIALS ============ */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <div className="text-center">
          <div className="lx-ornament">✦ ✦ ✦</div>
          <div className="lx-eyebrow mt-4">Kind Words</div>
          <h2 className="lx-serif italic text-4xl md:text-5xl mt-3">From the Chair</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="lx-card p-7 flex flex-col"
            >
              <div className="lx-serif text-3xl leading-none mb-3" style={{ color: "var(--lx-pink-deep)" }}>“</div>
              <p className="lx-serif italic text-lg leading-relaxed text-[color:var(--lx-fg)] flex-1">{t.quote}</p>
              <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--lx-border)" }}>
                <div className="text-sm font-medium">{t.author}</div>
                {t.service && (
                  <div className="text-[10px] uppercase tracking-[0.22em] mt-1 text-[color:var(--lx-pink-ink)]">{t.service}</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="lx-card p-10 md:p-14">
          <div className="lx-ornament">✦</div>
          <h2 className="lx-serif italic text-4xl md:text-5xl mt-4">Ready when you are.</h2>
          <p className="mt-4 text-[color:var(--lx-muted)] max-w-md mx-auto">
            Slots open weekly. Reserve yours with a 25% deposit and we'll handle the rest.
          </p>
          <a href="#services" className="lx-cta mt-8">
            {branding?.cta_label ?? "Book Your Appointment"} <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t pt-10 pb-28 text-center" style={{ borderColor: "var(--lx-border)" }}>
        <div className="lx-serif italic text-2xl" style={{ color: "var(--lx-pink-ink)" }}>{workspace.name}</div>
        <p className="mt-2 text-xs text-[color:var(--lx-muted)] tracking-wider">@{workspace.slug}</p>
        <div className="mt-6 flex items-center justify-center gap-5 text-[11px] uppercase tracking-[0.28em] text-[color:var(--lx-muted)]">
          <button
            type="button"
            onClick={() => { window.location.href = "https://procschedule.com/login"; }}
            className="hover:text-[color:var(--lx-pink-ink)] transition cursor-pointer"
          >
            Stylist sign in
          </button>
          <span>·</span>
          <a href="https://procschedule.com/onboarding" className="hover:text-[color:var(--lx-pink-ink)] transition">
            Powered by ProcSchedule
          </a>
        </div>
      </footer>

      {/* ============ SERVICE OPTIONS DRAWER ============ */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 flex flex-col" style={{ backgroundColor: "var(--lx-bg)" }}>
          <SheetHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--lx-border)" }}>
            <SheetTitle className="lx-serif italic text-3xl" style={{ color: "var(--lx-fg)" }}>
              {activeVariant?.name ?? "Customize"}
            </SheetTitle>
            {activeVariant?.description && (
              <p className="text-sm text-[color:var(--lx-muted)] mt-1">{activeVariant.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs uppercase tracking-[0.22em] text-[color:var(--lx-muted)]">
              <Clock className="w-3.5 h-3.5" /> {activeVariant?.duration_min ?? 0} min
              <span>•</span>
              <span>Base {formatPrice(basePrice)}</span>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {lengthOptions.length > 0 && (
              <div>
                <h4 className="lx-eyebrow mb-3">Length</h4>
                <div className="flex flex-wrap gap-2">
                  {lengthOptions.map((l: any) => {
                    const active = selectedLengthId === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setSelectedLengthId(active ? null : l.id)}
                        className="rounded-full border-2 px-4 py-2 text-sm font-medium transition-all"
                        style={{
                          borderColor: active ? "var(--lx-pink-deep)" : "var(--lx-border)",
                          backgroundColor: active ? "rgba(244,194,201,0.25)" : "transparent",
                          color: active ? "var(--lx-pink-ink)" : "var(--lx-fg)",
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

            {hairColors.length > 0 && (
              <div>
                <h4 className="lx-eyebrow mb-3">Color</h4>
                <div className="flex flex-wrap gap-3">
                  {hairColors.map((c: any) => {
                    const active = selectedColorId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedColorId(active ? null : c.id)}
                        className="flex flex-col items-center gap-1.5"
                        title={c.label}
                      >
                        <div
                          className="w-11 h-11 rounded-full transition-all"
                          style={{
                            backgroundColor: c.swatch_hex,
                            boxShadow: active
                              ? `0 0 0 3px var(--lx-bg), 0 0 0 5px var(--lx-pink-deep)`
                              : `0 0 0 1px var(--lx-border)`,
                          }}
                        />
                        <span className={`text-[10px] tracking-wider transition ${active ? "font-bold text-[color:var(--lx-pink-ink)]" : "opacity-60"}`}>{c.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-2xl p-5" style={{ backgroundColor: "rgba(244,194,201,0.18)" }}>
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
              <div className="border-t my-3" style={{ borderColor: "var(--lx-border)" }} />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="lx-serif text-xl" style={{ color: "var(--lx-pink-ink)" }}>{formatPrice(currentTotalCents)}</span>
              </div>
              <div className="flex justify-between text-xs opacity-70 mt-1">
                <span>Deposit due today (25%)</span>
                <span>{formatPrice(depositCents)}</span>
              </div>
            </div>
          </div>

          <div className="border-t p-4" style={{ borderColor: "var(--lx-border)" }}>
            <a href={`${bookingHref}${bookingQuery}`} className="lx-cta w-full">
              Secure Appointment Slot <ArrowRight className="w-3.5 h-3.5" />
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
            className="mx-auto max-w-3xl rounded-full backdrop-blur-xl flex items-center gap-3 p-3 border"
            style={{
              backgroundColor: "rgba(255,255,255,0.85)",
              borderColor: "var(--lx-border)",
              boxShadow: "0 10px 40px -10px rgba(200,112,128,0.35)",
            }}
          >
            <div className="flex-1 min-w-0 px-2">
              <div className="text-xs text-[color:var(--lx-muted)] truncate">
                {activeVariant.name}
                {selectedLength && ` • ${selectedLength.name}`}
                {selectedColor && ` • #${selectedColor.code}`}
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="lx-serif text-lg" style={{ color: "var(--lx-pink-ink)" }}>{formatPrice(currentTotalCents)}</span>
                <span className="text-[10px] opacity-60">deposit {formatPrice(depositCents)}</span>
              </div>
            </div>
            <a href={`${bookingHref}${bookingQuery}`} className="relative inline-flex items-center gap-1.5 rounded-full px-5 py-3 text-xs font-semibold text-white whitespace-nowrap uppercase tracking-[0.18em]"
               style={{ background: "linear-gradient(135deg, var(--lx-pink-deep), var(--lx-pink))" }}
            >
              <span className="absolute inset-0 rounded-full animate-ping opacity-40"
                style={{ backgroundColor: "var(--lx-pink-deep)" }}
              />
              <span className="relative">Secure Slot</span>
              <ArrowRight className="relative w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}

