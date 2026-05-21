# Multi-Tenant Scheduling SaaS — Database Design

## Architecture Overview

**Tenancy model: workspace-scoped (hybrid).** Every business — solo or team — is a `workspace`. A solo provider gets an auto-created single-member workspace on signup, so the data model never branches on "solo vs team."

**Isolation strategy:** every tenant-owned table carries a non-null `workspace_id`. RLS policies gate all access through a `SECURITY DEFINER` helper that reads the caller's workspace membership. No cross-tenant joins are possible from the client.

**Roles inside a workspace:** `owner`, `admin`, `staff`, `client`. Stored in a dedicated `workspace_members` table — never on the profile, never on auth metadata.

---

## Tables

### 1. `workspaces` — the tenant root
- `id` uuid PK
- `name` text
- `slug` text unique (for public booking URLs: `/book/acme-salon`)
- `owner_id` uuid → `auth.users` (denormalized for fast "is owner" checks; canonical role still lives in `workspace_members`)
- `is_solo` boolean — implicit single-member workspace flag
- `timezone` text, `created_at`, `updated_at`

### 2. `profiles` — one row per `auth.users`
- `id` uuid PK → `auth.users.id`
- `full_name`, `avatar_url`, `email`, `phone`
- Global to the user; a single auth user can belong to many workspaces.

### 3. `workspace_members` — membership + role (the security backbone)
- `id` uuid PK
- `workspace_id` uuid → `workspaces`
- `user_id` uuid → `auth.users`
- `role` `workspace_role` enum: `owner | admin | staff`
- `is_active` boolean
- Unique `(workspace_id, user_id)`
- This is the **only** place internal roles live. Clients are NOT members — they live in `customers`.

### 4. `services` — what can be booked
- `id`, `workspace_id`
- `name`, `description`, `duration_minutes`, `price_cents`, `currency`
- `is_active`, `color` (calendar display)

### 5. `service_providers` — which staff offer which services (M:N)
- `service_id` → `services`
- `member_id` → `workspace_members` (must be role `staff`/`admin`/`owner`)
- Composite PK

### 6. `customers` — bookable end-users (guests OR linked accounts)
- `id`, `workspace_id`
- `user_id` uuid nullable → `auth.users` (set when a client creates a portal login)
- `full_name`, `email`, `phone`, `notes`
- Unique `(workspace_id, email)` where email is not null — same person across workspaces stays separate (each business owns its own customer record)

### 7. `provider_availability` — recurring weekly working hours
- `id`, `workspace_id`, `member_id` → `workspace_members`
- `day_of_week` smallint (0–6)
- `start_time` time, `end_time` time
- Multiple rows per day allowed (split shifts)

### 8. `availability_exceptions` — overrides (time off, extra hours)
- `id`, `workspace_id`, `member_id`
- `start_at` timestamptz, `end_at` timestamptz
- `is_available` boolean — `false` = time off, `true` = one-off extra availability
- `reason` text

### 9. `appointments` — the core booking
- `id`, `workspace_id`
- `service_id` → `services`
- `provider_id` → `workspace_members`
- `customer_id` → `customers`
- `start_at`, `end_at` timestamptz
- `status` `appointment_status` enum: `pending | confirmed | completed | cancelled | no_show`
- `notes`, `cancelled_at`, `cancelled_by`
- Indexes: `(workspace_id, start_at)`, `(provider_id, start_at)`
- Exclusion constraint (Postgres `btree_gist`) preventing overlapping non-cancelled bookings per provider

---

## Security (RLS)

Every tenant table has RLS enabled. Access flows through one `SECURITY DEFINER` function to avoid recursive policy lookups:

```sql
create function public.is_workspace_member(_workspace_id uuid, _min_role workspace_role default 'staff')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = _workspace_id
      and user_id = auth.uid()
      and is_active
      and role >= _min_role  -- enum ordered owner > admin > staff
  )
$$;
```

**Policy patterns:**
- `workspaces`: SELECT if `is_workspace_member(id)`; UPDATE/DELETE only if role = `owner`.
- `workspace_members`: SELECT own workspaces; INSERT/UPDATE/DELETE only by `owner`/`admin`.
- `services`, `provider_availability`, `customers`: SELECT for any member; write for `admin`+, plus `staff` can write their own availability.
- `appointments`:
  - `staff` SELECT only rows where `provider_id` matches their own `workspace_members.id` (enforces "staff sees only own calendar")
  - `admin`/`owner` SELECT all in workspace
  - Customers with a linked `user_id` SELECT their own via `customers.user_id = auth.uid()`
- **Public booking page** (unauthenticated): served via `createServerFn` using `supabaseAdmin`, never via direct anon RLS. The server fn returns only safe columns (service name/duration/price, available slots) — never customer PII.

---

## Key Decisions Explained

**Why `workspace_members.id` (not `user_id`) as the provider FK on appointments?**
A user could leave the workspace; their historical bookings must stay attributable. The membership row is the durable identity within a tenant.

**Why separate `customers` from `auth.users`?**
You need guest bookings (no account) and per-workspace customer records (the same person at two salons is two customer rows with different notes/history). `customers.user_id` is the optional bridge when a client creates a portal login later.

**Why enum-ordered roles?**
Lets RLS policies do `role >= 'staff'` instead of `role IN (...)` lists everywhere.

**Why an exclusion constraint on appointments?**
Application-level overlap checks race under concurrent bookings. The DB constraint is the only correct guarantee.

---

## Out of Scope (Future Phases)
- Resources/rooms, recurring appointments, payments — schema is designed to extend cleanly (add `resource_id` to appointments, a `recurrence_rules` table, an `invoices`/`payments` pair) without breaking the tenancy model.
- Client portal UI — the data model already supports it via `customers.user_id`.

---

## Implementation Order (when you approve)
1. Enable Lovable Cloud
2. Migration: enums + `workspaces`, `profiles`, `workspace_members` + trigger that auto-creates a solo workspace on signup
3. Migration: `services`, `service_providers`, `customers`
4. Migration: `provider_availability`, `availability_exceptions`
5. Migration: `appointments` with exclusion constraint
6. RLS policies + `is_workspace_member` helper
7. Seed test data + verify isolation with two workspaces
