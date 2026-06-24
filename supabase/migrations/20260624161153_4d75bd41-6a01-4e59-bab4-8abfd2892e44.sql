ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'incomplete_expired';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'unpaid';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'paused';