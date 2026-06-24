# Fix tenant subscriptions, guest payments, and subdomain links

Three separate problems, tackled in order of impact. Two of them (guest payments, wildcard DNS) are large enough that they're phased.

---

## Problem 1 — Subscriptions never show "active" + enforce access

**Root cause:** the `subscriptions` table is completely empty (0 rows) even for paying clients. The checkout code sets the right `workspaceId` metadata, so the issue is the webhook rows aren't landing in the environment the billing page reads. The billing UI only reads rows tagged with the *current* environment (`live` in production, `sandbox` in preview), so any mismatch shows "no plan." Relying solely on the webhook is fragile.

**Fixes:**
1. **Add a reconciliation server function** (`syncWorkspaceSubscription` in `src/utils/payments.functions.ts`, `requireSupabaseAuth` + workspace-member check). It queries Stripe directly for the workspace's customer/subscriptions (via `metadata['workspaceId']` search), then upserts the row into `subscriptions` with the correct `environment`. This makes billing display correct even if a webhook was missed or landed in the wrong env.
2. **Call it on the billing page load** (`dashboard.billing.tsx`) and after checkout return, then `refresh()` the `useSubscription` hook. Billing now self-heals.
3. **Harden the webhook** (`src/routes/api/public/payments/webhook.ts`): reject requests with a missing/invalid `?env=` param instead of silently defaulting to `sandbox` (current default is the likely cause of mis-tagged rows), and log unmatched events.
4. **`useSubscription` (`src/hooks/useSubscription.ts`)**: also treat `canceled` with a future `current_period_end` as active (grace period), matching the documented lifecycle.
5. **Enforce access:** add a subscription gate to the dashboard. The dashboard layout (`dashboard.tsx`) checks the synced subscription; if not active, redirect to `/pricing` with a banner ("Your subscription is inactive"). Booking storefront stays public so existing clients can still book.

---

## Problem 2 — Guest checkout with tenant-chosen provider + automatic platform fee

You want tenants to connect **Stripe, PayPal, or Square**, guests to pay on the booking site, and the platform to **auto-deduct a percentage** on every transaction. Each provider needs its own marketplace/partner integration to split fees automatically — this is a big build, so it's phased.

### Phase 2A — Foundation + admin settings UI (this round)
1. **DB:** new `workspace_payment_settings` table — `workspace_id`, `provider` (`stripe`|`paypal`|`square`|`none`), `connection_status`, provider account id, `platform_fee_percent` (platform-controlled default, e.g. 2%), `deposit_type` (`none`|`deposit`|`full`), `deposit_amount_cents`/`deposit_percent`, `currency`. RLS scoped to workspace members; GRANTs included.
2. **Admin page:** new `src/routes/dashboard.payments.tsx` — tenant picks a provider, sees connect status, sets deposit/full-payment policy. Add it to the dashboard nav with a "Back to Dashboard" button.
3. **Booking page:** when a provider is connected and a deposit/full payment is configured, add a payment step to `booking.$slug.tsx` before confirming. Until a provider is connected, booking works as today (no payment).

### Phase 2B — Stripe Connect first (next round)
Implement Stripe Connect onboarding (`account` + `account_link`), and charge guests with `application_fee_amount` (your platform %) routed to the tenant's connected account. Stripe is first because it integrates cleanly with the existing `stripe.server.ts` gateway and supports automatic fee splitting natively.

### Phase 2C — PayPal + Square (later rounds)
PayPal (Partner Referrals + `platform_fees`) and Square (OAuth + app fee) each require their own partner/app credentials and OAuth flows. We'll wire these one at a time. **Note:** automatic fee-splitting on all three requires platform/partner accounts and per-tenant OAuth — I'll request the needed credentials at each phase.

---

## Problem 3 — `businessname.procschedule.com` links don't resolve

**Root cause:** your code now always emits `businessname.procschedule.com`, but your Lovable custom domain only covers `procschedule.com` and `www`. Arbitrary tenant subdomains need a **wildcard DNS record + wildcard SSL**, which isn't set up yet — so new links 404.

**Fixes:**
1. **Interim (code, this round):** make `getTenantUrl` in `src/lib/subdomain.ts` emit the working **path form** (`https://procschedule.com/<slug>`) until the wildcard is confirmed live, controlled by a single flag so we can flip it instantly once DNS is ready. New booking links work immediately again.
2. **Wildcard setup guidance (I'll walk you through it):** add a `*` (wildcard) record at your DNS provider plus the `*.procschedule.com` entry, and confirm SSL. Lovable custom domains don't auto-provision wildcard subdomain certs, so this likely needs a wildcard cert / proxy (e.g. Cloudflare in proxy mode) in front. Once it resolves and serves HTTPS, flip the flag from step 1 back to subdomain form.

---

## Suggested order
1. **Problem 1 + Problem 3 interim** — small, high-impact, unblock paying clients and broken links now.
2. **Problem 2A** — payment settings foundation + admin UI + booking deposit step.
3. **Problem 2B (Stripe Connect)**, then **2C (PayPal, Square)** in follow-ups.

I'll start with step 1 once you approve.
