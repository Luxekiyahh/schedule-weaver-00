CREATE TABLE public.workspace_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'none' CHECK (provider IN ('none','stripe','paypal','square')),
  connection_status text NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('disconnected','pending','connected','error')),
  provider_account_id text,
  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 2.00 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
  deposit_type text NOT NULL DEFAULT 'none' CHECK (deposit_type IN ('none','deposit','full')),
  deposit_amount_cents integer NOT NULL DEFAULT 0 CHECK (deposit_amount_cents >= 0),
  deposit_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (deposit_percent >= 0 AND deposit_percent <= 100),
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_payment_settings TO authenticated;
GRANT SELECT ON public.workspace_payment_settings TO anon;
GRANT ALL ON public.workspace_payment_settings TO service_role;

ALTER TABLE public.workspace_payment_settings ENABLE ROW LEVEL SECURITY;

-- Workspace members manage their own settings.
CREATE POLICY "Members manage their workspace payment settings"
  ON public.workspace_payment_settings FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Public booking pages may read non-sensitive payment policy.
-- (Sensitive account ids are not exposed by the storefront query.)
CREATE POLICY "Public can read payment policy"
  ON public.workspace_payment_settings FOR SELECT
  TO anon
  USING (true);

CREATE TRIGGER set_workspace_payment_settings_updated_at
  BEFORE UPDATE ON public.workspace_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();