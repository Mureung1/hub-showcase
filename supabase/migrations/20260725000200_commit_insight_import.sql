alter table public.insight_import_jobs
alter column expires_at drop not null;

update public.insight_import_jobs
set expires_at = null
where status in ('completed', 'undone');

alter table public.insight_import_jobs
add constraint insight_import_jobs_expires_at_status_check check (
  (status in ('completed', 'undone') and expires_at is null)
  or (status not in ('completed', 'undone') and expires_at is not null)
);

create function public.commit_insight_import(
  p_job_id uuid,
  p_collection_mappings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  v_job public.insight_import_jobs%rowtype;
  v_mapping jsonb;
  v_target jsonb;
  v_path_json jsonb;
  v_path text[];
  v_collection_key text;
  v_seen_keys jsonb := '[]'::jsonb;
  v_unknown_key boolean;
  v_category_id uuid;
  v_name text;
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

  if v_job.status = 'completed' then
    return jsonb_build_object(
      'jobId', v_job.id,
      'createdCount', v_job.created_count,
      'duplicateCount', v_job.duplicate_count,
      'excludedCount', v_job.excluded_count
    );
  end if;

  if v_job.status <> 'ready' then
    raise exception using errcode = '22023', message = '가져오기 작업 상태가 반영할 수 없습니다.';
  end if;

  update public.insight_import_jobs
  set status = 'committing'
  where id = v_job.id;

  begin
    if jsonb_typeof(p_collection_mappings) is distinct from 'array' then
      raise exception using errcode = '22023', message = '모음 매핑 형식이 올바르지 않습니다.';
    end if;

    for v_mapping in select value from jsonb_array_elements(p_collection_mappings) as element(value)
    loop
      if jsonb_typeof(v_mapping) <> 'object' then
        raise exception using errcode = '22023', message = '모음 매핑 형식이 올바르지 않습니다.';
      end if;

      select bool_or(key not in ('collectionKey', 'target'))
      into v_unknown_key
      from jsonb_object_keys(v_mapping) as key;

      if coalesce(v_unknown_key, false)
        or not (v_mapping ?& array['collectionKey', 'target'])
        or jsonb_typeof(v_mapping -> 'collectionKey') <> 'string'
        or jsonb_typeof(v_mapping -> 'target') <> 'object' then
        raise exception using errcode = '22023', message = '모음 매핑 형식이 올바르지 않습니다.';
      end if;

      v_collection_key := v_mapping ->> 'collectionKey';
      begin
        v_path_json := v_collection_key::jsonb;
        if jsonb_typeof(v_path_json) <> 'array' then
          raise exception using errcode = '22023', message = '모음 키 형식이 올바르지 않습니다.';
        end if;
        select coalesce(array_agg(value #>> '{}'), '{}'::text[])
        into v_path
        from jsonb_array_elements(v_path_json) as element(value);
        if exists (
          select 1
          from jsonb_array_elements(v_path_json) as element(value)
          where jsonb_typeof(value) <> 'string'
        ) then
          raise exception using errcode = '22023', message = '모음 키 형식이 올바르지 않습니다.';
        end if;
      exception when invalid_text_representation then
        raise exception using errcode = '22023', message = '모음 키 형식이 올바르지 않습니다.';
      end;

      if v_seen_keys @> jsonb_build_array(v_path_json) then
        raise exception using errcode = '22023', message = '모음 키가 중복되었습니다.';
      end if;
      v_seen_keys := v_seen_keys || jsonb_build_array(v_path_json);

      if not exists (
        select 1
        from public.insight_import_items
        where job_id = v_job.id
          and collection_path = v_path
      ) then
        raise exception using errcode = '22023', message = '가져오기 작업에 없는 모음 키입니다.';
      end if;

      v_target := v_mapping -> 'target';
      if v_target ->> 'kind' = 'uncategorized' then
        if (select count(*) from jsonb_object_keys(v_target)) <> 1 then
          raise exception using errcode = '22023', message = '분류 대상 형식이 올바르지 않습니다.';
        end if;
      elsif v_target ->> 'kind' = 'existing' then
        if (select array_agg(key order by key) from jsonb_object_keys(v_target) as key)
             <> array['categoryId', 'kind']::text[]
          or jsonb_typeof(v_target -> 'categoryId') <> 'string'
          or v_target ->> 'categoryId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
          raise exception using errcode = '22023', message = '분류 대상 형식이 올바르지 않습니다.';
        end if;
        v_category_id := (v_target ->> 'categoryId')::uuid;
        if not exists (
          select 1 from public.categories
          where id = v_category_id and user_id = current_user_id
        ) then
          raise exception using errcode = '22023', message = '분류 대상 소유자가 올바르지 않습니다.';
        end if;
      elsif v_target ->> 'kind' = 'new' then
        if (select array_agg(key order by key) from jsonb_object_keys(v_target) as key)
             <> array['colorKey', 'kind', 'name']::text[]
          or jsonb_typeof(v_target -> 'name') <> 'string'
          or jsonb_typeof(v_target -> 'colorKey') <> 'string'
          or v_target ->> 'colorKey' not in (
            'slate-1', 'slate-2', 'slate-3', 'blue-1', 'blue-2', 'blue-3',
            'indigo-1', 'indigo-2', 'indigo-3', 'violet-1', 'violet-2', 'violet-3',
            'green-1', 'green-2', 'green-3', 'teal-1', 'teal-2', 'teal-3',
            'amber-1', 'amber-2', 'amber-3', 'coral-1', 'coral-2', 'coral-3'
          ) then
          raise exception using errcode = '22023', message = '새 분류 대상 형식이 올바르지 않습니다.';
        end if;
        v_name := regexp_replace(btrim(v_target ->> 'name'), '[[:space:]]+', ' ', 'g');
        if char_length(v_name) not between 1 and 50 then
          raise exception using errcode = '22023', message = '새 분류 이름이 올바르지 않습니다.';
        end if;
      else
        raise exception using errcode = '22023', message = '분류 대상 형식이 올바르지 않습니다.';
      end if;
    end loop;

    with mapping_values as (
      select
        mapping.value -> 'target' as target,
        array(
          select value #>> '{}'
          from jsonb_array_elements((mapping.value ->> 'collectionKey')::jsonb) as path(value)
        ) as collection_path
      from jsonb_array_elements(p_collection_mappings) as mapping(value)
      where mapping.value -> 'target' ->> 'kind' = 'new'
    ),
    requested_categories as (
      select
        lower(regexp_replace(btrim(target ->> 'name'), '[[:space:]]+', ' ', 'g')) as normalized_name,
        regexp_replace(btrim(target ->> 'name'), '[[:space:]]+', ' ', 'g') as name,
        target ->> 'colorKey' as color_key,
        min(item.ordinal) as first_ordinal
      from mapping_values
      join public.insight_import_items as item
        on item.job_id = v_job.id
       and item.collection_path = mapping_values.collection_path
      group by 1, 2, 3
    ),
    missing_categories as (
      select requested_categories.*,
        row_number() over (order by first_ordinal, normalized_name) - 1 as sort_offset
      from requested_categories
      where not exists (
        select 1 from public.categories as category
        where category.user_id = current_user_id
          and category.normalized_name = requested_categories.normalized_name
      )
    )
    insert into public.categories (user_id, name, color_key, sort_order)
    select
      current_user_id,
      name,
      color_key,
      (select coalesce(max(sort_order), -1) from public.categories where user_id = current_user_id) + sort_offset + 1
    from missing_categories
    on conflict (user_id, normalized_name) do nothing;

    with mapping_values as (
      select
        mapping.value -> 'target' as target,
        array(
          select value #>> '{}'
          from jsonb_array_elements((mapping.value ->> 'collectionKey')::jsonb) as path(value)
        ) as collection_path
      from jsonb_array_elements(p_collection_mappings) as mapping(value)
    ),
    resolved_mappings as (
      select
        collection_path,
        case
          when target ->> 'kind' = 'uncategorized' then null::uuid
          when target ->> 'kind' = 'existing' then (target ->> 'categoryId')::uuid
          else (
            select category.id
            from public.categories as category
            where category.user_id = current_user_id
              and category.normalized_name = lower(regexp_replace(btrim(target ->> 'name'), '[[:space:]]+', ' ', 'g'))
          )
        end as category_id
      from mapping_values
    )
    update public.insight_import_items as item
    set selected_category_id = mapping.category_id
    from resolved_mappings as mapping
    where item.job_id = v_job.id
      and item.collection_path = mapping.collection_path;

    update public.insight_import_items as item
    set classification = 'existing_duplicate'
    where item.job_id = v_job.id
      and item.classification = 'new'
      and exists (
        select 1 from public.insights as insight
        where insight.user_id = current_user_id
          and insight.normalized_url = item.normalized_url
      );

    with candidate_insights as (
      select
        gen_random_uuid() as id,
        item.original_url,
        item.normalized_url,
        item.domain,
        coalesce(nullif(btrim(item.title_candidate), ''), item.domain) as title,
        case
          when nullif(btrim(item.title_candidate), '') is null then 'fallback'
          else 'capture'
        end as title_origin,
        nullif(btrim(item.explicit_memo_candidate), '') as memo,
        item.selected_category_id as category_id
      from public.insight_import_items as item
      where item.job_id = v_job.id
        and item.classification = 'new'
    ),
    inserted_insights as (
      insert into public.insights (
        id,
        user_id,
        original_url,
        normalized_url,
        domain,
        title,
        title_origin,
        memo,
        category_id
      )
      select
        candidate.id,
        current_user_id,
        candidate.original_url,
        candidate.normalized_url,
        candidate.domain,
        candidate.title,
        candidate.title_origin,
        candidate.memo,
        candidate.category_id
      from candidate_insights as candidate
      on conflict (user_id, normalized_url) do nothing
      returning id, normalized_url, updated_at
    )
    update public.insight_import_items as item
    set
      created_insight_id = insight.id,
      imported_updated_at = insight.updated_at
    from inserted_insights as insight
    where item.job_id = v_job.id
      and item.classification = 'new'
      and item.normalized_url = insight.normalized_url;

    update public.insight_import_items as item
    set
      classification = 'existing_duplicate',
      created_insight_id = null,
      imported_updated_at = null
    where item.job_id = v_job.id
      and item.classification = 'new'
      and not exists (
        select 1 from public.insights as insight
        where insight.id = item.created_insight_id
          and insight.user_id = current_user_id
      );

    update public.insight_import_jobs as job
    set
      status = 'completed',
      total_count = (select count(*) from public.insight_import_items where job_id = v_job.id),
      new_count = (select count(*) from public.insight_import_items where job_id = v_job.id and classification = 'new'),
      duplicate_count = (select count(*) from public.insight_import_items where job_id = v_job.id and classification = 'existing_duplicate'),
      input_duplicate_count = (select count(*) from public.insight_import_items where job_id = v_job.id and classification = 'input_duplicate'),
      excluded_count = (select count(*) from public.insight_import_items where job_id = v_job.id and classification = 'excluded'),
      created_count = (select count(*) from public.insight_import_items where job_id = v_job.id and created_insight_id is not null),
      completed_at = now(),
      expires_at = null,
      failure_code = null
    where job.id = v_job.id
    returning * into v_job;

    return jsonb_build_object(
      'jobId', v_job.id,
      'createdCount', v_job.created_count,
      'duplicateCount', v_job.duplicate_count,
      'excludedCount', v_job.excluded_count
    );
  exception when others then
    update public.insight_import_jobs
    set
      status = 'failed',
      failure_code = 'commit-failed',
      expires_at = now() + interval '24 hours'
    where id = v_job.id;
    return jsonb_build_object('ok', false, 'reason', 'commit-failed');
  end;
end;
$$;

create function public.retry_insight_import(
  p_job_id uuid,
  p_collection_mappings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  v_job public.insight_import_jobs%rowtype;
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

  if not found or v_job.status <> 'failed' then
    raise exception using errcode = '22023', message = '재시도할 수 없는 가져오기 작업입니다.';
  end if;

  update public.insight_import_jobs
  set
    status = 'ready',
    failure_code = null,
    expires_at = now() + interval '24 hours'
  where id = v_job.id;

  return public.commit_insight_import(p_job_id, p_collection_mappings);
end;
$$;

revoke all on function public.commit_insight_import(uuid, jsonb) from public;
revoke all on function public.commit_insight_import(uuid, jsonb) from anon;
grant execute on function public.commit_insight_import(uuid, jsonb) to authenticated;

revoke all on function public.retry_insight_import(uuid, jsonb) from public;
revoke all on function public.retry_insight_import(uuid, jsonb) from anon;
grant execute on function public.retry_insight_import(uuid, jsonb) to authenticated;
