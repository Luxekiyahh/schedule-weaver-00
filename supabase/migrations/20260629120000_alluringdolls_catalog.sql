-- ============================================================
-- Alluring Dolls (slug: alluringdolls) — full catalog seed
-- Scoped entirely to this one workspace_id. Touches no other tenant.
-- Safe to re-run: deletes-then-reinserts only rows belonging to this
-- workspace, so running it twice will not create duplicates.
-- ============================================================

do $$
declare
  v_ws_id uuid;
  v_member_id uuid;

  -- service_categories ids
  v_cat_quickweave uuid;
  v_cat_sewins uuid;
  v_cat_wigs uuid;
  v_cat_braids_size uuid;
  v_cat_braids_count uuid;
begin
  select id into v_ws_id from public.workspaces where slug = 'alluringdolls';

  if v_ws_id is null then
    raise notice 'Workspace with slug=alluringdolls not found — skipping seed.';
    return;
  end if;

  -- Owner/admin member, used to auto-link new bookable services so they
  -- show up under "my services" the same way manually-created ones do.
  select id into v_member_id
  from public.workspace_members
  where workspace_id = v_ws_id and is_active = true
  order by (role = 'owner') desc, (role = 'admin') desc
  limit 1;

  -- ----------------------------------------------------------
  -- 1. Flat `services` table — this is what actually powers the
  --    real booking flow (availability, conflict checks, etc).
  -- ----------------------------------------------------------
  delete from public.service_providers
  where workspace_id = v_ws_id
    and service_id in (select id from public.services where workspace_id = v_ws_id);
  delete from public.services where workspace_id = v_ws_id;

  insert into public.services (workspace_id, name, description, duration_minutes, price_cents, currency, is_active)
  values
    -- Quick weaves & styles (client provides hair; Sensual or Empire preferred)
    (v_ws_id, 'Quick Weave', 'Basic styling included. Client provides hair — Sensual or Empire recommended.', 120, 12000, 'USD', true),
    (v_ws_id, 'Bobs / Blunt Cut', 'Basic styling included. Client provides hair — Sensual or Empire recommended.', 120, 12000, 'USD', true),
    (v_ws_id, 'Frontal/Closure Quick Weave', 'Basic styling included. Client provides hair — Sensual or Empire recommended.', 120, 14000, 'USD', true),
    (v_ws_id, 'Half Up Half Down', 'Basic styling included. Client provides hair — Sensual or Empire recommended.', 120, 13500, 'USD', true),
    (v_ws_id, 'Half Braids Half Bond-In', 'Basic styling included. Client provides hair — Sensual or Empire recommended.', 120, 16500, 'USD', true),
    (v_ws_id, 'Ponytail', 'Basic styling included.', 90, 10000, 'USD', true),
    (v_ws_id, '2 Ponytails', 'Basic styling included.', 90, 12000, 'USD', true),

    -- Sew-ins (client provides hair; Sensual or Empire preferred)
    (v_ws_id, 'Traditional Sew-In', 'Basic styling included. Client provides hair — Sensual or Empire recommended.', 180, 15000, 'USD', true),
    (v_ws_id, 'Frontal/Closure Sew-In', 'Basic styling included. Client provides hair — Sensual or Empire recommended.', 180, 17000, 'USD', true),
    (v_ws_id, 'Half Braids Half Sewn-In', 'Basic styling included. Client provides hair — Sensual or Empire recommended.', 180, 19000, 'USD', true),
    (v_ws_id, 'Curls', 'Styling only.', 45, 4500, 'USD', true),
    (v_ws_id, 'Crimps', 'Styling only.', 45, 4500, 'USD', true),

    -- Wig installs
    (v_ws_id, 'Frontal Wig Install', 'Basic styling included.', 90, 13000, 'USD', true),
    (v_ws_id, 'Closure Wig Install', 'Basic styling included.', 90, 10000, 'USD', true),

    -- Braids — by size (hair included, 60in, ages 14+, colors 1B/1/2/4)
    (v_ws_id, 'Braids — Xsmall', 'Hair included (60 inch). Colors available: 1B, 1, 2, 4. Ages 14+.', 600, 30000, 'USD', true),
    (v_ws_id, 'Braids — Small', 'Hair included (60 inch). Colors available: 1B, 1, 2, 4. Ages 14+.', 540, 27500, 'USD', true),
    (v_ws_id, 'Braids — Smedium', 'Hair included (60 inch). Colors available: 1B, 1, 2, 4. Ages 14+.', 480, 22500, 'USD', true),
    (v_ws_id, 'Braids — Medium', 'Hair included (60 inch). Colors available: 1B, 1, 2, 4. Ages 14+.', 420, 17500, 'USD', true),

    -- Braids — by count (cornrows/plaits)
    (v_ws_id, '2-4 Braids', 'Cornrows/plaits, priced by count.', 60, 7000, 'USD', true),
    (v_ws_id, '6-8 Braids', 'Cornrows/plaits, priced by count.', 120, 9000, 'USD', true),
    (v_ws_id, '10-14 Braids', 'Cornrows/plaits, priced by count.', 180, 15000, 'USD', true),
    (v_ws_id, '20 Braids', 'Cornrows/plaits, priced by count.', 240, 18500, 'USD', true),
    (v_ws_id, '25+ Braids', 'Cornrows/plaits, priced by count.', 300, 22500, 'USD', true);

  -- Auto-link every new service to the owner, mirroring what the dashboard
  -- "New service" form does automatically.
  if v_member_id is not null then
    insert into public.service_providers (workspace_id, service_id, member_id)
    select v_ws_id, id, v_member_id from public.services where workspace_id = v_ws_id
    on conflict do nothing;
  end if;

  -- ----------------------------------------------------------
  -- 2. Storefront "menu" tables — categories / variants / length
  --    options / hair colors. Powers the pretty landing-page menu.
  -- ----------------------------------------------------------
  delete from public.service_variants where workspace_id = v_ws_id;
  delete from public.service_categories where workspace_id = v_ws_id;
  delete from public.service_length_options where workspace_id = v_ws_id;
  delete from public.service_hair_colors where workspace_id = v_ws_id;

  insert into public.service_categories (workspace_id, name, description, sort_order)
  values (v_ws_id, 'Quick Weaves & Styles', 'Basic styling included. Bring your own hair — Sensual or Empire preferred.', 1)
  returning id into v_cat_quickweave;

  insert into public.service_categories (workspace_id, name, description, sort_order)
  values (v_ws_id, 'Sew-Ins', 'Basic styling included on all but curls & crimps. Bring your own hair — Sensual or Empire preferred.', 2)
  returning id into v_cat_sewins;

  insert into public.service_categories (workspace_id, name, description, sort_order)
  values (v_ws_id, 'Wig Installs', 'Basic styling included.', 3)
  returning id into v_cat_wigs;

  insert into public.service_categories (workspace_id, name, description, sort_order)
  values (v_ws_id, 'Braids — By Size', 'Hair included, 60 inch. Ages 14 & up.', 4)
  returning id into v_cat_braids_size;

  insert into public.service_categories (workspace_id, name, description, sort_order)
  values (v_ws_id, 'Braids — By Count', 'Cornrows & plaits, priced by braid count.', 5)
  returning id into v_cat_braids_count;

  insert into public.service_variants (workspace_id, category_id, name, description, price_cents, duration_min, sort_order)
  values
    (v_ws_id, v_cat_quickweave, 'Quick Weave', null, 12000, 120, 1),
    (v_ws_id, v_cat_quickweave, 'Bobs / Blunt Cut', null, 12000, 120, 2),
    (v_ws_id, v_cat_quickweave, 'Frontal/Closure Quick Weave', null, 14000, 120, 3),
    (v_ws_id, v_cat_quickweave, 'Half Up Half Down', null, 13500, 120, 4),
    (v_ws_id, v_cat_quickweave, 'Half Braids Half Bond-In', null, 16500, 120, 5),
    (v_ws_id, v_cat_quickweave, 'Ponytail', null, 10000, 90, 6),
    (v_ws_id, v_cat_quickweave, '2 Ponytails', null, 12000, 90, 7),

    (v_ws_id, v_cat_sewins, 'Traditional', null, 15000, 180, 1),
    (v_ws_id, v_cat_sewins, 'Frontal/Closure', null, 17000, 180, 2),
    (v_ws_id, v_cat_sewins, 'Half Braids Half Sewn-In', null, 19000, 180, 3),
    (v_ws_id, v_cat_sewins, 'Curls', 'Styling only.', 4500, 45, 4),
    (v_ws_id, v_cat_sewins, 'Crimps', 'Styling only.', 4500, 45, 5),

    (v_ws_id, v_cat_wigs, 'Frontal Wig Install', null, 13000, 90, 1),
    (v_ws_id, v_cat_wigs, 'Closure Wig Install', null, 10000, 90, 2),

    (v_ws_id, v_cat_braids_size, 'Xsmall', null, 30000, 600, 1),
    (v_ws_id, v_cat_braids_size, 'Small', null, 27500, 540, 2),
    (v_ws_id, v_cat_braids_size, 'Smedium', null, 22500, 480, 3),
    (v_ws_id, v_cat_braids_size, 'Medium', null, 17500, 420, 4),

    (v_ws_id, v_cat_braids_count, '2-4 Braids', null, 7000, 60, 1),
    (v_ws_id, v_cat_braids_count, '6-8 Braids', null, 9000, 120, 2),
    (v_ws_id, v_cat_braids_count, '10-14 Braids', null, 15000, 180, 3),
    (v_ws_id, v_cat_braids_count, '20 Braids', null, 18500, 240, 4),
    (v_ws_id, v_cat_braids_count, '25+ Braids', null, 22500, 300, 5);

  insert into public.service_length_options (workspace_id, name, duration_min, price_cents, sort_order)
  values
    (v_ws_id, 'Thigh Length (Braids by Size)', 0, 5000, 1),
    (v_ws_id, 'Knee Length (Braids by Size)', 0, 12500, 2),
    (v_ws_id, 'Butt/Thigh Length (Braids by Count)', 0, 3500, 3),
    (v_ws_id, 'Knee Length (Braids by Count)', 0, 5000, 4);

  insert into public.service_hair_colors (workspace_id, code, label, swatch_hex, sort_order)
  values
    (v_ws_id, '1', 'Jet Black', '#0a0a0a', 1),
    (v_ws_id, '1B', 'Off Black', '#1c1310', 2),
    (v_ws_id, '2', 'Darkest Brown', '#2e1d14', 3),
    (v_ws_id, '4', 'Medium Brown', '#4a2c1a', 4);

  -- ----------------------------------------------------------
  -- 3. Branding (used for page <title>/meta and as a fallback
  --    palette source).
  -- ----------------------------------------------------------
  insert into public.workspace_branding (
    workspace_id, primary_hex, accent_hex, background_hex,
    heading_font, body_font, hero_headline, hero_subhead, cta_label
  )
  values (
    v_ws_id, '#cba35c', '#3a0d18', '#0b0a0d',
    'Italiana', 'Jost', 'Alluring Dolls',
    'Belle Glade''s home for quick weaves, sew-ins, wig installs & braids.',
    'Reserve Your Look'
  )
  on conflict (workspace_id) do update set
    primary_hex = excluded.primary_hex,
    accent_hex = excluded.accent_hex,
    background_hex = excluded.background_hex,
    heading_font = excluded.heading_font,
    body_font = excluded.body_font,
    hero_headline = excluded.hero_headline,
    hero_subhead = excluded.hero_subhead,
    cta_label = excluded.cta_label;

  raise notice 'Alluring Dolls catalog seeded: % services, workspace_id=%',
    (select count(*) from public.services where workspace_id = v_ws_id), v_ws_id;
end $$;
