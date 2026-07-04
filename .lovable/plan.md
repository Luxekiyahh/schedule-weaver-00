# Landing Page Overhaul — Premium Editorial

Rebuild `src/routes/index.tsx` (the only file involved) from the current dark/neon developer aesthetic into a clean, high-end editorial look for a broad market of service professionals (consultants, contractors, creatives). No backend, routing, or business-logic changes.

## 1. Aesthetic direction
- **Background:** soft off-white (`#f8f7f4` / warm paper), remove all dark `#0a0a0f` surfaces.
- **Typography:** dark high-contrast ink (`#141414`) headings, muted gray body. Large editorial serif or refined display headline paired with a clean sans body (keeps a "premium business tool" feel, not developer/neon).
- **Remove:** neon indigo→fuchsia gradients, glow blurs, grid overlay, `font-mono` labels, macOS-window "dev" chrome, the `src/routes/` code teaser strip, and the "type-safe / live" dev accents.
- **Accent:** a single restrained accent (deep ink or a muted editorial tone) for buttons/links instead of gradients. Buttons become solid dark-on-light.
- Keep framer-motion entrance animations (subtle), keep the Demo modal but restyle it light (or simplify its copy to remove dev jargon).

## 2. Nav
- Light sticky header, dark wordmark "ProcSchedule", simple links (Features, Pricing). Solid dark "Get Started" button.

## 3. Hero (rewrite)
- **Remove** the "AI-NATIVE · MULTI-TENANT · v2.0" badge entirely.
- **Headline:** "Stop Sending Your Clients to a Generic Calendar."
- **Sub-headline:** "The ultimate booking and retention engine for service professionals. Skip the DIY website builders—we custom-code a high-converting scheduling site for your business for a flat $100 setup."
- Primary CTA (e.g. "Get Started") + secondary "Watch Demo". Replace neon trust chips with neutral editorial ones (or drop them).

## 4. Replace dashboard mockup
- Remove the hair-extensions lineup (Ayana Brooks / "Luxury Install 22" / Color #4", etc.) and all salon references (Scissors icon, "Good morning, Melanie", revenue-per-service styling).
- Build a **clean abstract calendar + appointments UI** on a light card: a small week/day calendar strip plus appointment rows for broad services:
  - "Strategy Consultation"
  - "Site Inspection"
  - plus 1–2 neutral generic entries (e.g. "Discovery Call", "Project Review").
- Neutral avatars/initials, muted status pills (Confirmed / Pending), light card with soft shadow and thin border. No macOS dots, no dev strip.

## 5. Feature grid (rewrite all four)
Replace icons/gradients with clean line icons on a light card. New copy:
1. **The Done-For-You Booking Site** — "No clunky templates or coding required. We build you a fully branded, conversion-optimized storefront ready to accept deposits on day one."
2. **Smart Lifecycle Automations** — "Trigger automated follow-ups based on the exact service booked, creating a seamless sales machine that brings clients back."
3. **Strict No-Show Protection** — "Dynamic deposit rules that adapt to client history. Automatically require 100% upfront payments from clients with a history of late cancellations."
4. **Secure Client Portfolios** — "Keep comprehensive records, project files, and private notes attached directly to the client's booking profile."
- Update the section eyebrow/heading away from "Built for what Calendly forgot." dev framing to a broad professional message (e.g. "Everything you need to book and retain clients").

## 6. Final CTA + footer
- Restyle the closing CTA card to light editorial (remove radial neon glow); update copy to broad-market ("Your custom booking site, built for a flat $100 setup.").
- Light footer, remove "Engineered for service teams" dev tone, keep sign in / get started links.

## 7. SEO head()
- Update `title` / `description` / `og:*` to broad-market, benefit-led copy (remove "Procedural Powerhouse", "AI-driven, multi-tenant" jargon). Keep single H1 = the new hero headline.

## Technical notes
- All changes are contained in `src/routes/index.tsx`; colors are currently hardcoded utility classes, so the rewrite swaps them for light equivalents (no `styles.css` token changes required, though I can optionally add tokens if you prefer).
- Tenant-subdomain branch (`TenantStorefrontBySlug`) is untouched.
- Verify with a typecheck and a Playwright screenshot of `/` after the rewrite.
