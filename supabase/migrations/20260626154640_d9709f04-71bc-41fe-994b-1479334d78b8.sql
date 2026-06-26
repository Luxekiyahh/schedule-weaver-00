-- 1. Service catalog: remove cross-tenant anon enumeration, scope to members
DROP POLICY IF EXISTS "Public can view active services" ON public.services;

DROP POLICY IF EXISTS "Public can view active categories" ON public.service_categories;
CREATE POLICY "Members can view categories" ON public.service_categories
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Public can view active variants" ON public.service_variants;
CREATE POLICY "Members can view variants" ON public.service_variants
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Public can view active length options" ON public.service_length_options;
CREATE POLICY "Members can view length options" ON public.service_length_options
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Public can view active hair colors" ON public.service_hair_colors;
CREATE POLICY "Members can view hair colors" ON public.service_hair_colors
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

-- 2. Workspace branding: remove fully-public read, scope to members
DROP POLICY IF EXISTS "Public can view branding" ON public.workspace_branding;
CREATE POLICY "Members can view branding" ON public.workspace_branding
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

-- 3. Payment settings: separate read from write; only admins may write
DROP POLICY IF EXISTS "Members manage their workspace payment settings" ON public.workspace_payment_settings;

CREATE POLICY "Members can view payment settings" ON public.workspace_payment_settings
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins manage payment settings" ON public.workspace_payment_settings
  FOR ALL TO authenticated
  USING (has_workspace_role(workspace_id, 'admin'::workspace_role))
  WITH CHECK (has_workspace_role(workspace_id, 'admin'::workspace_role));