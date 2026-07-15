begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(14);

select extensions.has_table('public', 'insights', '인사이트 테이블이 존재한다');
select extensions.has_column('public', 'insights', 'user_id', '사용자 식별자를 저장한다');
select extensions.has_column('public', 'insights', 'normalized_url', '정규화 URL을 저장한다');
select extensions.has_column('public', 'insights', 'schema_version', '스키마 버전을 저장한다');

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
    delete from public.insights
    where id = '10000000-0000-4000-8000-000000000003'
    returning id
  $$,
  $$ select null::uuid where false $$,
  '다른 사용자의 인사이트는 삭제되지 않는다'
);

reset role;

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
