begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create or replace function pg_temp.public_has_execute(p_signature regprocedure)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(bool_or(privilege.privilege_type = 'EXECUTE'), false)
  from pg_catalog.pg_proc procedure
  cross join lateral pg_catalog.aclexplode(
    coalesce(procedure.proacl, pg_catalog.acldefault('f', procedure.proowner))
  ) privilege
  where procedure.oid = p_signature
    and privilege.grantee = 0
$$;

select col_default_is(
  'public', 'projects', 'retention_days', '90',
  'projects default to 90-day retention'
);
select has_column('public', 'share_links', 'disclosure_mode', 'share links store disclosure mode');
select has_column('public', 'share_links', 'include_project_title', 'share links store title consent');
select function_privs_are(
  'public', 'app_purge_expired_project_data', array['integer'],
  'authenticated', array[]::text[], 'authenticated clients cannot run retention deletion'
);
select function_privs_are(
  'public', 'app_purge_expired_project_data', array['integer'],
  'service_role', array['EXECUTE'], 'service role can run bounded retention deletion'
);
select is(
  pg_temp.public_has_execute('public.app_purge_expired_project_data(integer)'::regprocedure),
  false,
  'PUBLIC cannot run retention deletion'
);
select is(
  has_function_privilege(
    'anon', 'public.app_purge_expired_project_data(integer)', 'EXECUTE'
  ),
  false,
  'anonymous clients cannot run retention deletion'
);
select function_privs_are(
  'public', 'app_preview_expired_project_data', array[]::text[],
  'authenticated', array[]::text[], 'authenticated clients cannot preview global retention impact'
);
select function_privs_are(
  'public', 'app_preview_expired_project_data', array[]::text[],
  'service_role', array['EXECUTE'], 'service role can preview global retention impact'
);
select is(
  pg_temp.public_has_execute('public.app_preview_expired_project_data()'::regprocedure),
  false,
  'PUBLIC cannot preview global retention impact'
);
select is(
  has_function_privilege(
    'anon', 'public.app_preview_expired_project_data()', 'EXECUTE'
  ),
  false,
  'anonymous clients cannot preview global retention impact'
);
select function_privs_are(
  'public', 'app_preview_project_retention', array['uuid', 'uuid', 'smallint'],
  'authenticated', array[]::text[], 'authenticated clients cannot bypass the retention preview boundary'
);
select function_privs_are(
  'public', 'app_preview_project_retention', array['uuid', 'uuid', 'smallint'],
  'service_role', array['EXECUTE'], 'service role can preview an owned project retention change'
);
select is(
  pg_temp.public_has_execute(
    'public.app_preview_project_retention(uuid,uuid,smallint)'::regprocedure
  ),
  false,
  'PUBLIC cannot preview project retention impact'
);
select is(
  has_function_privilege(
    'anon',
    'public.app_preview_project_retention(uuid,uuid,smallint)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot preview project retention impact'
);
select function_privs_are(
  'public', 'app_purge_expired_project_data_until_drained', array['integer', 'integer'],
  'service_role', array['EXECUTE'], 'service role can drain a bounded retention backlog'
);
select is(
  pg_temp.public_has_execute(
    'public.app_purge_expired_project_data_until_drained(integer,integer)'::regprocedure
  ),
  false,
  'PUBLIC cannot drain the retention backlog'
);
select is(
  has_function_privilege(
    'anon',
    'public.app_purge_expired_project_data_until_drained(integer,integer)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot drain the retention backlog'
);
select is(
  pg_temp.public_has_execute('public.app_update_project(uuid,uuid,jsonb)'::regprocedure),
  false,
  'PUBLIC cannot call the project mutation boundary'
);
select is(
  has_function_privilege(
    'anon', 'public.app_update_project(uuid,uuid,jsonb)', 'EXECUTE'
  ),
  false,
  'anonymous clients cannot call the project mutation boundary'
);
select is(
  pg_temp.public_has_execute(
    'public.app_create_share_link(uuid,uuid,text,timestamp with time zone,text,boolean)'::regprocedure
  ),
  false,
  'PUBLIC cannot create disclosure-aware share links'
);
select is(
  has_function_privilege(
    'anon',
    'public.app_create_share_link(uuid,uuid,text,timestamp with time zone,text,boolean)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot create disclosure-aware share links'
);
select is(
  pg_temp.public_has_execute('public.resolve_shared_analysis(text)'::regprocedure),
  false,
  'PUBLIC cannot resolve share hashes directly'
);
select is(
  has_function_privilege(
    'anon', 'public.resolve_shared_analysis(text)', 'EXECUTE'
  ),
  false,
  'anonymous clients cannot resolve share hashes directly'
);
select is(
  pg_temp.public_has_execute(
    'public.app_consume_public_rate_limit(text,text,integer,integer)'::regprocedure
  ),
  false,
  'PUBLIC cannot mutate public rate-limit buckets'
);
select is(
  has_function_privilege(
    'anon',
    'public.app_consume_public_rate_limit(text,text,integer,integer)',
    'EXECUTE'
  ),
  false,
  'anonymous clients cannot mutate public rate-limit buckets'
);

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'b1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'retention-owner@example.test', '', now(),
  '{}', '{}', now(), now()
);

set local role service_role;

select ok(
  public.app_consume_public_rate_limit(
    'auth:magic:ip:hour', repeat('8', 64), 10, 3600
  ),
  'Magic Link IP limiter tuple is accepted by the database contract'
);
select ok(
  public.app_consume_public_rate_limit(
    'auth:magic:email:hour', repeat('9', 64), 3, 3600
  ),
  'Magic Link email limiter tuple is accepted by the database contract'
);
select throws_ok($$
  select public.app_consume_public_rate_limit(
    'auth:magic:email:hour', repeat('9', 64), 4, 3600
  )
$$, 'P0001', 'INVALID_RATE_LIMIT', 'Magic Link callers cannot weaken the email limit');

insert into public.projects(id, owner_id, title, retention_days) values
  ('b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111', 'Ninety day project', 90),
  ('b3333333-3333-4333-8333-333333333333', 'b1111111-1111-4111-8111-111111111111', 'Thirty day project', 30),
  ('b4444444-4444-4444-8444-444444444444', 'b1111111-1111-4111-8111-111111111111', 'Keep until deleted', null);

insert into public.projects(id, owner_id, title) values (
  'b4555555-4555-4555-8555-455555555555',
  'b1111111-1111-4111-8111-111111111111',
  'New default project'
);
select is(
  (select retention_days from public.projects where id = 'b4555555-4555-4555-8555-455555555555'),
  90::smallint,
  'projects inserted after the migration receive the 90-day default'
);
select is(
  (select retention_days from public.projects where id = 'b4444444-4444-4444-8444-444444444444'),
  null::smallint,
  'an explicit pre-existing-style null retention choice remains unlimited'
);

select throws_ok($$
  select public.app_update_project(
    'b1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    '{"retention_days":30}'::jsonb
  )
$$, 'P0001', 'RETENTION_REDUCTION_CONFIRMATION_REQUIRED', '90-to-30 retention reduction requires confirmation');
select throws_ok($$
  select public.app_update_project(
    'b1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    jsonb_build_object(
      'retention_days', 30,
      'retention_acknowledged', true,
      'retention_preview_fingerprint', repeat('f', 64)
    )
  )
$$, 'P0001', 'RETENTION_PREVIEW_STALE', 'a stale deletion preview cannot authorize shorter retention');

select is(
  (public.app_update_project(
    'b1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    jsonb_build_object(
      'retention_days', 30,
      'retention_acknowledged', true,
      'retention_preview_fingerprint', public.app_preview_project_retention(
        'b1111111-1111-4111-8111-111111111111',
        'b2222222-2222-4222-8222-222222222222',
        30
      ) ->> 'fingerprint'
    )
  )).retention_days,
  30::smallint,
  'project owner can confirm shorter retention through the service boundary'
);
select is(
  (public.app_update_project(
    'b1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    '{"retention_days":90}'::jsonb
  )).retention_days,
  90::smallint,
  'project owner can restore 90-day retention'
);
select throws_ok($$
  select public.app_update_project(
    'b1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    '{"retention_days":45}'::jsonb
  )
$$, 'P0001', 'INVALID_RETENTION_POLICY', 'unsupported retention values are rejected');
select throws_ok($$
  select public.app_update_project(
    'b1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    '{"retention_days":"30","retention_acknowledged":true}'::jsonb
  )
$$, 'P0001', 'INVALID_RETENTION_POLICY', 'string retention values use the stable policy error');
select throws_ok($$
  select public.app_update_project(
    'b1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    '{"retention_acknowledged":true}'::jsonb
  )
$$, 'P0001', 'INVALID_PROJECT_PATCH', 'a confirmation flag is consumed only with a real project patch');
select throws_ok($$
  select public.app_update_project(
    'b1111111-1111-4111-8111-111111111111',
    'b4444444-4444-4444-8444-444444444444',
    '{"retention_days":90}'::jsonb
  )
$$, 'P0001', 'RETENTION_REDUCTION_CONFIRMATION_REQUIRED', 'unlimited-to-finite retention requires confirmation');
select is(
  (public.app_update_project(
    'b1111111-1111-4111-8111-111111111111',
    'b4444444-4444-4444-8444-444444444444',
    jsonb_build_object(
      'retention_days', 90,
      'retention_acknowledged', true,
      'retention_preview_fingerprint', public.app_preview_project_retention(
        'b1111111-1111-4111-8111-111111111111',
        'b4444444-4444-4444-8444-444444444444',
        90
      ) ->> 'fingerprint'
    )
  )).retention_days,
  90::smallint,
  'unlimited-to-finite retention succeeds after confirmation'
);
select is(
  (public.app_update_project(
    'b1111111-1111-4111-8111-111111111111',
    'b4444444-4444-4444-8444-444444444444',
    '{"retention_days":null}'::jsonb
  )).retention_days,
  null::smallint,
  'returning to unlimited retention does not require deletion confirmation'
);

select throws_ok($$
  select public.app_purge_expired_project_data(null)
$$, 'P0001', 'INVALID_RETENTION_BATCH_SIZE', 'null cannot disable the retention batch bound');
select throws_ok($$
  select public.app_purge_expired_project_data(0)
$$, 'P0001', 'INVALID_RETENTION_BATCH_SIZE', 'zero is below the retention batch bound');
select throws_ok($$
  select public.app_purge_expired_project_data(5001)
$$, 'P0001', 'INVALID_RETENTION_BATCH_SIZE', 'values over 5000 exceed the retention batch bound');
select throws_ok($$
  select public.app_purge_expired_project_data_until_drained(500, null)
$$, 'P0001', 'INVALID_RETENTION_MAX_BATCHES', 'null cannot disable the retention drain bound');
select throws_ok($$
  select public.app_purge_expired_project_data_until_drained(500, 0)
$$, 'P0001', 'INVALID_RETENTION_MAX_BATCHES', 'zero is below the retention drain bound');
select throws_ok($$
  select public.app_purge_expired_project_data_until_drained(500, 101)
$$, 'P0001', 'INVALID_RETENTION_MAX_BATCHES', 'values over 100 exceed the retention drain bound');

insert into public.source_records(
  id, project_id, kind, title, content, content_sha256, char_count, occurred_at, created_at
) values
  ('b5000000-0000-4000-8000-000000000001', 'b2222222-2222-4222-8222-222222222222', 'meeting', 'Expired 90', 'expired ninety', encode(extensions.digest('expired ninety', 'sha256'), 'hex'), char_length('expired ninety'), now() - interval '91 days', now() - interval '91 days'),
  ('b5000000-0000-4000-8000-000000000002', 'b3333333-3333-4333-8333-333333333333', 'note', 'Expired 30', 'expired thirty', encode(extensions.digest('expired thirty', 'sha256'), 'hex'), char_length('expired thirty'), now() - interval '31 days', now() - interval '31 days'),
  ('b5000000-0000-4000-8000-000000000003', 'b4444444-4444-4444-8444-444444444444', 'research', 'Unlimited', 'keep unlimited', encode(extensions.digest('keep unlimited', 'sha256'), 'hex'), char_length('keep unlimited'), now() - interval '1000 days', now() - interval '1000 days'),
  ('b5000000-0000-4000-8000-000000000004', 'b2222222-2222-4222-8222-222222222222', 'feedback', 'Fresh 90', 'keep fresh', encode(extensions.digest('keep fresh', 'sha256'), 'hex'), char_length('keep fresh'), now() - interval '10 days', now() - interval '10 days'),
  ('b5000000-0000-4000-8000-000000000005', 'b2222222-2222-4222-8222-222222222222', 'meeting', 'Old meeting imported today', 'keep recent import', encode(extensions.digest('keep recent import', 'sha256'), 'hex'), char_length('keep recent import'), now() - interval '1 year', now());

insert into public.analysis_runs(
  id, project_id, created_by, idempotency_key, request_fingerprint,
  status, provider_mode, result_jsonb, completed_at
) values
  ('b6000000-0000-4000-8000-000000000001', 'b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111', 'expired-run-key', repeat('a', 64), 'succeeded', 'local', '{"decisions":[]}'::jsonb, now()),
  ('b6000000-0000-4000-8000-000000000002', 'b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111', 'fresh-run-key', repeat('b', 64), 'succeeded', 'local', '{"projectTitle":"Ninety day project","decisions":[]}'::jsonb, now());

insert into public.analysis_run_sources(
  analysis_run_id, source_record_id, source_title, source_kind,
  content_snapshot, content_sha256, char_count
) values
  ('b6000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000001', 'Expired 90', 'meeting', 'expired ninety', encode(extensions.digest('expired ninety', 'sha256'), 'hex'), char_length('expired ninety')),
  ('b6000000-0000-4000-8000-000000000002', 'b5000000-0000-4000-8000-000000000004', 'Fresh 90', 'feedback', 'keep fresh', encode(extensions.digest('keep fresh', 'sha256'), 'hex'), char_length('keep fresh'));

insert into public.share_links(
  id, analysis_run_id, created_by, token_hash, expires_at, disclosure_mode
) values (
  'b7000000-0000-4000-8000-000000000001',
  'b6000000-0000-4000-8000-000000000001',
  'b1111111-1111-4111-8111-111111111111', repeat('c', 64), now() + interval '1 day', 'summary'
);

create temporary table project_retention_preview_result(result jsonb) on commit drop;
insert into project_retention_preview_result
select public.app_preview_project_retention(
  'b1111111-1111-4111-8111-111111111111',
  'b2222222-2222-4222-8222-222222222222',
  30
);
select is(
  (select (result ->> 'expired_source_records')::integer from project_retention_preview_result),
  1,
  'project retention preview counts all expired sources for the proposed policy'
);
select is(
  (select (result ->> 'expired_analysis_runs')::integer from project_retention_preview_result),
  1,
  'project retention preview counts runs that would cascade'
);
select is(
  (select (result ->> 'affected_share_links')::integer from project_retention_preview_result),
  1,
  'project retention preview counts links that would cascade'
);
select matches(
  (select result ->> 'fingerprint' from project_retention_preview_result),
  '^[0-9a-f]{64}$',
  'project retention preview returns a deterministic confirmation fingerprint'
);
select throws_ok($$
  select public.app_preview_project_retention(
    'b9999999-9999-4999-8999-999999999999',
    'b2222222-2222-4222-8222-222222222222',
    30
  )
$$, '42501', 'insufficient_privilege', 'project retention preview hides another owner project');

create temporary table retention_preview_result(result jsonb) on commit drop;
insert into retention_preview_result select public.app_preview_expired_project_data();

select is(
  (select (result ->> 'expired_source_records')::integer from retention_preview_result),
  2,
  'retention preview counts expired sources without deleting them'
);
select is(
  (select (result ->> 'expired_analysis_runs')::integer from retention_preview_result),
  1,
  'retention preview counts runs linked to expired sources'
);
select is(
  (select (result ->> 'expired_orphan_analysis_runs')::integer from retention_preview_result),
  0,
  'retention preview separates orphaned runs'
);
select is(
  (select (result ->> 'affected_share_links')::integer from retention_preview_result),
  1,
  'retention preview reports share links removed by cascade'
);
select is(
  (select (result ->> 'affected_projects')::integer from retention_preview_result),
  2,
  'retention preview reports every affected project'
);
select is(
  (select count(*)::integer from public.source_records where id in (
    'b5000000-0000-4000-8000-000000000001',
    'b5000000-0000-4000-8000-000000000002'
  )),
  2,
  'retention preview is non-destructive'
);

select is(
  (public.app_purge_expired_project_data(500) ->> 'deleted_source_records')::integer,
  2,
  'retention deletes only expired sources from bounded projects'
);
select is(
  (select count(*)::integer from public.source_records where id in (
    'b5000000-0000-4000-8000-000000000003',
    'b5000000-0000-4000-8000-000000000004',
    'b5000000-0000-4000-8000-000000000005'
  )),
  3,
  'unlimited, fresh, and newly imported historical sources remain'
);
select is(
  (select count(*)::integer from public.analysis_runs where id = 'b6000000-0000-4000-8000-000000000001'),
  0,
  'a run containing an expired source is deleted'
);
select is(
  (select count(*)::integer from public.share_links where id = 'b7000000-0000-4000-8000-000000000001'),
  0,
  'retention cascades to share links'
);

insert into public.analysis_runs(
  id, project_id, created_by, idempotency_key, request_fingerprint,
  status, provider_mode, result_jsonb, created_at, completed_at
) values (
  'b6000000-0000-4000-8000-000000000003',
  'b2222222-2222-4222-8222-222222222222',
  'b1111111-1111-4111-8111-111111111111',
  'orphan-run-key', repeat('f', 64), 'succeeded', 'local',
  '{"decisions":[]}'::jsonb, now() - interval '91 days', now() - interval '91 days'
);
insert into public.analysis_run_sources(
  analysis_run_id, source_record_id, source_title, source_kind,
  content_snapshot, content_sha256, char_count, created_at
) values (
  'b6000000-0000-4000-8000-000000000003', null, 'Previously deleted source',
  'meeting', 'orphan snapshot',
  encode(extensions.digest('orphan snapshot', 'sha256'), 'hex'),
  char_length('orphan snapshot'), now() - interval '91 days'
);
insert into public.share_links(
  id, analysis_run_id, created_by, token_hash, expires_at
) values (
  'b7000000-0000-4000-8000-000000000002',
  'b6000000-0000-4000-8000-000000000003',
  'b1111111-1111-4111-8111-111111111111', repeat('a', 64), now() + interval '1 day'
);
select is(
  (public.app_purge_expired_project_data(500) ->> 'deleted_orphan_analysis_runs')::integer,
  1,
  'retention removes an old run whose source was deleted before this migration'
);
select is(
  (select count(*)::integer from public.analysis_runs where id = 'b6000000-0000-4000-8000-000000000003'),
  0,
  'the orphaned analysis run is deleted'
);
select is(
  (select count(*)::integer from public.share_links where id = 'b7000000-0000-4000-8000-000000000002'),
  0,
  'orphan cleanup cascades to its share link'
);
insert into public.analysis_runs(
  id, project_id, created_by, idempotency_key, request_fingerprint, status,
  provider_mode, result_jsonb, created_at, completed_at
) values
  (
    'b6000000-0000-4000-8000-000000000006',
    'b2222222-2222-4222-8222-222222222222',
    'b1111111-1111-4111-8111-111111111111',
    'zero-snapshot-old-key', repeat('6', 64), 'succeeded', 'local',
    '{"decisions":[]}'::jsonb, now() - interval '91 days', now() - interval '91 days'
  ),
  (
    'b6000000-0000-4000-8000-000000000007',
    'b2222222-2222-4222-8222-222222222222',
    'b1111111-1111-4111-8111-111111111111',
    'zero-snapshot-fresh-key', repeat('7', 64), 'succeeded', 'local',
    '{"decisions":[]}'::jsonb, now(), now()
  ),
  (
    'b6000000-0000-4000-8000-000000000008',
    'b4444444-4444-4444-8444-444444444444',
    'b1111111-1111-4111-8111-111111111111',
    'zero-snapshot-unlimited-key', repeat('8', 64), 'succeeded', 'local',
    '{"decisions":[]}'::jsonb, now() - interval '1 year', now() - interval '1 year'
  );
select is(
  (public.app_purge_expired_project_data(500) ->> 'deleted_orphan_analysis_runs')::integer,
  1,
  'an expired run with no snapshot rows is treated as orphaned data'
);
select is(
  (select count(*)::integer from public.analysis_runs where id = 'b6000000-0000-4000-8000-000000000006'),
  0,
  'the old zero-snapshot analysis run is deleted'
);
select is(
  (select count(*)::integer from public.analysis_runs where id = 'b6000000-0000-4000-8000-000000000007'),
  1,
  'a fresh zero-snapshot analysis run is retained'
);
select is(
  (select count(*)::integer from public.analysis_runs where id = 'b6000000-0000-4000-8000-000000000008'),
  1,
  'an unlimited-retention zero-snapshot analysis run is retained'
);

insert into public.source_records(
  id, project_id, kind, title, content, content_sha256, char_count, created_at
) values (
  'b5000000-0000-4000-8000-000000000006',
  'b2222222-2222-4222-8222-222222222222',
  'meeting', 'High fanout expired source', 'bounded fanout',
  encode(extensions.digest('bounded fanout', 'sha256'), 'hex'),
  char_length('bounded fanout'), now() - interval '91 days'
);
insert into public.analysis_runs(
  id, project_id, created_by, idempotency_key, request_fingerprint,
  status, provider_mode, result_jsonb, completed_at
) values
  ('b6000000-0000-4000-8000-000000000004', 'b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111', 'fanout-run-key-1', repeat('1', 64), 'succeeded', 'local', '{"decisions":[]}'::jsonb, now()),
  ('b6000000-0000-4000-8000-000000000005', 'b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111', 'fanout-run-key-2', repeat('2', 64), 'succeeded', 'local', '{"decisions":[]}'::jsonb, now());
insert into public.analysis_run_sources(
  analysis_run_id, source_record_id, source_title, source_kind,
  content_snapshot, content_sha256, char_count
) values
  ('b6000000-0000-4000-8000-000000000004', 'b5000000-0000-4000-8000-000000000006', 'High fanout expired source', 'meeting', 'bounded fanout', encode(extensions.digest('bounded fanout', 'sha256'), 'hex'), char_length('bounded fanout')),
  ('b6000000-0000-4000-8000-000000000005', 'b5000000-0000-4000-8000-000000000006', 'High fanout expired source', 'meeting', 'bounded fanout', encode(extensions.digest('bounded fanout', 'sha256'), 'hex'), char_length('bounded fanout'));
select is(
  (public.app_purge_expired_project_data(1) ->> 'deleted_analysis_runs')::integer,
  1,
  'a batch of one deletes at most one linked analysis run'
);
select is(
  (select count(*)::integer from public.analysis_runs where id in (
    'b6000000-0000-4000-8000-000000000004',
    'b6000000-0000-4000-8000-000000000005'
  )),
  1,
  'one linked run remains for the next bounded purge'
);
select is(
  (select count(*)::integer from public.source_records where id = 'b5000000-0000-4000-8000-000000000006'),
  1,
  'the source remains until every linked run has been deleted'
);
select is(
  (public.app_purge_expired_project_data(1) ->> 'deleted_analysis_runs')::integer,
  1,
  'the next bounded purge removes the remaining linked run'
);
select is(
  (select count(*)::integer from public.source_records where id = 'b5000000-0000-4000-8000-000000000006'),
  0,
  'the source is deleted only after its last linked run is gone'
);

insert into public.analysis_runs(
  id, project_id, created_by, idempotency_key, request_fingerprint, status,
  provider_mode, result_jsonb, created_at, completed_at
) values
  ('b6000000-0000-4000-8000-000000000009', 'b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111', 'drain-run-key-1', repeat('9', 64), 'succeeded', 'local', '{"decisions":[]}'::jsonb, now() - interval '91 days', now() - interval '91 days'),
  ('b6000000-0000-4000-8000-00000000000a', 'b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111', 'drain-run-key-2', repeat('a', 64), 'succeeded', 'local', '{"decisions":[]}'::jsonb, now() - interval '91 days', now() - interval '91 days'),
  ('b6000000-0000-4000-8000-00000000000b', 'b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111', 'drain-run-key-3', repeat('b', 64), 'succeeded', 'local', '{"decisions":[]}'::jsonb, now() - interval '91 days', now() - interval '91 days');
create temporary table retention_drain_result(result jsonb) on commit drop;
insert into retention_drain_result select public.app_purge_expired_project_data_until_drained(1, 2);
select is(
  (select (result ->> 'deleted_orphan_analysis_runs')::integer from retention_drain_result),
  2,
  'the drain wrapper honors the per-batch and maximum-batch bounds'
);
select is(
  (select (result ->> 'batches_executed')::integer from retention_drain_result),
  2,
  'the capped drain reports the number of executed batches'
);
select is(
  (select (result ->> 'drain_complete')::boolean from retention_drain_result),
  false,
  'the drain reports remaining eligible data when the batch cap is reached'
);
select is(
  (select count(*)::integer from public.analysis_runs where id in (
    'b6000000-0000-4000-8000-000000000009',
    'b6000000-0000-4000-8000-00000000000a',
    'b6000000-0000-4000-8000-00000000000b'
  )),
  1,
  'one eligible run remains after two batches of one'
);
delete from retention_drain_result;
insert into retention_drain_result select public.app_purge_expired_project_data_until_drained(1, 2);
select is(
  (select (result ->> 'deleted_orphan_analysis_runs')::integer from retention_drain_result),
  1,
  'the next drain removes the final eligible run'
);
select is(
  (select (result ->> 'batches_executed')::integer from retention_drain_result),
  2,
  'the completing drain includes its final no-progress eligibility check batch'
);
select is(
  (select (result ->> 'drain_complete')::boolean from retention_drain_result),
  true,
  'the drain reports complete only after a separate eligibility check'
);
select is(
  (public.app_create_share_link(
    'b1111111-1111-4111-8111-111111111111',
    'b6000000-0000-4000-8000-000000000002',
    repeat('d', 64), now() + interval '1 day', 'evidence', false
  )).disclosure_mode,
  'evidence',
  'evidence disclosure is stored through the service boundary'
);
select throws_ok($$
  select public.app_create_share_link(
    'b1111111-1111-4111-8111-111111111111',
    'b6000000-0000-4000-8000-000000000002',
    repeat('e', 64), now() + interval '8 days', 'evidence', false
  )
$$, 'P0001', 'INVALID_SHARE_EXPIRATION', 'evidence links cannot exceed seven days');
select is(
  (select project_title from public.resolve_shared_analysis(repeat('d', 64))),
  null::text,
  'project title remains private unless explicitly included'
);
select is(
  (select disclosure_mode from public.resolve_shared_analysis(repeat('d', 64))),
  'evidence',
  'public resolution returns the persisted disclosure mode'
);

reset role;
select is(
  (select count(*)::integer from cron.job where jobname = 'modu-brain-retention-daily'),
  1,
  'exactly one daily retention job is scheduled'
);

select is(
  (select schedule from cron.job where jobname = 'modu-brain-retention-daily'),
  '17 3 * * *',
  'retention Cron runs daily at the configured UTC time'
);
select is(
  (select command from cron.job where jobname = 'modu-brain-retention-daily'),
  'select public.app_purge_expired_project_data_until_drained(500, 20)',
  'retention Cron drains several bounded batches without an unbounded transaction'
);
select ok(
  (select active from cron.job where jobname = 'modu-brain-retention-daily'),
  'retention Cron is active'
);
select is(
  (select username from cron.job where jobname = 'modu-brain-retention-daily'),
  current_user,
  'retention Cron executes as the migration owner'
);
select ok(
  has_function_privilege(
    (select username from cron.job where jobname = 'modu-brain-retention-daily'),
    'public.app_purge_expired_project_data_until_drained(integer,integer)',
    'EXECUTE'
  ),
  'the scheduled role can execute the retention function'
);
select lives_ok(
  $$select public.app_purge_expired_project_data_until_drained(1, 2)$$,
  'the scheduled purge command is executable outside the service role'
);

select * from finish(true);
rollback;
