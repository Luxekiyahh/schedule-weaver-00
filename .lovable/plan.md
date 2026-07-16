# Bypass paywall for platform admins

The dashboard subscription gate in `src/routes/dashboard.tsx` currently forces every workspace to have an active subscription (`sub.isActive`) or it toasts and redirects to `/pricing`. `takiyah472@gmail.com` is already in the `platform_admins` table (that's how `/admin` grants access), so the cleanest fix is to treat platform admins as always-entitled — no per-user hardcoding, no data changes.

## Changes

1. **`src/routes/dashboard.tsx`** — before the paywall redirect, call the existing `isPlatformAdmin` server function (`src/lib/platform-admin.functions.ts`) once on mount. If `isPlatformAdmin` is true, skip the `!sub.isActive` redirect entirely and render `<Outlet />`. While the admin check is in flight, don't bounce to `/pricing`.

2. Leave `useSubscription`, Stripe sync, and the `ALLOWED_WHEN_INACTIVE` list untouched so real tenants still hit the paywall.

3. No schema, RLS, or auth changes. `/admin` continues to work as-is.

## Verification

- Sign in as `takiyah472@gmail.com`, visit `/dashboard/home` and a locked subpage (e.g. `/dashboard/calendar`): should load without the "subscription is inactive" toast or `/pricing` redirect.
- Sign in as a non-admin tenant with no active subscription: still redirected to `/pricing` (unchanged behavior).
- `bunx tsgo --noEmit` passes.
