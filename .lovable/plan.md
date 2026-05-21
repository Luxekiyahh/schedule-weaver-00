## Problem

Supabase is throwing `permission denied for function is_workspace_member` whenever a query hits any RLS policy that calls it (which is most of them — `workspaces`, `services`, `customers`, `appointments`, etc.). The function exists and is `SECURITY DEFINER`, but the `authenticated` Postgres role doesn't have `EXECUTE` privilege on it, so RLS evaluation fails before any rows are returned.

The same issue applies to the two sibling helpers used in policies: `has_workspace_role` and `current_member_id`.

## Fix

One small migration that grants execute to `authenticated` (and `anon`, for safety on any public-read paths) on the three RLS helper functions:

```sql
grant execute on function public.is_workspace_member(uuid)            to authenticated, anon;
grant execute on function public.has_workspace_role(uuid, public.workspace_role) to authenticated, anon;
grant execute on function public.current_member_id(uuid)              to authenticated, anon;
```

No table, policy, or app-code changes. After this runs, the dashboard queries (`workspace_members`, `services`, `customers`, `appointments`) should start returning rows again for the signed-in user.

## Why this happened

The functions were created without an explicit `GRANT EXECUTE`. In Postgres the default `PUBLIC` execute grant on functions has been progressively locked down, and Supabase projects generally don't rely on it — helper functions used inside RLS must be explicitly granted to `authenticated`.

## Out of scope

- No change to function bodies or `SECURITY DEFINER` settings.
- No change to RLS policies themselves.
- No change to the dashboard or onboarding code.
