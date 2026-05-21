
-- Set search_path on updated_at trigger fn
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end $$;

-- Revoke public execute on internal SECURITY DEFINER helpers; they are used inside RLS policies only
revoke execute on function public.is_workspace_member(uuid) from public, anon, authenticated;
revoke execute on function public.has_workspace_role(uuid, public.workspace_role) from public, anon, authenticated;
revoke execute on function public.current_member_id(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
