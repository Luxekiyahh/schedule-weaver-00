## Goal

Rework the /onboarding wizard so it matches the ProcSchedule "Horological precision" theme applied to the rest of the app, cuts friction (fewer / clearer steps), lets users step back at any point, and expands the Services step with Categories and Add-ons.

## 1. Visual redesign (theme parity)

- Rebuild the header/progress bar using semantic tokens (`bg-background`, `border-border`, `text-foreground`, `primary`) so it reads like the rest of the site instead of the generic purple/pink defaults still hardcoded in `initialWizard` (`primaryColor: "#6d28d9"`, `secondaryColor: "#ec4899"`).
- Replace the segmented progress bars with a single slim horologe-style progress rail plus "Step X of N — {label}" so mobile isn't just unlabeled bars.
- Card container: rounded-2xl, ink surface, subtle gold hairline border on active section; consistent with `/login` and `/dashboard`.
- Default `primaryColor` / `secondaryColor` in `initialWizard` to the brand ink/gold pair so the LivePreview starts on-brand.
- Tighten spacing on mobile (padding, typography scale, sticky action bar on small screens).

## 2. Always-available Back button

Current behavior: Back only appears on `step > 2`, and there is no way to leave step 2 back to step 1 or exit the flow.

- Add a persistent top-left Back control in the sticky header on every step:
  - Step 1: "Back to home" → navigates to `/`.
  - Step 2+: "Back" → previous step (already-account users still can't re-enter account creation — floor stays at step 2 when `hasAccount`).
- Keep the existing bottom Back/Continue pair for steps 3–8, but move the sticky-top Back so it's reachable without scrolling on mobile.
- Preview step (9): top Back returns to Intake; bottom action becomes "Publish".

## 3. Simplify the flow (9 steps → 6)

Merge closely-related steps so the wizard feels shorter without losing data:

```text
Old:  Account → Industry → Identity → Photos → Services → Hours → Policies → Intake → Preview
New:  Account → Industry → Brand (Identity + Photos + colors)
      → Services (Categories + Services + Add-ons)
      → Availability (Hours + Location + Policies)
      → Review & Publish (Intake shown inline, then Publish)
```

- Brand: name, tagline, bio, logo upload, photos, primary/secondary color, all in one scrollable card with subheadings.
- Availability: weekly hours + location + policies (deposit, cancellation, grace, custom note) in one card.
- Review & Publish: LivePreview promoted to full width, Intake questions collapsed by default ("Advanced: pre-booking questions"), single Publish CTA. Confetti + redirect unchanged.
- Step labels shrink to 6, progress bar recalculated. Validation rules migrate 1:1 (industry required at step 2, business name required at Brand).

## 4. Services step: Categories + Add-ons

Extend `WizardState.services` and the Services step UI:

### Data (wizard-config.ts)

```ts
type ServiceCategory = { id: string; name: string };
type ServiceAddOn = {
  id: string;
  name: string;
  price: string;      // dollars, string for the same input UX
  duration: string;   // minutes as string, optional
};
type ServiceDraft = {
  ...existing fields,
  categoryId: string | null;
  addOns: ServiceAddOn[];
};
type WizardState = { ...; categories: ServiceCategory[]; ... };
```

Seed one default category from the picked industry (e.g. "Barber Services") so single-category users don't have to think about it. `emptyService` sets `categoryId` to the first category and `addOns: []`.

### UI

- Top of Services step: "Categories" strip — chips per category, inline add/rename/delete, drag-to-reorder skipped for v1.
- Services list is grouped under each category with an "Add service" button per group.
- Each service card gets a new "Add-ons" section (below the existing size/tier "Options") with rows of {name, +$price, +min duration, delete} and an "+ Add-on" button. Existing `options` array kept as-is (used for variants/tiers).
- Empty state: if the user leaves the default category alone, the UI still looks like a single flat list (category header hidden when only one exists and it hasn't been renamed).

### Persistence (`src/lib/onboarding.functions.ts`)

- Extend `serviceSchema` with `categoryId`, `addOns`.
- On complete: create rows in `service_categories` for each wizard category (replacing the current "{industry} Services" auto-category). Map each service's `categoryId` to the created category id when writing `services` and `service_variants`.
- Add-ons: persist as extra rows in `service_variants` under the same category, tagged with a `metadata`/naming convention like `"{Service} — {Add-on name}"` and their own price/duration, OR (preferred if the column exists) store them in a dedicated column. Confirm the storefront read path treats them as bookable extras. If no add-on schema exists, add a migration introducing `public.service_add_ons (id, workspace_id, service_id, name, price_cents, duration_min, sort_order, active)` with GRANTs + RLS following the project's role rules, and write to it here.

## 5. Verification

- `bunx tsgo --noEmit` clean.
- Manual walk-through in preview (mobile 390px + desktop): each step, Back at every step, category add/rename, service under category, add-on add/remove, publish completes and dashboard opens.
- Confirm existing tenants who resume mid-onboarding still land on step 2 with their name prefilled.

## Out of scope

- Reordering categories/services via drag.
- Editing categories/add-ons from the dashboard (existing catalog page already handles categories; add-ons dashboard UI is a follow-up).
- Any change to `/login`, `/admin`, `/dashboard` visuals — theme was set in the previous turn.
