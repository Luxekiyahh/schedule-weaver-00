-- 1. Opt-in flag: platform-admin owned workspaces are normally blocked from
-- having a public storefront. This flag whitelists a single operator-owned
-- business workspace without weakening the rule for the others.
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS storefront_enabled boolean NOT NULL DEFAULT false;

-- 2. Comped subscriptions are never created or cancelled by Stripe.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS comped boolean NOT NULL DEFAULT false;

-- 3. Turn the operator's placeholder workspace into the real business.
UPDATE public.workspaces
SET name = 'Luxe Allure Artistry',
    slug = 'luxe-allure-artistry',
    storefront_enabled = true,
    timezone = 'America/New_York',
    business_email = 'admin@procschedule.com',
    onboarded_at = COALESCE(onboarded_at, now()),
    updated_at = now()
WHERE id = '4548f2e9-d94a-4c4b-a33a-fb9846833553';

-- 4. Service catalog.
INSERT INTO public.service_categories (workspace_id, name, description, sort_order, active)
SELECT '4548f2e9-d94a-4c4b-a33a-fb9846833553', 'Makeup Artistry',
       'Soft, luminous, camera-ready makeup for every occasion.', 1, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_categories
  WHERE workspace_id = '4548f2e9-d94a-4c4b-a33a-fb9846833553' AND name = 'Makeup Artistry'
);

INSERT INTO public.services (workspace_id, category_id, name, description, duration_minutes, price_cents, currency, is_active)
SELECT '4548f2e9-d94a-4c4b-a33a-fb9846833553', c.id, v.name, v.description, 80, v.price_cents, 'USD', true
FROM public.service_categories c
CROSS JOIN (VALUES
  ('Soft Glam', 'A softly sculpted, luminous everyday look: skin prep, flawless base, soft shadow, lashes and a natural lip.', 7500),
  ('Full Glam', 'Full-coverage, high-impact glam: sculpted contour, dramatic eye, lashes and a bold finish made to last all night.', 9500)
) AS v(name, description, price_cents)
WHERE c.workspace_id = '4548f2e9-d94a-4c4b-a33a-fb9846833553'
  AND c.name = 'Makeup Artistry'
  AND NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.workspace_id = '4548f2e9-d94a-4c4b-a33a-fb9846833553' AND s.name = v.name
  );

-- 5. Weekly availability for the owner (Tue-Sat).
INSERT INTO public.provider_availability (workspace_id, member_id, day_of_week, start_time, end_time)
SELECT '4548f2e9-d94a-4c4b-a33a-fb9846833553', m.id, v.dow, v.start_time::time, v.end_time::time
FROM public.workspace_members m
CROSS JOIN (VALUES (2,'09:00','18:00'),(3,'09:00','18:00'),(4,'09:00','19:00'),(5,'09:00','19:00'),(6,'08:00','17:00')) AS v(dow, start_time, end_time)
WHERE m.workspace_id = '4548f2e9-d94a-4c4b-a33a-fb9846833553'
  AND m.is_active
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_availability a
    WHERE a.member_id = m.id AND a.day_of_week = v.dow
  );

-- 6. Comped top-tier entitlement (no Stripe objects, never billed).
INSERT INTO public.subscriptions (workspace_id, plan_tier, status, environment, comped, setup_fee_paid, current_period_start, current_period_end)
VALUES
  ('4548f2e9-d94a-4c4b-a33a-fb9846833553', 'enterprise', 'active', 'live', true, true, now(), now() + interval '100 years'),
  ('4548f2e9-d94a-4c4b-a33a-fb9846833553', 'enterprise', 'active', 'sandbox', true, true, now(), now() + interval '100 years')
ON CONFLICT (workspace_id, environment) DO UPDATE
SET plan_tier = EXCLUDED.plan_tier,
    status = EXCLUDED.status,
    comped = true,
    setup_fee_paid = true,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = now();

-- 7. Flat $25 deposit configuration (charged once a card processor is connected).
INSERT INTO public.workspace_payment_settings (workspace_id, deposit_type, deposit_amount_cents, currency)
VALUES ('4548f2e9-d94a-4c4b-a33a-fb9846833553', 'deposit', 2500, 'USD')
ON CONFLICT (workspace_id) DO UPDATE
SET deposit_type = 'deposit', deposit_amount_cents = 2500, updated_at = now();