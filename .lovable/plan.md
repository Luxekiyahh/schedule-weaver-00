# Add business address + contact info to the booking confirmation email

Right now the app stores no business address or contact details anywhere, so I'll add fields for each business to enter (address, phone, contact email, website), persist them, then show them in the customer booking-confirmation email. I'll also remove the "Need to make a change? Just reply to this email…" line since these are sent from a no-reply address.

## 1. Data model (migration)

Add four nullable text columns to `workspaces`:
- `business_address`
- `business_phone`
- `business_email`
- `business_website`

No new table, so no new grants needed. Existing RLS on `workspaces` already covers member access.

## 2. Save / load the fields

- New authenticated server function `saveBusinessInfo` (in `src/lib/tenant.functions.ts`) using `requireSupabaseAuth` + a workspace-membership/admin check, writing the four columns.
- Extend the existing workspace/context loader used by the dashboard so the current values come back for editing.

## 3. Where businesses enter it

Per your answer, both places:
- **Onboarding "Identity" step** (`src/routes/onboarding.tsx`, step 3): add Address, Phone, Contact email, Website inputs to the wizard state, and persist them when the workspace is created (`finalizeTenantSignup`).
- **Dashboard** (`src/routes/dashboard.home.tsx`): add an editable "Business info" card (Address, Phone, Contact email, Website) with a Save button that calls `saveBusinessInfo`, so existing businesses can fill it in and edit later.

## 4. Email template changes

- `src/lib/email/appointment-emails.server.ts`: select the four new columns and pass `businessAddress`, `businessPhone`, `businessEmail`, `businessWebsite` into the `booking-confirmation` template data.
- `src/lib/email-templates/booking-confirmation.tsx`:
  - Add a **Location** block showing the business address (only if present).
  - Add a **Contact** block showing phone, email, and website (each only if present).
  - **Remove** the "Need to make a change? Just reply to this email and we'll take care of it." line.
  - Update `previewData` with sample address/phone/email/website.

Each new block renders only when its value exists, so businesses that haven't filled the info in won't get empty rows.

## 5. Verification

- Run the typecheck/build.
- Render the confirmation template via the email preview route to confirm the address/contact blocks show and the reply line is gone.
- Smoke-test the dashboard "Business info" card saves and reloads with the values.

## Technical notes

- Files: one migration; `src/lib/tenant.functions.ts`; `src/routes/onboarding.tsx`; `src/routes/dashboard.home.tsx`; `src/lib/email/appointment-emails.server.ts`; `src/lib/email-templates/booking-confirmation.tsx`.
- The From address stays no-reply; the contact block gives customers a real way to reach the business instead of replying.
