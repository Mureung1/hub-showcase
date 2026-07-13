begin;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'modu-brain-retention-daily'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end;
$$;

drop function if exists public.app_purge_expired_project_data_until_drained(integer, integer);
drop function if exists public.app_purge_expired_project_data(integer);
drop function if exists public.app_create_share_link(
  uuid, uuid, text, timestamptz, text, boolean
);
drop function public.resolve_shared_analysis(text);

-- The legacy resolver always reveals the project title and cannot preserve the
-- per-link consent introduced by the forward migration once those columns are
-- removed. Revoke every still-active link before restoring that resolver.
update public.share_links
set revoked_at = now()
where revoked_at is null and expires_at > now();

create or replace function public.app_consume_public_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_bucket timestamptz;
  v_count integer;
begin
  if p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_RATE_LIMIT_SUBJECT';
  end if;
  if not (
    (p_scope = 'share:hour' and p_limit = 60 and p_window_seconds = 3600)
    or (p_scope = 'share:ip:hour' and p_limit = 600 and p_window_seconds = 3600)
    or (p_scope = 'share:token-ip:hour' and p_limit = 60 and p_window_seconds = 3600)
    or (p_scope = 'public-analysis:hour' and p_limit = 30 and p_window_seconds = 3600)
    or (p_scope = 'public-import:hour' and p_limit = 20 and p_window_seconds = 3600)
  ) then
    raise exception 'INVALID_RATE_LIMIT';
  end if;
  v_bucket := to_timestamp(
    floor(extract(epoch from pg_catalog.clock_timestamp()) / p_window_seconds)
      * p_window_seconds
  );
  insert into public.rate_limit_buckets(
    scope, subject_hash, bucket_start, window_seconds, request_count
  ) values (
    p_scope, p_subject_hash, v_bucket, p_window_seconds, 1
  )
  on conflict (scope, subject_hash, bucket_start) do update
    set request_count = least(public.rate_limit_buckets.request_count + 1, 2147483647),
        updated_at = now()
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$;

create function public.resolve_shared_analysis(p_token_hash text)
returns table(
  project_title text,
  result_jsonb jsonb,
  completed_at timestamptz,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select p.title, public.sanitize_shared_result(r.result_jsonb), r.completed_at, s.expires_at
  from public.share_links s
  join public.analysis_runs r on r.id = s.analysis_run_id
  join public.projects p on p.id = r.project_id
  where s.token_hash = p_token_hash
    and s.revoked_at is null
    and s.expires_at > now()
    and r.status = 'succeeded'
    and p.archived_at is null
  limit 1;
$$;

create or replace function public.app_update_project(
  p_user_id uuid,
  p_project_id uuid,
  p_patch jsonb
)
returns public.projects
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_project public.projects;
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
begin
  if p_user_id is null then raise insufficient_privilege; end if;
  if jsonb_typeof(v_patch) <> 'object'
     or v_patch = '{}'::jsonb
     or exists (
       select 1 from jsonb_object_keys(v_patch) as item(key)
       where item.key not in ('title', 'description')
     ) then
    raise exception 'INVALID_PROJECT_PATCH';
  end if;

  update public.projects p
  set title = case when v_patch ? 'title' then v_patch ->> 'title' else p.title end,
      description = case
        when v_patch ? 'description' then coalesce(v_patch ->> 'description', '')
        else p.description
      end
  where p.id = p_project_id and p.owner_id = p_user_id
  returning p.* into v_project;
  if not found then raise insufficient_privilege; end if;
  return v_project;
end;
$$;

grant execute on function public.app_create_share_link(uuid, uuid, text, timestamptz)
  to service_role;
revoke all on function public.app_consume_public_rate_limit(text, text, integer, integer)
  from PUBLIC, anon, authenticated;
grant execute on function public.app_consume_public_rate_limit(text, text, integer, integer)
  to service_role;
revoke all on function public.resolve_shared_analysis(text)
  from PUBLIC, anon, authenticated;
grant execute on function public.resolve_shared_analysis(text) to service_role;

alter table public.share_links
  drop constraint if exists share_links_disclosure_expiry_check,
  drop column if exists include_project_title,
  drop column if exists disclosure_mode;

alter table public.projects drop column if exists retention_days;

grant execute on function public.set_updated_at() to PUBLIC;

commit;
