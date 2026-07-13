-- 1. Suspension fields on workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS suspended_by uuid;

-- 2. SMS send log (operator / service-role only)
CREATE TABLE IF NOT EXISTS public.sms_send_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid,
  to_number text,
  body text,
  purpose text,
  twilio_sid text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sms_send_log TO service_role;
ALTER TABLE public.sms_send_log ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon: fail-closed, accessed only via service role.

-- 3. Admin audit log (operator / service-role only)
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  target_workspace_id uuid,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 4. Operator-only: pg_cron status
CREATE OR REPLACE FUNCTION public.admin_cron_status()
RETURNS TABLE(jobid bigint, jobname text, schedule text, active boolean,
              last_status text, last_start timestamptz, last_end timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT j.jobid, j.jobname, j.schedule, j.active,
         r.status, r.start_time, r.end_time
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT d.status, d.start_time, d.end_time
    FROM cron.job_run_details d
    WHERE d.jobid = j.jobid
    ORDER BY d.start_time DESC
    LIMIT 1
  ) r ON true
  ORDER BY j.jobname;
END;
$$;

-- 5. Operator-only: platform stats
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT jsonb_build_object(
    'total_tenants', (SELECT count(*) FROM public.workspaces),
    'suspended_tenants', (SELECT count(*) FROM public.workspaces WHERE suspended_at IS NOT NULL),
    'bookings_7d', (SELECT count(*) FROM public.appointments WHERE created_at >= now() - interval '7 days'),
    'bookings_30d', (SELECT count(*) FROM public.appointments WHERE created_at >= now() - interval '30 days'),
    'email_failures_7d', (SELECT count(*) FROM public.email_send_log WHERE status IN ('failed','dlq','bounced','complained') AND created_at >= now() - interval '7 days'),
    'sms_failures_7d', (SELECT count(*) FROM public.sms_send_log WHERE status = 'failed' AND created_at >= now() - interval '7 days')
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_cron_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;