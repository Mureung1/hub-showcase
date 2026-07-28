-- TeamFlow bounded Agent trace and atomic completion verification.
-- Run only against TeamFlow project lmmeuoeuiouyowpthxwg.
-- Never run against TimeBox project vimywtpiqsixlfiegpdd.
-- Every fixture and assertion is enclosed by this transaction and ROLLBACK.

begin;

create temporary table agent_trace_test_state (
  key text primary key,
  value uuid not null
) on commit drop;

grant select, insert, update, delete on table agent_trace_test_state
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

select pg_temp.assert_true(
  not private.is_valid_agent_trace('{}'::jsonb),
  'an empty object must not satisfy the Agent trace contract'
);

select pg_temp.assert_true(
  not private.is_valid_agent_trace(
    '{
      "version":1,
      "plan":["Inspect"],
      "selfReview":{},
      "suggestedNextAction":"Review.",
      "attemptCount":1,
      "repaired":false
    }'::jsonb
  ),
  'an empty selfReview must not satisfy the Agent trace contract'
);

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
  'f1000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'teamflow-agent-trace@example.invalid',
  '{"provider":"google","providers":["google"]}'::jsonb,
  '{"full_name":"Agent Trace Tester"}'::jsonb,
  now(),
  now()
),
(
  'f1000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'teamflow-agent-trace-outsider@example.invalid',
  '{"provider":"google","providers":["google"]}'::jsonb,
  '{"full_name":"Agent Trace Outsider"}'::jsonb,
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
) values (
  'f2000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'Bounded Agent trace project',
  'Verifies Agent trace validation and atomic completion.',
  'in_progress',
  '2026-07-28',
  '2026-08-04'
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
) values (
  'f3000000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'teamflow-agent-trace@example.invalid',
  'user',
  'Agent Trace Tester',
  'A',
  'Reviewer',
  '',
  '#3a6898',
  false
);

insert into public.project_access (project_id, user_id, member_id) values (
  'f2000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001'
);

select set_config(
  'request.jwt.claim.sub',
  'f1000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated","email":"teamflow-agent-trace@example.invalid"}',
  true
);
set local role authenticated;

insert into agent_trace_test_state (key, value)
select
  'ai_member',
  ((public.create_project_ai_agent(
    'f2000000-0000-4000-8000-000000000001',
    'Trace Agent',
    'Researcher',
    'Runs bounded Agent trace tests.',
    '#6950b8',
    'Use only the selected project context.',
    '{"project":true,"notes":true,"tasks":true,"team":false,"resources":true}'::jsonb
  ) -> 'member' ->> 'id')::uuid);

with inserted_tasks as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  )
  select
    'f2000000-0000-4000-8000-000000000001',
    title,
    (select value from agent_trace_test_state where key = 'ai_member'),
    '2026-08-01',
    'not_started',
    description
  from (
    values
      ('valid_task', 'Valid Agent trace', 'Valid atomic completion.'),
      ('invalid_task', 'Invalid Agent trace', 'Invalid trace must roll back.'),
      ('outsider_task', 'Outsider Agent trace', 'Outsider must not complete.'),
      ('legacy_task', 'Legacy Agent completion', 'Legacy completion remains compatible.')
  ) as fixture(key, title, description)
  returning id, title
)
insert into agent_trace_test_state (key, value)
select
  case title
    when 'Valid Agent trace' then 'valid_task'
    when 'Invalid Agent trace' then 'invalid_task'
    when 'Outsider Agent trace' then 'outsider_task'
    else 'legacy_task'
  end,
  id
from inserted_tasks;

insert into agent_trace_test_state (key, value)
select
  'valid_run',
  ((public.start_ai_run(
    (select value from agent_trace_test_state where key = 'ai_member'),
    (select value from agent_trace_test_state where key = 'valid_task'),
    '{"task":{"title":"Valid Agent trace"}}'::jsonb,
    'live',
    'gemini',
    'gemini-test-flash'
  ) -> 'aiRun' ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select agent_trace is null
    from public.ai_runs
    where id = (select value from agent_trace_test_state where key = 'valid_run')
  ),
  'new running and legacy rows must remain compatible with a nullable trace'
);

select public.complete_agentic_ai_run(
  (select value from agent_trace_test_state where key = 'valid_run'),
  '# Final result',
  '{
    "version":1,
    "plan":["Inspect the task","Write and review the result"],
    "selfReview":{
      "roleFollowed":true,
      "requirementsMet":true,
      "selectedContextOnly":true,
      "issues":[]
    },
    "suggestedNextAction":"Review the result.",
    "attemptCount":1,
    "repaired":false
  }'::jsonb,
  '{"inputTokens":10,"outputTokens":20,"totalTokens":30}'::jsonb,
  120
);

select pg_temp.assert_true(
  (
    select status = 'pending_review'
      and agent_trace ->> 'attemptCount' = '1'
      and agent_trace ->> 'repaired' = 'false'
    from public.ai_runs
    where id = (select value from agent_trace_test_state where key = 'valid_run')
  )
  and (
    select status = 'in_review'
    from public.tasks
    where id = (select value from agent_trace_test_state where key = 'valid_task')
  ),
  'valid trace, pending review, and task in_review must be saved atomically'
);

insert into agent_trace_test_state (key, value)
select
  'invalid_run',
  ((public.start_ai_run(
    (select value from agent_trace_test_state where key = 'ai_member'),
    (select value from agent_trace_test_state where key = 'invalid_task'),
    '{"task":{"title":"Invalid Agent trace"}}'::jsonb,
    'live',
    'gemini',
    'gemini-test-flash'
  ) -> 'aiRun' ->> 'id')::uuid);

select pg_temp.expect_error(
  format(
    'select public.complete_agentic_ai_run(%L, %L, %L::jsonb, %L::jsonb, 10)',
    (select value from agent_trace_test_state where key = 'invalid_run'),
    '# Invalid result',
    '{"version":1,"plan":[],"selfReview":{},"suggestedNextAction":"","attemptCount":3,"repaired":false}',
    '{}'
  ),
  'INVALID_AI_AGENT_TRACE'
);

select pg_temp.assert_true(
  (
    select status = 'running' and agent_trace is null
    from public.ai_runs
    where id = (select value from agent_trace_test_state where key = 'invalid_run')
  )
  and (
    select status = 'in_progress'
    from public.tasks
    where id = (select value from agent_trace_test_state where key = 'invalid_task')
  ),
  'invalid trace must roll back completion and task transition'
);

insert into agent_trace_test_state (key, value)
select
  'outsider_run',
  ((public.start_ai_run(
    (select value from agent_trace_test_state where key = 'ai_member'),
    (select value from agent_trace_test_state where key = 'outsider_task'),
    '{"task":{"title":"Outsider Agent trace"}}'::jsonb,
    'live',
    'gemini',
    'gemini-test-flash'
  ) -> 'aiRun' ->> 'id')::uuid);

select set_config(
  'request.jwt.claim.sub',
  'f1000000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated","email":"teamflow-agent-trace-outsider@example.invalid"}',
  true
);

select pg_temp.expect_error(
  format(
    'select public.complete_agentic_ai_run(%L, %L, %L::jsonb, %L::jsonb, 10)',
    (select value from agent_trace_test_state where key = 'outsider_run'),
    '# Outsider result',
    '{"version":1,"plan":["Inspect"],"selfReview":{"roleFollowed":true,"requirementsMet":true,"selectedContextOnly":true,"issues":[]},"suggestedNextAction":"Review.","attemptCount":1,"repaired":false}',
    '{}'
  ),
  'AI_RUN_NOT_FOUND'
);

select set_config(
  'request.jwt.claim.sub',
  'f1000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated","email":"teamflow-agent-trace@example.invalid"}',
  true
);

select pg_temp.assert_true(
  (
    select status = 'running' and agent_trace is null
    from public.ai_runs
    where id = (select value from agent_trace_test_state where key = 'outsider_run')
  ),
  'a non-collaborator must not complete or mutate an Agent run'
);

insert into agent_trace_test_state (key, value)
select
  'legacy_run',
  ((public.start_ai_run(
    (select value from agent_trace_test_state where key = 'ai_member'),
    (select value from agent_trace_test_state where key = 'legacy_task'),
    '{"task":{"title":"Legacy Agent completion"}}'::jsonb,
    'mock',
    null,
    null
  ) -> 'aiRun' ->> 'id')::uuid);

select public.complete_ai_run(
  (select value from agent_trace_test_state where key = 'legacy_run'),
  '# Legacy result',
  '{}'::jsonb,
  0
);

select pg_temp.assert_true(
  (
    select status = 'pending_review' and agent_trace is null
    from public.ai_runs
    where id = (select value from agent_trace_test_state where key = 'legacy_run')
  ),
  'the existing completion RPC must remain compatible with a null trace'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select pg_temp.expect_error(
  'select public.complete_agentic_ai_run(
    ''f4000000-0000-4000-8000-000000000001'',
    ''# denied'',
    ''{}''::jsonb,
    ''{}''::jsonb,
    0
  )',
  'permission denied'
);

reset role;
rollback;
