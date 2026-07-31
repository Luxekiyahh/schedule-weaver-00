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
        WHEN 'service_lifecycle_automation' THEN s.plan_tier IN ('pro', 'enterprise')
        WHEN 'review_redirect' THEN s.plan_tier IN ('pro', 'enterprise')
        WHEN 'client_profiles' THEN s.plan_tier IN ('pro', 'enterprise')
        WHEN 'vip_tiering' THEN s.plan_tier = 'enterprise'
        WHEN 'no_show_prepay' THEN s.plan_tier = 'enterprise'
        WHEN 'waitlist_bidding' THEN s.plan_tier = 'enterprise'
        WHEN 'sms_booking_confirmations' THEN s.plan_tier IN ('pro', 'enterprise')
        ELSE false
      END
  )
$function$