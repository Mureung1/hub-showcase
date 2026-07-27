create function public.undo_insight_import(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  v_job public.insight_import_jobs%rowtype;
  v_deleted_count integer := 0;
  v_preserved_count integer := 0;
  v_already_deleted_count integer := 0;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = '인증이 필요합니다.';
  end if;

  select *
  into v_job
  from public.insight_import_jobs
  where id = p_job_id
    and user_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = '가져오기 작업을 찾을 수 없습니다.';
  end if;

  if v_job.status = 'undone' then
    return jsonb_build_object(
      'jobId', v_job.id,
      'deletedCount', greatest(
        v_job.created_count
          - v_job.preserved_count
          - v_job.already_deleted_count,
        0
      ),
      'preservedCount', v_job.preserved_count,
      'alreadyDeletedCount', v_job.already_deleted_count
    );
  end if;

  if v_job.status <> 'completed' then
    raise exception using errcode = '22023', message = '완료된 가져오기 작업만 되돌릴 수 있습니다.';
  end if;

  perform 1
  from public.insights as insight
  join public.insight_import_items as item
    on item.created_insight_id = insight.id
   and item.user_id = insight.user_id
  where item.job_id = v_job.id
    and item.classification = 'new'
  for update of insight;

  select count(*)::integer
  into v_already_deleted_count
  from public.insight_import_items
  where job_id = v_job.id
    and classification = 'new'
    and created_insight_id is null;

  select count(*)::integer
  into v_preserved_count
  from public.insight_import_items as item
  join public.insights as insight
    on insight.id = item.created_insight_id
   and insight.user_id = item.user_id
  where item.job_id = v_job.id
    and item.classification = 'new'
    and insight.updated_at is distinct from item.imported_updated_at;

  delete from public.insights as insight
  using public.insight_import_items as item
  where item.job_id = v_job.id
    and item.classification = 'new'
    and item.created_insight_id = insight.id
    and item.user_id = insight.user_id
    and insight.updated_at = item.imported_updated_at;

  get diagnostics v_deleted_count = row_count;

  update public.insight_import_jobs
  set
    status = 'undone',
    preserved_count = v_preserved_count,
    already_deleted_count = v_already_deleted_count,
    expires_at = null
  where id = v_job.id;

  return jsonb_build_object(
    'jobId', v_job.id,
    'deletedCount', v_deleted_count,
    'preservedCount', v_preserved_count,
    'alreadyDeletedCount', v_already_deleted_count
  );
end;
$$;

create function public.delete_insight_import_record(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = '인증이 필요합니다.';
  end if;

  delete from public.insight_import_jobs
  where id = p_job_id
    and user_id = current_user_id;

  if not found then
    raise exception using errcode = '22023', message = '가져오기 작업을 찾을 수 없습니다.';
  end if;
end;
$$;

create function public.cleanup_expired_insight_imports()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_count integer := 0;
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception using errcode = '42501', message = '실행 권한이 없습니다.';
  end if;

  delete from public.insight_import_jobs
  where expires_at < now()
    and status in ('analyzing', 'ready', 'failed');

  get diagnostics v_deleted_count = row_count;

  return v_deleted_count;
end;
$$;

revoke all on function public.undo_insight_import(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.delete_insight_import_record(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.cleanup_expired_insight_imports()
from public, anon, authenticated, service_role;

grant execute on function public.undo_insight_import(uuid) to authenticated;
grant execute on function public.delete_insight_import_record(uuid) to authenticated;
grant execute on function public.cleanup_expired_insight_imports() to service_role;
