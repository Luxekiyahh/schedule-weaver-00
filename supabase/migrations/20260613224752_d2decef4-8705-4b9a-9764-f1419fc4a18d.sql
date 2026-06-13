CREATE TYPE public.plan_tier AS ENUM ('basic', 'pro', 'enterprise');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_tier public.plan_tier NOT NULL DEFAULT 'basic',
  status public.subscription_status NOT NULL DEFAULT 'incomplete',
  setup_fee_paid boolean NOT NULL DEFAULT false,
  paddle_subscription_id text,
  paddle_customer_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their workspace subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Feature entitlement helper: single source of truth shared by SQL and server code.
CREATE OR REPLACE FUNCTION public.workspace_has_feature(_workspace_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.workspace_id = _workspace_id
      AND s.status IN ('trialing', 'active')
      AND CASE _feature
        WHEN 'booking' THEN true
        WHEN 'workflow_automations' THEN s.plan_tier IN ('pro', 'enterprise')
        WHEN 'sms_marketing' THEN s.plan_tier IN ('pro', 'enterprise')
        WHEN 'ai_agents' THEN s.plan_tier = 'enterprise'
        ELSE false
      END
  )
$$;