# Dynamic Theme Mapping Engine — Public Booking Storefront

## Goal
Drive custom-branded storefront skins from database variables. A single core data pipeline (categories, variants, length options) feeds interchangeable layout components selected by `workspace.theme_id`, with `primary_color`, `font_family`, and `logo_url` injected dynamically. No scheduling/calendar logic is touched.

## Where this lives
The public **catalog** page is `src/routes/book.$slug.tsx`. It already fetches the workspace plus `categories`, `variants`, and `lengthOptions` via `getBookCatalog` (`src/lib/book.functions.ts`) and already reads `primary_color` / `secondary_color` / `font_family` / `logo_url`. This is the correct home for the theme engine.

The scheduling flow at `src/routes/booking.$slug.tsx` (services → provider → calendar matrix → details, server fns `getBookingWorkspace` / `getBookingSlots` / `createBooking`) is **left untouched** — only verified not to break.

## Database
The `workspaces` table already has `primary_color`, `font_family`, `logo_url`. It is missing `theme_id`.

- Migration: add `theme_id text` to `public.workspaces` (nullable, no default). No new table, no RLS/grant changes (column add only).

## Data layer
- `src/lib/book.functions.ts` → add `theme_id` to the `workspaces` select projection in `getBookCatalog` (currently selects `id, name, slug, primary_color, secondary_color, font_family, logo_url`). The catalog data shape (`categories`, `variants`, `lengthOptions`) stays exactly as-is so it can be passed cleanly as props.

## Theme layout components
Create `src/components/booking-themes/` with a shared prop contract so every skin consumes the same unified data:

```text
type StorefrontTheme = {
  workspace: { name; primary_color; secondary_color; font_family; logo_url; theme_id }
  categories: Category[]
  variants: Variant[]
  lengthOptions: LengthOption[]
  slug: string
}
```

Files:
- `types.ts` — shared `StorefrontThemeProps` (catalog/variants/length-option types reused from the catalog shape).
- `LuxuryBlushLayout.tsx` — blush/elegant skin; uses `primary_color` for buttons, selection rings, active text toggles, and state cards via inline `style` blocks; applies `font_family` to headers/display text; renders `logo_url`.
- `IndustrialDarkLayout.tsx` — dark/industrial skin; same prop contract, same dynamic color/font injection.
- `DefaultStorefrontLayout.tsx` — the current markup of `book.$slug.tsx` extracted verbatim into a component (fallback for workspaces with no/unknown `theme_id`), preserving today's behavior.

All three keep the existing `Link to="/booking/$slug"` CTAs so they hand off into the untouched scheduler.

## Booking catalog route
Refactor `src/routes/book.$slug.tsx` to:
- Keep the existing loading / not-found states and the `getBookCatalog` query.
- Compute `primary`, `secondary`, `fontStack` once and pass them (with catalog data) into the chosen layout.
- Add the conditional renderer:

```tsx
{workspace.theme_id === 'luxury-blush'   && <LuxuryBlushLayout {...props} />}
{workspace.theme_id === 'industrial-dark' && <IndustrialDarkLayout {...props} />}
{(!workspace.theme_id ||
  !['luxury-blush','industrial-dark'].includes(workspace.theme_id)) &&
  <DefaultStorefrontLayout {...props} />}
```

## Verification
- Build passes (route + components typecheck against the catalog shape).
- `/book/<slug>` renders the default skin when `theme_id` is null.
- Setting `theme_id` to `luxury-blush` / `industrial-dark` (test workspace) swaps the skin while colors/fonts/logo come from the DB.
- `/booking/<slug>` scheduling flow still works end to end (no code changes there).

## Technical notes
- `theme_id` values are plain strings matched in the conditional; adding a new skin later = new component + one conditional line.
- Colors injected via inline `style={{ backgroundColor: workspace.primary_color }}` / CSS custom-property tokens, not hardcoded hex.
- `font_family` rendered as a font stack on headers/display text.
