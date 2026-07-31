# Enforce Strict SMS Sequence: Pending → YES/NO Text → Wait → YES → Confirmation Text

## Root cause (verified in code)

- `createBooking` (`src/lib/booking.functions.ts:369`) already does Step 1 right: inserts the appointment as `pending` and sends **only** the pre-confirmation YES/NO text (`sendBookingSms`) plus the owner alert.
- **The break is at Step 3**: the YES-reply handler (`src/routes/api/public/sms/inbound.ts:157-171`) flips the appointment to `confirmed` and sends the confirmation **emails**, but never calls `sendBookingConfirmedSms` — so the full confirmation text (service, date/time, price, business address) and the owner "confirmed" alert never fire after a YES. The client only gets a short auto-reply ("Your appointment is confirmed. See you soon!").
- The confirmation texts you already received came from the confirmed-path (`sendBookingConfirmedSms` via the appointment webhook / direct test invocation) firing **without** any YES gate — which is why messages arrived out of order.

## Plan

### 1. Code fix — gate the confirmation SMS behind the YES reply
In `src/routes/api/public/sms/inbound.ts`, YES branch only:
- After updating status to `confirmed`, call `sendBookingConfirmedSms(appointmentId)` (dynamic import, best-effort — same pattern as the email call beside it). This sends:
  - Client: the full confirmation text — service, date, time, price, add-ons, business address (Pro-gated, honors the tenant's client_sms toggle).
  - Owner: the "confirmed" alert text.
- NO branch stays as-is (cancel + free the slot). No pending appointment → "no appointment awaiting confirmation" reply, so duplicate YES replies can't double-send.
- No changes to the pending insert or the pre-confirmation text — Step 1 already behaves correctly.

### 2. Reset the Alluring Dolls test data
- Appointment `0f1aa144-daf8-4236-b428-40ac02fd0e0e` (DeAsia Holmes, Aug 8): status → `pending`, clear `cancelled_at`/`cancelled_by`. Its YES/NO code is **0F1AA1**.
- Appointment `55c63612-931c-41ed-8af1-6c4d3acbcc72` (duplicate pending for the same phone): status → `cancelled`, so exactly one pending booking exists for that number and the YES test is unambiguous.

### 3. Verify the Twilio inbound webhook
Check the Twilio tile on `/admin/health` — the number's SMS webhook must point to the production inbound handler (`…/api/public/sms/inbound`). If not, run **Fix now** (`fixTwilioSmsWebhook`). Without this, YES/NO replies never reach the app.

### 4. End-to-end test of the strict sequence
1. Trigger `sendBookingSms` for the reset appointment → verify the client (+1 561 905-7383) receives **only** the YES/NO pre-confirmation text (with code 0F1AA1, appointment details, business address) and the owner (+1 561 975-8519) gets the "awaiting confirmation" alert. Confirm `sms_send_log` shows delivered — this also re-validates that the trial-mode failures from 18:07 UTC are resolved.
2. You reply **YES 0F1AA1** (or plain YES — only one pending) from the client phone. Fallback: I simulate a properly Twilio-signed POST to the inbound webhook.
3. Verify the full chain:
   - Appointment flips `pending` → `confirmed` in the database.
   - Client receives the **final confirmation SMS** (new gated path) and the confirmation email.
   - Owner receives the "confirmed" alert.
   - `sms_send_log` shows all delivered, in the right order (booking_request → client_confirmed → owner_alert).
4. Open the Alluring Dolls dashboard calendar and confirm the Aug 8 appointment displays as confirmed (pending before the YES, confirmed after).
5. Cleanup: cancel/remove the test appointment afterward if you want it off the live calendar.

## Technical details
- Files changed: `src/routes/api/public/sms/inbound.ts` only (one dynamic import + one call in the YES branch).
- Data changes: two UPDATEs on the two DeAsia Holmes test appointments — no schema changes, no migration.
- Deposit/payment confirmation paths (`confirmDepositBooking`, `confirmSquareDepositBooking`) are untouched — payment-confirmed bookings intentionally skip YES/NO since payment is the confirmation.
- Publish is required before the live test so `procschedule.com` runs the fixed inbound handler.