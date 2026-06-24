# Fix Subdomain URLs + Industry-Aware Storefront Themes

Two separate bugs, fixed together.

## Problem 1 — URLs render as `procschedule.com/business` instead of `business.procschedule.com`

The URL builder (`getTenantUrl`) and the storefront canonicalizer only switch a tenant to its subdomain once that tenant's `domain_status` is manually set to `"active"`. New signups are created pending, so they're stuck on the apex path form. Since the `*.procschedule.com` wildcard SSL is live and verified, every tenant can safely use the subdomain immediately.

### Changes
- **`src/lib/subdomain.ts`** — In `getTenantUrl`, on production/tenant-root hosts, always return `https://<slug>.procschedule.com` (drop the `domain_status === "active"` gate). Preview/sandbox/localhost still use the path form, since no wildcard exists there.
- **`src/routes/$slug.tsx`** — In the canonicalization effect, redirect apex path-form visits (`procschedule.com/<slug>`) to the subdomain regardless of `domain_status`, so old links forward cleanly.
- Anywhere the dashboard/onboarding shows the tenant's shareable booking link, it already calls `getTenantUrl`, so it inherits the fix automatically.

Note: the existing `domain_status` admin toggle (`/admin/domains`) stays in place for record-keeping but no longer blocks subdomain usage.

## Problem 2 — Every storefront shows the same template regardless of industry

Two causes:
1. **Onboarding never writes a `theme_id`** — `completeOnboarding` updates name/colors/logo but never sets `workspaces.theme_id`, so it stays at its default.
2. **The main storefront ignores themes** — `src/routes/$slug.tsx`'s `StorefrontView` hardcodes `DolliimarieStorefront` for slug `dolliimarie` and `DefaultStorefront` for everyone else. The themed layouts (Default / Luxury Blush / Industrial Dark) only exist on the separate `/book/$slug` route.

### Changes

**A. Theme selection during onboarding (default-by-industry + override picker)**
- **`src/components/onboarding/wizard-config.ts`**:
  - Add a `themeId` field to `WizardState` (`"default" | "luxury-blush" | "industrial-dark"`).
  - Add an industry→theme default map, e.g. Beauty & Hair → `luxury-blush`; Auto & Detailing / Home Services → `industrial-dark`; Fitness, Health, Consulting, Pet, Other → `default`.
  - Export a `THEMES` list (id, label, short description, preview swatch colors) for the picker UI.
- **`src/routes/onboarding.tsx`**:
  - When the user selects an industry, pre-set `themeId` to the industry default (only if they haven't manually chosen one yet).
  - Add a compact "Choose your design" picker (3 theme cards) to the design/preview step so the tenant can override.
  - Include `themeId` in the payload sent to `completeOnboarding`.
- **`src/lib/onboarding.functions.ts`**:
  - Add `themeId` to the input zod schema (enum, default `"default"`).
  - Write `theme_id: data.themeId` into the `workspaces` update block.

**B. Make the main storefront theme-aware (unify with `/book/$slug`)**
- **`src/routes/$slug.tsx`** — Replace the hardcoded `StorefrontView` branch with a `switch (workspace.theme_id)` that renders the matching themed layout (`LuxuryBlushLayout` / `IndustrialDarkLayout` / `DefaultStorefrontLayout`) using the same `StorefrontThemeProps` shape `/book/$slug` builds. Keep the `dolliimarie` special-case only if you want that exact bespoke page preserved (otherwise it becomes `luxury-blush`). The `OwnerAdminOverlay` stays mounted above the themed layout.
- Ensure `getStorefront` (in `src/lib/tenant.functions.ts`) returns the fields the themed layouts need (`theme_id`, colors, font, categories/variants/length options). If the storefront query doesn't already return the catalog in the theme-layout shape, map/extend it so the layouts render correctly.

## Verification
- Typecheck clean.
- New signup → confirm `workspaces.theme_id` is persisted and the chosen design renders at the storefront.
- Confirm the shareable link and post-signup canonical redirect both produce `business.procschedule.com`.
- Spot-check each of the three themes renders on the main storefront route.

## Out of scope
- No changes to billing/payment flow (payment only triggers the dashboard redirect; the template bug is in onboarding + storefront rendering, not Stripe).
- No DNS/SSL changes (wildcard already live).
