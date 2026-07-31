# Booking-page background images (onboarding + dashboard design page)

Let tenants upload two images — a **main background** for the whole booking site and a **background for the time-slots section** — both during onboarding and later from a new dashboard Design page. Both render edge-to-edge at any screen size on the public booking page.

No database migration needed: both URLs live in the existing `workspaces.theme_config` JSONB column, which the booking page already reads.

## 1. Storage & data model

**`src/lib/theme.ts`** — extend `ThemeConfig` with two optional fields:
- `background_image_url?: string`
- `slot_background_image_url?: string`

`normalizeTheme` already spreads, so the values pass through; the booking page's `getBookingWorkspace` query already selects `theme_config`, so no read-path changes.

**`src/lib/onboarding.functions.ts`** — extend the `uploadOnboardingImage` `kind` enum with `"background"` and `"slot-background"` (reuses the existing `branding` storage bucket, owner verification, and 5 MB limit). Extend `completeOnboarding` to merge both URLs into `workspaces.theme_config` via read-modify-write so no existing theme keys get clobbered.

## 2. Onboarding wizard — Step 3 "Your brand"

**`src/components/onboarding/wizard-config.ts`** — add to `WizardState`/`initialWizard`: `backgroundDataUrl`, `backgroundUrl`, `slotBgDataUrl`, `slotBgUrl`.

**`src/routes/onboarding.tsx`** (`StepBrand`) — new "Booking page backgrounds" section with two upload tiles, following the existing logo/portfolio pattern (upload → base64 → `uploadOnboardingImage` → local data-URL preview + CDN URL saved in wizard state):
- **Main site background** — wide aspect-video tile previewing the image.
- **Time-slots background** — tile previewing a mock time-slot grid over the image, so tenants see how times sit on it.
- Each tile gets a remove button and uploading spinner, same as portfolio.

**`src/components/onboarding/LivePreview.tsx`** — apply the page background image to the preview frame (`background-size: cover`, centered, with a dark scrim) so tenants see the effect live while picking.

## 3. Booking page rendering — `src/routes/booking.$slug.tsx`

- **Page wrapper**: when `background_image_url` is set, render it with `background-size: cover; background-position: center` (plus `background-attachment: fixed` on desktop for a stable, edge-to-edge fill) and a theme-aware scrim overlay (dark for dark themes, light for light themes) so text stays readable. Content card gets a solid/blurred background on top.
- **Time-slots section (step 3)**: the chosen image sits **behind the whole slots section** — a rounded container with the image (cover, centered) and a subtle dark overlay so time buttons stay legible.
- **"Wraps perfectly"**: cover + center guarantees the image fills its container at any aspect ratio or screen width with no distortion, tiling, or empty gaps.

**`src/components/AlluringDollsBookingFlow.tsx`** — add optional `backgroundUrl` / `slotBackgroundUrl` props (passed from the booking route's `theme_config`) and apply the same treatment to its page wrapper and slot grid, so the luxury storefront variant behaves identically.

## 4. Dashboard "Design" page for existing tenants

**`src/routes/dashboard.customize.tsx`** — build out the current empty stub into a Booking page design screen:
- Shows current background + slot-background images with previews.
- Upload/replace/remove each image (reusing `uploadOnboardingImage` with the new kinds).
- Saves via a new **`updateBookingDesign`** server function in `src/lib/tenant.functions.ts` (`requireSupabaseAuth`, verifies caller owns/admins the workspace, merges the two URLs into `theme_config`).
- Proper `head()` metadata; wrapped in the existing `ThemeProvider` layout so it matches the ink-and-gold theme in both light and dark mode.

**`src/routes/dashboard.home.tsx`** — add a "Design & backgrounds" ActionCard linking to `/dashboard/customize`.

## 5. Verification

- TypeScript check + production build pass.
- Visual check in preview: booking page with/without images, slot-section overlay legibility, onboarding previews.

## Files touched

| File | Change |
|---|---|
| `src/lib/theme.ts` | New optional theme fields |
| `src/lib/onboarding.functions.ts` | New upload kinds; persist URLs in `theme_config` |
| `src/lib/tenant.functions.ts` | New `updateBookingDesign` server fn |
| `src/components/onboarding/wizard-config.ts` | New wizard state fields |
| `src/routes/onboarding.tsx` | Two background upload tiles in Step 3 |
| `src/components/onboarding/LivePreview.tsx` | Background in live preview |
| `src/routes/booking.$slug.tsx` | Page + slots-section background rendering |
| `src/components/AlluringDollsBookingFlow.tsx` | Same rendering for the luxury flow |
| `src/routes/dashboard.customize.tsx` | New tenant Design page |
| `src/routes/dashboard.home.tsx` | New ActionCard link |