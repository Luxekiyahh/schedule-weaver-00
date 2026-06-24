# Calendar Control Panel + Staff Route + Back Buttons

## 1. New route: `/dashboard/staff` (placeholder)

Create `src/routes/dashboard.staff.tsx` — a simple staff management page so the "Add Providers" button has a real destination.

- `createFileRoute("/dashboard/staff")` with the same `beforeLoad` auth guard used by sibling dashboard routes.
- Header with a "Back to Dashboard" button (see section 4) and a title "Team & Providers".
- Loads `workspace_members` (owner/admin/staff) for the current workspace and lists them in cards (name, email, role) — reusing the member-loading pattern already in the calendar route.
- An "Invite provider" button can be a stubbed placeholder (toast: "Invites coming soon") so the page is functional but scoped; no new invite backend in this pass.

## 2. Database: persist schedule exceptions

The existing `availability_exceptions` table is member-scoped (`member_id NOT NULL`) and meant for per-provider blocks. The requested feature is a workspace-wide date block ("Holiday Close"), so add a dedicated table.

Migration creating `public.schedule_exceptions`:

```text
columns: id, workspace_id (NOT NULL), block_date (date, NOT NULL),
         label (text, NOT NULL), created_by (uuid, null), created_at
```

- GRANT SELECT/INSERT/UPDATE/DELETE to `authenticated`, ALL to `service_role`.
- Enable RLS. Policies scope every action to workspace members via the existing `public.is_workspace_member(workspace_id)` helper (read/insert/delete for members of that workspace).

## 3. Calendar control panel — `src/routes/dashboard.calendar.tsx`

**Imports**
- Add `useNavigate` from `@tanstack/react-router`.
- Add `motion, AnimatePresence` from `framer-motion`.
- Ensure the Lucide set includes `Plus, CalendarX, Users, ChevronLeft, Trash2` (Plus/Users/ChevronLeft already imported; add `CalendarX, Trash2`).

**Control panel header section** (rendered above the calendar grid, inside the main content container):
- Two styled buttons:
  - **Add Providers** — `onClick={() => navigate({ to: "/dashboard/staff" })}`, with `Users` icon.
  - **Schedule Exceptions** — opens the modal (`CalendarX` icon).

**Exceptions modal** (AnimatePresence overlay, not the shadcn Dialog, per spec):
- Backdrop + centered card animated with `motion.div` (fade/scale), dismiss on backdrop click and an X/Close.
- Inputs: a date picker (native `<input type="date">` bound to state) and a text `Input` for the block label (placeholder "Holiday Close").
- "Enforce Date Block" button inserts into `schedule_exceptions` (workspace_id + block_date + label + created_by), then refreshes the local list.
- Reactive list of active blocks; each row shows the date + label and a `Trash2` icon button that deletes the row from `schedule_exceptions` and updates state.
- Load existing blocks for the workspace when the modal opens (or on workspace load).
- Errors surfaced via `toast`.

All new JSX kept inside the existing component tree with balanced tags.

## 4. "Back to Dashboard" buttons

A small inline button using `navigate({ to: "/dashboard/home" })` with a `ChevronLeft` icon, placed top-left of the content area on:
- `src/routes/dashboard.calendar.tsx` (new)
- `src/routes/dashboard.staff.tsx` (new)
- `src/routes/dashboard.services.tsx` — already has an `ArrowLeft` back link; normalize it to the same navigate-based control for consistency.
- `src/routes/dashboard.billing.tsx` — same normalization.

## Technical notes
- Build safety: confirm no duplicate Lucide imports, single `useNavigate` declaration, and balanced JSX after edits; run a typecheck.
- The exceptions feature is presentation + CRUD only; it does not yet block booking availability (that would be a follow-up wiring into the booking flow).

## Sequence
1. Run the `schedule_exceptions` migration (approval required) so generated types include the table.
2. Create `dashboard.staff.tsx`.
3. Edit `dashboard.calendar.tsx` (control panel + modal + back button).
4. Add/normalize back buttons in services and billing.
5. Typecheck.