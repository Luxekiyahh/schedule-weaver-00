# Seed Alluring Dolls Catalog

## Context / what changed since your request
Your premise was that no tenant/user exists yet — but the database already has:
- **Workspace** `alluringdolls` → name **"AlluringDolls"**, owned by existing user `courttayicousfoster@gmail.com` (`b7651bae…`).
- **1 branding row** already present, `theme_id = luxury-blush`.
- **0** categories, **0** service_variants, **0** services.

So there's no `owner_id` constraint to work around and **no need for a placeholder user, a new workspace, or a public seed button**. The earlier error was almost certainly a NULL `owner_id` being passed by an external script. I'll seed the catalog directly and securely via server-side data tools (your chosen option).

Important architecture note: the Alluring Dolls storefront and booking flow (`AlluringDollsStorefront`, `AlluringDollsBookingFlow`) render from **`service_variants`** joined to **`service_categories`** (via `getStorefront`) — *not* the `services` table. Per your choice, I'll seed **both**: `service_variants` so the live page renders, and `services` so the dashboard/calendar views also list them.

## What I'll do (one data seed, run directly)

### 1. Align workspace + branding
- Update workspace name to **"Alluring Dolls"** (currently "AlluringDolls").
- Set the dark-luxury look: `theme_id = 'dark-luxury'` on the workspace and update the existing `workspace_branding` row toward dark tones (near-black bg, champagne-gold accent). Note: the `/alluringdolls` route already hard-renders the bespoke dark Alluring Dolls skin regardless of `theme_id`, so this is mainly for consistency.

### 2. Create 2 categories in `service_categories`
- **Braids** (sort_order 1)
- **Sew-ins** (sort_order 2)

### 3. Seed `service_variants` (these power the live storefront)
Braids (category = Braids):

| Name | Price | Duration |
|---|---|---|
| Braids by Size: XSmall | $300 | 10 hr |
| Braids by Size: Small | $275 | 9 hr |
| Braids by Size: Smedium | $225 | 8 hr |
| Braids by Size: Medium | $175 | 7 hr |
| Braids by Count: 2-4 | $70 | 1 hr |
| Braids by Count: 6-8 | $90 | 2 hr |
| Braids by Count: 10-14 | $150 | 3 hr |
| Braids by Count: 20 | $185 | 4 hr |
| Braids by Count: 25+ | $225 | 5 hr |

Sew-ins (category = Sew-ins):

| Name | Price | Duration |
|---|---|---|
| Traditional Sew-in | $150 | 3 hr |
| Frontal/Closure Sew-in | $170 | 3 hr |
| Half Braids Half Sew-in | $200 | 3 hr |
| Curls or Crimps Styling Add-on | $45 | 45 min |

### 4. Mirror the same 13 items into the `services` table
For the dashboard/calendar (`dashboard.services`, `dashboard.calendar`). The `services` table has no category column, so the category will be encoded in each row's `name`/`description` (e.g. "Braids — ..." / "Sew-ins — ..."). All rows `is_active = true`, `currency = USD`.

### 5. Idempotency
The seed checks for existing categories on the workspace first and skips if already seeded, so it's safe to re-run and won't create duplicates.

## Verification
After seeding I'll query the workspace's categories/variants/services counts and confirm `/alluringdolls` renders the catalog.

## Technical notes
- `service_variants` fields: `workspace_id, category_id, name, price_cents, duration_min, sort_order, active`.
- `services` fields: `workspace_id, name, description, duration_minutes, price_cents, currency, is_active`.
- Prices stored as cents; durations as minutes (size/count items use the hour values above).
- No new UI, no public endpoint, no schema migration — pure data seeding executed server-side via the secure data tool.
