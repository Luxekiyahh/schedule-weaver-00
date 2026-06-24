CREATE OR REPLACE FUNCTION public.workspace_has_feature(_workspace_id uuid, _feature text, _env text DEFAULT 'live'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.workspace_id = _workspace_id
      AND s.environment = _env
      AND s.status IN ('trialing', 'active', 'past_due')
      AND CASE _feature
        WHEN 'booking' THEN true
        WHEN 'workflow_automations' THEN s.plan_tier IN ('pro', 'enterprise')
        WHEN 'sms_marketing' THEN s.plan_tier IN ('pro', 'enterprise')
        WHEN 'no_show_automation' THEN s.plan_tier = 'enterprise'
        ELSE false
      END
  )
$function$;