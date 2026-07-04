# Restore Alluring Dolls & prevent onboarding overwrites

## What happened

The onboarding flow never creates a *new* workspace. Both `finalizeTenantSignup` and `completeOnboarding` (in `src/lib/onboarding.functions.ts` / `src/lib/tenant.functions.ts`) look up **the oldest workspace owned by the signed-in account and overwrite it in place**. When the Alluring Dolls owner account re-entered the wizard to make "Bubbles & Co", it renamed and re-skinned the existing Alluring Dolls record instead of creating a separate one.

The real Alluring Dolls workspace (`5542a2d5-…`) now has name "Bubbles & Co", slug `bubbles-co`, and Bubbles branding. Its 15 original services and 6 appointments are intact. The signature Alluring Dolls storefront/booking design is **hardcoded in code** and keyed off the exact slug `alluringdolls` (`booking.$slug.tsx`, `AlluringDollsStorefront.tsx`), so restoring the slug automatically brings the custom design back.

## Part 1 — Restore the data (data update, no schema change)

On workspace `5542a2d5-b3be-4fa3-be3e-da209e1d9177`:

**`workspaces`**
- `name` → `Alluring Dolls`
- `slug` → `alluringdolls` (re-enables the bespoke storefront skin)
- Leave `theme_id`/colors as-is — the Alluring Dolls skin uses its own baked-in colors/fonts, so the overwritten DB colors don't affect the storefront. (You can adjust colors/logo later from the dashboard.)

**`workspace_branding`**
- `hero_headline` → `Welcome to our booking site`
- `hero_subhead` → `Located in Belle Glade, FL`
- `layout_config.policies` → `deposit: 25`, `grace: "15 minutes"`, plus the full custom policy note you provided (deposit non-refundable, blow-out required, 15-min late rule, rescheduling/cancellation rules, $25 same-day fee) stored in `customNote`.
- Reset `layout_config.industry`/`owner_title`/`location` away from the Bubbles auto-detailing values.

**Cleanup**
- Delete the stray Bubbles "Basic Detail" service (`10a843a3-…`) and any mirrored `service_variants` row / `service_providers` link for it, so only the real Alluring Dolls services remain.

Note: the current `logo_url` is the Bubbles logo (you didn't specify a replacement). I'll leave it in place; you can re-upload the correct logo from the dashboard, or give me a URL and I'll set it in the same change.

## Part 2 — Prevent this from happening again (block re-onboarding)

Goal: once an account's workspace is configured, onboarding can never overwrite it.

1. **Schema:** add an `onboarded_at timestamptz` column to `workspaces` (migration). Backfill it to `now()` for every workspace that already has services or a branding row (including the restored Alluring Dolls one) so existing accounts are treated as done.

2. **Server guards** (`src/lib/onboarding.functions.ts`, `src/lib/tenant.functions.ts`): at the top of `completeOnboarding` and `finalizeTenantSignup`, if the resolved workspace already has `onboarded_at` set, throw a clear "This account is already set up" error instead of overwriting. `completeOnboarding` sets `onboarded_at = now()` on success.

3. **Route guard** (`src/routes/onboarding.tsx`): on load, call `getOnboardingContext` / a small status check; if the account is already onboarded, redirect to `/dashboard` so the wizard can't be re-run at all.

## Technical notes

- Part 1 is executed with the data-change (insert/update) tool since it only edits existing rows.
- Part 2's column addition is a migration; the guard logic is app code edited afterward.
- No RLS/policy changes required; all writes go through existing server functions using the service-role client.

## Verification

- Query the workspace + branding rows to confirm slug `alluringdolls`, restored hero text/policies, and that the stray service is gone.
- Load `/alluringdolls` (and `/booking/alluringdolls`) in the preview to confirm the custom Alluring Dolls design renders again with the correct services.
- Attempt to re-open `/onboarding` on an onboarded account and confirm it redirects to `/dashboard`; confirm the server functions reject a second run.
