# Alluring Dolls booking page — colors, add-ons, wig install, leopard

Four changes, mirroring how the Dolliimarie booking page presents colors and add-ons, while leaving the shared booking engine untouched for every other tenant.

## 1. Hair color options (1B, 1, 2, 4)

The booking page currently doesn't show colors at all (only the storefront does). I'll wire colors into the booking flow, Alluring-Dolls-only in presentation.

- **Data:** add 4 rows to the hair-colors table for the Alluring Dolls workspace:
  - `1B` (off/soft black), `1` (jet black), `2` (dark brown), `4` (medium brown), each with a dark swatch color and sort order.
- **Backend:** `getBookingWorkspace` (`src/lib/booking.functions.ts`) will also fetch active hair colors and return them as `hairColors`. Harmless empty array for tenants with none.
- **UI:** a new "Hair Color" section of gold swatch pills in `AlluringDollsBookingFlow.tsx` (matches the existing gold aesthetic), shown on the Details step. Selected color is displayed in the summary.
- **Recording the choice:** the picked color is appended to the appointment notes on submit (e.g. `Hair color: 1B`). This avoids changing the shared booking payload/engine.

## 2. Curls or Crimps → add-on (instead of a service)

Today "Curls or Crimps Styling Add-on" ($45 / 45 min) exists as a bookable **service** under Sew-ins.

- **Data:** create it as an **add-on** (length-option/add-on row: name "Curls or Crimps", $45, 45 min) for the workspace, and deactivate the standalone service so it no longer appears in the service list.
- **UI:** the Alluring Dolls flow already renders add-ons as gold toggle pills on the Details step, so it will appear there automatically and add to the total.

## 3. Missing "Wig Install" category + services

- **Data:** add a `Wig Install` service category, and two active services linked to the existing provider:
  - **Frontal wig install** — $130, 90 min
  - **Closure wig install** — $100, 90 min

## 4. Leopard texture not visible

The leopard layer *is* rendering (fixed, opacity .34) but its spots are near-black on a near-black background, so it reads as flat. I'll raise its contrast so it's actually visible: lighten the spot tones toward warm taupe/gold-brown, bump opacity, and reduce the blur slightly — keeping it subtle and on-brand. I'll re-screenshot to confirm it now reads on the booking page.

---

## Technical notes

- Files: `src/lib/booking.functions.ts` (add `hairColors` fetch/return), `src/routes/booking.$slug.tsx` (color state + pass-through + append to notes), `src/components/AlluringDollsBookingFlow.tsx` (color selector, summary line, leopard CSS).
- Data changes go through the insert/migration tools: hair-color rows, add-on row, service deactivation, new category + 2 services + provider links — all scoped to the Alluring Dolls workspace only.
- No changes to the shared booking flow used by other tenants; color UI and payload additions are gated to the `alluringdolls` slug / custom component.
- Verification: screenshot the booking page to confirm colors, the curls/crimps add-on, the Wig Install category, and a visible leopard texture.
