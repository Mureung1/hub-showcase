begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(66);

select extensions.has_table('public', 'insight_import_jobs', '가져오기 작업 테이블이 존재한다');
select extensions.has_table('public', 'insight_import_items', '가져오기 항목 테이블이 존재한다');

select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.insight_import_jobs'::regclass),
  '가져오기 작업 테이블에 RLS가 활성화되어 있다'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.insight_import_items'::regclass),
  '가져오기 항목 테이블에 RLS가 활성화되어 있다'
);

select extensions.ok(
  (
    select array_agg(attname::text order by attname) @> array[
      'id', 'user_id', 'input_kind', 'adapter_key', 'status', 'idempotency_key',
      'total_count', 'new_count', 'duplicate_count', 'input_duplicate_count',
      'excluded_count', 'created_count', 'preserved_count', 'already_deleted_count',
      'provider_cursor', 'failure_code', 'expires_at', 'completed_at', 'created_at', 'updated_at'
    ]::text[]
    from pg_attribute
    where attrelid = 'public.insight_import_jobs'::regclass
      and attnum > 0
      and not attisdropped
  ),
  '가져오기 작업의 핵심 열과 집계 열이 존재한다'
);
select extensions.ok(
  (
    select array_agg(attname::text order by attname) @> array[
      'job_id', 'user_id', 'candidate_id', 'captured_at_candidate', 'collection_path',
      'explicit_memo_candidate', 'original_url', 'normalized_url', 'domain', 'source_location',
      'title_candidate', 'warnings', 'classification', 'exclusion_code', 'created_insight_id',
      'imported_updated_at', 'selected_category_id', 'ordinal'
    ]::text[]
    from pg_attribute
    where attrelid = 'public.insight_import_items'::regclass
      and attnum > 0
      and not attisdropped
  ),
  '가져오기 항목의 후보 및 결과 열이 존재한다'
);
select extensions.ok(
  (
    select array_agg(conname order by conname) @> array[
      'insight_import_jobs_id_user_key',
      'insight_import_jobs_user_idempotency_key'
    ]::name[]
    from pg_constraint
    where conrelid = 'public.insight_import_jobs'::regclass
  ),
  '가져오기 작업의 복합 키와 멱등성 고유 제약이 존재한다'
);
select extensions.ok(
  (
    select count(*) = 3
    from pg_constraint
    where conrelid = 'public.insight_import_items'::regclass
      and contype = 'f'
  )
  and (
    select array_agg(conname order by conname) @> array[
      'insight_import_items_job_candidate_key',
      'insight_import_items_job_ordinal_key'
    ]::name[]
    from pg_constraint
    where conrelid = 'public.insight_import_items'::regclass
  ),
  '가져오기 항목의 외래 키와 고유 제약이 존재한다'
);
select extensions.ok(
  exists (
    select 1 from pg_index
    where indexrelid = 'public.insight_import_jobs_user_created_at_idx'::regclass
  )
  and exists (
    select 1 from pg_index
    where indexrelid = 'public.insight_import_items_job_classification_ordinal_idx'::regclass
  ),
  '가져오기 조회 인덱스가 존재한다'
);
select extensions.ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.insight_import_jobs'::regclass
      and tgname = 'set_insight_import_jobs_updated_at'
      and not tgisinternal
  ),
  '가져오기 작업의 수정 시각 트리거가 존재한다'
);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000021', 'import-owner@example.com'),
  ('00000000-0000-4000-8000-000000000022', 'import-other@example.com');

insert into public.insights (
  id, user_id, original_url, normalized_url, domain, title
) values (
  '30000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000021',
  'https://owner.example/created-insight',
  'https://owner.example/created-insight',
  'owner.example',
  '소유자의 생성 인사이트'
), (
  '30000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000022',
  'https://other.example/created-insight',
  'https://other.example/created-insight',
  'other.example',
  '다른 사용자의 생성 인사이트'
);

insert into public.categories (id, user_id, name, color_key, sort_order)
values (
  '20000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000021',
  '가져오기',
  'blue-2',
  0
), (
  '20000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000022',
  '다른 사용자 가져오기',
  'blue-2',
  0
);

insert into public.insight_import_jobs (
  id, user_id, input_kind, adapter_key, status, idempotency_key, expires_at, created_at, updated_at
) values (
  '40000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000021',
  'pasted-text',
  'pasted-text',
  'ready',
  repeat('a', 64),
  now() + interval '1 day',
  '2026-07-01 00:00:00+00',
  '2026-07-01 00:00:00+00'
), (
  '40000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000022',
  'file',
  'generic-csv',
  'ready',
  repeat('b', 64),
  now() + interval '1 day',
  '2026-07-01 00:00:00+00',
  '2026-07-01 00:00:00+00'
);

insert into public.insight_import_items (
  job_id, user_id, candidate_id, original_url, source_location, classification,
  selected_category_id, created_insight_id, ordinal
) values (
  '40000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000021',
  'owner-1',
  'https://owner.example/import',
  '행 1',
  'new',
  '20000000-0000-4000-8000-000000000021',
  '30000000-0000-4000-8000-000000000021',
  1
), (
  '40000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000022',
  'other-1',
  'https://other.example/import',
  '행 1',
  'existing_duplicate',
  null,
  null,
  1
);

select extensions.throws_ok(
  $$
    insert into public.insight_import_items (
      job_id, user_id, candidate_id, original_url, source_location, classification,
      created_insight_id, ordinal
    ) values (
      '40000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000021',
      'cross-user-insight',
      'https://owner.example/cross-user-insight',
      '행 99',
      'new',
      '30000000-0000-4000-8000-000000000022',
      99
    )
  $$,
  '23503',
  null,
  '다른 사용자의 인사이트를 가져오기 생성 결과로 연결할 수 없다'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"00000000-0000-4000-8000-000000000021","role":"authenticated"}';

select extensions.results_eq(
  $$ select count(*)::bigint from public.insight_import_jobs $$,
  array[1::bigint],
  '소유자는 자신의 가져오기 작업을 조회할 수 있다'
);
select extensions.results_eq(
  $$ select count(*)::bigint from public.insight_import_items $$,
  array[1::bigint],
  '소유자는 자신의 가져오기 항목을 조회할 수 있다'
);

set local "request.jwt.claims" =
  '{"sub":"00000000-0000-4000-8000-000000000022","role":"authenticated"}';

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.insight_import_jobs
    where id = '40000000-0000-4000-8000-000000000021'
  $$,
  array[0::bigint],
  '다른 사용자는 소유자의 가져오기 작업을 조회할 수 없다'
);
select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.insight_import_items
    where job_id = '40000000-0000-4000-8000-000000000021'
  $$,
  array[0::bigint],
  '다른 사용자는 소유자의 가져오기 항목을 조회할 수 없다'
);

reset role;

delete from public.insights
where id = '30000000-0000-4000-8000-000000000021';

select extensions.results_eq(
  $$
    select created_insight_id, user_id
    from public.insight_import_items
    where job_id = '40000000-0000-4000-8000-000000000021'
      and candidate_id = 'owner-1'
  $$,
  $$
    values (
      null::uuid,
      '00000000-0000-4000-8000-000000000021'::uuid
    )
  $$,
  '생성 인사이트 삭제 시 연결만 해제하고 항목 소유자는 보존한다'
);

select extensions.ok(
  not has_table_privilege('anon', 'public.insight_import_jobs', 'select,insert,update,delete'),
  'anon은 가져오기 작업에 대한 직접 권한이 없다'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.insight_import_items', 'select,insert,update,delete'),
  'anon은 가져오기 항목에 대한 직접 권한이 없다'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.insight_import_jobs', 'select')
  and not has_table_privilege('authenticated', 'public.insight_import_jobs', 'insert,update,delete'),
  'authenticated는 가져오기 작업을 조회만 할 수 있다'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.insight_import_items', 'select')
  and not has_table_privilege('authenticated', 'public.insight_import_items', 'insert,update,delete'),
  'authenticated는 가져오기 항목을 조회만 할 수 있다'
);

select extensions.throws_ok(
  $$
    insert into public.insight_import_jobs (
      user_id, input_kind, adapter_key, status, idempotency_key, expires_at
    ) values (
      '00000000-0000-4000-8000-000000000021',
      'pasted-text', 'pasted-text', 'ready', 'invalid', now()
    )
  $$,
  '23514',
  null,
  '멱등성 키는 64자리 소문자 16진수여야 한다'
);
select extensions.throws_ok(
  $$
    insert into public.insight_import_items (
      job_id, user_id, candidate_id, original_url, source_location, classification, ordinal
    ) values (
      '40000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000021',
      'too-long-url', repeat('u', 4097), '행 2', 'new', 2
    )
  $$,
  '23514',
  null,
  '원본 URL의 최대 길이를 초과하면 거부한다'
);
select extensions.throws_ok(
  $$
    insert into public.insight_import_items (
      job_id, user_id, candidate_id, original_url, source_location, classification,
      exclusion_code, ordinal
    ) values (
      '40000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000021',
      'invalid-exclusion', 'https://owner.example/invalid', '행 3', 'new',
      'invalid-url', 3
    )
  $$,
  '23514',
  null,
  '제외 사유는 excluded 분류에서만 허용한다'
);
select extensions.throws_ok(
  $$
    insert into public.insight_import_items (
      job_id, user_id, candidate_id, original_url, source_location, classification,
      selected_category_id, ordinal
    ) values (
      '40000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000021',
      'other-category', 'https://owner.example/category', '행 4', 'new',
      '20000000-0000-4000-8000-000000000022', 4
    )
  $$,
  '23503',
  null,
  '다른 사용자의 카테고리는 선택할 수 없다'
);
select extensions.lives_ok(
  $$
    insert into public.insight_import_items (
      job_id, user_id, candidate_id, original_url, source_location, classification, ordinal
    ) values (
      '40000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000021',
      'nullable-category', 'https://owner.example/no-category', '행 5', 'new', 5
    )
  $$,
  '선택 카테고리 없이 가져오기 항목을 저장할 수 있다'
);
insert into public.insights (
  id, user_id, original_url, normalized_url, domain, title
) values (
  '30000000-0000-4000-8000-000000000023',
  '00000000-0000-4000-8000-000000000021',
  'https://owner.example/created-insight',
  'https://owner.example/created-insight',
  'owner.example',
  'prepare duplicate insight'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"00000000-0000-4000-8000-000000000021","role":"authenticated"}';

create temporary table prepared_import_result on commit drop as
select public.prepare_insight_import(
  'pasted-text',
  'pasted-text',
  repeat('c', 64),
  jsonb_build_array(
    jsonb_build_object(
      'candidateId', 'prepared-new', 'capturedAtCandidate', '2026-07-01T00:00:00Z',
      'collectionPath', jsonb_build_array('collection-one'), 'explicitMemoCandidate', 'memo',
      'originalUrl', 'https://prepared.example/new',
      'normalizedUrl', 'https://prepared.example/new', 'domain', 'prepared.example',
      'sourceLocation', 'line one', 'titleCandidate', 'new item',
      'warnings', '[]'::jsonb, 'exclusionCode', null
    ),
    jsonb_build_object(
      'candidateId', 'prepared-existing', 'capturedAtCandidate', null,
      'collectionPath', jsonb_build_array('collection-two'), 'explicitMemoCandidate', null,
      'originalUrl', 'https://owner.example/created-insight',
      'normalizedUrl', 'https://owner.example/created-insight', 'domain', 'owner.example',
      'sourceLocation', 'line two', 'titleCandidate', null,
      'warnings', jsonb_build_array('missing-title'), 'exclusionCode', null
    ),
    jsonb_build_object(
      'candidateId', 'prepared-input-duplicate', 'capturedAtCandidate', null,
      'collectionPath', jsonb_build_array('collection-one'), 'explicitMemoCandidate', null,
      'originalUrl', 'https://prepared.example/new#duplicate',
      'normalizedUrl', 'https://prepared.example/new', 'domain', 'prepared.example',
      'sourceLocation', 'line three', 'titleCandidate', 'duplicate item',
      'warnings', '[]'::jsonb, 'exclusionCode', null
    ),
    jsonb_build_object(
      'candidateId', 'prepared-excluded', 'capturedAtCandidate', null,
      'collectionPath', jsonb_build_array('collection-excluded'), 'explicitMemoCandidate', null,
      'originalUrl', 'invalid url', 'normalizedUrl', null, 'domain', null,
      'sourceLocation', 'line four', 'titleCandidate', null,
      'warnings', '[]'::jsonb, 'exclusionCode', 'invalid-url'
    )
  )
) as result;

select extensions.ok(
  (
    select array_agg(key order by key) = array[
      'adapterKey', 'collections', 'expiresAt', 'id', 'items', 'status', 'summary'
    ]::text[]
    and bool_and(
      jsonb_typeof(result -> 'id') = 'string'
      and (result ->> 'id')::uuid is not null
      and jsonb_typeof(result -> 'adapterKey') = 'string'
      and result ->> 'adapterKey' = 'pasted-text'
      and jsonb_typeof(result -> 'status') = 'string'
      and result ->> 'status' = 'ready'
      and jsonb_typeof(result -> 'expiresAt') = 'string'
      and (result ->> 'expiresAt')::timestamptz is not null
      and jsonb_typeof(result -> 'collections') = 'array'
      and jsonb_typeof(result -> 'items') = 'array'
      and jsonb_typeof(result -> 'summary') = 'object'
    )
    from prepared_import_result,
      jsonb_object_keys(result) as key
  ),
  'prepare RPC returns only the PreparedImport top-level keys'
);
select extensions.ok(
  (
    select array_agg(key order by key) = array[
      'createdCount', 'duplicateCount', 'excludedCount', 'inputDuplicateCount',
      'newCount', 'totalCount'
    ]::text[]
    and bool_and(
      jsonb_typeof(result -> 'summary' -> 'createdCount') = 'number'
      and jsonb_typeof(result -> 'summary' -> 'duplicateCount') = 'number'
      and jsonb_typeof(result -> 'summary' -> 'excludedCount') = 'number'
      and jsonb_typeof(result -> 'summary' -> 'inputDuplicateCount') = 'number'
      and jsonb_typeof(result -> 'summary' -> 'newCount') = 'number'
      and jsonb_typeof(result -> 'summary' -> 'totalCount') = 'number'
      and result -> 'summary' -> 'createdCount' = '0'::jsonb
      and result -> 'summary' -> 'duplicateCount' = '1'::jsonb
      and result -> 'summary' -> 'excludedCount' = '1'::jsonb
      and result -> 'summary' -> 'inputDuplicateCount' = '1'::jsonb
      and result -> 'summary' -> 'newCount' = '1'::jsonb
      and result -> 'summary' -> 'totalCount' = '4'::jsonb
    )
    from prepared_import_result,
      jsonb_object_keys(result -> 'summary') as key
  ),
  'prepare RPC returns only the PreparedImport summary keys'
);
select extensions.ok(
  (
    select
      bool_and(
        jsonb_typeof(item.value) = 'object'
        and (select array_agg(key order by key) from jsonb_object_keys(item.value) as key) = array[
          'candidateId', 'capturedAtCandidate', 'classification', 'collectionPath',
          'domain', 'exclusionCode', 'explicitMemoCandidate', 'normalizedUrl',
          'originalUrl', 'sourceLocation', 'titleCandidate', 'warnings'
        ]::text[]
        and jsonb_typeof(item.value -> 'candidateId') = 'string'
        and jsonb_typeof(item.value -> 'capturedAtCandidate') in ('string', 'null')
        and jsonb_typeof(item.value -> 'collectionPath') = 'array'
        and jsonb_typeof(item.value -> 'explicitMemoCandidate') in ('string', 'null')
        and jsonb_typeof(item.value -> 'originalUrl') = 'string'
        and jsonb_typeof(item.value -> 'sourceLocation') = 'string'
        and jsonb_typeof(item.value -> 'titleCandidate') in ('string', 'null')
        and jsonb_typeof(item.value -> 'warnings') = 'array'
        and jsonb_typeof(item.value -> 'classification') = 'string'
        and jsonb_typeof(item.value -> 'domain') in ('string', 'null')
        and jsonb_typeof(item.value -> 'exclusionCode') in ('string', 'null')
        and jsonb_typeof(item.value -> 'normalizedUrl') in ('string', 'null')
      )
      and bool_or(
        item.value ->> 'candidateId' = 'prepared-new'
        and item.value ->> 'classification' = 'new'
        and item.value -> 'collectionPath' = '["collection-one"]'::jsonb
        and item.value ->> 'originalUrl' = 'https://prepared.example/new'
        and item.value ->> 'normalizedUrl' = 'https://prepared.example/new'
      )
    from prepared_import_result,
      jsonb_array_elements(result -> 'items') as item(value)
  ),
  'prepare RPC returns PreparedImportItem camelCase keys, shapes, and values'
);

select extensions.results_eq(
  $$
    select result ->> 'status', result #>> '{summary,totalCount}',
      result #>> '{summary,newCount}', result #>> '{summary,duplicateCount}',
      result #>> '{summary,inputDuplicateCount}', result #>> '{summary,excludedCount}'
    from prepared_import_result
  $$,
  $$ values ('ready', '4', '1', '1', '1', '1') $$,
  'prepare RPC returns ready with exact summary'
);
select extensions.results_eq(
  $$
    select status, total_count, new_count, duplicate_count, input_duplicate_count, excluded_count
    from public.insight_import_jobs
    where id = (select (result ->> 'id')::uuid from prepared_import_result)
  $$,
  $$ values ('ready'::text, 4, 1, 1, 1, 1) $$,
  'prepare RPC persists exact job summary'
);
select extensions.results_eq(
  $$
    select candidate_id, classification, ordinal
    from public.insight_import_items
    where job_id = (select (result ->> 'id')::uuid from prepared_import_result)
    order by ordinal
  $$,
  $$
    values
      ('prepared-new'::text, 'new'::text, 1),
      ('prepared-existing'::text, 'existing_duplicate'::text, 2),
      ('prepared-input-duplicate'::text, 'input_duplicate'::text, 3),
      ('prepared-excluded'::text, 'excluded'::text, 4)
  $$,
  'prepare RPC preserves ordinal and recalculates classifications'
);
select extensions.results_eq(
  $$ select result -> 'collections' from prepared_import_result $$,
  $$ values ('[["collection-one"], ["collection-two"], ["collection-excluded"]]'::jsonb) $$,
  'prepare RPC returns first-seen unique collections'
);
select extensions.results_eq(
  $$
    select (public.prepare_insight_import(
      'pasted-text', 'pasted-text', repeat('c', 64), '[]'::jsonb
    ) ->> 'id')::uuid = (select (result ->> 'id')::uuid from prepared_import_result)
  $$,
  array[true],
  'same user and idempotency key returns the stored job'
);
select extensions.results_eq(
  $$
    select count(*)::bigint from public.insight_import_items
    where job_id = (select (result ->> 'id')::uuid from prepared_import_result)
  $$,
  array[4::bigint],
  'idempotent retry does not append items'
);

set local "request.jwt.claims" =
  '{"sub":"00000000-0000-4000-8000-000000000022","role":"authenticated"}';
select extensions.ok(
  (public.prepare_insight_import(
    'file', 'generic-csv', repeat('c', 64),
    jsonb_build_array(jsonb_build_object(
      'candidateId', 'other-user-item', 'capturedAtCandidate', null,
      'collectionPath', '[]'::jsonb, 'explicitMemoCandidate', null,
      'originalUrl', 'https://other-user.example/new',
      'normalizedUrl', 'https://other-user.example/new', 'domain', 'other-user.example',
      'sourceLocation', 'line one', 'titleCandidate', null,
      'warnings', '[]'::jsonb, 'exclusionCode', null
    ))
  ) ->> 'id')::uuid <> (select (result ->> 'id')::uuid from prepared_import_result),
  'same idempotency key for another user creates another job'
);

select extensions.throws_ok(
  $$ select public.prepare_insight_import('invalid', 'pasted-text', repeat('d', 64), '[]'::jsonb) $$,
  '22023', null, 'invalid input kind is rejected'
);
select extensions.throws_ok(
  $$ select public.prepare_insight_import('pasted-text', 'invalid', repeat('d', 64), '[]'::jsonb) $$,
  '22023', null, 'invalid adapter key is rejected'
);
select extensions.throws_ok(
  $$ select public.prepare_insight_import('pasted-text', 'pasted-text', 'invalid', '[]'::jsonb) $$,
  '22023', null, 'invalid idempotency key is rejected'
);
select extensions.throws_ok(
  $$ select public.prepare_insight_import('pasted-text', 'pasted-text', repeat('d', 64), '{}'::jsonb) $$,
  '22023', null, 'non-array items are rejected'
);
select extensions.throws_ok(
  $$
    select public.prepare_insight_import(
      'pasted-text', 'pasted-text', repeat('d', 64),
      (select jsonb_agg(jsonb_build_object(
        'candidateId', value::text, 'capturedAtCandidate', null, 'collectionPath', '[]'::jsonb,
        'explicitMemoCandidate', null, 'originalUrl', 'https://limit.example/' || value,
        'normalizedUrl', 'https://limit.example/' || value, 'domain', 'limit.example',
        'sourceLocation', 'line', 'titleCandidate', null, 'warnings', '[]'::jsonb, 'exclusionCode', null
      )) from generate_series(1, 10001) as value)
    )
  $$,
  '22023', null, 'more than 10000 items are rejected'
);
select extensions.throws_ok(
  $$
    select public.prepare_insight_import('pasted-text', 'pasted-text', repeat('e', 64),
      jsonb_build_array(jsonb_build_object(
        'candidateId', '', 'capturedAtCandidate', 'invalid-date',
        'collectionPath', jsonb_build_array(1), 'explicitMemoCandidate', repeat('m', 201),
        'originalUrl', repeat('u', 4097), 'normalizedUrl', repeat('n', 4097), 'domain', 1,
        'sourceLocation', repeat('s', 501), 'titleCandidate', repeat('t', 501),
        'warnings', jsonb_build_array('invalid-warning'), 'exclusionCode', null
      ))
    )
  $$,
  '22023', null, 'invalid item shapes and field limits are rejected'
);
select extensions.throws_ok(
  $$
    select public.prepare_insight_import('pasted-text', 'pasted-text', repeat('f', 64),
      jsonb_build_array(jsonb_build_object(
        'candidateId', 'owned-by-payload', 'capturedAtCandidate', null, 'collectionPath', '[]'::jsonb,
        'explicitMemoCandidate', null, 'originalUrl', 'https://payload.example/user',
        'normalizedUrl', 'https://payload.example/user', 'domain', 'payload.example',
        'sourceLocation', 'line', 'titleCandidate', null, 'warnings', '[]'::jsonb,
        'exclusionCode', null, 'userId', '00000000-0000-4000-8000-000000000022'
      ))
    )
  $$,
  '22023', null, 'payload user ownership injection is rejected'
);
select extensions.throws_ok(
  $$
    select public.prepare_insight_import('pasted-text', 'pasted-text', repeat('1', 64),
      jsonb_build_array(jsonb_build_object(
        'candidateId', 'other-category-payload', 'capturedAtCandidate', null,
        'collectionPath', '[]'::jsonb, 'explicitMemoCandidate', null,
        'originalUrl', 'https://payload.example/category',
        'normalizedUrl', 'https://payload.example/category', 'domain', 'payload.example',
        'sourceLocation', 'line', 'titleCandidate', null, 'warnings', '[]'::jsonb,
        'exclusionCode', null, 'selectedCategoryId', '20000000-0000-4000-8000-000000000021'
      ))
    )
  $$,
  '22023', null, 'another user selected category is rejected'
);

reset role;
set local role anon;
select extensions.throws_ok(
  $$ select public.prepare_insight_import('pasted-text', 'pasted-text', repeat('2', 64), '[]'::jsonb) $$,
  '42501', null, 'anonymous callers cannot execute the prepare RPC'
);
reset role;
select extensions.ok(
  has_function_privilege('authenticated', 'public.prepare_insight_import(text, text, text, jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.prepare_insight_import(text, text, text, jsonb)', 'execute'),
  'only authenticated callers receive execute permission'
);

update public.insight_import_jobs
set status = 'committing'
where id = '40000000-0000-4000-8000-000000000021';

select extensions.ok(
  (
    select updated_at > created_at
    from public.insight_import_jobs
    where id = '40000000-0000-4000-8000-000000000021'
  ),
  '가져오기 작업을 갱신하면 수정 시각 트리거가 적용된다'
);

select extensions.has_function(
  'public',
  'commit_insight_import',
  array['uuid', 'jsonb'],
  '가져오기 원자적 반영 RPC가 존재한다'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"00000000-0000-4000-8000-000000000021","role":"authenticated"}';

create temporary table commit_prepared_result on commit drop as
select public.prepare_insight_import(
  'file',
  'generic-csv',
  repeat('3', 64),
  jsonb_build_array(
    jsonb_build_object(
      'candidateId', 'commit-existing-category', 'capturedAtCandidate', null,
      'collectionPath', jsonb_build_array('기존 분류'), 'explicitMemoCandidate', '기존 메모',
      'originalUrl', 'https://commit.example/existing-category',
      'normalizedUrl', 'https://commit.example/existing-category', 'domain', 'commit.example',
      'sourceLocation', '행 1', 'titleCandidate', '외부 제목',
      'warnings', '[]'::jsonb, 'exclusionCode', null
    ),
    jsonb_build_object(
      'candidateId', 'commit-new-category', 'capturedAtCandidate', null,
      'collectionPath', jsonb_build_array('새 분류'), 'explicitMemoCandidate', null,
      'originalUrl', 'https://commit.example/new-category',
      'normalizedUrl', 'https://commit.example/new-category', 'domain', 'commit.example',
      'sourceLocation', '행 2', 'titleCandidate', null,
      'warnings', jsonb_build_array('missing-title'), 'exclusionCode', null
    ),
    jsonb_build_object(
      'candidateId', 'commit-uncategorized', 'capturedAtCandidate', null,
      'collectionPath', jsonb_build_array('미분류'), 'explicitMemoCandidate', null,
      'originalUrl', 'https://commit.example/uncategorized',
      'normalizedUrl', 'https://commit.example/uncategorized', 'domain', 'commit.example',
      'sourceLocation', '행 3', 'titleCandidate', '미분류 제목',
      'warnings', '[]'::jsonb, 'exclusionCode', null
    )
  )
) as result;

create temporary table commit_result on commit drop as
select public.commit_insight_import(
  (select (result ->> 'id')::uuid from commit_prepared_result),
  jsonb_build_array(
    jsonb_build_object(
      'collectionKey', '["기존 분류"]',
      'target', jsonb_build_object('kind', 'existing', 'categoryId', '20000000-0000-4000-8000-000000000021')
    ),
    jsonb_build_object(
      'collectionKey', '["새 분류"]',
      'target', jsonb_build_object('kind', 'new', 'name', '  연구   ', 'colorKey', 'violet-2')
    )
  )
) as result;

select extensions.results_eq(
  $$ select result ->> 'createdCount', result ->> 'duplicateCount', result ->> 'excludedCount' from commit_result $$,
  $$ values ('3', '0', '0') $$,
  '반영 RPC가 생성·중복·제외 집계를 반환한다'
);
select extensions.results_eq(
  $$
    select category_id, title, title_origin, memo
    from public.insights
    where user_id = '00000000-0000-4000-8000-000000000021'
      and normalized_url = 'https://commit.example/existing-category'
  $$,
  $$ values ('20000000-0000-4000-8000-000000000021'::uuid, '외부 제목'::text, 'capture'::text, '기존 메모'::text) $$,
  '소유한 기존 분류와 외부 제목·명시 메모를 반영한다'
);
select extensions.results_eq(
  $$
    select insight.title, insight.title_origin, category.name, category.color_key
    from public.insights as insight
    join public.categories as category on category.id = insight.category_id
    where insight.user_id = '00000000-0000-4000-8000-000000000021'
      and insight.normalized_url = 'https://commit.example/new-category'
  $$,
  $$ values ('commit.example'::text, 'fallback'::text, '연구'::text, 'violet-2'::text) $$,
  '새 분류와 제목 대체값을 같은 반영으로 생성한다'
);
select extensions.is(
  (
    select category_id
    from public.insights
    where user_id = '00000000-0000-4000-8000-000000000021'
      and normalized_url = 'https://commit.example/uncategorized'
  ),
  null::uuid,
  '매핑하지 않은 모음은 미분류로 반영한다'
);
select extensions.ok(
  (
    select status = 'completed'
      and expires_at is null
      and created_count = 3
      and completed_at is not null
    from public.insight_import_jobs
    where id = (select (result ->> 'id')::uuid from commit_prepared_result)
  )
  and (
    select bool_and(created_insight_id is not null and imported_updated_at is not null)
    from public.insight_import_items
    where job_id = (select (result ->> 'id')::uuid from commit_prepared_result)
  ),
  '완료 작업과 항목 생성 결과를 저장한다'
);
select extensions.results_eq(
  $$
    select public.commit_insight_import(
      (select (result ->> 'id')::uuid from commit_prepared_result),
      '[]'::jsonb
    ) = (select result from commit_result)
  $$,
  array[true],
  '완료된 작업을 재호출하면 저장된 결과를 반환한다'
);
select extensions.is(
  (
    select count(*)::integer
    from public.insights
    where user_id = '00000000-0000-4000-8000-000000000021'
      and normalized_url like 'https://commit.example/%'
  ),
  3,
  '완료 작업 재호출은 인사이트를 추가하지 않는다'
);

create temporary table racing_commit_prepared on commit drop as
select public.prepare_insight_import(
  'file', 'generic-csv', repeat('5', 64),
  jsonb_build_array(jsonb_build_object(
    'candidateId', 'commit-racing-duplicate', 'capturedAtCandidate', null,
    'collectionPath', jsonb_build_array('경쟁 중복'), 'explicitMemoCandidate', '가져오기 메모',
    'originalUrl', 'https://commit.example/racing-duplicate',
    'normalizedUrl', 'https://commit.example/racing-duplicate', 'domain', 'commit.example',
    'sourceLocation', '행 4', 'titleCandidate', '가져오기 제목',
    'warnings', '[]'::jsonb, 'exclusionCode', null
  ))
) as result;
insert into public.insights (
  user_id,
  original_url,
  normalized_url,
  domain,
  title,
  title_origin,
  memo,
  category_id
) values (
  '00000000-0000-4000-8000-000000000021',
  'https://commit.example/racing-duplicate',
  'https://commit.example/racing-duplicate',
  'commit.example',
  '경쟁 저장 제목',
  'user',
  '경쟁 저장 메모',
  '20000000-0000-4000-8000-000000000021'
);
create temporary table racing_commit_result on commit drop as
select public.commit_insight_import(
  (select (result ->> 'id')::uuid from racing_commit_prepared),
  '[]'::jsonb
) as result;
select extensions.results_eq(
  $$
    select result ->> 'createdCount', result ->> 'duplicateCount'
    from racing_commit_result
  $$,
  $$ values ('0', '1') $$,
  '준비 뒤 생긴 경쟁 인사이트를 반영 시점 중복으로 다시 분류한다'
);
select extensions.results_eq(
  $$
    select count(*)::integer, title, title_origin, memo, category_id
    from public.insights
    where user_id = '00000000-0000-4000-8000-000000000021'
      and normalized_url = 'https://commit.example/racing-duplicate'
    group by title, title_origin, memo, category_id
  $$,
  $$
    values (
      1,
      '경쟁 저장 제목'::text,
      'user'::text,
      '경쟁 저장 메모'::text,
      '20000000-0000-4000-8000-000000000021'::uuid
    )
  $$,
  '경쟁 중복은 기존 제목·메모·분류를 변경하지 않는다'
);

create temporary table failed_commit_prepared on commit drop as
select public.prepare_insight_import(
  'file', 'generic-csv', repeat('4', 64),
  jsonb_build_array(jsonb_build_object(
    'candidateId', 'failed-atomic', 'capturedAtCandidate', null,
    'collectionPath', jsonb_build_array('실패 분류'), 'explicitMemoCandidate', null,
    'originalUrl', 'https://commit.example/failed-atomic',
    'normalizedUrl', 'https://commit.example/failed-atomic', 'domain', 'commit.example',
    'sourceLocation', '행 4', 'titleCandidate', null,
    'warnings', '[]'::jsonb, 'exclusionCode', null
  ))
) as result;
select extensions.results_eq(
  $$
    select public.commit_insight_import(
      (select (result ->> 'id')::uuid from failed_commit_prepared),
      jsonb_build_array(jsonb_build_object(
        'collectionKey', '["실패 분류"]',
        'target', jsonb_build_object('kind', 'existing', 'categoryId', '20000000-0000-4000-8000-000000000022')
      )))
  $$,
  $$ values ('{"ok": false, "reason": "commit-failed"}'::jsonb) $$,
  '다른 사용자 분류 매핑은 원자적으로 실패한다'
);
select extensions.ok(
  (
    select status = 'failed' and failure_code = 'commit-failed' and expires_at is not null
    from public.insight_import_jobs
    where id = (select (result ->> 'id')::uuid from failed_commit_prepared)
  )
  and not exists (
    select 1 from public.insights
    where normalized_url = 'https://commit.example/failed-atomic'
  ),
  '실패한 반영은 인사이트를 남기지 않고 재시도 상태를 기록한다'
);
select extensions.ok(
  public.retry_insight_import(
    (select (result ->> 'id')::uuid from failed_commit_prepared),
    jsonb_build_array(jsonb_build_object(
      'collectionKey', '["실패 분류"]',
      'target', jsonb_build_object('kind', 'new', 'name', '재시도', 'colorKey', 'blue-2')
    ))
  ) ->> 'createdCount' = '1',
  '실패 작업은 재시도 RPC로 다시 반영할 수 있다'
);

create temporary table invalid_color_prepared on commit drop as
select public.prepare_insight_import(
  'file', 'generic-csv', repeat('6', 64),
  jsonb_build_array(jsonb_build_object(
    'candidateId', 'invalid-color', 'capturedAtCandidate', null,
    'collectionPath', jsonb_build_array('잘못된 색상'), 'explicitMemoCandidate', null,
    'originalUrl', 'https://commit.example/invalid-color',
    'normalizedUrl', 'https://commit.example/invalid-color', 'domain', 'commit.example',
    'sourceLocation', '행 5', 'titleCandidate', null,
    'warnings', '[]'::jsonb, 'exclusionCode', null
  ))
) as result;
select extensions.results_eq(
  $$
    select public.commit_insight_import(
      (select (result ->> 'id')::uuid from invalid_color_prepared),
      jsonb_build_array(jsonb_build_object(
        'collectionKey', '["잘못된 색상"]',
        'target', jsonb_build_object('kind', 'new', 'name', '잘못된 색상', 'colorKey', 'invalid')
      ))
    )
  $$,
  $$ values ('{"ok": false, "reason": "commit-failed"}'::jsonb) $$,
  '잘못된 분류 색상은 원자적으로 반영을 실패시킨다'
);

create temporary table missing_collection_prepared on commit drop as
select public.prepare_insight_import(
  'file', 'generic-csv', repeat('7', 64),
  jsonb_build_array(jsonb_build_object(
    'candidateId', 'missing-collection', 'capturedAtCandidate', null,
    'collectionPath', jsonb_build_array('실제 모음'), 'explicitMemoCandidate', null,
    'originalUrl', 'https://commit.example/missing-collection',
    'normalizedUrl', 'https://commit.example/missing-collection', 'domain', 'commit.example',
    'sourceLocation', '행 6', 'titleCandidate', null,
    'warnings', '[]'::jsonb, 'exclusionCode', null
  ))
) as result;
select extensions.results_eq(
  $$
    select public.commit_insight_import(
      (select (result ->> 'id')::uuid from missing_collection_prepared),
      jsonb_build_array(jsonb_build_object(
        'collectionKey', '["없는 모음"]',
        'target', jsonb_build_object('kind', 'uncategorized')
      ))
    )
  $$,
  $$ values ('{"ok": false, "reason": "commit-failed"}'::jsonb) $$,
  '준비 작업에 없는 모음 키는 원자적으로 반영을 실패시킨다'
);
select extensions.ok(
  not exists (
    select 1
    from public.insights
    where normalized_url in (
      'https://commit.example/invalid-color',
      'https://commit.example/missing-collection'
    )
  )
  and not exists (
    select 1
    from public.categories
    where user_id = '00000000-0000-4000-8000-000000000021'
      and normalized_name in ('잘못된 색상', '없는 모음')
  ),
  '잘못된 매핑은 인사이트와 분류를 남기지 않는다'
);

create temporary table invalid_state_jobs (
  state text primary key,
  job_id uuid not null
) on commit drop;
insert into invalid_state_jobs (state, job_id)
values
  (
    'analyzing',
    (
      public.prepare_insight_import(
        'file', 'generic-csv', repeat('8', 64), '[]'::jsonb
      ) ->> 'id'
    )::uuid
  ),
  (
    'committing',
    (
      public.prepare_insight_import(
        'file', 'generic-csv', repeat('9', 64), '[]'::jsonb
      ) ->> 'id'
    )::uuid
  ),
  (
    'undone',
    (
      public.prepare_insight_import(
        'file', 'generic-csv', repeat('0', 64), '[]'::jsonb
      ) ->> 'id'
    )::uuid
  );
reset role;
update public.insight_import_jobs as job
set
  status = state.state,
  expires_at = case when state.state = 'undone' then null else job.expires_at end
from invalid_state_jobs as state
where job.id = state.job_id;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"00000000-0000-4000-8000-000000000021","role":"authenticated"}';
select extensions.throws_ok(
  $$
    select public.commit_insight_import(
      (select job_id from invalid_state_jobs where state = 'analyzing'),
      '[]'::jsonb
    )
  $$,
  '22023',
  null,
  '분석 중 작업은 반영할 수 없다'
);
select extensions.throws_ok(
  $$
    select public.commit_insight_import(
      (select job_id from invalid_state_jobs where state = 'committing'),
      '[]'::jsonb
    )
  $$,
  '22023',
  null,
  '이미 반영 중인 작업은 다시 반영할 수 없다'
);
select extensions.throws_ok(
  $$
    select public.commit_insight_import(
      (select job_id from invalid_state_jobs where state = 'undone'),
      '[]'::jsonb
    )
  $$,
  '22023',
  null,
  '되돌린 작업은 다시 반영할 수 없다'
);

reset role;
select extensions.ok(
  has_function_privilege('authenticated', 'public.commit_insight_import(uuid, jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.retry_insight_import(uuid, jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.commit_insight_import(uuid, jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.retry_insight_import(uuid, jsonb)', 'execute'),
  '반영과 재시도 RPC는 인증 사용자에게만 실행 권한을 부여한다'
);

select * from extensions.finish();
rollback;
