grant execute on function public.is_workspace_member(uuid) to authenticated, anon;
grant execute on function public.has_workspace_role(uuid, public.workspace_role) to authenticated, anon;
grant execute on function public.current_member_id(uuid) to authenticated, anon;