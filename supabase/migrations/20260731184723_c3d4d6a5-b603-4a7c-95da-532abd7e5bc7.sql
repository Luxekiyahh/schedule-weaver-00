CREATE OR REPLACE FUNCTION public.find_customers_by_phone(_digits text)
RETURNS TABLE(id uuid, workspace_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.workspace_id FROM public.customers c
  WHERE regexp_replace(coalesce(c.phone,''), '\D', '', 'g') LIKE '%' || _digits
$$;
REVOKE ALL ON FUNCTION public.find_customers_by_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_customers_by_phone(text) TO service_role;