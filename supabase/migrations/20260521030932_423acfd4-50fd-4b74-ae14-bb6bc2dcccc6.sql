
-- Extensions
create extension if not exists btree_gist;

-- ENUMS
create type public.workspace_role as enum ('staff', 'admin', 'owner');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

-- =========================
-- PROFILES
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- =========================
-- WORKSPACES
-- =========================
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  is_solo boolean not null default false,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;

-- =========================
-- WORKSPACE MEMBERS
-- =========================
create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
alter table public.workspace_members enable row level security;

create index on public.workspace_members (user_id);
create index on public.workspace_members (workspace_id);

-- =========================
-- SECURITY DEFINER HELPERS (avoid RLS recursion)
-- =========================
create or replace function public.is_workspace_member(_workspace_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
      and user_id = auth.uid()
      and is_active
  )
$$;

create or replace function public.has_workspace_role(_workspace_id uuid, _min_role public.workspace_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
      and user_id = auth.uid()
      and is_active
      and role >= _min_role
  )
$$;

create or replace function public.current_member_id(_workspace_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.workspace_members
  where workspace_id = _workspace_id and user_id = auth.uid() and is_active
  limit 1
$$;

-- Policies referencing helpers
create policy "Members can view their workspaces"
  on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));

create policy "Owners can update workspace"
  on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, 'owner'));

create policy "Owners can delete workspace"
  on public.workspaces for delete to authenticated
  using (public.has_workspace_role(id, 'owner'));

create policy "Authenticated users can create workspaces"
  on public.workspaces for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Members can view memberships in their workspaces"
  on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Admins manage memberships"
  on public.workspace_members for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin'));

create policy "Admins update memberships"
  on public.workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

create policy "Admins delete memberships"
  on public.workspace_members for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- =========================
-- SERVICES
-- =========================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'USD',
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.services enable row level security;
create index on public.services (workspace_id);

create policy "Members can view services"
  on public.services for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Admins manage services - insert"
  on public.services for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin'));

create policy "Admins manage services - update"
  on public.services for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

create policy "Admins manage services - delete"
  on public.services for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- =========================
-- SERVICE PROVIDERS (m:n)
-- =========================
create table public.service_providers (
  service_id uuid not null references public.services(id) on delete cascade,
  member_id uuid not null references public.workspace_members(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (service_id, member_id)
);
alter table public.service_providers enable row level security;
create index on public.service_providers (member_id);
create index on public.service_providers (workspace_id);

create policy "Members can view service_providers"
  on public.service_providers for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Admins manage service_providers - insert"
  on public.service_providers for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin'));

create policy "Admins manage service_providers - delete"
  on public.service_providers for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- =========================
-- CUSTOMERS
-- =========================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customers enable row level security;
create index on public.customers (workspace_id);
create index on public.customers (user_id);
create unique index customers_workspace_email_unique
  on public.customers (workspace_id, lower(email)) where email is not null;

create policy "Members can view customers"
  on public.customers for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Linked customer can view own record"
  on public.customers for select to authenticated
  using (user_id = auth.uid());

create policy "Admins manage customers - insert"
  on public.customers for insert to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin'));

create policy "Admins manage customers - update"
  on public.customers for update to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

create policy "Admins manage customers - delete"
  on public.customers for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- =========================
-- PROVIDER AVAILABILITY (recurring weekly)
-- =========================
create table public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id uuid not null references public.workspace_members(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
alter table public.provider_availability enable row level security;
create index on public.provider_availability (workspace_id, member_id);

create policy "Members can view availability"
  on public.provider_availability for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Staff edit own availability - insert"
  on public.provider_availability for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, 'admin')
    or member_id = public.current_member_id(workspace_id)
  );

create policy "Staff edit own availability - update"
  on public.provider_availability for update to authenticated
  using (
    public.has_workspace_role(workspace_id, 'admin')
    or member_id = public.current_member_id(workspace_id)
  );

create policy "Staff edit own availability - delete"
  on public.provider_availability for delete to authenticated
  using (
    public.has_workspace_role(workspace_id, 'admin')
    or member_id = public.current_member_id(workspace_id)
  );

-- =========================
-- AVAILABILITY EXCEPTIONS (time off / extras)
-- =========================
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id uuid not null references public.workspace_members(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_available boolean not null default false,
  reason text,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
alter table public.availability_exceptions enable row level security;
create index on public.availability_exceptions (workspace_id, member_id, start_at);

create policy "Members can view exceptions"
  on public.availability_exceptions for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Staff edit own exceptions - insert"
  on public.availability_exceptions for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, 'admin')
    or member_id = public.current_member_id(workspace_id)
  );

create policy "Staff edit own exceptions - update"
  on public.availability_exceptions for update to authenticated
  using (
    public.has_workspace_role(workspace_id, 'admin')
    or member_id = public.current_member_id(workspace_id)
  );

create policy "Staff edit own exceptions - delete"
  on public.availability_exceptions for delete to authenticated
  using (
    public.has_workspace_role(workspace_id, 'admin')
    or member_id = public.current_member_id(workspace_id)
  );

-- =========================
-- APPOINTMENTS
-- =========================
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  provider_id uuid not null references public.workspace_members(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  notes text,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  -- prevent overlapping non-cancelled bookings per provider
  exclude using gist (
    provider_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status <> 'cancelled')
);
alter table public.appointments enable row level security;
create index on public.appointments (workspace_id, start_at);
create index on public.appointments (provider_id, start_at);
create index on public.appointments (customer_id);

-- Staff: only own calendar; admins/owners: all in workspace
create policy "Staff view own, admins view all - appointments"
  on public.appointments for select to authenticated
  using (
    public.has_workspace_role(workspace_id, 'admin')
    or provider_id = public.current_member_id(workspace_id)
  );

create policy "Linked customers view own appointments"
  on public.appointments for select to authenticated
  using (
    exists (
      select 1 from public.customers c
      where c.id = appointments.customer_id and c.user_id = auth.uid()
    )
  );

create policy "Admins and own-provider can insert appointments"
  on public.appointments for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, 'admin')
    or provider_id = public.current_member_id(workspace_id)
  );

create policy "Admins and own-provider can update appointments"
  on public.appointments for update to authenticated
  using (
    public.has_workspace_role(workspace_id, 'admin')
    or provider_id = public.current_member_id(workspace_id)
  );

create policy "Admins can delete appointments"
  on public.appointments for delete to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'));

-- =========================
-- TRIGGERS: updated_at
-- =========================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_workspaces_updated before update on public.workspaces
  for each row execute function public.tg_set_updated_at();
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.tg_set_updated_at();
create trigger trg_services_updated before update on public.services
  for each row execute function public.tg_set_updated_at();
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.tg_set_updated_at();
create trigger trg_appointments_updated before update on public.appointments
  for each row execute function public.tg_set_updated_at();

-- =========================
-- AUTH SIGNUP: create profile + solo workspace + owner membership
-- =========================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  new_ws_id uuid;
  base_slug text;
  final_slug text;
  i int := 0;
begin
  -- profile
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  on conflict (id) do nothing;

  -- solo workspace slug from email local-part
  base_slug := regexp_replace(lower(split_part(coalesce(new.email,'user'), '@', 1)), '[^a-z0-9]+', '-', 'g');
  if base_slug = '' or base_slug is null then base_slug := 'workspace'; end if;
  final_slug := base_slug;
  while exists (select 1 from public.workspaces where slug = final_slug) loop
    i := i + 1;
    final_slug := base_slug || '-' || i::text;
  end loop;

  insert into public.workspaces (name, slug, owner_id, is_solo)
  values (coalesce(new.raw_user_meta_data->>'full_name', new.email, 'My workspace'), final_slug, new.id, true)
  returning id into new_ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_ws_id, new.id, 'owner');

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
