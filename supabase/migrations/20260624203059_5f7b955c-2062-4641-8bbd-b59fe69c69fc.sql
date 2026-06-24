-- Secure per-workspace payment provider credentials (BYO keys).
-- Secret keys are stored here and are NEVER exposed to the client:
-- the table is locked down (no anon/authenticated grants) and only the
-- service role (server functions) can read/write it.
CREATE TABLE public.workspace_payment_credentials (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_secret_key text,
  paypal_client_id text,
  paypal_secret text,
  square_access_token text,
  square_location_id text,
  environment text NOT NULL DEFAULT 'live',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Service role only — no client access whatsoever.
GRANT ALL ON public.workspace_payment_credentials TO service_role;
ALTER TABLE public.workspace_payment_credentials ENABLE ROW LEVEL SECURITY;
-- No policies: clients can never read these secrets directly.

CREATE TRIGGER set_updated_at_payment_credentials
  BEFORE UPDATE ON public.workspace_payment_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Publishable key is safe to expose to the browser (Stripe.js needs it).
ALTER TABLE public.workspace_payment_settings
  ADD COLUMN IF NOT EXISTS stripe_publishable_key text;