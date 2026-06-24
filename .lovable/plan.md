# Make "Connect account" actually connect

Today the button (`handleConnect` in `src/routes/dashboard.payments.tsx`) only shows a "coming soon" toast. We'll turn it into real, provider-specific onboarding driven by the provider chosen on the page.

## How it will behave
1. Owner picks Stripe / Square / PayPal on the payments page.
2. Clicks **Connect account** → server creates a provider onboarding session and returns a URL.
3. Browser redirects to the provider's hosted onboarding.
4. On completion the provider redirects back to a return route, we re-check the account status, and the page shows **Connected**.

## What ships live now: Stripe Connect (no new credentials)
Stripe is already connected through the Lovable gateway, so this works immediately.

- New server functions in `src/utils/payment-connect.functions.ts`:
  - `startStripeConnect` — auth + workspace-member check; creates (or reuses) a Stripe **Express** connected account for the workspace, stores its id, then creates an Account Link and returns its URL. Uses `createStripeClient` from `src/lib/stripe.server.ts` (gateway-routed).
  - `refreshConnectStatus` — re-reads the connected account (`charges_enabled` / `details_submitted`) and updates `connection_status` to `connected` / `pending`.
- Persist the connected-account id in the existing `provider_account_id` column and reuse it on repeat clicks so we don't create duplicates.
- Return/refresh handling via the existing `/dashboard/payments` route reading `?connect=return` / `?connect=refresh` query params (calls `refreshConnectStatus`, then cleans the URL). Onboarding `return_url` / `refresh_url` are built from `window.location.origin` so it works on tenant subdomains and the custom domain.

## What gets scaffolded but stays gated: Square & PayPal
You don't have credentials yet, so these can't go live until you create developer apps and provide OAuth keys.

- The same `startProviderConnect` entry point will branch on provider. For Square/PayPal it checks for the required secrets; if missing, it returns a clear, actionable message and the button surfaces "Add your Square/PayPal credentials to enable this" instead of silently doing nothing.
- When you're ready, you'll add: Square (`SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET`) and PayPal (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`) via the secrets flow, and I'll wire their OAuth redirect + token exchange + return handling following the same pattern as Stripe.

## Frontend changes (`src/routes/dashboard.payments.tsx`)
- Replace the toast-only `handleConnect` with a call to `startProviderConnect`, then `window.location.href = url` on success.
- Add a small "Connecting…" loading state on the button.
- On mount, detect `?connect=return|refresh`, call `refreshConnectStatus`, update the pill, and strip the query param.
- Disable Connect until settings are saved with the chosen provider (so the row exists), or auto-save the provider first.

## Notes / constraints
- No database migration needed — `workspace_payment_settings` already has `provider`, `connection_status`, and `provider_account_id`.
- Stripe Connect requires the platform Stripe account to have Connect enabled. If the gateway's Stripe account doesn't have Connect turned on, the first attempt will return Stripe's error; I'll surface that message verbatim so we know to enable it. This is the one external dependency for the Stripe path.
- All Stripe calls go through the gateway helper — no direct SDK keys.

## Technical summary
- New: `src/utils/payment-connect.functions.ts` (`startProviderConnect`/`startStripeConnect`, `refreshConnectStatus`).
- Edit: `src/routes/dashboard.payments.tsx` (real connect handler, return-param handling, loading state).
- Reuse: `src/lib/stripe.server.ts`, `workspace_payment_settings` table, `requireSupabaseAuth` middleware (already registered in `src/start.ts`).
