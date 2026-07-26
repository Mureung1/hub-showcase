create function public.prepare_insight_import(
  p_input_kind text,
  p_adapter_key text,
  p_idempotency_key text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  v_job public.insight_import_jobs%rowtype;
  v_item jsonb;
  v_warning text;
  v_path_value jsonb;
  v_category_id uuid;
  v_unknown_key boolean;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = '인증이 필요합니다.';
  end if;

  if p_input_kind is null
    or p_input_kind not in ('pasted-text', 'file', 'connected-account')
    or p_adapter_key is null
    or p_adapter_key not in (
      'pasted-text', 'bookmark-html', 'generic-csv', 'generic-json',
      'generic-html', 'generic-markdown', 'generic-text', 'zip', 'notion'
    )
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) > 10000 then
    raise exception using errcode = '22023', message = '가져오기 준비 입력이 올바르지 않습니다.';
  end if;

  select *
  into v_job
  from public.insight_import_jobs
  where user_id = current_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_job.status <> 'ready' then
      raise exception using
        errcode = '22023',
        message = '현재 상태에서는 같은 가져오기를 다시 준비할 수 없습니다.';
    end if;

    return (
      with item_json as (
        select jsonb_build_object(
          'candidateId', item.candidate_id,
          'capturedAtCandidate', item.captured_at_candidate,
          'collectionPath', to_jsonb(item.collection_path),
          'explicitMemoCandidate', item.explicit_memo_candidate,
          'originalUrl', item.original_url,
          'sourceLocation', item.source_location,
          'titleCandidate', item.title_candidate,
          'warnings', item.warnings,
          'classification', item.classification,
          'domain', item.domain,
          'exclusionCode', item.exclusion_code,
          'normalizedUrl', item.normalized_url
        ) as value,
        item.ordinal
        from public.insight_import_items as item
        where item.job_id = v_job.id
      ),
      collection_json as (
        select collection_path, min(ordinal) as first_ordinal
        from public.insight_import_items
        where job_id = v_job.id
          and cardinality(collection_path) > 0
        group by collection_path
      )
      select jsonb_build_object(
        'id', v_job.id,
        'adapterKey', v_job.adapter_key,
        'status', v_job.status,
        'expiresAt', v_job.expires_at,
        'collections', coalesce((
          select jsonb_agg(to_jsonb(collection_path) order by first_ordinal)
          from collection_json
        ), '[]'::jsonb),
        'items', coalesce((
          select jsonb_agg(value order by ordinal)
          from item_json
        ), '[]'::jsonb),
        'summary', jsonb_build_object(
          'createdCount', v_job.created_count,
          'duplicateCount', v_job.duplicate_count,
          'excludedCount', v_job.excluded_count,
          'inputDuplicateCount', v_job.input_duplicate_count,
          'newCount', v_job.new_count,
          'totalCount', v_job.total_count
        )
      )
    );
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as element(value)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception using errcode = '22023', message = '가져오기 항목 형식이 올바르지 않습니다.';
    end if;

    select bool_or(key not in (
      'candidateId', 'capturedAtCandidate', 'collectionPath', 'explicitMemoCandidate',
      'originalUrl', 'sourceLocation', 'titleCandidate', 'warnings', 'domain',
      'exclusionCode', 'normalizedUrl', 'selectedCategoryId'
    ))
    into v_unknown_key
    from jsonb_object_keys(v_item) as key;

    if coalesce(v_unknown_key, false) or v_item ? 'userId'
      or not (v_item ?& array[
        'candidateId', 'capturedAtCandidate', 'collectionPath', 'explicitMemoCandidate',
        'originalUrl', 'sourceLocation', 'titleCandidate', 'warnings', 'domain',
        'exclusionCode', 'normalizedUrl'
      ])
      or jsonb_typeof(v_item -> 'candidateId') <> 'string'
      or btrim(v_item ->> 'candidateId') = ''
      or jsonb_typeof(v_item -> 'collectionPath') <> 'array'
      or jsonb_array_length(v_item -> 'collectionPath') > 20
      or jsonb_typeof(v_item -> 'originalUrl') <> 'string'
      or btrim(v_item ->> 'originalUrl') = ''
      or char_length(v_item ->> 'originalUrl') > 4096
      or jsonb_typeof(v_item -> 'sourceLocation') <> 'string'
      or btrim(v_item ->> 'sourceLocation') = ''
      or char_length(v_item ->> 'sourceLocation') > 500
      or jsonb_typeof(v_item -> 'warnings') <> 'array'
      or (
        jsonb_typeof(v_item -> 'capturedAtCandidate') not in ('string', 'null')
        or jsonb_typeof(v_item -> 'explicitMemoCandidate') not in ('string', 'null')
        or jsonb_typeof(v_item -> 'titleCandidate') not in ('string', 'null')
        or jsonb_typeof(v_item -> 'domain') not in ('string', 'null')
        or jsonb_typeof(v_item -> 'exclusionCode') not in ('string', 'null')
        or jsonb_typeof(v_item -> 'normalizedUrl') not in ('string', 'null')
      )
      or char_length(coalesce(v_item ->> 'explicitMemoCandidate', '')) > 200
      or char_length(coalesce(v_item ->> 'titleCandidate', '')) > 500
      or char_length(coalesce(v_item ->> 'normalizedUrl', '')) > 4096 then
      raise exception using errcode = '22023', message = '가져오기 항목 형식이 올바르지 않습니다.';
    end if;

    for v_path_value in select value from jsonb_array_elements(v_item -> 'collectionPath') as element(value)
    loop
      if jsonb_typeof(v_path_value) <> 'string' then
        raise exception using errcode = '22023', message = '모음 경로 형식이 올바르지 않습니다.';
      end if;
    end loop;

    for v_warning in select value #>> '{}' from jsonb_array_elements(v_item -> 'warnings') as element(value)
    loop
      if v_warning is null
        or v_warning not in ('missing-title', 'trimmed-title', 'trimmed-memo', 'ambiguous-field') then
        raise exception using errcode = '22023', message = '경고 코드가 올바르지 않습니다.';
      end if;
    end loop;

    if v_item ->> 'exclusionCode' is not null
      and v_item ->> 'exclusionCode' not in (
        'invalid-url', 'unsupported-protocol', 'private-address', 'limit-exceeded'
      ) then
      raise exception using errcode = '22023', message = '제외 코드가 올바르지 않습니다.';
    end if;

    if v_item ->> 'exclusionCode' is null
      and nullif(btrim(v_item ->> 'normalizedUrl'), '') is null then
      raise exception using errcode = '22023', message = '정규화 URL이 필요합니다.';
    end if;

    if v_item ->> 'capturedAtCandidate' is not null then
      begin
        perform (v_item ->> 'capturedAtCandidate')::timestamptz;
      exception when others then
        raise exception using errcode = '22023', message = '캡처 시각이 올바르지 않습니다.';
      end;
    end if;

    if v_item ? 'selectedCategoryId' then
      if jsonb_typeof(v_item -> 'selectedCategoryId') not in ('string', 'null') then
        raise exception using errcode = '22023', message = '선택 범주 형식이 올바르지 않습니다.';
      end if;

      if v_item ->> 'selectedCategoryId' is not null then
        if v_item ->> 'selectedCategoryId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
          raise exception using errcode = '22023', message = '선택 범주 형식이 올바르지 않습니다.';
        end if;

        v_category_id := (v_item ->> 'selectedCategoryId')::uuid;
        if not exists (
          select 1 from public.categories
          where id = v_category_id and user_id = current_user_id
        ) then
          raise exception using errcode = '22023', message = '선택 범주 소유자가 올바르지 않습니다.';
        end if;
      end if;
    end if;
  end loop;

  insert into public.insight_import_jobs (
    user_id, input_kind, adapter_key, status, idempotency_key, expires_at
  ) values (
    current_user_id, p_input_kind, p_adapter_key, 'analyzing', p_idempotency_key,
    now() + interval '24 hours'
  )
  on conflict (user_id, idempotency_key) do nothing
  returning * into v_job;

  if not found then
    select * into v_job
    from public.insight_import_jobs
    where user_id = current_user_id and idempotency_key = p_idempotency_key
    for update;

    return public.prepare_insight_import(
      p_input_kind, p_adapter_key, p_idempotency_key, '[]'::jsonb
    );
  end if;

  with parsed_items as (
    select
      element.ordinality::integer as ordinal,
      element.value as raw,
      (element.value ->> 'candidateId') as candidate_id,
      nullif(element.value ->> 'capturedAtCandidate', '')::timestamptz as captured_at_candidate,
      array(select value #>> '{}' from jsonb_array_elements(element.value -> 'collectionPath')) as collection_path,
      element.value ->> 'explicitMemoCandidate' as explicit_memo_candidate,
      element.value ->> 'originalUrl' as original_url,
      nullif(element.value ->> 'normalizedUrl', '') as normalized_url,
      element.value ->> 'domain' as domain,
      element.value ->> 'sourceLocation' as source_location,
      element.value ->> 'titleCandidate' as title_candidate,
      element.value -> 'warnings' as warnings,
      element.value ->> 'exclusionCode' as exclusion_code,
      case when element.value ? 'selectedCategoryId'
        then (element.value ->> 'selectedCategoryId')::uuid
        else null
      end as selected_category_id
    from jsonb_array_elements(p_items) with ordinality as element(value, ordinality)
  ),
  classified_items as (
    select
      parsed_items.*,
      case
        when exclusion_code is not null then 'excluded'
        when row_number() over (partition by normalized_url order by ordinal) > 1 then 'input_duplicate'
        when exists (
          select 1 from public.insights
          where user_id = current_user_id
            and normalized_url = parsed_items.normalized_url
        ) then 'existing_duplicate'
        else 'new'
      end as classification
    from parsed_items
  )
  insert into public.insight_import_items (
    job_id, user_id, candidate_id, captured_at_candidate, collection_path,
    explicit_memo_candidate, original_url, normalized_url, domain, source_location,
    title_candidate, warnings, classification, exclusion_code, selected_category_id, ordinal
  )
  select
    v_job.id, current_user_id, candidate_id, captured_at_candidate, collection_path,
    explicit_memo_candidate, original_url, normalized_url, domain, source_location,
    title_candidate, warnings, classification, exclusion_code, selected_category_id, ordinal
  from classified_items;

  update public.insight_import_jobs as job
  set
    status = 'ready',
    total_count = (select count(*) from public.insight_import_items where job_id = v_job.id),
    new_count = (select count(*) from public.insight_import_items where job_id = v_job.id and classification = 'new'),
    duplicate_count = (select count(*) from public.insight_import_items where job_id = v_job.id and classification = 'existing_duplicate'),
    input_duplicate_count = (select count(*) from public.insight_import_items where job_id = v_job.id and classification = 'input_duplicate'),
    excluded_count = (select count(*) from public.insight_import_items where job_id = v_job.id and classification = 'excluded')
  where job.id = v_job.id
  returning * into v_job;

  return public.prepare_insight_import(
    p_input_kind, p_adapter_key, p_idempotency_key, '[]'::jsonb
  );
end;
$$;

revoke all on function public.prepare_insight_import(text, text, text, jsonb) from public;
revoke all on function public.prepare_insight_import(text, text, text, jsonb) from anon;
grant execute on function public.prepare_insight_import(text, text, text, jsonb) to authenticated;
