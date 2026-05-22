
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.service_categories(workspace_id);

create table public.service_variants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null default 0,
  duration_min int not null default 60,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.service_variants(workspace_id);
create index on public.service_variants(category_id);

create table public.service_length_options (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  duration_min int not null default 0,
  price_cents int not null default 0,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.service_length_options(workspace_id);

create table public.service_hair_colors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code text not null,
  label text not null,
  swatch_hex text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.service_hair_colors(workspace_id);

alter table public.appointments
  add column if not exists deposit_cents int not null default 0,
  add column if not exists variant_id uuid references public.service_variants(id),
  add column if not exists length_option_id uuid references public.service_length_options(id),
  add column if not exists hair_color text;

create table public.workspace_branding (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  primary_hex text not null default '#4f46e5',
  accent_hex text not null default '#ec4899',
  background_hex text not null default '#ffffff',
  heading_font text not null default 'Playfair Display',
  body_font text not null default 'Inter',
  hero_headline text not null default 'Book Your Appointment',
  hero_subhead text not null default 'Reserve your spot in just a few clicks.',
  cta_label text not null default 'Book now',
  hero_image_url text,
  logo_url text,
  updated_at timestamptz not null default now()
);

create trigger trg_service_categories_updated before update on public.service_categories
  for each row execute function public.tg_set_updated_at();
create trigger trg_service_variants_updated before update on public.service_variants
  for each row execute function public.tg_set_updated_at();
create trigger trg_service_length_options_updated before update on public.service_length_options
  for each row execute function public.tg_set_updated_at();
create trigger trg_workspace_branding_updated before update on public.workspace_branding
  for each row execute function public.tg_set_updated_at();

alter table public.service_categories enable row level security;
alter table public.service_variants enable row level security;
alter table public.service_length_options enable row level security;
alter table public.service_hair_colors enable row level security;
alter table public.workspace_branding enable row level security;

create policy "Public can view active categories" on public.service_categories
  for select to anon, authenticated using (active = true);
create policy "Public can view active variants" on public.service_variants
  for select to anon, authenticated using (active = true);
create policy "Public can view active length options" on public.service_length_options
  for select to anon, authenticated using (active = true);
create policy "Public can view active hair colors" on public.service_hair_colors
  for select to anon, authenticated using (active = true);
create policy "Public can view branding" on public.workspace_branding
  for select to anon, authenticated using (true);

create policy "Admins manage categories" on public.service_categories
  for all to authenticated
  using (has_workspace_role(workspace_id, 'admin'::workspace_role))
  with check (has_workspace_role(workspace_id, 'admin'::workspace_role));
create policy "Admins manage variants" on public.service_variants
  for all to authenticated
  using (has_workspace_role(workspace_id, 'admin'::workspace_role))
  with check (has_workspace_role(workspace_id, 'admin'::workspace_role));
create policy "Admins manage length options" on public.service_length_options
  for all to authenticated
  using (has_workspace_role(workspace_id, 'admin'::workspace_role))
  with check (has_workspace_role(workspace_id, 'admin'::workspace_role));
create policy "Admins manage hair colors" on public.service_hair_colors
  for all to authenticated
  using (has_workspace_role(workspace_id, 'admin'::workspace_role))
  with check (has_workspace_role(workspace_id, 'admin'::workspace_role));
create policy "Admins manage branding" on public.workspace_branding
  for all to authenticated
  using (has_workspace_role(workspace_id, 'admin'::workspace_role))
  with check (has_workspace_role(workspace_id, 'admin'::workspace_role));

create policy "Public can view workspaces" on public.workspaces
  for select to anon, authenticated using (true);

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "Branding public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'branding');
create policy "Branding admin write" on storage.objects
  for insert to authenticated with check (bucket_id = 'branding');
create policy "Branding admin update" on storage.objects
  for update to authenticated using (bucket_id = 'branding');
create policy "Branding admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'branding');
