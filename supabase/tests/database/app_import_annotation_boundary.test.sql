begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'app-owner@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a9999999-9999-4999-8999-999999999999',
   'authenticated', 'authenticated', 'app-other@example.test', '', now(), '{}', '{}', now(), now());

set local role service_role;
insert into public.projects(id, owner_id, title)
values (
  'a2222222-2222-4222-8222-222222222222',
  'a1111111-1111-4111-8111-111111111111',
  'Service boundary project'
);

select is(
  (select source ->> 'project_id'
   from public.app_import_source_context(
     'a1111111-1111-4111-8111-111111111111',
     'a2222222-2222-4222-8222-222222222222',
     'note', 'Service import', 'owner-only context', 'paste'
   )),
  'a2222222-2222-4222-8222-222222222222',
  'service import persists context for the validated actor'
);

select throws_ok($$
  select * from public.app_import_source_context(
    'a9999999-9999-4999-8999-999999999999',
    'a2222222-2222-4222-8222-222222222222',
    'note', 'Forged import', 'must not persist', 'paste'
  )
$$, '42501', 'insufficient_privilege', 'service import rechecks actor ownership');

insert into public.analysis_runs(
  id, project_id, created_by, idempotency_key, request_fingerprint,
  status, provider_mode, result_jsonb, completed_at
) values (
  'abbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'a2222222-2222-4222-8222-222222222222',
  'a1111111-1111-4111-8111-111111111111',
  'app-boundary-run', repeat('a', 64),
  'succeeded', 'local',
  '{"decisions":[{"id":"decision-1"}]}'::jsonb,
  now()
);

select is(
  (select outcome from public.app_create_analysis_run_annotation(
    'a1111111-1111-4111-8111-111111111111',
    'abbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'app-annotation-1', 'note', 'run', null, 'Actor-owned feedback'
  )),
  'created',
  'service annotation persists feedback for the validated actor'
);

select throws_ok($$
  select * from public.app_create_analysis_run_annotation(
    'a9999999-9999-4999-8999-999999999999',
    'abbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'forged-annotation', 'note', 'run', null, 'must not persist'
  )
$$, '42501', 'insufficient_privilege', 'service annotation rechecks actor ownership');

select * from finish(true);
rollback;
