## Goal
A complete luxury visual rebrand of the **Alluring Dolls** booking experience — storefront + booking flow — while preserving 100% of functionality, data, routes, and backend. Purely presentational changes in two self-contained skin components.

## Scope (what changes)
Only these two files, both scoped to the `alluringdolls` slug:
- `src/components/AlluringDollsStorefront.tsx` — landing / menu / policies page
- `src/components/AlluringDollsBookingFlow.tsx` — 4-step booking UI (Service → Provider → Time → Details)

**Untouched:** all route logic (`$slug.tsx`, `booking.$slug.tsx`), server functions, booking/slot/deposit/payment logic, data pipeline, categories/variants/length/color data, policy text, navigation, URLs, database. Every prop contract and handler stays identical — I only restyle the markup that renders them.

## Design system upgrade (shared `ad-*` tokens in both files)

### 1. Palette (your exact brand colors)
Update CSS variables to:
```
--ad-bg: #090809;  --ad-bg2: #151214;
--ad-gold: #CDA45B;  --ad-gold-2: #B98B47;  --ad-gold-bright: #F3E0AD;
--ad-ivory: #F8F5EF;  --ad-smoke: #C8B7A0;
--ad-border: rgba(205,164,91,.25);  --ad-glow: rgba(205,164,91,.18);
```
All fills become gradients (no flat one-dimensional surfaces).

### 2. Typography
Swap the Google Fonts `<link>` to load **Cinzel** (uppercase section/hero titles), **Cormorant Garamond** (editorial serif display/subheads), and **Inter** (body). Increase paragraph whitespace and heading letter-spacing. Body stays highly readable.

### 3. CSS leopard background (no images)
A fixed, full-viewport `.ad-leopard` layer built entirely with layered `radial-gradient`s — oversized irregular charcoal-on-black spots, blurred edges, embossed/leather feel, low opacity, seamless & responsive. Layered beneath soft radial lighting gradients. Its opacity rises subtly on scroll via framer-motion `useScroll` → `useTransform` bound to a fixed overlay (reduced-motion respected).

### 4. Luxury lighting & depth
Add a top spotlight radial glow, corner ambient glows, and a vignette overlay. Cards gain layered shadows, thin gold borders, soft inner highlights, and optional glassmorphism where appropriate.

### 5. Champagne chrome effect (`.ad-chrome`)
Brushed champagne metallic text: multi-stop gold gradient clipped to text + engraved dual text-shadow + soft reflection. Applied only to the hero name, section titles, featured/callout headings. Keep the existing slow light-sweep as the signature shimmer (reduced-motion safe).

### 6. Capsule buttons (`.ad-cta`)
Large radius champagne-gold gradient capsules, embossed, soft shadow; hover = glow + lift + scale, 250–350ms transitions. Replaces every button/CTA including the sticky mobile book bar and the booking-flow next/back/confirm buttons (restyled via existing `ad-cta-btn`/`ad-ghost-btn` hooks).

### 7. Forms (booking flow)
Rounded matte inputs, gold border, gold focus ring, generous spacing, floating-label styling where feasible, subtle focus animations — via the existing `ad-input`/`ad-label` classes (no logic/state changes).

## Section-by-section restyle

**Storefront:**
- **Hero** → editorial: large chrome heading, generous spacing, spotlight lighting, refined eyebrow + contact row, curved section transition.
- **Menu / category sections** → oversized rounded editorial cards; service rows become luxury product cards (rounded, gradient, soft shadow, gold accent) with hover lift to scale 1.02 + brighter border + deeper shadow; better type hierarchy.
- **Length add-ons & hair colors** → refined luxury panels; swatches with soft gold ring glow.
- **Policies ("Good to Know")** → large rounded luxury information panel: premium padding, gold outline, soft gradient bg, each policy its own block with thin gold divider lines.
- **Footer** → refined with chrome wordmark and thin gold rule.

**Booking flow:**
- Restyle the step indicator, service/provider selection rows, calendar & slot grid, and details form to the same luxury card/button/form language. Keep the 4-step structure, props, and handlers exactly as-is.

## Motion
Scroll-reveal fade-up on sections (existing `whileInView` retained/tuned), button glow on hover, heading shimmer, image/card fades, 250–350ms transitions. All gated behind `prefers-reduced-motion`.

## Mobile
Comfortable spacing, readable type, large tap targets, elegant card stacking, luxury sticky book bar. Verified at mobile width.

## Verification
- Typecheck/build clean.
- Playwright screenshots of `/alluringdolls` and `/booking/alluringdolls` at desktop + mobile widths to confirm the luxury look and that all data (services, prices, policies, colors, steps) still renders.
- Confirm CTAs still navigate to the booking route and the flow steps still advance.

## Technical notes
- Both skins use inline `<style>` blocks with raw CSS (not `@apply`), so no `@reference` needed; remote fonts stay as a `<link>` tag in JSX (allowed). No changes to `src/styles.css`, Tailwind theme, or global tokens — the rebrand is fully contained to these two components so no other tenant is affected.
- No new dependencies (framer-motion already present).