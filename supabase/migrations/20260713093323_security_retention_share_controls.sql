begin;

alter table public.projects
  add column retention_days smallint
  check (retention_days is null or retention_days in (30, 90));

-- Preserve the retention choice of every project that predates this contract.
-- Only projects inserted after this migration receive the 90-day default.
alter table public.projects
  alter column retention_days set default 90;

alter table public.share_links
  add column disclosure_mode text not null default 'summary'
    check (disclosure_mode in ('summary', 'evidence')),
  add column include_project_title boolean not null default false,
  add constraint share_links_disclosure_expiry_check check (
    (disclosure_mode = 'summary' and expires_at <= created_at + interval '30 days')
    or
    (disclosure_mode = 'evidence' and expires_at <= created_at + interval '7 days')
  );

create function public.app_preview_project_retention(
  p_user_id uuid,
  p_project_id uuid,
  p_retention_days smallint
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_user_id is null then raise insufficient_privilege; end if;
  if p_retention_days is null or p_retention_days not in (30, 90) then
    raise exception 'INVALID_RETENTION_POLICY';
  end if;
  perform 1
  from public.projects p
  where p.id = p_project_id and p.owner_id = p_user_id;
  if not found then raise insufficient_privilege; end if;

  with expired_sources as materialized (
    select s.id
    from public.source_records s
    where s.project_id = p_project_id
      and s.created_at < statement_timestamp() - make_interval(days => p_retention_days)
  ),
  source_runs as materialized (
    select distinct r.id
    from public.analysis_runs r
    join public.analysis_run_sources ars on ars.analysis_run_id = r.id
    join expired_sources source on source.id = ars.source_record_id
    where r.project_id = p_project_id
  ),
  orphan_runs as materialized (
    select r.id
    from public.analysis_runs r
    where r.project_id = p_project_id
      and r.created_at < statement_timestamp() - make_interval(days => p_retention_days)
      and not exists (
        select 1
        from public.analysis_run_sources ars
        where ars.analysis_run_id = r.id
          and ars.source_record_id is not null
      )
  ),
  expired_runs as materialized (
    select id from source_runs
    union
    select id from orphan_runs
  ),
  affected_shares as materialized (
    select share.id
    from public.share_links share
    join expired_runs run on run.id = share.analysis_run_id
  ),
  fingerprint_material as (
    select pg_catalog.concat_ws(
      '|',
      p_project_id::text,
      p_retention_days::text,
      coalesce((select pg_catalog.string_agg(id::text, ',' order by id) from expired_sources), ''),
      coalesce((select pg_catalog.string_agg(id::text, ',' order by id) from expired_runs), ''),
      coalesce((select pg_catalog.string_agg(id::text, ',' order by id) from affected_shares), '')
    ) as value
  )
  select jsonb_build_object(
    'retention_days', p_retention_days,
    'expired_source_records', (select count(*)::integer from expired_sources),
    'expired_analysis_runs', (select count(*)::integer from expired_runs),
    'expired_orphan_analysis_runs', (select count(*)::integer from orphan_runs),
    'affected_share_links', (select count(*)::integer from affected_shares),
    'fingerprint', encode(
      extensions.digest((select value from fingerprint_material), 'sha256'),
      'hex'
    ),
    'examined_at', statement_timestamp()
  ) into v_result;

  return v_result;
end;
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
  v_retention_days smallint;
  v_current_retention_days smallint;
  v_retention_acknowledged boolean := false;
  v_retention_preview jsonb;
  v_retention_preview_fingerprint text;
begin
  if p_user_id is null then raise insufficient_privilege; end if;
  if jsonb_typeof(v_patch) <> 'object'
     or v_patch = '{}'::jsonb
     or exists (
       select 1 from jsonb_object_keys(v_patch) as item(key)
       where item.key not in (
         'title', 'description', 'retention_days', 'retention_acknowledged',
         'retention_preview_fingerprint'
       )
     )
     or not (v_patch ?| array['title', 'description', 'retention_days'])
     or (
       v_patch ? 'retention_acknowledged'
       and jsonb_typeof(v_patch -> 'retention_acknowledged') <> 'boolean'
     )
     or (
       v_patch ? 'retention_preview_fingerprint'
       and (
         jsonb_typeof(v_patch -> 'retention_preview_fingerprint') <> 'string'
         or (v_patch ->> 'retention_preview_fingerprint') !~ '^[0-9a-f]{64}$'
       )
     )
     or (
       v_patch ?| array['retention_acknowledged', 'retention_preview_fingerprint']
       and not (v_patch ? 'retention_days')
     ) then
    raise exception 'INVALID_PROJECT_PATCH';
  end if;

  if v_patch ? 'retention_acknowledged' then
    v_retention_acknowledged := (v_patch ->> 'retention_acknowledged')::boolean;
  end if;
  if v_patch ? 'retention_preview_fingerprint' then
    v_retention_preview_fingerprint := v_patch ->> 'retention_preview_fingerprint';
  end if;

  if v_patch ? 'retention_days' then
    if jsonb_typeof(v_patch -> 'retention_days') = 'null' then
      v_retention_days := null;
    elsif v_patch -> 'retention_days' = '30'::jsonb then
      v_retention_days := 30;
    elsif v_patch -> 'retention_days' = '90'::jsonb then
      v_retention_days := 90;
    else
      raise exception 'INVALID_RETENTION_POLICY';
    end if;
  end if;

  select p.retention_days
    into v_current_retention_days
  from public.projects p
  where p.id = p_project_id and p.owner_id = p_user_id
  for update;
  if not found then raise insufficient_privilege; end if;

  if v_patch ? 'retention_days'
     and v_retention_days is not null
     and (
       v_current_retention_days is null
       or (v_current_retention_days = 90 and v_retention_days = 30)
     )
     then
    if not v_retention_acknowledged then
      raise exception 'RETENTION_REDUCTION_CONFIRMATION_REQUIRED';
    end if;
    v_retention_preview := public.app_preview_project_retention(
      p_user_id,
      p_project_id,
      v_retention_days
    );
    if v_retention_preview_fingerprint is null
       or v_retention_preview_fingerprint <> v_retention_preview ->> 'fingerprint' then
      raise exception 'RETENTION_PREVIEW_STALE';
    end if;
  end if;

  update public.projects p
  set title = case when v_patch ? 'title' then v_patch ->> 'title' else p.title end,
      description = case
        when v_patch ? 'description' then coalesce(v_patch ->> 'description', '')
        else p.description
      end,
      retention_days = case
        when v_patch ? 'retention_days' then v_retention_days
        else p.retention_days
      end
  where p.id = p_project_id and p.owner_id = p_user_id
  returning p.* into v_project;
  return v_project;
end;
$$;

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
    or (p_scope = 'share:ip:hour' and p_limit = 60 and p_window_seconds = 3600)
    or (p_scope = 'share:token-ip:hour' and p_limit = 60 and p_window_seconds = 3600)
    or (p_scope = 'auth:magic:ip:hour' and p_limit = 10 and p_window_seconds = 3600)
    or (p_scope = 'auth:magic:email:hour' and p_limit = 3 and p_window_seconds = 3600)
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
    set request_count = least(
          public.rate_limit_buckets.request_count + 1,
          2147483647
        ),
        updated_at = now()
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$;

-- Keep the service-role-only compatibility overload during the rolling
-- Node/database transition. Browser roles remain revoked by the prior
-- operations migration; a later contract migration can remove this overload
-- after every runtime uses the disclosure-aware signature below.

create function public.app_create_share_link(
  p_user_id uuid,
  p_run_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_disclosure_mode text,
  p_include_project_title boolean
)
returns public.share_links
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_share public.share_links;
  v_mode text := coalesce(p_disclosure_mode, 'summary');
begin
  if p_user_id is null or not exists (
    select 1
    from public.analysis_runs r
    join public.projects p on p.id = r.project_id
    where r.id = p_run_id
      and r.created_by = p_user_id
      and r.status = 'succeeded'
      and p.owner_id = p_user_id
      and p.archived_at is null
  ) then
    raise insufficient_privilege;
  end if;
  if v_mode not in ('summary', 'evidence') then
    raise exception 'INVALID_SHARE_DISCLOSURE';
  end if;
  if p_expires_at <= now()
     or (v_mode = 'summary' and p_expires_at > now() + interval '30 days')
     or (v_mode = 'evidence' and p_expires_at > now() + interval '7 days') then
    raise exception 'INVALID_SHARE_EXPIRATION';
  end if;

  insert into public.share_links(
    analysis_run_id,
    created_by,
    token_hash,
    expires_at,
    disclosure_mode,
    include_project_title
  ) values (
    p_run_id,
    p_user_id,
    p_token_hash,
    p_expires_at,
    v_mode,
    coalesce(p_include_project_title, false)
  )
  returning * into v_share;
  return v_share;
end;
$$;

drop function public.resolve_shared_analysis(text);

create function public.resolve_shared_analysis(p_token_hash text)
returns table(
  project_title text,
  result_jsonb jsonb,
  completed_at timestamptz,
  expires_at timestamptz,
  disclosure_mode text,
  include_project_title boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    case when s.include_project_title then p.title else null end,
    public.sanitize_shared_result(r.result_jsonb),
    r.completed_at,
    s.expires_at,
    s.disclosure_mode,
    s.include_project_title
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

create function public.app_preview_expired_project_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with expired_sources as materialized (
    select s.id, s.project_id
    from public.source_records s
    join public.projects p on p.id = s.project_id
    where p.retention_days is not null
      and s.created_at < statement_timestamp() - make_interval(days => p.retention_days)
  ),
  source_runs as materialized (
    select distinct r.id, r.project_id
    from public.analysis_runs r
    join public.analysis_run_sources ars on ars.analysis_run_id = r.id
    join expired_sources source on source.id = ars.source_record_id
  ),
  orphan_runs as materialized (
    select r.id, r.project_id
    from public.analysis_runs r
    join public.projects p on p.id = r.project_id
    where p.retention_days is not null
      and r.created_at < statement_timestamp() - make_interval(days => p.retention_days)
      and not exists (
        select 1
        from public.analysis_run_sources ars
        where ars.analysis_run_id = r.id
          and ars.source_record_id is not null
      )
  ),
  expired_runs as materialized (
    select id, project_id from source_runs
    union
    select id, project_id from orphan_runs
  ),
  affected_projects as (
    select project_id from expired_sources
    union
    select project_id from expired_runs
  )
  select jsonb_build_object(
    'expired_source_records', (select count(*)::integer from expired_sources),
    'expired_analysis_runs', (select count(*)::integer from expired_runs),
    'expired_orphan_analysis_runs', (select count(*)::integer from orphan_runs),
    'affected_share_links', (
      select count(*)::integer
      from public.share_links share
      join expired_runs run on run.id = share.analysis_run_id
    ),
    'affected_projects', (select count(*)::integer from affected_projects),
    'examined_at', statement_timestamp()
  );
$$;

create function public.app_purge_expired_project_data(p_batch_size integer default 500)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_expired_source_ids uuid[] := array[]::uuid[];
  v_source_run_ids uuid[] := array[]::uuid[];
  v_orphan_run_ids uuid[] := array[]::uuid[];
  v_expired_run_ids uuid[] := array[]::uuid[];
  v_remaining_run_slots integer := 0;
  v_deleted_sources integer := 0;
  v_deleted_runs integer := 0;
  v_deleted_orphan_runs integer := 0;
begin
  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 5000 then
    raise exception 'INVALID_RETENTION_BATCH_SIZE';
  end if;

  -- The batch size independently caps locked source rows and deleted run rows.
  -- A source is deleted only after every referencing run has been removed, so
  -- a high-fanout source is drained over multiple bounded calls without losing
  -- the snapshot provenance needed by the next call.
  select coalesce(
    pg_catalog.array_agg(candidate.id order by candidate.created_at, candidate.id),
    array[]::uuid[]
  ) into v_expired_source_ids
  from (
    select s.id, s.created_at
    from public.source_records s
    join public.projects p on p.id = s.project_id
    where p.retention_days is not null
      and s.created_at < now() - make_interval(days => p.retention_days)
    order by s.created_at, s.id
    limit p_batch_size
    -- Lock the owning project with the source. Retention changes use the same
    -- project-row lock, so a concurrent change to 90 days or unlimited cannot
    -- race a purge that already evaluated the shorter policy.
    for update of s, p skip locked
  ) candidate;

  select coalesce(
    pg_catalog.array_agg(candidate.id order by candidate.created_at, candidate.id),
    array[]::uuid[]
  ) into v_source_run_ids
  from (
    select r.id, r.created_at
    from public.analysis_runs r
    where exists (
      select 1
      from public.analysis_run_sources ars
      where ars.analysis_run_id = r.id
        and ars.source_record_id = any(v_expired_source_ids)
    )
    order by r.created_at, r.id
    limit p_batch_size
    for update of r skip locked
  ) candidate;

  v_remaining_run_slots := greatest(
    p_batch_size - cardinality(v_source_run_ids),
    0
  );

  if v_remaining_run_slots > 0 then
    select coalesce(
      pg_catalog.array_agg(candidate.id order by candidate.created_at, candidate.id),
      array[]::uuid[]
    ) into v_orphan_run_ids
    from (
      select r.id, r.created_at
      from public.analysis_runs r
      join public.projects p on p.id = r.project_id
      where p.retention_days is not null
        and not (r.id = any(v_source_run_ids))
        and r.created_at < now() - make_interval(days => p.retention_days)
        and not exists (
          select 1
          from public.analysis_run_sources ars
          where ars.analysis_run_id = r.id
            and ars.source_record_id is not null
        )
      order by r.created_at, r.id
      limit v_remaining_run_slots
      for update of r, p skip locked
    ) candidate;
  end if;

  v_expired_run_ids := v_source_run_ids || v_orphan_run_ids;

  with deleted as (
    delete from public.analysis_runs r
    where r.id = any(v_expired_run_ids)
    returning r.id
  )
  select
    count(*)::integer,
    (count(*) filter (where deleted.id = any(v_orphan_run_ids)))::integer
  into v_deleted_runs, v_deleted_orphan_runs
  from deleted;

  with deleted as (
    delete from public.source_records s
    where s.id = any(v_expired_source_ids)
      and not exists (
        select 1
        from public.analysis_run_sources ars
        where ars.source_record_id = s.id
      )
    returning s.id
  )
  select count(*)::integer into v_deleted_sources from deleted;

  v_result := jsonb_build_object(
    'deleted_source_records', v_deleted_sources,
    'deleted_analysis_runs', v_deleted_runs,
    'deleted_orphan_analysis_runs', v_deleted_orphan_runs,
    'completed_at', clock_timestamp()
  );

  return v_result;
end;
$$;

create function public.app_purge_expired_project_data_until_drained(
  p_batch_size integer default 500,
  p_max_batches integer default 20
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch jsonb;
  v_batches_executed integer := 0;
  v_deleted_sources integer := 0;
  v_deleted_runs integer := 0;
  v_deleted_orphan_runs integer := 0;
  v_has_remaining boolean := false;
begin
  if p_max_batches is null or p_max_batches < 1 or p_max_batches > 100 then
    raise exception 'INVALID_RETENTION_MAX_BATCHES';
  end if;

  for v_batch_number in 1..p_max_batches loop
    v_batch := public.app_purge_expired_project_data(p_batch_size);
    v_batches_executed := v_batches_executed + 1;
    v_deleted_sources := v_deleted_sources
      + coalesce((v_batch ->> 'deleted_source_records')::integer, 0);
    v_deleted_runs := v_deleted_runs
      + coalesce((v_batch ->> 'deleted_analysis_runs')::integer, 0);
    v_deleted_orphan_runs := v_deleted_orphan_runs
      + coalesce((v_batch ->> 'deleted_orphan_analysis_runs')::integer, 0);

    exit when coalesce((v_batch ->> 'deleted_source_records')::integer, 0) = 0
      and coalesce((v_batch ->> 'deleted_analysis_runs')::integer, 0) = 0;
  end loop;
  select exists (
    select 1
    from public.source_records s
    join public.projects p on p.id = s.project_id
    where p.retention_days is not null
      and s.created_at < now() - make_interval(days => p.retention_days)
    union all
    select 1
    from public.analysis_runs r
    join public.projects p on p.id = r.project_id
    where p.retention_days is not null
      and r.created_at < now() - make_interval(days => p.retention_days)
      and not exists (
        select 1
        from public.analysis_run_sources ars
        where ars.analysis_run_id = r.id
          and ars.source_record_id is not null
      )
  ) into v_has_remaining;

  return jsonb_build_object(
    'deleted_source_records', v_deleted_sources,
    'deleted_analysis_runs', v_deleted_runs,
    'deleted_orphan_analysis_runs', v_deleted_orphan_runs,
    'batches_executed', v_batches_executed,
    'drain_complete', not v_has_remaining,
    'completed_at', clock_timestamp()
  );
end;
$$;
create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'modu-brain-retention-daily'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
  perform cron.schedule(
    'modu-brain-retention-daily',
    '17 3 * * *',
    'select public.app_purge_expired_project_data_until_drained(500, 20)'
  );
end;
$$;

revoke all on function public.app_update_project(uuid, uuid, jsonb)
  from PUBLIC, anon, authenticated;
grant execute on function public.app_update_project(uuid, uuid, jsonb) to service_role;
revoke all on function public.app_preview_project_retention(uuid, uuid, smallint)
  from PUBLIC, anon, authenticated;
grant execute on function public.app_preview_project_retention(uuid, uuid, smallint)
  to service_role;
revoke all on function public.app_consume_public_rate_limit(text, text, integer, integer)
  from PUBLIC, anon, authenticated;
grant execute on function public.app_consume_public_rate_limit(text, text, integer, integer)
  to service_role;
revoke all on function public.app_create_share_link(
  uuid, uuid, text, timestamptz, text, boolean
) from PUBLIC, anon, authenticated;
grant execute on function public.app_create_share_link(
  uuid, uuid, text, timestamptz, text, boolean
) to service_role;
revoke all on function public.resolve_shared_analysis(text)
  from PUBLIC, anon, authenticated;
grant execute on function public.resolve_shared_analysis(text) to service_role;
revoke all on function public.app_purge_expired_project_data(integer)
  from PUBLIC, anon, authenticated;
grant execute on function public.app_purge_expired_project_data(integer) to service_role;
revoke all on function public.app_preview_expired_project_data()
  from PUBLIC, anon, authenticated;
grant execute on function public.app_preview_expired_project_data() to service_role;
revoke all on function public.app_purge_expired_project_data_until_drained(integer, integer)
  from PUBLIC, anon, authenticated;
grant execute on function public.app_purge_expired_project_data_until_drained(integer, integer)
  to service_role;
revoke execute on function public.set_updated_at() from PUBLIC, anon, authenticated;

commit;
