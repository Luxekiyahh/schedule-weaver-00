## Goal
In preview, tenants whose only subscription lives in the **live** environment (which is every real subscriber, since checkout runs against live) currently read as inactive and get bounced back to `/pricing`. Add a preview-only fallback so gating recognizes a live subscription when no sandbox row exists.

## Root cause
- `getStripeEnvironment()` returns `"sandbox"` in preview.
- `useSubscription` queries `subscriptions` filtered by `environment = "sandbox"` → empty for Alluring Dolls (their only row is `environment = "live"`, pro/active).
- `src/routes/dashboard.tsx` redirects to `/pricing` when `!sub.isActive`, so preview users can never leave `/pricing`.

## Change
Edit **`src/hooks/useSubscription.ts`** only:

1. Query the subscription for the resolved environment (`getStripeEnvironment()`) as today.
2. If that returns no row **and** the environment is `"sandbox"` (i.e. preview/dev), run a second query for the same workspace filtered by `environment = "live"`, ordered by `created_at desc`, `limit(1)`, `maybeSingle()`, and use that row for gating.
3. Never do the reverse (live never falls back to sandbox), so the published site is completely unaffected.
4. Keep the existing `isActive` / grace-period logic unchanged.

This is a read-only gating fallback in preview; no schema or data changes, and checkout still targets the correct environment.

## Verification
- In preview as Alluring Dolls (`courttayicousfoster@gmail.com`), confirm `/dashboard/*` loads instead of redirecting to `/pricing`.
- Confirm the published site behavior is unchanged (live env still reads the live row directly).

## Technical notes
- Only `src/hooks/useSubscription.ts` changes.
- The fallback branch is guarded by `getStripeEnvironment() === "sandbox"` so it cannot leak into production gating.
