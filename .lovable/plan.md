# Booking flow: categories, add-on tickers, deposit paywall & email fix

Three workstreams, all applied across every tenant (with the bespoke Alluring Dolls skin kept in sync).

## 1. Tidier catalog — dropdown categories + add-on tickers + image placeholders

**Problem:** The booking flow's Step 1 lists a flat `services` table, while the public storefront shows the richer `service_categories` / `service_variants` catalog. They're two different data sets, so the booking page looks untidy and uncategorized.

**Changes**
- **Schema (migration):** add an optional `image_url text` column to `service_categories` and `service_variants` (nullable, no data change). This backs the "optional image placeholder."
- **Data:** extend `getBookingWorkspace` to also return `categories`, `variants`, and `lengthOptions` (the same pipeline the storefront uses), including the new `image_url`.
- **Booking Step 1 (both the generic `booking.$slug.tsx` flow and the `AlluringDollsBookingFlow` skin):**
  - Group services under **collapsible category dropdowns** (accordion). Each category header shows its name and an **image thumbnail** — a styled placeholder box when `image_url` is empty.
  - Each service/variant row also gets a small **image placeholder** slot.
  - Render length options / add-ons as **toggle "ticker" buttons** (multi-select pill buttons) instead of a plain list, so the selected add-ons feed into the booking total.
- **Storefront (`AlluringDollsStorefront.tsx` + generic storefront):** mirror the placeholder image slot on categories and variants so the two surfaces stay consistent.

## 2. Deposit payment wall (all tenants, using the tenant's own connected provider)

**Behavior:** After Step 4 (Details), if the tenant has a connected provider and a deposit configured (`workspace_payment_settings.provider != 'none'`, `connection_status = 'connected'`, `deposit_type != 'none'`), insert a new **Step 5 — Deposit** that must be paid before the appointment is confirmed. If no payment is configured, booking confirms directly as it does today.

**Deposit amount** is derived per tenant from `workspace_payment_settings`:
- `full` → service/variant price
- `deposit` → `deposit_amount_cents`, or `deposit_percent` of the price

**Flow (Stripe first):**
- New server fn `createPendingBooking` inserts the appointment as `status = 'pending'` (does not fire the confirmation email yet) and returns its id.
- New server fn `createDepositCheckout` reads the tenant's `stripe_secret_key` from `workspace_payment_credentials` and creates a Stripe **Checkout Session** (`mode: 'payment'`, deposit amount) **directly against `api.stripe.com`** using the tenant's key (matching the existing `payment-connect.functions.ts` pattern — tenant keys are not routed through the Lovable gateway). `success_url` returns to `/booking/$slug?appt=<id>&session_id={CHECKOUT_SESSION_ID}`.
- On return, `confirmDepositBooking` retrieves the session with the tenant key; if `payment_status = 'paid'`, it flips the appointment to `confirmed` (which triggers the confirmation email) and records the deposit. Otherwise the slot stays pending and the user can retry.
- This session-verify approach avoids configuring a separate Stripe webhook per tenant.

**Provider scope:** implement the live charge for **Stripe** now (the connected provider Alluring Dolls will use). For tenants on PayPal/Square, Step 5 shows a deposit-required notice and confirms on continue, with a note that card capture for those providers is a follow-up. Confirm if you want PayPal/Square charging built now too.

## 3. Fix confirmation emails (nobody is receiving them)

**Root cause:** the appointment webhook sends via Resend using `onboarding@resend.dev`. That sandbox sender only delivers to the Resend account's own address — so customers (and in practice the owner) get nothing. The DB trigger and webhook themselves are wired correctly.

**Fix:** move confirmation + owner-alert emails onto Lovable's built-in, queued, logged email system sending from a verified project domain (`procschedule.com` is already attached to the project):
- Set up email infrastructure and app-email templates (booking confirmation for the customer, new-booking alert for the owner).
- Trigger the sends from the booking confirmation path (`createBooking` / `confirmDepositBooking`) via the queued send helper with an idempotency key per appointment — instead of the current direct Resend call in the DB-webhook route.
- Retire the `onboarding@resend.dev` sends. Delivery becomes visible in the email log for debugging.
- *Prerequisite:* this needs the sender domain confirmed/verified; if DNS isn't finished, emails queue and start flowing once verification completes.

## Technical notes / files
- Migration: `image_url` on `service_categories`, `service_variants`.
- `src/lib/booking.functions.ts`: extend `getBookingWorkspace`; add `createPendingBooking`, `createDepositCheckout`, `confirmDepositBooking`; keep direct `createBooking` for no-payment tenants; move email trigger to confirmation path.
- `src/routes/booking.$slug.tsx` + `src/components/AlluringDollsBookingFlow.tsx`: category accordions, add-on ticker buttons, image placeholders, new deposit step + return handling.
- `src/components/AlluringDollsStorefront.tsx` + generic storefront: image placeholder slots.
- Tenant Stripe calls reuse the direct-provider pattern from `src/utils/payment-connect.functions.ts` (not `stripe.server.ts`, which is the platform's own Stripe).
- Email: Lovable email infra + templates; remove `onboarding@resend.dev` path in `src/routes/api/public/appointment-confirmation.ts`.

## Open question
- Build live card capture for **PayPal/Square** deposits now, or Stripe-only with an info screen for the other two initially?
