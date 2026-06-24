CREATE TABLE public.schedule_exceptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  block_date date NOT NULL,
  label text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_exceptions TO authenticated;
GRANT ALL ON public.schedule_exceptions TO service_role;

ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace schedule exceptions"
  ON public.schedule_exceptions FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can add workspace schedule exceptions"
  ON public.schedule_exceptions FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update workspace schedule exceptions"
  ON public.schedule_exceptions FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can delete workspace schedule exceptions"
  ON public.schedule_exceptions FOR DELETE
  USING (public.is_workspace_member(workspace_id));