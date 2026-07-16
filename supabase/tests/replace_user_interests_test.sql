begin;
select plan(11);

select has_function(
  'public',
  'replace_user_interests',
  array['uuid[]'],
  'replace_user_interests(uuid[]) exists'
);

select ok(
  not has_function_privilege('anon', 'public.replace_user_interests(uuid[])', 'EXECUTE'),
  'anon cannot execute'
);

select ok(
  has_function_privilege('authenticated', 'public.replace_user_interests(uuid[])', 'EXECUTE'),
  'authenticated can execute'
);

-- Fixture user는 auth.users에 넣고 request.jwt.claim.sub를 설정한다.
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'onboarding-a@example.test',
  now(),
  now()
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);

select is(
  cardinality(public.replace_user_interests(array[
    (select id from public.interests where launch_status='active' order by display_order limit 1)
  ])),
  1,
  'first save stores one interest'
);

select is(
  (select count(*)::integer from public.user_interests),
  1,
  'one user_interest row exists'
);

select throws_ok(
  $$ select public.replace_user_interests(array[]::uuid[]) $$,
  'P0001',
  'INTEREST_COUNT_OUT_OF_RANGE',
  'empty list rejected'
);

select is(
  (select count(*)::integer from public.user_interests),
  1,
  'failed replacement preserves previous rows'
);

select throws_ok(
  $$ select public.replace_user_interests(array[
    (select id from public.interests order by display_order limit 1),
    (select id from public.interests order by display_order limit 1)
  ]) $$,
  'P0001',
  'INTEREST_IDS_DUPLICATED',
  'duplicate ids rejected'
);

select throws_ok(
  $$ select public.replace_user_interests(array[gen_random_uuid()]) $$,
  'P0001',
  'INTEREST_NOT_SELECTABLE',
  'unknown id rejected'
);

select throws_ok(
  $$
  select public.replace_user_interests(
    (select array_agg(id order by display_order)
     from (select id, display_order from public.interests order by display_order limit 4) selected)
  )
  $$,
  'P0001',
  'INTEREST_COUNT_OUT_OF_RANGE',
  'four ids rejected'
);

reset role;
update public.interests
set launch_status = 'hidden'
where id = (select id from public.interests order by display_order limit 1);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);

select throws_ok(
  $$ select public.replace_user_interests(array[
    (select id from public.interests where launch_status = 'hidden' order by display_order limit 1)
  ]) $$,
  'P0001',
  'INTEREST_NOT_SELECTABLE',
  'hidden interest rejected'
);

reset role;
select * from finish();
rollback;
