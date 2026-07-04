## Goal
Four focused fixes to the Alluring Dolls experience — no changes to booking logic, scheduling, or data flow.

## 1. Leopard pattern missing on the booking page
`/booking/alluringdolls` (`AlluringDollsBookingFlow.tsx`) already includes the `.ad-leopard` layer, but at `opacity: .18` on a short, narrow page it reads as flat black. The storefront looks textured only because its leopard opacity ramps up to 0.5 on scroll.

**Fix:** Make the booking-page leopard clearly visible — raise its opacity (~0.3–0.35), and verify the fixed layer paints correctly behind the centered card (stacking context is already isolated). Match the storefront's texture density so both pages feel consistent.

## 2. Remove street address on the storefront footer
In `AlluringDollsStorefront.tsx` the footer line reads:
`33 W Ave A, Apt 3A · Belle Glade, FL`

**Fix:** Drop the street/apt (residential privacy) → show just `Belle Glade, FL`. Keep the map pin icon.

## 3. Hide the image placeholder when a service has no image
Currently empty images render a bordered box with a placeholder icon on both surfaces:
- `AlluringDollsStorefront.tsx` → `AdStoreImage` (service cards + category headers)
- `AlluringDollsBookingFlow.tsx` → `AdImage` (service selection rows)

**Fix:** When `url` is empty, render nothing (return `null`) instead of the placeholder box, and adjust the row/card layout so the text sits flush with no empty gap. Applies to service items (and category headers for consistency).

## 4. Add an "Add image" button to the Edit Service popup
The edit popup lives in `dashboard.services.tsx` → `ServiceDialog`, which edits the `services` table. Important data-model note: the live Alluring Dolls page reads images from the **`service_variants`** table (parallel rows matched by name), not `services`. Both tables already have an `image_url` column and a public `branding` storage bucket exists.

**Fix:**
- Add an image upload control to `ServiceDialog` (thumbnail preview + "Add image" / "Replace" / "Remove" buttons), wired to the `Service` type/state (add `image_url`).
- Upload the file to the existing public `branding` bucket under a `services/{workspaceId}/…` path and get its public URL.
- On save, write `image_url` to the `services` row **and** mirror it onto the matching `service_variants` row (same `workspace_id` + `name`) so the image actually appears on the storefront and booking flow. On new-service creation, set it on both if a name match exists.
- Confirm the `branding` bucket has an insert/update policy allowing the authenticated workspace owner to upload; add one via migration if missing.

## Verification
- Screenshot `/alluringdolls` and `/booking/alluringdolls` (desktop + mobile): leopard visible on both, footer shows only "Belle Glade, FL", no placeholder boxes on imageless services.
- In the dashboard, edit a service, upload an image, save, and confirm it renders on the storefront service card and the booking selection row.
- Typecheck clean; booking flow and all existing functionality untouched.

## Not changing
Booking/slot/deposit logic, routes, other tenants' themes, service pricing/duration data.