ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS domain_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_domain_status_check;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_domain_status_check
  CHECK (domain_status IN ('pending', 'active'));