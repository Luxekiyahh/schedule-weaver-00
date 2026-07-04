ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS image_url text;