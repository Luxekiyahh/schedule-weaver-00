# Booking SMS: client thank-you + tenant alert + YES/NO confirmation

## Goal
When a client books:
1. The client gets a "thank you for booking" SMS with their appointment info and the business address, asking them to reply **YES** to confirm or **NO** to cancel.
2. The tenant (owner) gets an SMS alert about the new booking.
3. The appointment stays **pending until the client replies YES**; **NO** cancels it and frees the slot.

## Key constraints discovered
- The public booking form does **not** collect a phone number today, and `createBooking` inserts appointments as `confirmed`. Both must change.
- SMS sending already exists (`src/lib/sms/twilio.server.ts`) via the direct Twilio REST API using existing secrets (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`).
- Two-way replies require Twilio to POST inbound messages to a public webhook — this needs a one-time setup step in the Twilio Console (see Setup below).

## Changes

### 1. Database (migration)
- Add `notify_mobile` (text, nullable) to `workspaces` — the owner's mobile for booking alerts, used as a fallback when `business_phone` is empty. Tenant alert is sent to `business_phone` if present, otherwise `notify_mobile`.
- Add `sms_confirmation_status` (text, nullable) + optional `customer_phone` denormalization is not needed — phone is already stored on `customers`. We will store the client phone on the `customers` row (existing `phone` column).
- No new table required. Inbound replies are matched by the sender's phone number to the customer's most recent `pending` appointment.

### 2. Collect phone on the booking form
- Add a required `phone` field to the booking input schema in `src/lib/booking.functions.ts` (zod: trimmed, 6–20 chars) and to the public booking UI (`src/routes/booking.$slug.tsx`, and `book.$slug.tsx` if it renders a form).
- Persist the phone onto the `customers` record in `prepareAndInsertAppointment` (set on create, and update existing customers that have no phone).

### 3. Pending-until-YES flow
- Change `createBooking` to insert the appointment with status **`pending`** instead of `confirmed`.
- Since the existing appointment-insert webhook only emails on `confirmed`, the new booking-time SMS (both client + tenant) will be sent directly from `createBooking` after insert (not via the email webhook), through a new server-only helper.

### 4. New SMS helper: `src/lib/sms/booking-sms.server.ts`
- `sendBookingSms(appointmentId)`: hydrates appointment + customer + workspace + service (like `appointment-emails.server.ts`) and sends:
  - **Client thank-you SMS** (new builder `buildBookingRequestSms` in `twilio.server.ts`): greeting, service, date/time, price, business address, and "Reply YES to confirm or NO to cancel."
  - **Tenant alert SMS** (new builder `buildOwnerAlertSms`): customer name, service, date/time, and client phone — sent to `business_phone` || `notify_mobile`.
- Respects existing notification prefs where sensible; always attempts the client confirmation SMS since it's core to the flow.
- Wrapped in try/catch so SMS failures never block the booking.

### 5. Inbound reply webhook: `src/routes/api/public/sms/inbound.ts`
- Twilio POSTs `application/x-www-form-urlencoded` with `From`, `Body`, and a signature header.
- Verify the request using Twilio's `X-Twilio-Signature` (HMAC-SHA1 over the URL + sorted params with the auth token) — reject unverified requests.
- Normalize `From` to E.164, find the customer(s) with that phone, then their most recent `pending` appointment.
- If body starts with **YES/Y** → set status `confirmed` (this fires the existing confirmation email webhook path too) and reply with a TwiML confirmation message.
- If body starts with **NO/N** → set status `cancelled` (frees the slot; existing cancellation trigger runs) and reply with a TwiML cancellation message.
- Otherwise reply with a short "Reply YES or NO" TwiML.
- Returns `text/xml` TwiML so Twilio relays the auto-reply.

### 6. Tenant settings UI
- In the notifications settings route (`src/routes/dashboard.notifications.tsx`), add an "Owner mobile for booking alerts" input bound to `workspaces.notify_mobile`, saved via a small authenticated server function. Explain it's used when no business phone is set.

## Setup the user must do (one-time)
- In the Twilio Console, set the **Messaging → A message comes in** webhook for the project's Twilio number to:
  `https://schedule-weaver-00.lovable.app/api/public/sms/inbound` (POST).
- Recommend enabling SMS Pumping Protection / Geo Permissions for the number.

## Verification
- Typecheck.
- Simulate an inbound POST (signed) to the webhook and confirm a pending appointment flips to confirmed/cancelled.
- Confirm booking with a real phone triggers both SMS and leaves the appointment pending until reply.

## Technical notes
- Inbound webhook runs in the Worker runtime; use Web Crypto (HMAC-SHA1) for Twilio signature verification (no Node-only libs).
- All server-only Supabase access uses `supabaseAdmin` imported inside handlers.
- The Twilio number is shared across tenants, so replies are matched by customer phone → latest pending appointment (across the platform). Edge case: a client with pending appointments at two businesses — YES/NO applies to the most recent; acceptable for v1.
