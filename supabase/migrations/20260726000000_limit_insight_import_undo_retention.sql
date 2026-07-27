create extension if not exists pg_cron with schema pg_catalog;

alter table public.insight_import_jobs
add column undo_expires_at timestamptz;

create table public.insight_import_undo_items (
  job_id uuid not null,
  user_id uuid not null,
  created_insight_id uuid,
  imported_updated_at timestamptz not null,
  constraint insight_import_undo_items_job_user_id_fkey
    foreign key (job_id, user_id)
    references public.insight_import_jobs (id, user_id)
    on delete cascade,
  constraint insight_import_undo_items_created_insight_user_id_fkey
    foreign key (created_insight_id, user_id)
    references public.insights (id, user_id)
    on delete set null (created_insight_id)
);

create index insight_import_undo_items_job_id_idx
on public.insight_import_undo_items (job_id);

alter table public.insight_import_undo_items enable row level security;

revoke all on table public.insight_import_undo_items
from public, anon, authenticated, service_role;

insert into public.insight_import_undo_items (
  job_id,
  user_id,
  created_insight_id,
  imported_updated_at
)
select
  item.job_id,
  item.user_id,
  item.created_insight_id,
  item.imported_updated_at
from public.insight_import_items as item
join public.insight_import_jobs as job on job.id = item.job_id
where job.status = 'completed'
  and job.completed_at > now() - interval '24 hours'
  and item.imported_updated_at is not null;

update public.insight_import_jobs
set undo_expires_at = completed_at + interval '24 hours'
where status = 'completed'
  and completed_at > now() - interval '24 hours';

delete from public.insight_import_items as item
using public.insight_import_jobs as job
where item.job_id = job.id
  and job.status in ('completed', 'undone');

alter table public.insight_import_jobs
drop constraint insight_import_jobs_expires_at_status_check;

alter table public.insight_import_jobs
add constraint insight_import_jobs_expiration_status_check check (
  (
    status in ('completed', 'undone')
    and expires_at is null
  )
  or (
    status not in ('completed', 'undone')
    and expires_at is not null
  )
)
not valid;

alter table public.insight_import_jobs
validate constraint insight_import_jobs_expiration_status_check;

alter table public.insight_import_jobs
add constraint insight_import_jobs_undo_expiration_status_check check (
  status = 'completed' or undo_expires_at is null
)
not valid;

alter table public.insight_import_jobs
validate constraint insight_import_jobs_undo_expiration_status_check;

create function public.set_insight_import_undo_expiration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
    new.undo_expires_at := new.completed_at + interval '24 hours';
  elsif new.status <> 'completed' then
    new.undo_expires_at := null;
  end if;

  return new;
end;
$$;

create trigger set_insight_import_undo_expiration
before update on public.insight_import_jobs
for each row
execute function public.set_insight_import_undo_expiration();

create function public.finalize_insight_import_undo_ledger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.insight_import_undo_items (
      job_id,
      user_id,
      created_insight_id,
      imported_updated_at
    )
    select
      item.job_id,
      item.user_id,
      item.created_insight_id,
      item.imported_updated_at
    from public.insight_import_items as item
    where item.job_id = new.id
      and item.imported_updated_at is not null;

    delete from public.insight_import_items
    where job_id = new.id;
  end if;

  return null;
end;
$$;

create trigger finalize_insight_import_undo_ledger
after update on public.insight_import_jobs
for each row
execute function public.finalize_insight_import_undo_ledger();

create or replace function public.undo_insight_import(p_job_id uuid)
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

  if v_job.undo_expires_at is null or v_job.undo_expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'undo-expired');
  end if;

  perform 1
  from public.insights as insight
  join public.insight_import_undo_items as undo_item
    on undo_item.created_insight_id = insight.id
   and undo_item.user_id = insight.user_id
  where undo_item.job_id = v_job.id
  for update of insight;

  select count(*)::integer
  into v_already_deleted_count
  from public.insight_import_undo_items
  where job_id = v_job.id
    and created_insight_id is null;

  select count(*)::integer
  into v_preserved_count
  from public.insight_import_undo_items as undo_item
  join public.insights as insight
    on insight.id = undo_item.created_insight_id
   and insight.user_id = undo_item.user_id
  where undo_item.job_id = v_job.id
    and insight.updated_at is distinct from undo_item.imported_updated_at;

  delete from public.insights as insight
  using public.insight_import_undo_items as undo_item
  where undo_item.job_id = v_job.id
    and undo_item.created_insight_id = insight.id
    and undo_item.user_id = insight.user_id
    and insight.updated_at = undo_item.imported_updated_at;

  get diagnostics v_deleted_count = row_count;

  delete from public.insight_import_undo_items
  where job_id = v_job.id;

  update public.insight_import_jobs
  set
    status = 'undone',
    preserved_count = v_preserved_count,
    already_deleted_count = v_already_deleted_count,
    expires_at = null,
    undo_expires_at = null
  where id = v_job.id;

  return jsonb_build_object(
    'jobId', v_job.id,
    'deletedCount', v_deleted_count,
    'preservedCount', v_preserved_count,
    'alreadyDeletedCount', v_already_deleted_count
  );
end;
$$;

create function public.cleanup_expired_insight_import_undo_items()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_count integer := 0;
begin
  delete from public.insight_import_undo_items as undo_item
  using public.insight_import_jobs as job
  where undo_item.job_id = job.id
    and (
      job.undo_expires_at is null
      or job.undo_expires_at <= now()
    );

  get diagnostics v_deleted_count = row_count;

  update public.insight_import_jobs
  set undo_expires_at = null
  where status = 'completed'
    and undo_expires_at <= now();

  return v_deleted_count;
end;
$$;

revoke all on function public.set_insight_import_undo_expiration()
from public, anon, authenticated, service_role;
revoke all on function public.finalize_insight_import_undo_ledger()
from public, anon, authenticated, service_role;
revoke all on function public.cleanup_expired_insight_import_undo_items()
from public, anon, authenticated, service_role;
revoke all on function public.undo_insight_import(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.undo_insight_import(uuid) to authenticated;

select cron.schedule(
  'cleanup-expired-insight-import-undo-items',
  '* * * * *',
  'select public.cleanup_expired_insight_import_undo_items()'
);
