begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(25);

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
  selected_category_id, ordinal
) values (
  '40000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000021',
  'owner-1',
  'https://owner.example/import',
  '행 1',
  'new',
  '20000000-0000-4000-8000-000000000021',
  1
), (
  '40000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000022',
  'other-1',
  'https://other.example/import',
  '행 1',
  'existing_duplicate',
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

select * from extensions.finish();
rollback;
