-- TeamFlow BYOK Gemini credential and provider-neutral AI run verification.
-- Run only against TeamFlow project lmmeuoeuiouyowpthxwg after applying
-- 20260727185839_user_ai_credentials_and_live_runs.sql.
-- Do not run against TimeBox project vimywtpiqsixlfiegpdd.
-- Every fixture and assertion is enclosed by this transaction and ROLLBACK.

begin;

create temporary table byok_test_state (
  key text primary key,
  value uuid not null
) on commit drop;

grant select, insert, update, delete on table byok_test_state
  to authenticated, anon;

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'ASSERTION_FAILED:%', p_message;
  end if;
end;
$$;

create function pg_temp.expect_error(p_statement text, p_expected text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actual_message text;
begin
  begin
    execute p_statement;
  exception
    when others then
      actual_message := sqlerrm;
  end;

  if actual_message is null then
    raise exception 'ASSERTION_FAILED:expected error containing "%"', p_expected;
  end if;

  if position(p_expected in actual_message) = 0 then
    raise exception
      'ASSERTION_FAILED:expected error containing "%", got "%"',
      p_expected,
      actual_message;
  end if;
end;
$$;

insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    'd1000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'teamflow-byok-a@example.invalid',
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{"full_name":"BYOK A"}'::jsonb,
    now(),
    now()
  ),
  (
    'd1000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'teamflow-byok-b@example.invalid',
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{"full_name":"BYOK B"}'::jsonb,
    now(),
    now()
  ),
  (
    'd1000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'teamflow-byok-cascade@example.invalid',
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{"full_name":"BYOK Cascade"}'::jsonb,
    now(),
    now()
  );

insert into public.projects (
  id,
  owner_id,
  name,
  description,
  status,
  start_date,
  end_date
) values
  (
    'd2000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001',
    'BYOK project A',
    'Project used to verify live run metadata.',
    'in_progress',
    '2026-07-27',
    '2026-08-03'
  ),
  (
    'd2000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000002',
    'BYOK project B',
    'Isolated project used to verify RLS.',
    'in_progress',
    '2026-07-27',
    '2026-08-03'
  );

insert into public.members (
  id,
  project_id,
  auth_user_id,
  email,
  kind,
  name,
  initial,
  role,
  description,
  color,
  is_ai
) values
  (
    'd3000000-0000-4000-8000-000000000001',
    'd2000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001',
    'teamflow-byok-a@example.invalid',
    'user',
    'BYOK A',
    'A',
    'Developer',
    '',
    '#3a6898',
    false
  ),
  (
    'd3000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000002',
    'teamflow-byok-b@example.invalid',
    'user',
    'BYOK B',
    'B',
    'Reviewer',
    '',
    '#8a4e68',
    false
  );

insert into public.project_access (project_id, user_id, member_id) values
  (
    'd2000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001',
    'd3000000-0000-4000-8000-000000000001'
  ),
  (
    'd2000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000002',
    'd3000000-0000-4000-8000-000000000002'
  );

select pg_temp.assert_true(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.user_ai_credentials'::regclass
  ),
  'user_ai_credentials must have RLS enabled'
);

select pg_temp.assert_true(
  has_table_privilege('authenticated', 'public.user_ai_credentials', 'SELECT')
    and has_table_privilege('authenticated', 'public.user_ai_credentials', 'INSERT')
    and has_table_privilege('authenticated', 'public.user_ai_credentials', 'UPDATE')
    and has_table_privilege('authenticated', 'public.user_ai_credentials', 'DELETE'),
  'authenticated must have the credential DML privileges needed by the API'
);

select pg_temp.assert_true(
  not has_table_privilege(
    'anon',
    'public.user_ai_credentials',
    'SELECT'
  ),
  'anon must not have credential table access'
);

-- User A can manage only its own encrypted credential row.
select set_config(
  'request.jwt.claim.sub',
  'd1000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated","email":"teamflow-byok-a@example.invalid"}',
  true
);
set local role authenticated;

insert into public.user_ai_credentials (
  user_id,
  provider,
  encrypted_key,
  iv,
  auth_tag,
  encryption_version,
  key_hint,
  verified_at
) values (
  'd1000000-0000-4000-8000-000000000001',
  'gemini',
  'QUFBQUFBQUFBQUFBQUFBQUFB',
  'QUFBQUFBQUFBQUFB',
  'QUFBQUFBQUFBQUFBQUFBQQ==',
  1,
  'A001',
  now()
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.user_ai_credentials
    where user_id = 'd1000000-0000-4000-8000-000000000001'
      and key_hint = 'A001'
  ),
  'user A must read its own encrypted credential metadata'
);

select pg_temp.expect_error(
  $sql$
    insert into public.user_ai_credentials (
      user_id, provider, encrypted_key, iv, auth_tag,
      encryption_version, key_hint
    ) values (
      'd1000000-0000-4000-8000-000000000002',
      'gemini',
      'QkJCQkJCQkJCQkJCQkJCQkJC',
      'QkJCQkJCQkJCQkJC',
      'QkJCQkJCQkJCQkJCQkJCQg==',
      1,
      'B001'
    )
  $sql$,
  'row-level security'
);

select pg_temp.expect_error(
  $sql$
    insert into public.user_ai_credentials (
      user_id, provider, encrypted_key, iv, auth_tag,
      encryption_version, key_hint
    ) values (
      'd1000000-0000-4000-8000-000000000001',
      'openai',
      'Q0NDQ0NDQ0NDQ0NDQ0NDQ0ND',
      'Q0NDQ0NDQ0NDQ0ND',
      'Q0NDQ0NDQ0NDQ0NDQ0NDQw==',
      1,
      'C001'
    )
  $sql$,
  'user_ai_credentials_provider_check'
);

reset role;

insert into public.user_ai_credentials (
  user_id,
  provider,
  encrypted_key,
  iv,
  auth_tag,
  encryption_version,
  key_hint,
  verified_at
) values (
  'd1000000-0000-4000-8000-000000000002',
  'gemini',
  'QkJCQkJCQkJCQkJCQkJCQkJC',
  'QkJCQkJCQkJCQkJC',
  'QkJCQkJCQkJCQkJCQkJCQg==',
  1,
  'B001',
  now()
);

set local role authenticated;

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.user_ai_credentials
  ),
  'user A must not discover user B credential rows'
);

with updated as (
  update public.user_ai_credentials
  set key_hint = 'HACK'
  where user_id = 'd1000000-0000-4000-8000-000000000002'
  returning user_id
)
select pg_temp.assert_true(
  not exists (select 1 from updated),
  'user A must not update user B credential'
);

with deleted as (
  delete from public.user_ai_credentials
  where user_id = 'd1000000-0000-4000-8000-000000000002'
  returning user_id
)
select pg_temp.assert_true(
  not exists (select 1 from deleted),
  'user A must not delete user B credential'
);

reset role;

select pg_temp.assert_true(
  (
    select key_hint = 'B001'
    from public.user_ai_credentials
    where user_id = 'd1000000-0000-4000-8000-000000000002'
      and provider = 'gemini'
  ),
  'user B credential must remain unchanged after user A writes'
);

select pg_temp.expect_error(
  $sql$
    insert into public.user_ai_credentials (
      user_id, provider, encrypted_key, iv, auth_tag,
      encryption_version, key_hint
    ) values (
      'd1000000-0000-4000-8000-000000000003',
      'gemini',
      'Q0NDQ0NDQ0NDQ0NDQ0NDQ0ND',
      'Q0NDQ0NDQ0NDQ0ND',
      'Q0NDQ0NDQ0NDQ0NDQ0NDQw==',
      2,
      'C001'
    )
  $sql$,
  'user_ai_credentials_encryption_version_check'
);

insert into public.user_ai_credentials (
  user_id,
  provider,
  encrypted_key,
  iv,
  auth_tag,
  encryption_version,
  key_hint
) values (
  'd1000000-0000-4000-8000-000000000003',
  'gemini',
  'Q0NDQ0NDQ0NDQ0NDQ0NDQ0ND',
  'Q0NDQ0NDQ0NDQ0ND',
  'Q0NDQ0NDQ0NDQ0NDQ0NDQw==',
  1,
  'C001'
);

delete from auth.users
where id = 'd1000000-0000-4000-8000-000000000003';

select pg_temp.assert_true(
  not exists (
    select 1
    from public.user_ai_credentials
    where user_id = 'd1000000-0000-4000-8000-000000000003'
  ),
  'deleting an auth user must cascade its encrypted credential'
);

set local role anon;

select pg_temp.expect_error(
  'select count(*) from public.user_ai_credentials',
  'permission denied'
);

reset role;

-- User A creates one AI and two tasks to verify generic and compatibility RPCs.
select set_config(
  'request.jwt.claim.sub',
  'd1000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated","email":"teamflow-byok-a@example.invalid"}',
  true
);
set local role authenticated;

insert into byok_test_state (key, value)
select
  'ai_a',
  ((public.create_project_ai_agent(
    'd2000000-0000-4000-8000-000000000001',
    'Gemini Agent',
    'Evidence analyst',
    'Produces reviewed project evidence.',
    '#6950b8',
    'Use only the supplied project context.',
    '{"project":true,"notes":true,"tasks":true,"team":false,"resources":true}'::jsonb
  ) -> 'member' ->> 'id')::uuid);

with inserted_task as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  ) values (
    'd2000000-0000-4000-8000-000000000001',
    'Generate live evidence brief',
    (select value from byok_test_state where key = 'ai_a'),
    '2026-07-30',
    'in_progress',
    'Live Gemini execution fixture.'
  )
  returning id
)
insert into byok_test_state (key, value)
select 'live_task', id from inserted_task;

with inserted_task as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  ) values (
    'd2000000-0000-4000-8000-000000000001',
    'Generate deterministic Mock brief',
    (select value from byok_test_state where key = 'ai_a'),
    '2026-07-31',
    'not_started',
    'Legacy Mock RPC compatibility fixture.'
  )
  returning id
)
insert into byok_test_state (key, value)
select 'mock_task', id from inserted_task;

insert into byok_test_state (key, value)
select
  'live_run',
  ((public.create_ai_run(
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'live_task'),
    '{"task":{"title":"Generate live evidence brief"}}'::jsonb,
    '# Gemini result',
    'live',
    'gemini',
    'gemini-3.5-flash',
    '{"inputTokens":120,"outputTokens":40,"totalTokens":160}'::jsonb,
    1250
  ) ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'pending_review'
      and execution_mode = 'live'
      and provider = 'gemini'
      and model = 'gemini-3.5-flash'
      and usage = '{"inputTokens":120,"outputTokens":40,"totalTokens":160}'::jsonb
      and duration_ms = 1250
      and created_by = 'd1000000-0000-4000-8000-000000000001'
    from public.ai_runs
    where id = (select value from byok_test_state where key = 'live_run')
  ),
  'generic live RPC must persist provider metadata and the authenticated actor'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.create_ai_run(
        %L,
        %L,
        '{}'::jsonb,
        '# Duplicate live result',
        'live',
        'gemini',
        'gemini-3.5-flash',
        '{}'::jsonb,
        10
      )
    $sql$,
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'live_task')
  ),
  'TEAMFLOW_CONFLICT:AI_RUN_PENDING'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.create_ai_run(
        %L,
        %L,
        '{}'::jsonb,
        '# Invalid metadata',
        'live',
        'mock',
        'gemini-3.5-flash',
        '{}'::jsonb,
        10
      )
    $sql$,
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'mock_task')
  ),
  'INVALID_AI_RUN_METADATA'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.create_failed_ai_run(
        %L,
        %L,
        '{}'::jsonb,
        'Bad usage fixture',
        'live',
        'gemini',
        'gemini-3.5-flash',
        '{"promptTokenCount":1}'::jsonb,
        -1
      )
    $sql$,
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'mock_task')
  ),
  'INVALID_AI_RUN_METADATA'
);

select public.reject_ai_run(
  (select value from byok_test_state where key = 'live_run')
);

insert into byok_test_state (key, value)
select
  'failed_run',
  ((public.create_failed_ai_run(
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'live_task'),
    '{"task":{"title":"Generate live evidence brief"}}'::jsonb,
    'Gemini request timed out.',
    'live',
    'gemini',
    'gemini-3.5-flash',
    '{"inputTokens":null,"outputTokens":null,"totalTokens":null}'::jsonb,
    45000
  ) ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'failed'
      and execution_mode = 'live'
      and provider = 'gemini'
      and model = 'gemini-3.5-flash'
      and usage = '{"inputTokens":null,"outputTokens":null,"totalTokens":null}'::jsonb
      and duration_ms = 45000
      and result_markdown is null
      and error_message = 'Gemini request timed out.'
    from public.ai_runs
    where id = (select value from byok_test_state where key = 'failed_run')
  ),
  'generic failed RPC must persist sanitized failure metadata'
);

insert into byok_test_state (key, value)
select
  'live_retry',
  ((public.create_ai_run(
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'live_task'),
    '{"task":{"title":"Generate live evidence brief"}}'::jsonb,
    '# Successful retry',
    'live',
    'gemini',
    'gemini-3.5-flash',
    '{"inputTokens":100,"outputTokens":25,"totalTokens":125}'::jsonb,
    900
  ) ->> 'id')::uuid);

select public.apply_ai_run(
  (select value from byok_test_state where key = 'live_retry')
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.create_ai_run(
        %L,
        %L,
        '{}'::jsonb,
        '# Run after apply',
        'live',
        'gemini',
        'gemini-3.5-flash',
        '{}'::jsonb,
        10
      )
    $sql$,
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'live_task')
  ),
  'TEAMFLOW_CONFLICT:AI_RUN_APPLIED'
);

insert into byok_test_state (key, value)
select
  'mock_run',
  ((public.create_mock_ai_run(
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'mock_task'),
    '{"task":{"title":"Generate deterministic Mock brief"}}'::jsonb,
    '# Mock result'
  ) ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select execution_mode = 'mock'
      and provider is null
      and model is null
      and usage = '{}'::jsonb
      and duration_ms = 0
    from public.ai_runs
    where id = (select value from byok_test_state where key = 'mock_run')
  ),
  'legacy Mock RPC must keep its signature and populate compatibility metadata'
);

select public.reject_ai_run(
  (select value from byok_test_state where key = 'mock_run')
);

insert into byok_test_state (key, value)
select
  'failed_mock_run',
  ((public.create_failed_mock_ai_run(
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'mock_task'),
    '{"task":{"title":"Generate deterministic Mock brief"}}'::jsonb,
    'Deterministic Mock failure.'
  ) ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'failed'
      and execution_mode = 'mock'
      and provider is null
      and model is null
      and usage = '{}'::jsonb
      and duration_ms = 0
    from public.ai_runs
    where id = (select value from byok_test_state where key = 'failed_mock_run')
  ),
  'legacy failed Mock RPC must keep its signature and compatibility metadata'
);

select pg_temp.expect_error(
  format(
    $sql$
      insert into public.ai_runs (
        project_id,
        ai_member_id,
        task_id,
        status,
        context_snapshot,
        result_markdown,
        created_by,
        execution_mode,
        provider,
        model,
        usage,
        duration_ms
      ) values (
        'd2000000-0000-4000-8000-000000000001',
        %L,
        %L,
        'pending_review',
        '{}'::jsonb,
        '# Bypassed result',
        'd1000000-0000-4000-8000-000000000001',
        'live',
        'gemini',
        'gemini-3.5-flash',
        '{}'::jsonb,
        1
      )
    $sql$,
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'mock_task')
  ),
  'permission denied'
);

reset role;

-- User B cannot discover project A run rows or invoke project A run RPCs.
select set_config(
  'request.jwt.claim.sub',
  'd1000000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated","email":"teamflow-byok-b@example.invalid"}',
  true
);
set local role authenticated;

select pg_temp.assert_true(
  (
    select count(*) = 0
    from public.ai_runs
    where project_id = 'd2000000-0000-4000-8000-000000000001'
  ),
  'non-collaborator must not read project A run history'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.create_ai_run(
        %L,
        %L,
        '{}'::jsonb,
        '# Unauthorized result',
        'live',
        'gemini',
        'gemini-3.5-flash',
        '{}'::jsonb,
        10
      )
    $sql$,
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'mock_task')
  ),
  'AI_AGENT_NOT_FOUND'
);

reset role;

set local role anon;

select pg_temp.expect_error(
  format(
    $sql$
      select public.create_ai_run(
        %L,
        %L,
        '{}'::jsonb,
        '# Anonymous result',
        'live',
        'gemini',
        'gemini-3.5-flash',
        '{}'::jsonb,
        10
      )
    $sql$,
    (select value from byok_test_state where key = 'ai_a'),
    (select value from byok_test_state where key = 'mock_task')
  ),
  'permission denied'
);

reset role;

rollback;
