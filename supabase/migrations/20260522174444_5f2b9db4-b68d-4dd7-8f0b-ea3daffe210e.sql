
-- 1) Tighten branding storage policies: require workspace admin role.
--    Path convention: <workspace_id>/<filename...>
DROP POLICY IF EXISTS "Branding admin write" ON storage.objects;
DROP POLICY IF EXISTS "Branding admin update" ON storage.objects;
DROP POLICY IF EXISTS "Branding admin delete" ON storage.objects;
DROP POLICY IF EXISTS "Branding public read" ON storage.objects;

CREATE POLICY "Branding admin write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND public.has_workspace_role(
    ((storage.foldername(name))[1])::uuid,
    'admin'::public.workspace_role
  )
);

CREATE POLICY "Branding admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'branding'
  AND public.has_workspace_role(
    ((storage.foldername(name))[1])::uuid,
    'admin'::public.workspace_role
  )
);

CREATE POLICY "Branding admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'branding'
  AND public.has_workspace_role(
    ((storage.foldername(name))[1])::uuid,
    'admin'::public.workspace_role
  )
);

-- Restrict SELECT on storage.objects for branding to workspace members only,
-- so anonymous clients cannot list/enumerate files. Public CDN URLs continue
-- to work because the bucket itself is public.
CREATE POLICY "Branding member list"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'branding'
  AND public.is_workspace_member(
    ((storage.foldername(name))[1])::uuid
  )
);

-- 2) Drop the public read policy on workspaces. All public storefront reads
--    go through server functions using the admin client, so no anon read is
--    needed and we stop leaking owner_id / notification_settings to anon.
DROP POLICY IF EXISTS "Public can view workspaces" ON public.workspaces;

-- 3) Add a public SELECT policy on services scoped to active rows so the
--    public booking flow remains consistent with service_variants / categories.
CREATE POLICY "Public can view active services"
ON public.services FOR SELECT
TO anon, authenticated
USING (is_active = true);
