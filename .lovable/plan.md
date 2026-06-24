# Pricing restructure: optional Design Fee, sharper tiers, annual billing

## Goals
1. Rename the $100 fee to **"Done-For-You Design"** and make it an **optional upsell**, not a mandatory bundled charge. The wizard-generated site stays free with any plan.
2. Restructure tier features and bump Enterprise $60 → $65 (existing subscribers grandfathered automatically).
3. Add **monthly / annual** billing with 2 months free on annual (~17% off). Monthly shown by default.

## New plan structure

| Tier | Monthly | Annual (2 mo free) | Includes |
|------|---------|--------------------|----------|
| Basic | $30 | $300 | Wizard-built booking site, email confirmations, 24hr reminders, client management, deposit collection |
| Pro | $45 | $450 | Everything in Basic + SMS reminders, post-visit feedback email, rebook nudge sequence, review redirect flow |
| Enterprise | $65 | $650 | Everything in Pro + no-show automation, waitlist management, birthday/loyalty emails, priority support |

**Done-For-You Design** — one-time **$100**, optional. Pitch: "Competitors charge $500–$2,000+ for custom setup. We build it for $100." Purchasable from the dashboard billing page, the pricing page (add-on section), and the onboarding finish step.

## Implementation

### 1. Stripe products & prices
Create via the payments tool (test env; auto-syncs to live on publish):
- Annual prices: `basic_yearly` ($300), `pro_yearly` ($450), `enterprise_yearly` ($650).
- New `enterprise_monthly` price at $65 (reuses the `enterprise_monthly` lookup key; existing $60 subscriptions reference their original Stripe price object directly, so they're grandfathered).
- `design_fee_onetime` ($100) product named "Done-For-You Design" — replaces the old `setup_fee_onetime` lookup key in code.

### 2. `src/lib/entitlements.ts`
- Add `BillingPeriod = "monthly" | "yearly"`.
- Extend `PlanMeta` with `yearlyPriceId`, `yearlyCents`, monthly/annual price-id lookups.
- Rewrite `PLANS` with the new taglines and feature bullets above.
- Replace fee constants: `DESIGN_FEE_PRICE_ID = "design_fee_onetime"`, `DESIGN_FEE_CENTS = 10000`, and friendly label "Done-For-You Design".
- Update `Feature` taxonomy: drop `ai_agents`; keep `booking`, `workflow_automations`, `sms_marketing`; add `no_show_automation` (enterprise). Update `PLAN_FEATURES` accordingly.

### 3. Feature gating migration (`workspace_has_feature`)
Update the SQL helper: remove the `ai_agents` case, add `no_show_automation` → enterprise only. Keep the env-aware signature.

### 4. Webhook (`src/routes/api/public/payments/webhook.ts`)
- Extend `LOOKUP_TO_TIER` to map the yearly lookup keys to their tiers.
- Rename `SETUP_FEE_LOOKUP_KEY` → `design_fee_onetime` (the `setup_fee_paid` column is kept and now means "design service purchased").

### 5. Checkout flow (`src/utils/payments.functions.ts`)
- No longer auto-bundle the fee into plan checkout. Plan checkout sends a single recurring lookup key (monthly or yearly).
- The Design Fee is a standalone one-time checkout (existing `mode: "payment"` path already supports a single one-time price via `priceLookupKeys: ["design_fee_onetime"]`).

### 6. Pricing page (`src/routes/pricing.tsx`)
- Add a Monthly / Annual toggle (monthly default); annual shows yearly price + "2 months free" badge.
- Replace the bundled-fee banner with hero copy positioning the wizard site as included.
- Remove setup-fee bundling from `handleSelect`; pass the period-appropriate lookup key.
- Add an optional **Done-For-You Design** add-on card below the plans ("Want us to build it for you? $100, one-time").

### 7. Dashboard billing (`src/routes/dashboard.billing.tsx`)
- Add the Monthly / Annual toggle and yearly prices.
- Remove the bundled-fee copy; `changeSubscriptionPlan` / checkout use the selected period's lookup key.
- Add a **Done-For-You Design** upsell card (hidden once `setup_fee_paid` is true) that opens the one-time checkout.

### 8. Onboarding finish step (`src/routes/onboarding.tsx`)
- On the final "Here's your booking site" step, add an optional "Want us to customize it for you? — Done-For-You Design, $100" CTA that routes to the one-time Design Fee checkout. Skipping proceeds normally to plan selection.

## Notes
- Enterprise grandfathering needs no migration — old subscriptions keep their original Stripe price object.
- Copy avoids the words "setup fee" everywhere; uses "Done-For-You Design".
- No AI-agents language anywhere (removed from Enterprise and feature gating).
