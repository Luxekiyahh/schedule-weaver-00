UPDATE public.appointments a
SET start_at = a.start_at + interval '4 hours',
    end_at = a.end_at + interval '4 hours'
FROM public.workspaces w
WHERE w.id = a.workspace_id
  AND w.slug = 'alluringdolls'
  AND w.timezone = 'UTC'
  AND a.start_at > now();

UPDATE public.workspaces SET timezone = 'America/New_York' WHERE slug = 'alluringdolls';