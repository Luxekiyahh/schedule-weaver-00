# Rebuild the Onboarding "Client View" Preview

Replace the current simplified pink preview (`src/components/onboarding/LivePreview.tsx`) with a high-fidelity **dynamic dark-luxury** template. The layout and section hierarchy are inspired by the DolliiMariie booking site, but the color treatment is reusable for any tenant.

## Core principle

- **Fixed foundation, always:** near-black base (`#0A0A0A`), white / soft-white text, subtle ambient glow + glitter texture. This never changes regardless of the tenant's colors.
- **Accent = tenant primary color** (extracted from logo or chosen in the color step): buttons, section heading underlines, active/hover states, price text, icon tints, pill borders.
- **Supporting tone = tenant secondary color:** used sparingly for gradients, secondary highlights, and the hero wash.
- **Real-time:** the accent updates live as the logo is uploaded/colors are extracted, while the dark base stays locked.
- The wizard's existing **color-picker step stays as-is**.

## Visual language (ported from DolliiMariie, recolored)

- A centered mobile-style storefront frame inside the browser chrome mockup (keep the existing `your-business.procschedule.com` URL bar).
- Script/serif display font for the business name and section headings (e.g. Cormorant Garamond / Italiana feel), sans body.
- "Pill" section headings (rounded, accent-bordered, uppercase, letter-spaced).
- Accent-bordered cards (the `gold-card` equivalent, retinted to the accent over the dark base) with soft inner glow.
- Ornament dividers (`✦` with flanking hairlines) between sections.
- Slow accent sheen on the business-name title.

## Section order (all driven by live wizard state)

1. **Hero** — logo (or monogram), business name in display font, owner title, bio, accent "Book your appointment" button. Background = subtle radial wash of primary→secondary over black.
2. **Portfolio trio** — first 3 uploaded photos (graceful placeholders if none).
3. **Hours** — open days with formatted times; location/address line.
4. **Booking Policy** — 2-column accent cards built from `policies` (deposit, cancellation, grace, no-guests, custom note).
5. **Pre-Appointment / Intake** — cards rendered from the wizard `intake` questions.
6. **Portfolio gallery** — remaining uploaded photos in a 2-column grid.
7. **Services** — accent-bordered cards mapping live `services` (name, duration, price, options).
8. **Footer** — socials / business name flourish.

Empty states stay elegant (e.g. "Your services will appear here") so early steps still look premium.

## Technical notes

- Rewrite only `src/components/onboarding/LivePreview.tsx`. Signature stays `{ wizard, large }` so all callers in `src/routes/onboarding.tsx` are unaffected.
- Colors applied inline via CSS variables derived from `wizard.primaryColor` / `wizard.secondaryColor` plus the existing `hexToRgba` helper (for accent tints, glows, borders at low alpha over black).
- Keep using existing config helpers (`getIndustry`, `DAYS`, `formatTimeLabel`, `durationToMinutes`).
- Self-contained styling via inline styles + Tailwind utilities scoped to the preview container; no global `styles.css` changes required, so the dark luxe look never leaks into the rest of the onboarding chrome.
- No backend, data-model, or server-function changes.

## Out of scope

- The actual published storefront themes (`src/components/booking-themes/*`) are unchanged.
- Wizard steps, persistence, and color extraction logic are untouched.
