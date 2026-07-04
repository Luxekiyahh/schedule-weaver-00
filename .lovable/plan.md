# Apply the ProcSchedule Editorial Brand to /login, /pricing, and /dashboard

Bring the auth, pricing, and dashboard surfaces in line with the new landing-page identity: ink `#141414` on off-white `#f8f7f4`, solid dark buttons, muted-gray secondary text, serif (`Georgia`) display headings, and the flat "ProcSchedule" wordmark. This is a presentation-only reskin — no logic, data, routing, or checkout behavior changes.

## Brand tokens (applied consistently)
- Primary/ink: `#141414` (buttons, active states, headings, icon chips)
- Surface: `#f8f7f4` page background; `white` cards with `border-[#141414]/10`
- Secondary text: `#141414/60`; muted `#141414/45`
- Accent swaps: every `indigo-*` / `violet-*` accent → ink `#141414` (or `#141414/5`–`/10` tints); keep semantic status colors (emerald/amber/rose) for confirmed/pending/no-show
- Display headings use `font-family: Georgia, 'Times New Roman', serif`
- Focus rings: `focus:border-[#141414] focus:ring-[#141414]/10`

## 1. `/login` (`src/routes/login.tsx`)
- Page bg gradient → flat `#f8f7f4`.
- Logo chip `from-indigo-500 to-violet-600` → solid `#141414` with `#f8f7f4` calendar icon.
- Inputs: indigo focus states → ink focus states.
- Submit button stays dark (align to `#141414`).
- "Sign up" link `text-indigo-600` → ink, underline on hover.
- Heading in serif to match brand.

## 2. `/pricing` (`src/routes/pricing.tsx`)
- Page bg `bg-slate-50` → `#f8f7f4`; H1 to serif.
- Billing toggle active state `bg-indigo-600` → `#141414`.
- Featured (pro) card ring/border `indigo-500` → `#141414`; "Most popular" badge `bg-indigo-600` → ink.
- Feature check icons `text-indigo-600` → ink.
- Setup-fee callout card `border-indigo-200 from-indigo-50` + `bg-indigo-600` icon → neutral ink treatment (light `#141414/5` panel, ink icon chip).
- Bottom links `text-indigo-600` → ink.

## 3. `/dashboard` (all `dashboard.*.tsx` pages)
Reskin every dashboard surface for a consistent look:
- **dashboard.home.tsx**: eyebrow, action-card tones (`indigo`/`violet` → ink), the `from-slate-900 to-indigo-900` booking-link banner → solid `#141414`, empty-state icon chips, "AI Storefront Designer" tone, save button, focus states.
- **dashboard.billing.tsx**: plan badge, billing toggle, current-plan ring, check icons, upsell card gradient/icon → ink.
- **dashboard.calendar.tsx**: confirmed event style (`bg-indigo-50 border-indigo-500`) → ink-tinted; today highlight `text-indigo-600` / `bg-indigo-50/40` → ink; "view" link color.
- **dashboard.availability.tsx**: info panel `bg-indigo-50/40 text-indigo-900` → neutral ink panel.
- **dashboard.notifications.tsx**: icon chip `bg-indigo-100 text-indigo-600` → ink tint.
- **dashboard.services.tsx**: empty-state icon chip → ink tint.
- Sweep remaining `indigo-*`/`violet-*` accents in dashboard pages (services/staff/payments/customize) to the ink palette; leave status/semantic colors intact.

## Out of scope
- Storefront/booking components (`AlluringDolls*`, onboarding `LivePreview`) that carry per-tenant theming — those reflect the customer's brand, not ProcSchedule's, so they stay.
- No copy rewrites beyond what's needed; no new features.

## Verification
- `tsgo --noEmit` typecheck.
- Playwright screenshots of `/login`, `/pricing`, and `/dashboard/home` (and calendar/billing) to confirm the ink-on-paper brand renders with no leftover indigo/violet accents.
