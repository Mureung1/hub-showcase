begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(9);

select extensions.has_table(
  'public',
  'categories',
  '사용자 카테고리 테이블이 존재한다'
);

select extensions.ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.categories'::regclass
  ),
  '카테고리 테이블에 RLS가 활성화되어 있다'
);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000011', 'category-owner@example.com'),
  ('00000000-0000-4000-8000-000000000012', 'category-other@example.com');

insert into public.categories (
  id,
  user_id,
  name,
  color_key,
  sort_order
) values (
  '20000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000012',
  '다른 사용자 카테고리',
  'blue-2',
  0
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated"}';

select extensions.lives_ok(
  $$
    do $test$
    declare
      visible_name text;
    begin
      insert into public.categories (
        id,
        user_id,
        name,
        color_key,
        sort_order
      ) values (
        '20000000-0000-4000-8000-000000000011',
        '00000000-0000-4000-8000-000000000011',
        '개발',
        'green-2',
        0
      );

      select name
      into visible_name
      from public.categories
      where id = '20000000-0000-4000-8000-000000000011';

      if visible_name is distinct from '개발' then
        raise exception '생성한 카테고리를 조회하지 못했습니다.';
      end if;
    end
    $test$
  $$,
  '로그인 사용자는 자신의 카테고리를 생성하고 조회할 수 있다'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.categories
    where id = '20000000-0000-4000-8000-000000000012'
  $$,
  array[0::bigint],
  '다른 사용자의 카테고리는 조회할 수 없다'
);

select extensions.results_eq(
  $$
    update public.categories
    set name = '침범 시도'
    where id = '20000000-0000-4000-8000-000000000012'
    returning id
  $$,
  $$ select null::uuid where false $$,
  '다른 사용자의 카테고리는 수정되지 않는다'
);

select extensions.throws_ok(
  $$
    select public.delete_user_category(
      '20000000-0000-4000-8000-000000000012'
    )
  $$,
  '42501',
  '삭제할 수 있는 카테고리가 아닙니다.',
  '다른 사용자의 카테고리는 함수로 삭제할 수 없다'
);

insert into public.insights (
  id,
  user_id,
  original_url,
  normalized_url,
  domain,
  title,
  category_id
) values (
  '30000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000011',
  'https://category-owner.example/article',
  'https://category-owner.example/article',
  'category-owner.example',
  '카테고리 연결 인사이트',
  '20000000-0000-4000-8000-000000000011'
);

select extensions.throws_ok(
  $$
    update public.insights
    set category_id = '20000000-0000-4000-8000-000000000012'
    where id = '30000000-0000-4000-8000-000000000011'
  $$,
  '23503',
  null,
  '다른 사용자의 카테고리를 내 인사이트에 연결할 수 없다'
);

select extensions.lives_ok(
  $$
    select public.delete_user_category(
      '20000000-0000-4000-8000-000000000011'
    )
  $$,
  '자신의 카테고리를 함수로 삭제할 수 있다'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.insights
    where id = '30000000-0000-4000-8000-000000000011'
      and category_id is null
  $$,
  array[1::bigint],
  '카테고리 삭제 뒤 인사이트는 남고 미분류 상태가 된다'
);

select * from extensions.finish();
rollback;
