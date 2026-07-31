# SMS Workflow for Pro Plans — Fix Coverage, Gate to Pro, Test Live

## Why texts aren't going out today

- The booking SMS (client YES/NO text + owner alert) only fires on the **free booking** path (`createBooking`). Alluring Dolls — the only Pro tenant — takes **$25 Square deposits (live mode)**, and both deposit-confirmation paths (`confirmDepositBooking` for Stripe, `confirmSquareDepositBooking` for Square) send **emails only, never SMS**. Result: `sms_send_log` has zero rows and no Pro customer or owner has ever received a booking text.
- SMS is currently **ungated** — every plan would get it. Per your decision, booking SMS becomes a **Pro/Enterprise-only** feature.
- The YES/NO inbound endpoint exists (`/api/public/sms/inbound`), but we can't tell from here whether the Twilio number's webhook URL points at it.

## Phase 1 — Code fixes

1. **Plan gating (migration)**: extend the `workspace_has_feature(uuid, text, text)` database function with a new `sms_booking_confirmations` feature that returns true only for `pro`/`enterprise` subscriptions (matching the workspace's environment).
2. **`src/lib/sms/booking-sms.server.ts`**:
   - Add a plan gate at the top of the SMS sender: workspaces without the feature get no SMS, and a `sms_send_log` row with status `skipped` (reason recorded) is written so skips are visible in the admin console.
   - Honor the tenant's existing `client_sms` notification toggle (skip the client text only if they switched it off; owner alert still sends).
   - Add `sendBookingConfirmedSms(appointmentId)`: client gets a "your appointment is confirmed" text (service, date/time, price, business address — no YES/NO, since payment already confirms it) and the owner gets a "New booking confirmed" alert.
3. **`src/lib/sms/twilio.server.ts`**: parameterize the owner-alert first line ("awaiting client confirmation" vs "confirmed").
4. **`src/lib/booking.functions.ts`**: call `sendBookingConfirmedSms` (best-effort, alongside the existing email dispatch) in both `confirmDepositBooking` (Stripe) and `confirmSquareDepositBooking` (Square).
5. **Twilio webhook visibility/auto-fix**: new admin server function that reads the Twilio number's configured inbound SMS webhook via the Twilio API, reports it on `/admin/health`, and can set it to `https://procschedule.com/api/public/sms/inbound` if missing or wrong (one click, no console spelunking).

## Phase 2 — Preview verification

- Build/typecheck passes.
- Gating check: Kandii Krowns (Basic) SMS is skipped + logged; Alluring Dolls (Pro) is eligible.

## Phase 3 — Publish + live end-to-end test on Alluring Dolls

1. Publish the app so `procschedule.com` runs the fix.
2. Verify/auto-set the Twilio inbound webhook (step 5 above).
3. Send a connectivity test SMS to your number **561-905-7383**.
4. Create a **real test booking** on the live Alluring Dolls storefront with your number as the client phone → expect: client "thank you for booking… reply YES <code>" text to you, owner alert to **561-975-8519**, and matching `sms_send_log` rows with Twilio SIDs.
5. **Reply YES** from your phone → appointment flips to `confirmed`, confirmation email fires, and you get the "confirmed" reply text.
6. Deposit path: skip the real $25 charge — instead invoke the new confirmed-SMS sender directly on the test appointment and verify delivery/content, which is the exact code path Square confirmation will now call.
7. Negative test: trigger a booking SMS on Kandii Krowns (Basic) → confirm it is skipped and logged as such.
8. Cleanup: cancel the test appointment and confirm nothing else was disturbed.

## Technical details

- Migration: `CREATE OR REPLACE FUNCTION public.workspace_has_feature(uuid, text, text)` adding `WHEN 'sms_booking_confirmations' THEN s.plan_tier IN ('pro','enterprise')` (grants preserved on replace).
- Gate + skip logging live in `booking-sms.server.ts` (single choke point used by both the free and deposit paths).
- No new secrets needed — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` are already configured.
- All SMS sends remain best-effort: a Twilio failure never blocks a booking or a payment confirmation.
- Test touches one live tenant (Alluring Dolls) as approved; test appointment is cancelled afterward.