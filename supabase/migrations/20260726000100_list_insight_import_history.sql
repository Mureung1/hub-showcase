create function public.list_insight_import_history()
returns table (
  id uuid,
  adapter_key text,
  status text,
  total_count integer,
  new_count integer,
  duplicate_count integer,
  input_duplicate_count integer,
  excluded_count integer,
  created_count integer,
  preserved_count integer,
  already_deleted_count integer,
  completed_at timestamptz,
  undo_expires_at timestamptz,
  can_undo boolean,
  server_now timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    job.id,
    job.adapter_key,
    job.status,
    job.total_count,
    job.new_count,
    job.duplicate_count,
    job.input_duplicate_count,
    job.excluded_count,
    job.created_count,
    job.preserved_count,
    job.already_deleted_count,
    job.completed_at,
    job.undo_expires_at,
    job.status = 'completed'
      and job.undo_expires_at is not null
      and job.undo_expires_at > statement_timestamp(),
    statement_timestamp()
  from public.insight_import_jobs as job
  where job.user_id = (select auth.uid())
    and job.status in ('completed', 'undone')
  order by job.completed_at desc
  limit 20;
$$;

revoke all on function public.list_insight_import_history()
from public, anon, authenticated, service_role;

grant execute on function public.list_insight_import_history()
to authenticated;
