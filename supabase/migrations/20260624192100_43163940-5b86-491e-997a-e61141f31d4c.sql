DROP POLICY IF EXISTS "Public can read payment policy" ON public.workspace_payment_settings;
REVOKE SELECT ON public.workspace_payment_settings FROM anon;