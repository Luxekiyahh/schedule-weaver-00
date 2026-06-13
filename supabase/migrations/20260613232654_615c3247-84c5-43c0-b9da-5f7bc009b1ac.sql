ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#4f46e5',
  ADD COLUMN IF NOT EXISTS secondary_color text NOT NULL DEFAULT '#ec4899',
  ADD COLUMN IF NOT EXISTS font_family text NOT NULL DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS logo_url text;