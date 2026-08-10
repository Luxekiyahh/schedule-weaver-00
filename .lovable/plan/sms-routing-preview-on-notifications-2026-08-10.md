# SMS routing preview on Notifications

Add a panel to the Notifications settings page that shows, at a glance, exactly where booking texts will go and why - so you can confirm owner alerts and client texts hit the expected numbers before a real booking happens.

## What the panel shows

- **Owner alert goes to**: the resolved number in proper +1 format, plus which field it came from (owner mobile, or business phone as fallback). If both are empty, it says no owner alert will be sent.
- **Client text goes to**: "the phone number each customer enters at booking" - with a note that the number is normalized to E.164 before sending.
- **Plan eligibility**: whether this workspace's plan includes booking SMS. If not, it explains that bookings auto-confirm by email instead.
- **Client text toggle status**: shows that the "reply YES to confirm" prompt is always sent regardless of the toggle, and that the toggle only affects follow-up status texts.
- **Warnings** when a saved number cannot be normalized to a valid mobile number, so bad formatting is caught before a booking.

The panel refreshes when the owner mobile field is edited (previewing the unsaved value) and after saving.

## Technical notes

- New authenticated server function `getSmsRoutingPreview` in `src/lib/sms/sms.functions.ts`:
  - resolves the caller's active workspace via `workspace_members`
  - reads `notify_mobile`, `business_phone`, `notification_settings` from `workspaces`
  - calls the `workspace_has_feature` RPC with `sms_booking_confirmations` for plan eligibility
  - returns resolved owner number, its source field, normalized/valid flags, plan eligibility and the `client_sms` toggle - no secrets, no Twilio calls
- Resolution order mirrors `loadBookingContext` in `src/lib/sms/booking-sms.server.ts` exactly: `notify_mobile` first, then `business_phone`.
- Number formatting/validation reuses `normalizePhoneToE164` from `src/lib/phone.ts` (shared, browser-safe) so the preview matches what the sender does.
- UI added to the SMS card in `src/routes/dashboard.notifications.tsx`, styled with existing semantic tokens and shadcn Card/Badge, loaded via `useServerFn` + `useQuery`. Unsaved owner-mobile edits are previewed client-side using the same shared normalizer.
- No changes to sending behavior; this is read-only diagnostics.
