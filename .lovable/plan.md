# Milestone 1 — Billing & Tier Gating

This sets up paid subscriptions and the feature-locking foundation everything else (workflows, SMS marketing, AI agents) will plug into. Email-only nurture and the workflow engine come in later milestones.

## Payment provider: Paddle

Your product (booking/scheduling SaaS sold globally to business owners) is a clean fit for Paddle, and Paddle acts as merchant of record — it handles sales tax, VAT, and compliance automatically on every charge, all-inclusive (5% + 50¢). That removes a huge operational burden vs. wiring tax handling yourself. I'll enable Paddle (a test environment is created instantly so we can test without real money; accepting live payments later requires Paddle verification).

## The plan model

```text
Setup fee (one-time):  $100   — mandatory, charged once at signup
Basic   $30/mo  — booking site, confirmations, calendar
Pro     $45/mo  — + SMS marketing, workflow automations
Enterprise $60/mo — + AI call/SMS agents
```

Feature matrix that the whole app reads from:

```text
Feature                 Basic   Pro   Enterprise
booking + confirmations  ✓       ✓      ✓
workflow automations     ✗       ✓      ✓
sms marketing            ✗       ✓      ✓
ai agents (calls/sms)    ✗       ✗      ✓
```

## What gets built

### 1. Database (migration)
- `subscriptions` table keyed to `workspace_id`: `plan_tier` (enum: `basic|pro|enterprise`), `status` (`trialing|active|past_due|canceled`), `paddle_subscription_id`, `paddle_customer_id`, `setup_fee_paid` (bool), `current_period_end`. Standard id/created_at/updated_at + updated_at trigger.
- Enum `plan_tier`. GRANTs: `authenticated` SELECT only (read their own via RLS through workspace membership); `service_role` ALL (webhook writes). No anon.
- RLS: members of the workspace can read their subscription; only `service_role` (the webhook) writes.
- A SECURITY DEFINER helper `workspace_has_feature(_workspace_id, _feature text)` returning boolean, so both SQL policies and server code can gate consistently.

### 2. Enable Paddle + create products
- Enable Paddle, then create 4 catalog items: three recurring prices (Basic/Pro/Enterprise) + one one-time $100 setup fee.

### 3. Checkout flow
- A `/dashboard/billing` page showing current plan, the feature matrix, and upgrade/downgrade buttons.
- A public-facing `/pricing` route (marketing) with the three tiers + "$100 one-time setup" line, CTA into signup → checkout.
- Server function to open a Paddle checkout for (setup fee + chosen plan) for first-time subscribers, or a plan-change checkout for existing ones.

### 4. Webhook handler
- `src/routes/api/public/paddle-webhook.ts` — verifies Paddle signature, then upserts the `subscriptions` row on `subscription.created/updated/canceled` and marks `setup_fee_paid` on the one-time transaction. Uses `supabaseAdmin`.

### 5. Feature gating layer (the reusable part)
- `src/lib/entitlements.ts`: a typed map of tier → features, plus a `useEntitlements()` hook that loads the workspace's subscription and exposes `can('sms_marketing')`, `can('workflow_automations')`, `can('ai_agents')`, and `tier`.
- Apply it in the dashboard: lock the (future) SMS marketing, workflow, and AI-agent areas behind `can(...)` with an inline "Upgrade to Pro/Enterprise" prompt rather than hiding them — drives upgrades.
- Server-side enforcement: any server function for a gated feature checks `workspace_has_feature` before acting, so gating can't be bypassed from the client.

## Identified pain points this milestone addresses
- **No revenue capture today** — pricing exists only as marketing copy; nothing charges or enforces it.
- **Mandatory setup fee** has no mechanism — handled as a one-time line on first checkout.
- **Feature sprawl risk** — without a single entitlements source, gating SMS/workflows/AI later gets messy. Building the gating layer first means every later feature just calls `can(...)`.

## Technical notes
- Paddle is enabled via Lovable's built-in integration (no Paddle account/keys needed to start).
- Webhook lives under `/api/public/*` (bypasses auth on publish) and verifies the Paddle signature in-handler.
- `subscriptions` is the source of truth; the `plan_tier`/feature lookups never trust client state.
- Tax/VAT/compliance handled by Paddle as merchant of record — no tax code in the app.

## Out of scope (later milestones, already discussed)
- Nurture workflow engine (feedback email + 2–3 week rebook reminder, scheduled via pg_cron).
- Done-for-you presets + owner-editable workflow builder.
- SMS marketing tools and AI call/SMS agents (gating for them is built now; the features come later).

Want me to proceed with enabling Paddle and building this?
