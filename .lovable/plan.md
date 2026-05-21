## Add `client` to the workspace role enum

The database already has a `workspace_role` enum with `('staff', 'admin', 'owner')` — ordered so RLS can do `role >= 'staff'`. You're asking to add `client` as a fourth value.

### Important design question first

The original schema deliberately kept `client` OUT of `workspace_members` and put end-users in the `customers` table instead. Reason: clients are not staff, don't have calendars, don't count toward seat billing, and a workspace can have thousands of them. Mixing them into `workspace_members` means every "list my team" query has to filter them out, and the role-ordering trick (`role >= 'staff'`) breaks unless `client` sorts below `staff`.

Two ways to interpret your request:

**Option A — Add `client` to the existing enum, keep clients in `customers`**
Just extend the type so it matches your spec, but continue storing end-users in `customers` (with optional `customers.user_id` for portal logins). The enum value exists but is essentially unused inside `workspace_members`. Low risk, reversible.

**Option B — Add `client` AND start using `workspace_members` for clients too**
Bigger change: clients become members with `role = 'client'`, the `customers` table either goes away or becomes a profile-extension table, and every existing RLS policy needs auditing because `is_workspace_member(ws_id)` would suddenly return true for end-users browsing a booking page. This conflicts with the multi-tenancy isolation we just built.

### Recommended: Option A

### Migration

1. `ALTER TYPE public.workspace_role ADD VALUE 'client' BEFORE 'staff';`
   - Placed BEFORE `staff` so the existing `role >= 'staff'` ordering in `has_workspace_role()` continues to mean "internal team member, not a client."
2. No table changes, no RLS changes, no code changes required.
3. The generated `src/integrations/supabase/types.ts` will regenerate with `'client'` included in the `workspace_role` union.

### What this does NOT do

- Does not change how clients log in or book (still via `customers` table + optional `customers.user_id`).
- Does not add a client portal UI.
- Does not change any RLS policy.

### Confirm before I run it

- Are you good with Option A (enum-only change, no behavioral impact)?
- Or do you actually want Option B (restructure clients into `workspace_members`)? If so, I'll come back with a separate, larger plan.
