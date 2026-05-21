-- 1. notification_settings table
create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  email_client_confirm boolean not null default true,
  sms_client_confirm boolean not null default false,
  email_provider_alert boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

-- RLS: admins/owners full access; staff read-only
create policy "Admins manage notification_settings - select"
  on public.notification_settings for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Admins manage notification_settings - insert"
  on public.notification_settings for insert
  to authenticated
  with check (public.has_workspace_role(workspace_id, 'admin'::workspace_role));

create policy "Admins manage notification_settings - update"
  on public.notification_settings for update
  to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'::workspace_role));

create policy "Admins manage notification_settings - delete"
  on public.notification_settings for delete
  to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'::workspace_role));

-- updated_at trigger
create trigger trg_notification_settings_updated_at
before update on public.notification_settings
for each row execute function public.tg_set_updated_at();

-- Backfill one row per existing workspace
insert into public.notification_settings (workspace_id)
select id from public.workspaces
on conflict (workspace_id) do nothing;

-- 2. Appointment INSERT webhook trigger -> public TanStack route
create or replace function public.notify_appointment_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://project--b242ffaf-aba9-404d-ae2f-439da5daa84a.lovable.app/api/public/appointment-confirmation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(current_setting('app.appointment_webhook_secret', true), 'webcapt26luxe')
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'appointments',
      'schema', 'public',
      'record', row_to_json(NEW),
      'old_record', null
    )
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_appointment_inserted on public.appointments;
create trigger trg_notify_appointment_inserted
after insert on public.appointments
for each row execute function public.notify_appointment_inserted();
