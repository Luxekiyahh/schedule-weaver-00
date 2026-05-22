-- Add ai_credits column to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS ai_credits integer NOT NULL DEFAULT 5;

-- Backfill existing workspaces that somehow got 0
UPDATE public.workspaces SET ai_credits = 5 WHERE ai_credits IS NULL OR ai_credits < 0;

-- Add layout_config to workspace_branding
ALTER TABLE public.workspace_branding
  ADD COLUMN IF NOT EXISTS layout_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Create ai_generation_logs table
CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  prompt_text text NOT NULL,
  credits_deducted integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view ai_generation_logs" ON public.ai_generation_logs;
CREATE POLICY "Members can view ai_generation_logs"
  ON public.ai_generation_logs
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_workspace ON public.ai_generation_logs(workspace_id, created_at DESC);

-- Atomic credit consumption
CREATE OR REPLACE FUNCTION public.consume_ai_credit(_workspace_id uuid, _prompt text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
BEGIN
  UPDATE public.workspaces
    SET ai_credits = ai_credits - 1
    WHERE id = _workspace_id AND ai_credits > 0
    RETURNING ai_credits INTO remaining;

  IF remaining IS NULL THEN
    RAISE EXCEPTION 'OUT_OF_CREDITS' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.ai_generation_logs (workspace_id, prompt_text, credits_deducted)
    VALUES (_workspace_id, _prompt, 1);

  RETURN remaining;
END;
$$;

-- Refund on failure
CREATE OR REPLACE FUNCTION public.refund_ai_credit(_workspace_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
BEGIN
  UPDATE public.workspaces
    SET ai_credits = ai_credits + 1
    WHERE id = _workspace_id
    RETURNING ai_credits INTO remaining;
  RETURN remaining;
END;
$$;