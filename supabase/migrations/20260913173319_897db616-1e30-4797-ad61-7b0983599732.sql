ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS timezone_overridden_at timestamp with time zone;