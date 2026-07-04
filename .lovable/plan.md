## Goal
Add SMS booking-confirmation sending (via Twilio) to the existing confirmation flow, and add a "Send test SMS" button so we can verify it end-to-end.

## What exists today
- Booking confirmations are **email-only**: the `appointment-confirmation` webhook calls `sendAppointmentEmails(appt.id)` in `src/lib/email/appointment-emails.server.ts`.
- `workspaces.notification_settings` JSON stores prefs including `client_sms` (currently just a UI toggle on `dashboard.notifications.tsx`, not wired to anything).
- Twilio credentials already exist as secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
- `customers` table has a `phone` column; workspaces have `business_phone`, `name`, etc.

## Plan

### 1. Twilio SMS helper (server-only)
Create `src/lib/sms/twilio.server.ts`:
- `sendSms({ to, body })` posts to Twilio REST API `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json` with HTTP Basic auth (`SID:AUTH_TOKEN`), `application/x-www-form-urlencoded` body (`To`, `From`, `Body`).
- Reads `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` from `process.env` **inside** the function.
- Basic E.164 normalization of `to`; throws with the Twilio error body on non-2xx so failures are visible in logs.

### 2. Wire SMS into the confirmation flow
In `src/lib/email/appointment-emails.server.ts` (inside `sendAppointmentEmails`), after the email tasks:
- Add `client_sms` to the `prefs` merge default (`client_sms: false`).
- If `prefs.client_sms && customer.phone`, call `sendSms` with a concise confirmation message, e.g.:
  `"{businessName}: Your {serviceName} is confirmed for {dateLabel} at {timeLabel}. Reply to {business_phone} to make changes."`
- Wrap the SMS send in its own try/catch so an SMS failure never blocks the emails (log and continue). Reuse the already-computed `dateLabel`/`timeLabel`.

### 3. "Send test SMS" button (to test it)
- Add a server function `sendTestSms` in `src/lib/sms/sms.functions.ts` using `createServerFn` + `requireSupabaseAuth`, validating `{ phone: string }`. It verifies the caller is a member of a workspace (via their membership) and calls `sendSms` with a fixed test message. Returns `{ ok, sid }` or a typed error.
- On `src/routes/dashboard.notifications.tsx`, add a small "Test SMS" input (phone number) + button under the SMS card that calls the function via `useServerFn` and toasts success/failure.

### 4. Verify
- Typecheck/build.
- Use the test button (or `stack_modern--invoke-server-function`) to fire a real SMS to a provided number and confirm delivery + check server logs.
- Optionally insert a test `confirmed` appointment with `client_sms` enabled to confirm the webhook path also sends.

## Notes
- Uses the existing direct Twilio secrets (no connector changes needed).
- No DB migration required — `client_sms` already lives in `notification_settings`.
- I'll need a destination phone number to send the actual test SMS to.

## Technical details
- Twilio auth: `Authorization: Basic base64(ACCOUNT_SID:AUTH_TOKEN)`, body via `URLSearchParams`.
- All secret reads happen inside handler bodies (Worker runtime injects env per-request).
- `*.server.ts` helper is imported only from other server code / server functions, never from route components directly.