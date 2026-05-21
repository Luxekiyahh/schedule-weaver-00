## Diagnosis

Routing is actually wired correctly in `src/routeTree.gen.ts` (TanStack Start auto-generates it from files in `src/routes/` — there is no `App.tsx`/`routes.tsx` to edit). The real bug is in `src/routes/dashboard.tsx`:

- It is the parent of `dashboard.home.tsx` (file-based nesting via the `.` separator).
- But its component renders the full calendar UI and **never renders `<Outlet />`**.
- So when you visit `/dashboard/home`, the parent matches and shows the calendar, while the child `HomePage` has nowhere to mount — producing the broken/"not found"-feeling screen.

## Plan

1. **Turn `/dashboard` into a layout route.**
   Refactor `src/routes/dashboard.tsx` so its component is just the shared shell (sidebar/topbar if any) plus `<Outlet />`. Keep the existing `beforeLoad` auth guard and add a redirect so hitting `/dashboard` bare sends the user to `/dashboard/home`:
   ```ts
   beforeLoad: async ({ location }) => {
     const { data } = await supabase.auth.getUser();
     if (!data.user) throw redirect({ to: "/onboarding" });
     if (location.pathname === "/dashboard") {
       throw redirect({ to: "/dashboard/home" });
     }
   }
   ```

2. **Move the calendar UI into its own child route.**
   Create `src/routes/dashboard.calendar.tsx` (path `/dashboard/calendar`) containing the current `Dashboard` component body, state, queries, and dialogs from `dashboard.tsx`. Update any links/quick actions that currently point at `/dashboard` for the calendar to point at `/dashboard/calendar` instead.

3. **Leave `dashboard.home.tsx` as-is.**
   It already declares `createFileRoute("/dashboard/home")` and will now render correctly inside the layout's `<Outlet />`.

4. **Verify.**
   After the edit, the route tree should show `/dashboard` as a layout with `/dashboard/home` and `/dashboard/calendar` as children. Visiting `/dashboard` redirects to `/dashboard/home`; visiting `/dashboard/home` renders the home hub; `/dashboard/calendar` shows the calendar.

## Out of scope

- No changes to `routeTree.gen.ts` (auto-generated — never hand-edited).
- No changes to onboarding, auth, Supabase queries, or the home/calendar component internals beyond moving the calendar file.
