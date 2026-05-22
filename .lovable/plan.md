## Context

There is no shared dashboard sidebar component today — `src/routes/dashboard.tsx` is a bare layout that just renders `<Outlet />`, and each dashboard page has its own header / back-link. The de-facto nav hub on the dashboard is the **Quick actions** grid on `/dashboard/home`. I'll add the new "AI Storefront Designer" entry there. (If you want a true persistent left sidebar across all dashboard pages, that's a larger refactor — say the word and I'll fold it in.)

The current booking URL on `/dashboard/home` is built as `${origin}/book/${slug}`. You want it to be the public storefront root: `${origin}/${slug}` — which matches the live `/$slug` route already wired up (e.g. `/dolliimarie`).

## Plan

### 1. Fix Copy Booking Link (`src/routes/dashboard.home.tsx`)
- Change `bookingUrl` from `` `${origin}/book/${ctx.workspaceSlug}` `` to `` `${origin}/${ctx.workspaceSlug}` ``.
- Guard against an empty slug: if `ctx.workspaceSlug` is missing, disable the copy button and show "—" instead of writing a half-built URL.
- Keep the existing clipboard + toast flow.

### 2. Add "View Live Site" button (same gradient card on `/dashboard/home`)
- Place a secondary action immediately to the right of "Copy link".
- Use an `<a>` (not `<Link>`) so it opens externally:
  ```tsx
  <a
    href={`/${ctx.workspaceSlug}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
  >
    <ExternalLink className="h-4 w-4" /> View Live Site
  </a>
  ```
- Disable / hide when slug is missing.
- Import `ExternalLink` from `lucide-react`.
- On the narrow viewport (the user is on a 447px-wide preview), the two buttons should wrap cleanly via the existing `flex-wrap`.

### 3. Add "AI Storefront Designer" entry to dashboard nav
Since there is no shared sidebar, add this in the most visible nav surface on the dashboard:
- **`/dashboard/home` → Quick actions grid**: add a 5th `ActionCard` linking to `/setup`, labeled **"AI Storefront Designer"**, with the Lucide `Sparkles` (or `Wand2`) icon and a violet tone. Adjust grid to `sm:grid-cols-2 lg:grid-cols-3` (or keep 2-col and let it wrap) so five cards lay out cleanly.
- Add a `violet` entry to the local `TONES` map.

### Out of scope
- Building a new persistent dashboard sidebar layout across all `/dashboard/*` pages. Call it out if you want it and I'll plan that separately.
- Changes to `/setup`, `/$slug`, or the booking flow itself.

## Technical notes
- File touched: `src/routes/dashboard.home.tsx` only.
- No DB / RLS / server-function changes.
- Uses existing `lucide-react`, no new deps.
