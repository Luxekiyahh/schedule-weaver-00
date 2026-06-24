# Rebuild the ProcSchedule Onboarding Wizard

Rebuild `/onboarding` as an 8-step, two-column wizard (form left, live "Client view" preview right; stacked on mobile) that saves everything to the backend on completion. Dark, minimal aesthetic using existing design tokens.

## Data model (one migration)

Reuse existing tables; persist the few new shapes in JSON to avoid heavy schema churn:

- `workspaces`: update `name`, `slug`, `primary_color`, `secondary_color`, `logo_url`, `timezone`.
- `workspace_branding`: write `hero_headline` (business name), `hero_subhead` (bio/tagline), `primary_hex`, `accent_hex`, `logo_url`, and a structured `layout_config` JSON holding: `industry`, `owner_title`, `portfolio_urls[]`, `location` (`{type, address}`), `policies` (`{deposit, cancellation_window, grace_period, no_guests, custom_note}`), `intake_questions[]` (`{label, type}`).
- `services`: insert one row per service (`name`, `description`, `duration_minutes`, `price_cents`). Add a nullable `options` JSONB column to `services` to store the repeatable label/price sub-rows.
- `provider_availability`: replace the owner member's rows with the configured weekly hours.
- Storage: reuse the existing public `branding` bucket for logo + portfolio images, pathed under `{workspaceId}/...`.

## Backend (server functions in `src/lib/onboarding.functions.ts`)

- `getOnboardingContext` (auth): returns the caller's owned workspace id + slug, prefilling business name if present.
- `uploadOnboardingImage` (auth): returns a signed/admin upload to the `branding` bucket and the public URL (logo + each portfolio photo).
- `completeOnboarding` (auth): validates with Zod and writes all wizard state in one call — workspace fields, branding + `layout_config`, services (+options), and availability. Authorizes via `has_workspace_role(workspaceId,'owner')`, uses `supabaseAdmin` loaded inside the handler. Idempotent (upsert branding, clear+reinsert services/availability).

## Frontend (`src/routes/onboarding.tsx`, public route, client wizard)

Single route rendering `OnboardingWizard`. State machine in React state (`step` 1–8 + `wizard` object). Top progress bar: 8 labeled segments on desktop, dots on mobile. `Continue`/`Back` buttons with inline validation blocking advance when required fields are empty. No reloads.

Steps:
1. **Industry** — grid of icon tiles (Beauty & Hair, Fitness & Wellness, Home Services, Health & Medical, Consulting & Coaching, Auto & Detailing, Pet Services, Other); select highlights + auto-advances; stored as `industry`.
2. **Business Identity** — Business Name, Your Name/Title, Bio/Tagline textarea (160 cap, industry-based placeholder), Logo upload (PNG/JPG/SVG). On upload: load color-thief UMD from the given CDN via a `<script>` tag in `__root.tsx` head, extract top 2 colors → `primaryColor`/`secondaryColor`, show swatches "Colors detected from your logo," allow override via `<input type=color>`. Preview header/accent update live.
3. **Portfolio** — up to 9 images, 3×3 grid with remove (X), elegant placeholder tiles for empty slots, "add later" subtext. Feeds preview gallery.
4. **Services** — expandable service cards (Name, optional Description, Duration dropdown incl. Custom, Price, repeatable Options label+price rows), `+ Add Service`, 3 industry-based name placeholders. Preview services list updates live.
5. **Hours & Location** — Mon–Sun open/closed toggles with 30-min start/end dropdowns (6:00 AM–11:00 PM), defaults Mon–Fri 9–7, Sat–Sun 9–8. Location radios: studio/shop (address field), mobile (none), home (private address).
6. **Policies** — industry-default deposit ($50), cancellation window dropdown (12/24/48/72h, default 24), grace period dropdown (None/10/15/20/30, default 15), no-guests toggle, custom note textarea. Feeds preview Booking Policy.
7. **Intake Questions** — add custom questions (label + type: Short Text/Long Text/Yes/No/File Upload), 2 industry-based suggestions, `+ Add Question`, optional with "Skip for now".
8. **Preview & Rating** — large reveal of full preview; "How do you feel about your design?" + 5 stars. On mount, call `completeOnboarding` to persist. 4–5 stars → confetti + "You're all set! Your site is live at [slug].procschedule.com" + "Go to my dashboard" → `/dashboard/home`. 1–3 stars → "let's make it perfect" message + "Schedule a design call" opening a Calendly placeholder URL (`https://calendly.com/your-link` TODO) in a new tab + secondary "Go to dashboard anyway".

## Live Preview (`src/components/onboarding/LivePreview.tsx`)

Simplified DolliiMariie-style booking template inside a browser/phone frame mockup labeled "Client view — live preview": header (business name + logo, colored by extracted palette), hero (bio/tagline), services list, hours, policy section — all bound to wizard state and updating in real time. Step 8 renders it larger.

## Notes / dependencies

- Confetti: add `canvas-confetti` (`bun add canvas-confetti`).
- color-thief loaded from the specified CDN via root `<script>` (per Tailwind v4 remote-asset rule); accessed as `window.ColorThief`.
- Reuse existing shadcn primitives, `motion` for transitions, and semantic tokens (no hardcoded colors except the user's own brand palette in the preview).
- Calendly link left as a clearly-marked placeholder constant for you to fill in.
