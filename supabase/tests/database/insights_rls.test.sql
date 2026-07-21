begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(33);

select extensions.has_table('public', 'insights', '인사이트 테이블이 존재한다');
select extensions.has_column('public', 'insights', 'user_id', '사용자 식별자를 저장한다');
select extensions.has_column('public', 'insights', 'normalized_url', '정규화 URL을 저장한다');
select extensions.has_column('public', 'insights', 'schema_version', '스키마 버전을 저장한다');
select extensions.has_column('public', 'insights', 'title_origin', '제목 출처를 저장한다');

select extensions.ok(
  (
    select attnotnull
    from pg_attribute
    where attrelid = 'public.insights'::regclass
      and attname = 'title_origin'
  ),
  '제목 출처는 null을 허용하지 않는다'
);

select extensions.ok(
  (
    select pg_get_expr(defaults.adbin, defaults.adrelid) = '''fallback''::text'
    from pg_attrdef defaults
    join pg_attribute attributes
      on attributes.attrelid = defaults.adrelid
      and attributes.attnum = defaults.adnum
    where defaults.adrelid = 'public.insights'::regclass
      and attributes.attname = 'title_origin'
  ),
  '기존·구버전 입력의 제목 출처는 fallback을 사용한다'
);

select extensions.ok(
  exists(
    select 1
    from pg_constraint
    where conrelid = 'public.insights'::regclass
      and conname = 'insights_title_length_check'
  ),
  '캡처 제목 길이를 제한한다'
);

select extensions.ok(
  (
    select count(*) = 2
    from pg_attrdef defaults
    join pg_attribute attributes
      on attributes.attrelid = defaults.adrelid
      and attributes.attnum = defaults.adnum
    where defaults.adrelid = 'public.insights'::regclass
      and attributes.attname in ('created_at', 'updated_at')
      and pg_get_expr(defaults.adbin, defaults.adrelid) = 'now()'
  ),
  '생성·수정 시각의 기본값은 시간대를 포함한 now()를 사용한다'
);

select extensions.ok(
  position(
    'new.updated_at = now();'
    in (select prosrc from pg_proc where oid = 'public.set_insights_updated_at()'::regprocedure)
  ) > 0,
  '수정 시각 트리거는 시간대를 포함한 now()를 사용한다'
);

select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.insights'::regclass),
  '인사이트 테이블에 RLS가 활성화되어 있다'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'insights'
      and roles = array['authenticated']::name[]
  $$,
  array[4::bigint],
  '인증 사용자용 CRUD 정책 네 개가 존재한다'
);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000001', 'owner@example.com'),
  ('00000000-0000-4000-8000-000000000002', 'other@example.com');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.lives_ok(
  $$
    insert into public.insights (
      id,
      user_id,
      original_url,
      normalized_url,
      domain,
      title
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'https://owner.example/article',
      'https://owner.example/article',
      'owner.example',
      '소유자 인사이트'
    )
  $$,
  '자신의 인사이트를 생성할 수 있다'
);

select extensions.results_eq(
  $$
    select title_origin
    from public.insights
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  array['fallback'::text],
  '제목 출처를 생략한 기존 입력은 fallback으로 저장한다'
);

select extensions.throws_ok(
  $$
    insert into public.insights (
      id,
      user_id,
      original_url,
      normalized_url,
      domain,
      title
    ) values (
      '10000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000002',
      'https://other.example/article',
      'https://other.example/article',
      'other.example',
      '다른 사용자 인사이트'
    )
  $$,
  '42501',
  null,
  '다른 사용자 소유로 생성할 수 없다'
);

reset role;
insert into public.insights (
  id,
  user_id,
  original_url,
  normalized_url,
  domain,
  title
) values (
  '10000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000002',
  'https://hidden.example/article',
  'https://hidden.example/article',
  'hidden.example',
  '숨겨진 인사이트'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.results_eq(
  $$ select count(*)::bigint from public.insights $$,
  array[1::bigint],
  '자신의 인사이트만 조회할 수 있다'
);

select extensions.lives_ok(
  $$
    update public.insights
    set title = '수정된 인사이트'
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  '자신의 인사이트를 수정할 수 있다'
);

select extensions.results_eq(
  $$
    select title
    from public.insights
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  array['수정된 인사이트'::text],
  '자신의 인사이트 수정 결과가 실제로 반영된다'
);

select extensions.throws_ok(
  $$
    update public.insights
    set user_id = '00000000-0000-4000-8000-000000000002'
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  '자신의 인사이트를 다른 사용자 소유로 변경할 수 없다'
);

select extensions.results_eq(
  $$
    update public.insights
    set title = '침범 시도'
    where id = '10000000-0000-4000-8000-000000000003'
    returning id
  $$,
  $$ select null::uuid where false $$,
  '다른 사용자의 인사이트는 수정되지 않는다'
);

select extensions.lives_ok(
  $$
    delete from public.insights
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  '자신의 인사이트를 삭제할 수 있다'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.insights
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  array[0::bigint],
  '자신의 인사이트 삭제 결과가 실제로 반영된다'
);

select extensions.results_eq(
  $$
    delete from public.insights
    where id = '10000000-0000-4000-8000-000000000003'
    returning id
  $$,
  $$ select null::uuid where false $$,
  '다른 사용자의 인사이트는 삭제되지 않는다'
);

reset role;

select extensions.lives_ok(
  $$
    insert into public.insights (
      user_id, original_url, normalized_url, domain, title, title_origin
    ) values
      (
        '00000000-0000-4000-8000-000000000001',
        'https://title-origin.example/capture',
        'https://title-origin.example/capture',
        'title-origin.example',
        '캡처 제목',
        'capture'
      ),
      (
        '00000000-0000-4000-8000-000000000001',
        'https://title-origin.example/metadata',
        'https://title-origin.example/metadata',
        'title-origin.example',
        '메타데이터 제목',
        'metadata'
      ),
      (
        '00000000-0000-4000-8000-000000000001',
        'https://title-origin.example/user',
        'https://title-origin.example/user',
        'title-origin.example',
        '사용자 제목',
        'user'
      )
  $$,
  '허용된 제목 출처를 모두 저장할 수 있다'
);

select extensions.lives_ok(
  $$
    insert into public.insights (
      user_id,
      original_url,
      normalized_url,
      domain,
      title,
      memo,
      category,
      title_origin
    ) values (
      '00000000-0000-4000-8000-000000000001',
      repeat('o', 4096),
      repeat('n', 4096),
      repeat('d', 253),
      repeat('t', 500),
      repeat('m', 200),
      repeat('c', 50),
      'capture'
    )
  $$,
  '캡처 필드의 정확한 최대 길이는 저장할 수 있다'
);

select extensions.throws_ok(
  $$
    insert into public.insights (
      user_id, original_url, normalized_url, domain, title, title_origin
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'https://title-origin.example/article',
      'https://title-origin.example/article',
      'title-origin.example',
      '잘못된 제목 출처',
      'unknown'
    )
  $$,
  '23514',
  null,
  '허용하지 않는 제목 출처를 거부한다'
);

select extensions.throws_ok(
  $$
    insert into public.insights (
      user_id, original_url, normalized_url, domain, title
    ) values (
      '00000000-0000-4000-8000-000000000001',
      repeat('x', 4097),
      'https://original-length.example/article',
      'original-length.example',
      '원문 URL 길이 초과'
    )
  $$,
  '23514',
  null,
  '원문 URL 최대 길이를 초과하면 거부한다'
);

select extensions.throws_ok(
  $$
    insert into public.insights (
      user_id, original_url, normalized_url, domain, title
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'https://normalized-length.example/article',
      repeat('x', 4097),
      'normalized-length.example',
      '정규화 URL 길이 초과'
    )
  $$,
  '23514',
  null,
  '정규화 URL 최대 길이를 초과하면 거부한다'
);

select extensions.throws_ok(
  $$
    insert into public.insights (
      user_id, original_url, normalized_url, domain, title
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'https://domain-length.example/article',
      'https://domain-length.example/article',
      repeat('x', 254),
      '도메인 길이 초과'
    )
  $$,
  '23514',
  null,
  '도메인 최대 길이를 초과하면 거부한다'
);

select extensions.throws_ok(
  $$
    insert into public.insights (
      user_id, original_url, normalized_url, domain, title
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'https://title-length.example/article',
      'https://title-length.example/article',
      'title-length.example',
      repeat('x', 501)
    )
  $$,
  '23514',
  null,
  '제목 최대 길이를 초과하면 거부한다'
);

select extensions.throws_ok(
  $$
    insert into public.insights (
      user_id, original_url, normalized_url, domain, title, memo
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'https://memo-length.example/article',
      'https://memo-length.example/article',
      'memo-length.example',
      '메모 길이 초과',
      repeat('x', 201)
    )
  $$,
  '23514',
  null,
  '메모 최대 길이를 초과하면 거부한다'
);

select extensions.throws_ok(
  $$
    insert into public.insights (
      user_id, original_url, normalized_url, domain, title, category
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'https://category-length.example/article',
      'https://category-length.example/article',
      'category-length.example',
      '카테고리 길이 초과',
      repeat('x', 51)
    )
  $$,
  '23514',
  null,
  '카테고리 최대 길이를 초과하면 거부한다'
);

select extensions.throws_ok(
  $$
    insert into public.insights (
      user_id,
      original_url,
      normalized_url,
      domain,
      title
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'https://duplicate.example/article?source=second',
      'https://duplicate.example/article',
      'duplicate.example',
      '중복 두 번째'
    ), (
      '00000000-0000-4000-8000-000000000001',
      'https://duplicate.example/article?source=first',
      'https://duplicate.example/article',
      'duplicate.example',
      '중복 첫 번째'
    )
  $$,
  '23505',
  null,
  '같은 사용자의 정규화 URL 중복을 막는다'
);

select * from extensions.finish();
rollback;
