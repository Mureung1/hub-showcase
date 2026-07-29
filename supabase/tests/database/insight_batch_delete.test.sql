begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(6);

select extensions.has_function(
  'public',
  'delete_user_insights',
  array['uuid[]'],
  '인사이트 일괄 삭제 함수가 존재한다'
);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000021', 'batch-owner@example.com'),
  ('00000000-0000-4000-8000-000000000022', 'batch-other@example.com');

insert into public.insights (
  id,
  user_id,
  original_url,
  normalized_url,
  domain,
  title
) values
  (
    '10000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000021',
    'https://batch-owner.example/one',
    'https://batch-owner.example/one',
    'batch-owner.example',
    '소유자 첫 번째 인사이트'
  ),
  (
    '10000000-0000-4000-8000-000000000022',
    '00000000-0000-4000-8000-000000000021',
    'https://batch-owner.example/two',
    'https://batch-owner.example/two',
    'batch-owner.example',
    '소유자 두 번째 인사이트'
  ),
  (
    '10000000-0000-4000-8000-000000000023',
    '00000000-0000-4000-8000-000000000022',
    'https://batch-other.example/hidden',
    'https://batch-other.example/hidden',
    'batch-other.example',
    '다른 사용자 인사이트'
  );

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"00000000-0000-4000-8000-000000000021","role":"authenticated"}';

select extensions.results_eq(
  $$
    select *
    from public.delete_user_insights(array[
      '10000000-0000-4000-8000-000000000021'::uuid,
      '10000000-0000-4000-8000-000000000022'::uuid
    ])
    order by id
  $$,
  $$
    values
      ('10000000-0000-4000-8000-000000000021'::uuid),
      ('10000000-0000-4000-8000-000000000022'::uuid)
  $$,
  '자신의 유효한 인사이트 전체를 한 번에 삭제한다'
);

insert into public.insights (
  id,
  user_id,
  original_url,
  normalized_url,
  domain,
  title
) values
  (
    '10000000-0000-4000-8000-000000000024',
    '00000000-0000-4000-8000-000000000021',
    'https://batch-owner.example/three',
    'https://batch-owner.example/three',
    'batch-owner.example',
    '소유자 세 번째 인사이트'
  ),
  (
    '10000000-0000-4000-8000-000000000025',
    '00000000-0000-4000-8000-000000000021',
    'https://batch-owner.example/four',
    'https://batch-owner.example/four',
    'batch-owner.example',
    '소유자 네 번째 인사이트'
  );

select extensions.throws_ok(
  $$
    select public.delete_user_insights(array[
      '10000000-0000-4000-8000-000000000024'::uuid,
      '10000000-0000-4000-8000-000000000099'::uuid
    ])
  $$,
  'P0002',
  '삭제할 인사이트 전체를 찾지 못했습니다.',
  '존재하지 않는 ID가 섞이면 요청 전체를 거부한다'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.insights
    where id in (
      '10000000-0000-4000-8000-000000000024',
      '10000000-0000-4000-8000-000000000025'
    )
  $$,
  array[2::bigint],
  '거부된 요청은 자신의 유효한 인사이트도 삭제하지 않는다'
);

select extensions.throws_ok(
  $$
    select public.delete_user_insights(array[
      '10000000-0000-4000-8000-000000000025'::uuid,
      '10000000-0000-4000-8000-000000000023'::uuid
    ])
  $$,
  'P0002',
  '삭제할 인사이트 전체를 찾지 못했습니다.',
  '다른 사용자의 ID가 섞이면 요청 전체를 거부한다'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.insights
    where id = '10000000-0000-4000-8000-000000000025'
  $$,
  array[1::bigint],
  '다른 사용자 ID가 섞인 요청도 자신의 인사이트를 삭제하지 않는다'
);

select * from extensions.finish();
rollback;
