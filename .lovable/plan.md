## Master Admin Dashboard for Procschedule tenants

Build an internal operator console at `/admin`, gated to platform admins (`platform_admins` + `is_platform_admin()` — both already exist). It reuses the existing server-fn + admin-gate patterns from `admin.domains.tsx` / `platform-admin.functions.ts`.

### 1. Database migration

- **Suspend support:** add `suspended_at timestamptz`, `suspended_reason text`, `suspended_by uuid` to `workspaces`.
- **Enforce suspension:** update `getStorefront` and the booking-create path to treat a suspended workspace as unavailable (storefront shows a "temporarily unavailable" state; booking is rejected).
- **SMS logging:** create `public.sms_send_log` (workspace_id, to_number, body, purpose, twilio_sid, status, error_message, created_at) with GRANTs (service_role all; authenticated none — operator-only via admin fns) and RLS enabled fail-closed, mirroring `email_send_log`.
- **Operator read RPCs (SECURITY DEFINER, guarded by `is_platform_admin()`):**
  - `admin_cron_status()` → returns `cron.job` rows + latest `cron.job_run_details` (status, run time). PostgREST can't reach the `cron` schema directly, so this RPC is required.
  - `admin_platform_stats()` → aggregate counts (tenants by status, bookings last 7/30d, recent email failures from `email_send_log`, recent SMS failures from `sms_send_log`).

### 2. SMS logging wrapper

Add a `logAndSendSms()` helper (server-only) that calls the existing `sendSms()` and records the attempt + result into `sms_send_log`. Route the booking SMS (`booking-sms.server.ts`), waitlist, and confirmation sends through it so Twilio activity becomes queryable. `sendSms()` itself stays unchanged.

### 3. Server functions (`src/lib/platform-admin.functions.ts`, extended)

Every function re-checks `is_platform_admin()` before acting (same guard already used in the file).

- `listTenants()` — name, slug, `domain_status`, `suspended_at`, derived status (suspended / trial / active / past_due / cancelled from `subscriptions`), plan_tier, created_at, owner email.
- `getTenantDetail({ workspaceId })` — services/variants, recent appointments (with customer + status), payment settings + provider connection status, recent `email_send_log` and `sms_send_log` rows for that workspace.
- `suspendTenant` / `reactivateTenant({ workspaceId, reason })` — set/clear suspension fields.
- `impersonateTenant({ workspaceId })` — **full dashboard impersonation.** Looks up the owner's email, calls `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' })`, returns the `token_hash`; the client calls `supabase.auth.verifyOtp` to establish the owner's session, then routes to `/dashboard/home`. Logs the impersonation event (operator id + target + timestamp) into a lightweight audit note in `sms_send_log`-style pattern (new `admin_audit_log` table added in the migration). Includes a clear warning banner that this replaces the current session.
- `resendConfirmationSms({ appointmentId })` — rehydrate + resend via `buildConfirmationSms` + `logAndSendSms`.
- `resendWelcomeEmail({ workspaceId })` — re-enqueue the `welcome` template via `enqueueTransactionalEmail`.
- `triggerAppointmentWebhook({ appointmentId })` — POST the appointment-confirmation webhook with the shared secret (server-to-server), for manual replay.
- `rerunCronForTenant()` / `pokeEmailQueue()` — manually invoke the email-queue process route (the only per-tenant cron surface today) and re-run waitlist-notify for a chosen cancelled appointment.
- `getSystemHealth()` — combines: Stripe live/sandbox failed & past_due subscriptions from the `subscriptions` table **plus** recent failed charges pulled live via `createStripeClient` (using `src/lib/stripe.server.ts`); Twilio failures from `sms_send_log` **plus** a live pull of recent message statuses from the Twilio REST API; email failures from `email_send_log`; and `admin_cron_status()`.

### 4. Routes (UI)

Shared admin gate helper (redirect to `/login` if signed out; server fns enforce admin). Reuse the clean card styling already in `admin.domains.tsx`.

- `/admin` — landing: nav + health summary tiles.
- `/admin/tenants` — tenant list/overview table with status/plan/created, search, suspend toggle, and links to detail + storefront preview.
- `/admin/tenants/$id` — tenant detail: services, recent bookings, payment status, email/SMS logs; action buttons (impersonate, suspend/reactivate, resend welcome email, resend confirmation SMS per booking, replay webhook).
- `/admin/health` — system health: Stripe failures, Twilio failures, email failures, pg_cron job status with last-run times.

Storefront preview = open `https://<slug>.procschedule.com` (or `/{slug}`) in a new tab. Full impersonation = the magic-link flow above.

### 5. Verification

Typecheck; load `/admin/*` as a platform admin; confirm tenant list, detail, suspend/reactivate, impersonation session swap, each manual trigger, and the health panel (including live Stripe/Twilio pulls) render and function.

### Technical notes
- Impersonation via `auth.admin.generateLink` + client `verifyOtp` is the standard Supabase approach (no password needed); the operator's own session is replaced, so the UI warns before proceeding and offers a "return to admin" sign-out.
- All Stripe calls go through `createStripeClient` (gateway), never the raw SDK. Twilio status uses the existing REST pattern from `twilio.server.ts`.
- New tables (`sms_send_log`, `admin_audit_log`) follow the CREATE→GRANT→RLS→POLICY order; both are operator/service-role only (fail-closed for authenticated/anon).
