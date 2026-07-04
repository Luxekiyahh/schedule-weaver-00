# Make Square work reliably for all tenants (live-only)

The Square deposit flow is already generic — every server function reads
`workspace_payment_credentials` / `workspace_payment_settings` by
`workspace_id`, and the booking UI (generic flow + Alluring Dolls skin, which
share one submit handler) branches on `data.payment.provider === "square"`.
Nothing is hardcoded to a single tenant. This plan verifies that and closes
three real gaps so any workspace that connects Square can collect deposits
confidently in production.

## 1. Make Square live-only

Today the dashboard exposes a sandbox/live environment toggle. Per your
decision, Square should only ever run against Square's live API.

- `src/routes/dashboard.payments.tsx`: remove the sandbox/live environment
  selector for Square (keep Stripe's auto-detect behavior untouched) and always
  submit `environment: "live"` when the selected provider is Square.
- `src/utils/payment-connect.functions.ts`: in `saveProviderCredentials`, force
  `environment = "live"` for Square regardless of input, so validation and
  storage always hit `connect.squareup.com`.
- `src/lib/booking.functions.ts`: `squareApiBase()` already returns the live
  host for anything that isn't `"sandbox"`; since stored env is now always
  `"live"`, the deposit + confirmation calls target live automatically.

## 2. Reliable payment confirmation (the main robustness fix)

`confirmSquareDepositBooking` currently searches the location's 100 most recent
orders and matches on `reference_id`. For a busy tenant, the just-paid order can
fall outside that window, so the appointment never flips to `confirmed`. Fix by
looking the order up directly.

- Add a nullable `square_order_id text` column to `appointments` (migration; no
  new table, so no new GRANTs needed).
- `createSquareDepositCheckout`: store `payment_link.order_id` on the pending
  appointment when the checkout link is created.
- `confirmSquareDepositBooking`: when `square_order_id` is present, retrieve that
  order directly (`GET /v2/orders/{order_id}`) instead of searching. Fall back to
  the existing recent-orders search only when the id is missing (older rows).

## 3. Verify the amount actually paid

Currently confirmation only checks the order state is `COMPLETED`. Add a guard
that the order's captured/total amount is at least the expected deposit
(`deposit_cents` on the appointment), so a partially-paid or tampered order can't
confirm a booking. On mismatch, keep the appointment pending and return the
"deposit not received" message.

## 4. Verification

- Confirm the build passes.
- Re-read the two server functions to confirm live-only + direct-order lookup +
  amount check are wired correctly.
- Smoke-test the dashboard Payments screen (Playwright) to confirm a non-Alluring
  workspace can select Square, that the sandbox toggle is gone, and the connect
  form submits.
- Real end-to-end charging can't be exercised without a live Square account +
  real card, so I'll validate logic and the connect path rather than move real
  money. I'll report exactly what was and wasn't exercised.

## Technical notes

- Files touched: `src/routes/dashboard.payments.tsx`,
  `src/utils/payment-connect.functions.ts`, `src/lib/booking.functions.ts`, plus
  one migration adding `appointments.square_order_id`.
- No change to the booking UI branching or the shared submit handler — it already
  covers all tenants.
- Square API version stays `2024-10-17`.
