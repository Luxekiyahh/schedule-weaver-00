ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS notification_settings jsonb NOT NULL
DEFAULT '{"client_email":true,"client_sms":false,"provider_email":true}'::jsonb;