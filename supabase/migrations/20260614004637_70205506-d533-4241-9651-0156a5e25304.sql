CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  )
$$;

CREATE POLICY "Platform admins can view the admin list"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());