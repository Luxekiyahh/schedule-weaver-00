## Overview

Two parts: (1) update all three plans' prices + marketing copy and the underlying feature-gating map, and (2) build the first new capability set — **No-Show Prepay + Automated Waitlist** (Enterprise tier). The remaining Pro/Enterprise features (review redirect, visual client profiles, VIP tiering & hidden calendars) are scoped as follow-up phases.

## Part 1 — Pricing & plan copy

New monthly prices: **Basic $25**, **Pro $45**, **Enterprise $65**. Yearly keeps the "2 months free" pattern (10× monthly): $250 / $450 / $650. The $100 **Done-For-You setup fee stays a one-time add-on available on all tiers** (unchanged behavior, just clarified in copy).

`src/lib/entitlements.ts`:
- Update `monthlyCents`/`yearlyCents` for each tier (2500/25000, 4500/45000, 6500/65000).
- Rename display names/taglines to match: Basic "The Foundation", Pro "The Retention Engine", Enterprise "The VIP & Protection Tier".
- Rewrite each tier's `features` bullet list to the new copy.
- Expand the `Feature` union and `PLAN_FEATURES` map to the new flags:
  - basic: `booking`
  - pro: + `service_lifecycle_automation`, `review_redirect`, `client_profiles`
  - enterprise: + `vip_tiering`, `no_show_prepay`, `waitlist_bidding`

New Stripe prices are needed because amounts changed — create/replace prices via the payments tool for the six lookup keys (`basic_monthly`, `basic_yearly`, `pro_monthly`, `pro_yearly`, `enterprise_monthly`, `enterprise_yearly`). Lookup keys stay stable so checkout code is unaffected.

DB gating helper `public.workspace_has_feature` will be updated (migration) so the new feature strings resolve to the right tiers, keeping server-side checks aligned with `entitlements.ts`.

`src/routes/pricing.tsx` already renders from `PLANS`, so copy/price changes flow through automatically. Only minor wording on the setup-fee card is adjusted to say "available on any plan".

## Part 2 — No-Show Prepay + Waitlist (Enterprise)

### A. No-Show Prepay ("Burn Book")

Goal: clients with a history of no-shows are automatically forced to pay 100% up front.

Schema (migration):
- Add to `customers`: `no_show_count int not null default 0`, `require_prepay boolean not null default false`, `prepay_overridden_by uuid` (manual override).
- Add to `workspace_payment_settings`: `no_show_prepay_threshold int not null default 2` (how many no-shows before auto-flag).
- Trigger on `appointments`: when `status` changes to `no_show`, increment the customer's `no_show_count` and set `require_prepay = true` once the workspace threshold is met.

Booking logic (`src/lib/booking.functions.ts`):
- When resolving/creating the customer during booking, look up `require_prepay`. If true AND the workspace has the `no_show_prepay` feature active, override the deposit computation to **100% (full prepay)** regardless of the tenant's normal deposit setting. This reuses the existing Square/Stripe deposit checkout path — it only changes `depositType` to `full` for that booking.

Dashboard:
- On `dashboard.staff`/customers view (or a small "Clients" section), show a no-show badge and a toggle to manually clear/set `require_prepay`. Gated behind the Enterprise feature via `useSubscription().can("no_show_prepay")`.

### B. Automated Waitlist

Goal: when a booked slot frees up (cancellation), instantly SMS waitlisted clients a booking link.

Schema (migration) — new table `public.waitlist_entries`:
- `workspace_id`, `service_id`, `provider_id` (nullable = any), `customer_name`, `customer_email`, `customer_phone`, `desired_date` (nullable), `desired_from`/`desired_to` time window (nullable), `status` (`waiting`/`notified`/`booked`/`expired`), `notified_at`, `created_at`, `updated_at`.
- GRANTs: `authenticated` (dashboard reads via RLS scoped to workspace members), `service_role` full; `anon` INSERT via a narrow policy so public booking visitors can join. RLS: members manage their workspace's entries; public can insert only.

Public booking page (`AlluringDollsBookingFlow.tsx` + shared flow):
- When a chosen date/provider has no open slots, show a "Join the waitlist" CTA that captures name/email/phone + desired window and inserts a `waitlist_entries` row (server fn).

Cancellation → notify:
- On appointment cancellation (status → `cancelled`), a DB trigger calls a new public server route `src/routes/api/public/hooks/waitlist-notify.ts` (secured with the existing `apikey`/webhook-secret pattern). The route finds matching `waiting` entries (same workspace/service, provider match-or-any, freed slot fits the desired window), sends each an SMS via the existing Twilio helper with a booking deep link, and marks them `notified`.
- Gated behind Enterprise `waitlist_bidding` — if the workspace lacks the feature, the trigger/route no-ops.

SMS: reuse `src/lib/sms/twilio.server.ts` (`sendSms`); add a `buildWaitlistSms` builder alongside `buildConfirmationSms`.

### Feature gating summary
Both A and B check `workspace_has_feature(workspace_id, '<flag>', env)` server-side before acting, and `useSubscription().can(...)` client-side for UI visibility — so only Enterprise workspaces get the behavior.

## Verification
- Pricing page renders new names, prices, and bullet lists; checkout still opens with existing lookup keys.
- Simulate 2 no-shows for a test customer → next booking forces full prepay checkout.
- Create a waitlist entry, cancel a matching appointment → confirm the notify route selects it and (in test) logs/sends the SMS.
- `tsgo` typecheck passes.

## Follow-up phases (not in this build)
1. Review Redirect Flow (post-visit Google review ask).
2. Private Visual Client Profiles (photos/charts/notes per client).
3. Dynamic VIP Tiering & Hidden Calendars (deposit waivers + priority/hidden slots).

## Technical notes
- Files: `src/lib/entitlements.ts`, `src/routes/pricing.tsx`, `src/lib/booking.functions.ts`, `src/components/AlluringDollsBookingFlow.tsx` (+ shared booking route), `src/lib/sms/twilio.server.ts`, new `src/lib/waitlist.functions.ts`, new `src/routes/api/public/hooks/waitlist-notify.ts`, dashboard clients UI.
- Migrations: customer/no-show columns + trigger, payment-settings threshold column, `waitlist_entries` table with GRANTs/RLS, `workspace_has_feature` update, cancellation-notify trigger.
- Stripe: recreate the six prices at the new amounts (same lookup keys).
