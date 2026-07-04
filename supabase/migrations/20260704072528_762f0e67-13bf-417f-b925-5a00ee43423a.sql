ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

UPDATE public.workspaces w
SET onboarded_at = now()
WHERE onboarded_at IS NULL
  AND (
    EXISTS (SELECT 1 FROM public.services s WHERE s.workspace_id = w.id)
    OR EXISTS (SELECT 1 FROM public.workspace_branding b WHERE b.workspace_id = w.id)
  );