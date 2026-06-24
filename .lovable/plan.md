## Goal

Each "Get started" button on `/pricing` opens Stripe Checkout for its specific plan (Basic / Pro / Enterprise), with the one-time $100 setup fee bundled in for first-time buyers. Logged-out visitors continue through `/onboarding` first.

## Current state

The pricing page already maps each button to its plan and calls `openCheckout` with that plan's price. The intended flow is mostly wired, but it needs to be verified end-to-end and hardened so every button reliably reaches the Stripe-hosted checkout for the correct product.

## Flow per button

```text
Click "Get started" (plan X)
  ├─ Not signed in        → navigate to /onboarding (create account + workspace)
  ├─ Signed in, no workspace → toast error
  └─ Signed in + workspace → Stripe Checkout
         line items: [setup_fee_onetime (if not already paid)] + [X_monthly]
         success → /dashboard/home   cancel → /pricing
```

## Changes

1. **`src/routes/pricing.tsx`**
   - Confirm `handleSelect(tier)` passes the correct `priceLookupKeys` for each tier (`basic_monthly` / `pro_monthly` / `enterprise_monthly`) and sets `includeSetupFee` from `sub.setupFeePaid`.
   - Ensure the per-card button shows a loading spinner only for the clicked tier and surfaces a clear toast if checkout fails.
   - Keep the logged-out → `/onboarding` redirect and setup-fee bundling.

2. **`src/hooks/useStripeCheckout.ts` / `src/utils/payments.functions.ts`** (only if verification turns up a gap)
   - Confirm `createCheckoutSession` resolves each plan's price via `resolvePrice`, builds the subscription session with the optional setup-fee line item, and returns the hosted Checkout URL the client redirects to.

## Verification

- Run a typecheck/build.
- Drive the signed-in `/pricing` page with Playwright: click each plan's "Get started" and confirm it initiates a redirect to the Stripe Checkout URL (and that the resolved line items match plan + setup fee on first purchase).
- Confirm logged-out clicks route to `/onboarding`.

## Notes

- Checkout still uses the existing Lovable Stripe gateway and resolved price IDs; no product/price changes needed.
- Automatic tax falls back gracefully until the Stripe account address is configured, so checkout works in test mode now.
