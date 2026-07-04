-- 1. No-show prepay columns on customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS no_show_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS require_prepay boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prepay_overridden_by uuid;

-- 2. Threshold on payment settings
ALTER TABLE public.workspace_payment_settings
  ADD COLUMN IF NOT EXISTS no_show_prepay_threshold integer NOT NULL DEFAULT 2;

-- 3. Trigger: increment no_show_count and auto-flag require_prepay
CREATE OR REPLACE FUNCTION public.handle_appointment_no_show()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  threshold integer;
  new_count integer;
BEGIN
  IF NEW.status = 'no_show' AND (OLD.status IS DISTINCT FROM 'no_show') AND NEW.customer_id IS NOT NULL THEN
    SELECT COALESCE(no_show_prepay_threshold, 2) INTO threshold
      FROM public.workspace_payment_settings
      WHERE workspace_id = NEW.workspace_id;
    IF threshold IS NULL THEN threshold := 2; END IF;

    UPDATE public.customers
      SET no_show_count = COALESCE(no_show_count, 0) + 1,
          updated_at = now()
      WHERE id = NEW.customer_id
      RETURNING no_show_count INTO new_count;

    -- Auto-flag once threshold met, unless an owner manually overrode it.
    IF new_count >= threshold THEN
      UPDATE public.customers
        SET require_prepay = true
        WHERE id = NEW.customer_id
          AND prepay_overridden_by IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_no_show ON public.appointments;
CREATE TRIGGER trg_appointment_no_show
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointment_no_show();

-- 4. Waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  desired_date date,
  desired_from time,
  desired_to time,
  status text NOT NULL DEFAULT 'waiting',
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_ws_status ON public.waitlist_entries(workspace_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_entries TO authenticated;
GRANT INSERT ON public.waitlist_entries TO anon;
GRANT ALL ON public.waitlist_entries TO service_role;

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their workspace waitlist"
  ON public.waitlist_entries FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Public can join a waitlist"
  ON public.waitlist_entries FOR INSERT
  TO anon
  WITH CHECK (status = 'waiting');

CREATE TRIGGER trg_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5. Update feature gating helper to the new feature strings
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
        ELSE false
      END
  )
$function$;

-- 6. Cancellation -> waitlist notify trigger
CREATE OR REPLACE FUNCTION public.notify_appointment_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    PERFORM net.http_post(
      url := 'https://project--b242ffaf-aba9-404d-ae2f-439da5daa84a.lovable.app/api/public/hooks/waitlist-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', coalesce(current_setting('app.appointment_webhook_secret', true), 'webcapt26luxe')
      ),
      body := jsonb_build_object(
        'appointment_id', NEW.id,
        'workspace_id', NEW.workspace_id,
        'service_id', NEW.service_id,
        'provider_id', NEW.provider_id,
        'start_at', NEW.start_at,
        'end_at', NEW.end_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_cancelled ON public.appointments;
CREATE TRIGGER trg_appointment_cancelled
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_appointment_cancelled();