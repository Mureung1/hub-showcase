begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(4);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.categories
    where user_id = '00000000-0000-4000-8000-000000000071'
      and normalized_name = '개발'
  $$,
  array[1::bigint],
  '공백만 다른 기존 문자열은 사용자 카테고리 하나로 병합된다'
);

select extensions.results_eq(
  $$
    select
      count(distinct category_id)::bigint,
      bool_and(category_id is not null)
    from public.insights
    where user_id = '00000000-0000-4000-8000-000000000071'
  $$,
  $$
    values (1::bigint, true)
  $$,
  '병합한 카테고리를 모든 기존 인사이트에 연결한다'
);

select extensions.results_eq(
  $$
    select name, color_key, sort_order
    from public.categories
    where user_id = '00000000-0000-4000-8000-000000000071'
  $$,
  $$
    values ('개발'::text, 'green-2'::text, 0)
  $$,
  '기존 대표 이름과 고정 색상 및 정렬 순서를 유지한다'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.insights
    where (
      id = '30000000-0000-4000-8000-000000000071'
      and updated_at = '2026-07-02 00:00:00+00'::timestamptz
    ) or (
      id = '30000000-0000-4000-8000-000000000072'
      and updated_at = '2026-07-04 00:00:00+00'::timestamptz
    )
  $$,
  array[2::bigint],
  'category_id 백필 중 기존 인사이트 수정 시각을 보존한다'
);

select * from extensions.finish();
rollback;
