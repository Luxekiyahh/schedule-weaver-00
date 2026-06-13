ALTER TABLE public.subscriptions
  ADD COLUMN environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN price_id text;

-- Replace unique(workspace_id) with unique(workspace_id, environment) so a
-- workspace can hold both a test and a live subscription row simultaneously.
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_workspace_id_key;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_workspace_env_key UNIQUE (workspace_id, environment);

CREATE OR REPLACE FUNCTION public.workspace_has_feature(_workspace_id uuid, _feature text, _env text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.workspace_id = _workspace_id
      AND s.environment = _env
      AND s.status IN ('trialing', 'active', 'past_due')
      AND CASE _feature
        WHEN 'booking' THEN true
        WHEN 'workflow_automations' THEN s.plan_tier IN ('pro', 'enterprise')
        WHEN 'sms_marketing' THEN s.plan_tier IN ('pro', 'enterprise')
        WHEN 'ai_agents' THEN s.plan_tier = 'enterprise'
        ELSE false
      END
  )
$$;