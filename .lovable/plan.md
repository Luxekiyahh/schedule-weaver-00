# Welcome email on signup

Send a branded "Welcome to Procschedule" email as soon as a user creates their account, listing the platform's features and the support address **admin@procschedule.com**.

## Where it triggers

New accounts are created in the onboarding wizard, which calls the `finalizeTenantSignup` server function right after signup. That handler already runs server-side with the service-role client and knows the new user — it's the reliable place to enqueue the welcome email (fires exactly once per new account, no client dependency).

## What I'll build

1. **New email template** `src/lib/email-templates/welcome.tsx`
   - React Email component matching the existing templates' style (same `#ffffff` body, brand-consistent container/heading/button).
   - Content:
     - Warm welcome headline + intro.
     - A feature list covering the platform's capabilities, e.g.:
       - Custom-branded booking storefront at procschedule.com/your-name
       - Calendar with day/week/month views and appointment management
       - Online deposits & payment collection
       - Automated SMS & email reminders and confirmations
       - Client management and profiles
       - Service catalog, availability, and staff management
       - Review-redirect, VIP tiering, waitlist, and no-show protection (higher tiers)
     - Clear support line: "Questions? Email us at admin@procschedule.com".
     - CTA button linking to the dashboard.
   - Subject: "Welcome to Procschedule 🎉".

2. **Register the template** in `src/lib/email-templates/registry.ts` under key `welcome`.

3. **Trigger the send** inside `finalizeTenantSignup` (`src/lib/tenant.functions.ts`):
   - After the workspace is finalized, resolve the user's email (via `supabaseAdmin.auth.admin.getUserById(userId)`), then call `enqueueTransactionalEmail({ templateName: "welcome", recipientEmail, idempotencyKey: 'welcome-' + userId, templateData })`.
   - Import `enqueueTransactionalEmail` **inside the handler** (it's a `.server` helper using the service-role client) so it never leaks into the client bundle.
   - Wrap the send in try/catch so a mail hiccup never blocks account creation.

## Notes

- Uses the existing Lovable email infrastructure (domain `notify.procschedule.com` is verified and the queue is healthy) — no new setup or secrets.
- This is a transactional email (one recipient, triggered by their own signup), fully compliant with app-email rules.
- No schema changes.
