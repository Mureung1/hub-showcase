begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

select has_table('public', 'projects', 'projects table exists');
select has_table('public', 'analysis_runs', 'analysis_runs table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.projects'::regclass), 'projects RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.source_records'::regclass), 'sources RLS enabled');
select function_privs_are(
  'public', 'resolve_shared_analysis', array['text'], 'anon', array[]::text[],
  'anonymous users cannot resolve token hashes directly'
);
select function_privs_are(
  'public', 'start_analysis_run', array['uuid','uuid[]','text','text','text','text'],
  'authenticated', array['EXECUTE'], 'authenticated users can start an owned analysis'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'owner@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '99999999-9999-4999-8999-999999999999',
   'authenticated', 'authenticated', 'other@example.test', '', now(), '{}', '{}', now(), now());

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok($$
  insert into public.projects(id, owner_id, title)
  values ('22222222-2222-4222-8222-222222222222', auth.uid(), 'Owner project')
$$, 'owner can create a project');

insert into public.source_records(
  id, project_id, kind, title, content, content_sha256, char_count
) values (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  'meeting', 'Owner source', 'source one',
  encode(extensions.digest('source one', 'sha256'), 'hex'), 10
);

select is(
  (select count(*) from public.projects where id = '22222222-2222-4222-8222-222222222222'),
  1::bigint,
  'owner can read own project'
);
select lives_ok($$
  insert into public.source_records(
    id, project_id, kind, title, content, content_sha256, char_count
  ) values (
    '88888888-8888-4888-8888-888888888888',
    '22222222-2222-4222-8222-222222222222',
    'note', 'Emoji source', '😀', encode(extensions.digest('😀', 'sha256'), 'hex'), 1
  )
$$, 'Postgres char_length accepts one Unicode code point');
select is(
  (select char_count from public.source_records where id = '88888888-8888-4888-8888-888888888888'),
  1,
  'stored emoji char_count matches the API code-point metric'
);

set local "request.jwt.claim.sub" = '99999999-9999-4999-8999-999999999999';
select is(
  (select count(*) from public.projects where id = '22222222-2222-4222-8222-222222222222'),
  0::bigint,
  'another user cannot read project'
);
select is(
  (select count(*) from public.source_records where id = '33333333-3333-4333-8333-333333333333'),
  0::bigint,
  'another user cannot read source'
);
select is_empty($$
  update public.projects set title = 'stolen'
  where id = '22222222-2222-4222-8222-222222222222' returning id
$$, 'another user cannot update project');

set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
select is(
  (select outcome from public.start_analysis_run(
    '22222222-2222-4222-8222-222222222222',
    array['33333333-3333-4333-8333-333333333333'::uuid],
    'idempotency-key', repeat('b', 64), 'local', null
  )),
  'created',
  'first request atomically creates run and snapshots'
);
select is(
  (select outcome from public.start_analysis_run(
    '22222222-2222-4222-8222-222222222222',
    array['33333333-3333-4333-8333-333333333333'::uuid],
    'idempotency-key', repeat('b', 64), 'local', null
  )),
  'reused',
  'same key and fingerprint reuses the run'
);
select throws_ok($$
  select * from public.start_analysis_run(
    '22222222-2222-4222-8222-222222222222',
    array['33333333-3333-4333-8333-333333333333'::uuid],
    'idempotency-key', repeat('c', 64), 'local', null
  )
$$, 'P0001', 'IDEMPOTENCY_CONFLICT', 'same key with different semantic input is rejected');
select is((select count(*) from public.analysis_run_sources), 1::bigint, 'reuse does not duplicate snapshots');

select throws_like($$
  insert into public.analysis_runs(
    project_id, created_by, idempotency_key, request_fingerprint, status, provider_mode
  ) values (
    '22222222-2222-4222-8222-222222222222', auth.uid(), 'direct-run', repeat('a',64), 'running', 'local'
  )
$$, '%permission denied%', 'authenticated users cannot insert analysis runs directly');
select throws_like($$
  update public.analysis_runs set result_jsonb = '{"forged":true}'::jsonb
$$, '%permission denied%', 'authenticated users cannot update analysis results directly');
select throws_like($$
  insert into public.analysis_run_sources(
    analysis_run_id, source_record_id, source_title, source_kind, content_snapshot, content_sha256, char_count
  ) select id, '33333333-3333-4333-8333-333333333333', 'forged', 'meeting', 'x',
      encode(extensions.digest('x','sha256'),'hex'), 1 from public.analysis_runs limit 1
$$, '%permission denied%', 'authenticated users cannot insert immutable snapshots directly');
select throws_like($$
  insert into public.share_links(analysis_run_id, created_by, token_hash, expires_at)
  select id, auth.uid(), repeat('a',64), now() + interval '7 days' from public.analysis_runs limit 1
$$, '%permission denied%', 'authenticated users cannot insert share links directly');

set local role service_role;
select lives_ok($$
  update public.analysis_runs
  set status = 'succeeded',
      result_jsonb = '{"provider":{"model":"private"},"decisions":[{"id":"decision_public","evidence":[{"sourceRecordId":"33333333-3333-4333-8333-333333333333","sourceTitle":"Owner source","quote":"source one"}]}]}'::jsonb,
      completed_at = now()
  where project_id = '22222222-2222-4222-8222-222222222222'
$$, 'service role can complete an owned running analysis');

insert into public.projects(id, owner_id, title)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '99999999-9999-4999-8999-999999999999', 'Other project');
insert into public.analysis_runs(
  id, project_id, created_by, idempotency_key, request_fingerprint, status,
  provider_mode, result_jsonb, completed_at
) values (
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '99999999-9999-4999-8999-999999999999',
  'other-success', repeat('9',64), 'succeeded', 'local', '{"ok":true}'::jsonb, now()
);

insert into public.share_links(
  id, analysis_run_id, created_by, token_hash, created_at, expires_at, revoked_at
)
select '55555555-5555-4555-8555-555555555555', id,
  '11111111-1111-4111-8111-111111111111', repeat('d', 64), now(), now() + interval '7 days', null
from public.analysis_runs where idempotency_key = 'idempotency-key';
insert into public.share_links(
  id, analysis_run_id, created_by, token_hash, created_at, expires_at, revoked_at
)
select '66666666-6666-4666-8666-666666666666', id,
  '11111111-1111-4111-8111-111111111111', repeat('e', 64), now(), now() + interval '7 days', now()
from public.analysis_runs where idempotency_key = 'idempotency-key';
insert into public.share_links(
  id, analysis_run_id, created_by, token_hash, created_at, expires_at, revoked_at
)
select '77777777-7777-4777-8777-777777777777', id,
  '11111111-1111-4111-8111-111111111111', repeat('f', 64), now() - interval '2 days', now() - interval '1 day', null
from public.analysis_runs where idempotency_key = 'idempotency-key';

select is((select count(*) from public.resolve_shared_analysis(repeat('d', 64))), 1::bigint, 'active share resolves');
select is((select count(*) from public.resolve_shared_analysis(repeat('e', 64))), 0::bigint, 'revoked share does not resolve');
select is((select count(*) from public.resolve_shared_analysis(repeat('f', 64))), 0::bigint, 'expired share does not resolve');
select ok(
  (select not (result_jsonb ? 'provider')
      and position('sourceRecordId' in result_jsonb::text) = 0
      and position('33333333-3333-4333-8333-333333333333' in result_jsonb::text) = 0
   from public.resolve_shared_analysis(repeat('d', 64))),
  'shared projection strips provider and source identifiers recursively'
);

insert into public.analysis_runs(
  id, project_id, created_by, idempotency_key, request_fingerprint, status,
  provider_mode, started_at
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'stale-running', repeat('8',64), 'running', 'local', now() - interval '6 minutes'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
select throws_like($$
  update public.share_links
  set analysis_run_id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
  where id = '55555555-5555-4555-8555-555555555555'
$$, '%permission denied%', 'owner cannot retarget a share to another user run');
select throws_like($$
  update public.share_links set revoked_at = now()
  where id = '55555555-5555-4555-8555-555555555555'
$$, '%permission denied%', 'authenticated users cannot revoke shares directly');
select is(
  (select outcome from public.start_analysis_run(
    '22222222-2222-4222-8222-222222222222',
    array['33333333-3333-4333-8333-333333333333'::uuid],
    'fresh-after-stale', repeat('7',64), 'local', null
  )),
  'created',
  'a stale running lease no longer blocks a new analysis'
);
select is(
  (select status from public.analysis_runs where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'cancelled',
  'stale running lease is terminally cancelled'
);

set local "request.jwt.claim.sub" = '99999999-9999-4999-8999-999999999999';
select is((select count(*) from public.analysis_runs where created_by <> auth.uid()), 0::bigint, 'another user cannot read owner runs');
select is((select count(*) from public.share_links), 0::bigint, 'another user cannot read owner share links');

select * from finish(true);
rollback;
