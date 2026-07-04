# Add Square deposit checkout to the booking flow

## Goal
Today the deposit payment wall only charges real cards for **Stripe** tenants. Square/PayPal tenants just see a "deposit required" notice and the appointment confirms with no money collected. This plan adds true **Square** card capture so Alluring Dolls (which uses Square) can collect deposits before an appointment is confirmed — testable end to end.

## How it will work (mirrors the Stripe path)
1. Customer completes Steps 1–4, clicks "Continue to deposit".
2. Server creates a `pending` appointment (holds the slot) and a **Square hosted payment link** for the deposit amount, on the tenant's own Square account.
3. Customer is redirected to Square's hosted checkout, pays the deposit.
4. On return, the server verifies the Square order/payment is `COMPLETED`/`PAID`, then flips the appointment to `confirmed` and fires the confirmation email. If not paid, the pending hold is rolled back / left to expire.

## Backend changes (`src/lib/booking.functions.ts`)
- **`getBookingWorkspace`**: already exposes a `payment` block only for connected providers with a non-zero deposit. Extend so it isn't Stripe-gated — return `payment` for `square` too (the existing query already reads `provider`).
- **New `createSquareDepositCheckout`** (or branch inside `createDepositCheckout` on `settings.provider`):
  - Guard: `provider === "square"`, `connection_status === "connected"`, deposit configured.
  - Read `square_access_token` + `square_location_id` from `workspace_payment_credentials`.
  - `prepareAndInsertAppointment(data, "pending")`, compute deposit cents via existing `computeDepositCents`.
  - Call Square **Checkout API — Create Payment Link** (`POST https://connect.squareup.com/v2/online-checkout/payment-links`) with a `quick_pay` (name, `price_money`, `location_id`), `checkout_options.redirect_url` = `${origin}/booking/${slug}?appt=<id>&square_order=<orderId>`, and `payment_note`/`reference_id` = appointment id.
  - Return `{ url, appointmentId }`. On failure, delete the pending appointment (same rollback as Stripe).
  - Use production Square host by default; detect sandbox tokens if needed.
- **New `confirmSquareDepositBooking`** (or branch inside `confirmDepositBooking`):
  - Retrieve the order via Square (`GET /v2/orders/{orderId}` or Retrieve Payment Link) using the tenant token.
  - If `state === "COMPLETED"` / tenders paid, call the shared confirm helper (same one Stripe uses) to set `confirmed`, record deposit amount, dispatch confirmation + owner-alert emails (idempotent).
  - If unpaid, throw a friendly "deposit not received yet" error and leave the hold.

## Frontend changes (`src/routes/booking.$slug.tsx`)
- In the confirm handler, replace the `data.payment?.provider === "stripe"` branch with a provider switch:
  - `stripe` → existing `createDepositCheckout` redirect.
  - `square` → new `createSquareDepositCheckout` redirect.
  - otherwise → direct submit (current fallback).
- In the return-from-checkout effect, also handle the `square_order` query param: when present, call `confirmSquareDepositBooking` and show the same "Confirming your deposit…" state and success/error toasts already used for Stripe.

## `AlluringDollsBookingFlow.tsx`
- Deposit copy already reads generically from `depositRequired`/`data.payment`; no structural change needed. Confirm the "Continue to Deposit" button + deposit summary render for Square (they will, since `depositRequired` is provider-agnostic once the backend returns `payment` for Square).

## Testing
- With Alluring Dolls' Square connected + a deposit configured, run a booking in preview: verify redirect to Square checkout, pay in Square sandbox, confirm return flips the appointment to confirmed and sends the email. Verify a cancelled/unpaid return does **not** confirm.

## Notes / open items
- Square deposits require the tenant's Square token to have Checkout API permissions; if the stored token is sandbox vs production, the API host must match — I'll default to production and can add a sandbox toggle if your Square connection is sandbox.
- PayPal remains notice-only under this plan (no card capture) — say the word and I'll add PayPal in a follow-up.
