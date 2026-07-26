create function public.start_notion_insight_import(
  p_job_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_job_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = '인증이 필요합니다.';
  end if;

  if p_job_id is null
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Notion 작업 입력이 올바르지 않습니다.';
  end if;

  insert into public.insight_import_jobs (
    id, user_id, input_kind, adapter_key, status, idempotency_key, expires_at,
    provider_cursor
  )
  values (
    p_job_id, v_user_id, 'connected-account', 'notion', 'analyzing',
    p_idempotency_key, now() + interval '24 hours', null
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_job_id;

  if v_job_id is null then
    select id
    into v_job_id
    from public.insight_import_jobs
    where user_id = v_user_id
      and idempotency_key = p_idempotency_key;
  end if;

  if v_job_id is distinct from p_job_id then
    raise exception using errcode = '22023', message = 'Notion 작업 키가 충돌했습니다.';
  end if;

  return v_job_id;
end;
$$;

create function public.append_notion_import_items(
  p_job_id uuid,
  p_items jsonb,
  p_provider_cursor jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item jsonb;
  v_existing public.insight_import_items%rowtype;
  v_ordinal integer;
  v_path text[];
  v_exclusion_code text;
  v_normalized_url text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = '인증이 필요합니다.';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) > 500
    or jsonb_typeof(p_provider_cursor) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Notion 분석 slice가 올바르지 않습니다.';
  end if;

  perform 1
  from public.insight_import_jobs
  where id = p_job_id
    and user_id = v_user_id
    and adapter_key = 'notion'
    and status = 'analyzing'
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Notion 분석 작업을 찾을 수 없습니다.';
  end if;

  if (
    select count(*) + jsonb_array_length(p_items)
    from public.insight_import_items
    where job_id = p_job_id
  ) > 10000 then
    raise exception using errcode = '22023', message = 'Notion 후보 제한을 초과했습니다.';
  end if;

  select coalesce(max(ordinal), 0)
  into v_ordinal
  from public.insight_import_items
  where job_id = p_job_id;

  for v_item in
    select value from jsonb_array_elements(p_items) as element(value)
  loop
    if jsonb_typeof(v_item) is distinct from 'object'
      or not (v_item ?& array[
        'candidateId', 'capturedAtCandidate', 'collectionPath',
        'explicitMemoCandidate', 'originalUrl', 'sourceLocation',
        'titleCandidate', 'warnings', 'domain', 'exclusionCode',
        'normalizedUrl'
      ])
      or jsonb_typeof(v_item -> 'candidateId') is distinct from 'string'
      or btrim(v_item ->> 'candidateId') = ''
      or jsonb_typeof(v_item -> 'collectionPath') is distinct from 'array'
      or jsonb_array_length(v_item -> 'collectionPath') > 20
      or jsonb_typeof(v_item -> 'originalUrl') is distinct from 'string'
      or btrim(v_item ->> 'originalUrl') = ''
      or char_length(v_item ->> 'originalUrl') > 4096
      or jsonb_typeof(v_item -> 'sourceLocation') is distinct from 'string'
      or btrim(v_item ->> 'sourceLocation') = ''
      or char_length(v_item ->> 'sourceLocation') > 500
      or jsonb_typeof(v_item -> 'warnings') is distinct from 'array'
      or char_length(coalesce(v_item ->> 'titleCandidate', '')) > 500
      or char_length(coalesce(v_item ->> 'explicitMemoCandidate', '')) > 200
      or char_length(coalesce(v_item ->> 'normalizedUrl', '')) > 4096 then
      raise exception using errcode = '22023', message = 'Notion 후보 형식이 올바르지 않습니다.';
    end if;

    select coalesce(array_agg(value #>> '{}'), array[]::text[])
    into v_path
    from jsonb_array_elements(v_item -> 'collectionPath') as path(value);

    if exists (
      select 1
      from unnest(v_path) as part
      where part is null
    ) then
      raise exception using errcode = '22023', message = 'Notion 모음 경로가 올바르지 않습니다.';
    end if;

    v_exclusion_code := nullif(v_item ->> 'exclusionCode', '');
    v_normalized_url := nullif(v_item ->> 'normalizedUrl', '');

    if v_exclusion_code is not null
      and v_exclusion_code not in (
        'invalid-url', 'unsupported-protocol', 'private-address', 'limit-exceeded'
      ) then
      raise exception using errcode = '22023', message = 'Notion 제외 코드가 올바르지 않습니다.';
    end if;

    if v_exclusion_code is null and v_normalized_url is null then
      raise exception using errcode = '22023', message = 'Notion 정규화 URL이 필요합니다.';
    end if;

    select *
    into v_existing
    from public.insight_import_items
    where job_id = p_job_id
      and candidate_id = v_item ->> 'candidateId';

    if found then
      if v_existing.original_url is distinct from (v_item ->> 'originalUrl')
        or v_existing.normalized_url is distinct from v_normalized_url
        or v_existing.source_location is distinct from (v_item ->> 'sourceLocation')
        or v_existing.title_candidate is distinct from (v_item ->> 'titleCandidate')
        or v_existing.explicit_memo_candidate is distinct from (v_item ->> 'explicitMemoCandidate')
        or v_existing.collection_path is distinct from v_path
        or v_existing.warnings is distinct from (v_item -> 'warnings') then
        raise exception using errcode = '22023', message = 'Notion 후보가 기존 payload와 충돌했습니다.';
      end if;
      continue;
    end if;

    v_ordinal := v_ordinal + 1;
    insert into public.insight_import_items (
      job_id, user_id, candidate_id, captured_at_candidate, collection_path,
      explicit_memo_candidate, original_url, normalized_url, domain,
      source_location, title_candidate, warnings, classification,
      exclusion_code, ordinal
    )
    values (
      p_job_id,
      v_user_id,
      v_item ->> 'candidateId',
      nullif(v_item ->> 'capturedAtCandidate', '')::timestamptz,
      v_path,
      v_item ->> 'explicitMemoCandidate',
      v_item ->> 'originalUrl',
      v_normalized_url,
      v_item ->> 'domain',
      v_item ->> 'sourceLocation',
      v_item ->> 'titleCandidate',
      v_item -> 'warnings',
      case when v_exclusion_code is null then 'new' else 'excluded' end,
      v_exclusion_code,
      v_ordinal
    );
  end loop;

  update public.insight_import_jobs
  set provider_cursor = p_provider_cursor
  where id = p_job_id;

  return jsonb_build_object(
    'candidateCount',
    (select count(*) from public.insight_import_items where job_id = p_job_id)
  );
end;
$$;

create function public.finalize_notion_import_analysis(
  p_job_id uuid,
  p_provider_cursor jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_job public.insight_import_jobs%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = '인증이 필요합니다.';
  end if;

  if jsonb_typeof(p_provider_cursor) is distinct from 'object'
    or p_provider_cursor ->> 'stage' is distinct from 'complete' then
    raise exception using errcode = '22023', message = 'Notion 분석 cursor가 완료되지 않았습니다.';
  end if;

  select *
  into v_job
  from public.insight_import_jobs
  where id = p_job_id
    and user_id = v_user_id
    and adapter_key = 'notion'
    and status in ('analyzing', 'ready')
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Notion 분석 작업을 찾을 수 없습니다.';
  end if;

  with ranked as (
    select
      candidate_id,
      row_number() over (
        partition by normalized_url
        order by ordinal
      ) as duplicate_rank
    from public.insight_import_items
    where job_id = p_job_id
      and exclusion_code is null
  )
  update public.insight_import_items as item
  set classification = case
    when ranked.duplicate_rank > 1 then 'input_duplicate'
    when exists (
      select 1
      from public.insights
      where user_id = v_user_id
        and normalized_url = item.normalized_url
    ) then 'existing_duplicate'
    else 'new'
  end
  from ranked
  where item.job_id = p_job_id
    and item.candidate_id = ranked.candidate_id;

  update public.insight_import_jobs as job
  set
    status = 'ready',
    provider_cursor = p_provider_cursor,
    total_count = (
      select count(*) from public.insight_import_items where job_id = p_job_id
    ),
    new_count = (
      select count(*) from public.insight_import_items
      where job_id = p_job_id and classification = 'new'
    ),
    duplicate_count = (
      select count(*) from public.insight_import_items
      where job_id = p_job_id and classification = 'existing_duplicate'
    ),
    input_duplicate_count = (
      select count(*) from public.insight_import_items
      where job_id = p_job_id and classification = 'input_duplicate'
    ),
    excluded_count = (
      select count(*) from public.insight_import_items
      where job_id = p_job_id and classification = 'excluded'
    )
  where job.id = p_job_id
  returning * into v_job;

  return public.prepare_insight_import(
    'connected-account',
    'notion',
    v_job.idempotency_key,
    '[]'::jsonb
  );
end;
$$;

create or replace function public.store_insight_import_oauth_tokens(
  p_connection_id uuid,
  p_tokens jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception using errcode = '42501', message = '실행 권한이 없습니다.';
  end if;

  update public.insight_import_connections
  set
    status = 'connected',
    access_ciphertext = p_tokens ->> 'accessCiphertext',
    access_nonce = p_tokens ->> 'accessNonce',
    access_auth_tag = p_tokens ->> 'accessAuthTag',
    refresh_ciphertext = p_tokens ->> 'refreshCiphertext',
    refresh_nonce = p_tokens ->> 'refreshNonce',
    refresh_auth_tag = p_tokens ->> 'refreshAuthTag',
    key_version = (p_tokens ->> 'keyVersion')::smallint,
    workspace_name = p_tokens ->> 'workspaceName',
    workspace_id = p_tokens ->> 'workspaceId'
  where id = p_connection_id
    and status in ('exchanging', 'connected', 'analyzing');

  if not found then
    raise exception using errcode = '22023', message = '연결을 저장할 수 없습니다.';
  end if;
end;
$$;

revoke all on function public.start_notion_insight_import(uuid, text)
from public, anon, authenticated;
revoke all on function public.append_notion_import_items(uuid, jsonb, jsonb)
from public, anon, authenticated;
revoke all on function public.finalize_notion_import_analysis(uuid, jsonb)
from public, anon, authenticated;

grant execute on function public.start_notion_insight_import(uuid, text)
to authenticated;
grant execute on function public.append_notion_import_items(uuid, jsonb, jsonb)
to authenticated;
grant execute on function public.finalize_notion_import_analysis(uuid, jsonb)
to authenticated;
