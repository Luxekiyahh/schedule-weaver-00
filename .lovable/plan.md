# Categorize Alluring Dolls services + add "Doll" as provider

## Background

Your reference screenshot shows the original Alluring Dolls menu grouped into named categories (e.g. **BRAIDS** — "Braiding services by size and count."), the same multi-category style Dolliimarie uses (Hair Extension Installs / Maintenance / Removal & Care). During the earlier restore I lumped everything under one "Hair Services" category, so this fixes that.

Two tables drive the menu and must stay in sync:
- **Storefront** (`/alluringdolls`) reads `service_variants` grouped by `service_categories`.
- **Booking flow** (`/booking/alluringdolls`) reads the `services` table via each row's `category_id`.

Providers are workspace members; the booking flow shows a provider's name from their profile and only offers a service if that member is linked in `service_providers`. Right now Alluring Dolls has **zero provider links**, and the owner's display name is the business name "Alluring Dolls".

## Part 1 — Re-categorize into 4 categories

Create these categories (with descriptions, ordered) and assign every service to the right one, in BOTH `services.category_id` and the mirrored `service_variants`:

```text
Braids            — "Braiding services by size and count."
  Braids by Count: 2-4 / 6-8 / 10-14 / 20 / 25+
  Braids by Size: Medium / Smedium / Small / XSmall
Sew-Ins           — "Traditional, frontal, and closure installs."
  Traditional Sew-in / Frontal/Closure Sew-in / Half Braids Half Sew-in
Wig Installs      — "Closure and frontal wig installations."
  Closure wig install / Frontal wig install
Styling & Add-Ons — "Finishing touches and add-ons."
  Curls or Crimps Styling Add-on
```

Steps:
1. Insert the 4 categories (`active`, `sort_order` 1–4). Remove the leftover single "Hair Services" category.
2. `UPDATE services SET category_id = <matching category>` for each service (name-matched), keeping their existing prices/durations/active flags untouched.
3. Rebuild `service_variants` from the services so the storefront mirrors the same grouping, sort_order by price within each category.

Prices/durations are preserved exactly; only the grouping changes.

## Part 2 — Add "Doll" as the provider

Doll is the owner (account `courttayicousfoster@gmail.com`, member `2e8cacfa…`). To make her the booking provider shown as "Doll":

1. Set the owner's profile display name to **Doll** (business name stays "Alluring Dolls" on the workspace).
2. Link the owner member as a `service_providers` entry for every active service, so all services are bookable under Doll.
3. Availability already exists (weekly hours), so no change needed there.

## Technical notes

- All of this is data changes (insert/update/delete) on existing tables — no schema migration, no app-code changes.
- The "Curls or Crimps Styling Add-on" is currently inactive in `services` (so it stays off the bookable list) but active as a storefront variant; it will sit under "Styling & Add-Ons" on the menu. I'll leave its active flags as-is unless you want it bookable.

## Verification

- Query categories + each service's `category_id` and the rebuilt variants to confirm the 4 groups.
- Load `/alluringdolls` and `/booking/alluringdolls` in preview to confirm the menu shows Braids / Sew-Ins / Wig Installs / Styling & Add-Ons, and that Doll appears as the provider with bookable slots.
