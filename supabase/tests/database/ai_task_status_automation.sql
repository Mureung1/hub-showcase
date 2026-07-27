-- TeamFlow AI run -> task status automation verification.
-- Run only against TeamFlow project lmmeuoeuiouyowpthxwg after applying
-- the ai_task_status_automation migration.
-- Never run against TimeBox project vimywtpiqsixlfiegpdd.
-- Every fixture and assertion is enclosed by this transaction and ROLLBACK.

begin;

create temporary table ai_status_test_state (
  key text primary key,
  value uuid not null
) on commit drop;

grant select, insert, update, delete on table ai_status_test_state
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
) values (
  'e1000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'teamflow-ai-status@example.invalid',
  '{"provider":"google","providers":["google"]}'::jsonb,
  '{"full_name":"AI Status Tester"}'::jsonb,
  now(),
  now()
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
) values (
  'e1000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'teamflow-ai-status-outsider@example.invalid',
  '{"provider":"google","providers":["google"]}'::jsonb,
  '{"full_name":"AI Status Outsider"}'::jsonb,
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
  'e2000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  'AI task status project',
  'Verifies AI run state and task status synchronization.',
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
) values (
  'e3000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  'teamflow-ai-status@example.invalid',
  'user',
  'AI Status Tester',
  'A',
  'Reviewer',
  '',
  '#3a6898',
  false
);

insert into public.project_access (project_id, user_id, member_id) values (
  'e2000000-0000-4000-8000-000000000001',
  'e1000000-0000-4000-8000-000000000001',
  'e3000000-0000-4000-8000-000000000001'
);

select set_config(
  'request.jwt.claim.sub',
  'e1000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated","email":"teamflow-ai-status@example.invalid"}',
  true
);
set local role authenticated;

insert into ai_status_test_state (key, value)
select
  'ai_member',
  ((public.create_project_ai_agent(
    'e2000000-0000-4000-8000-000000000001',
    'Status Agent',
    'Researcher',
    'Runs deterministic status tests.',
    '#6950b8',
    'Follow the supplied project context.',
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
    'e2000000-0000-4000-8000-000000000001',
    'Review and apply AI result',
    (select value from ai_status_test_state where key = 'ai_member'),
    '2026-07-30',
    'not_started',
    'Main status transition fixture.'
  )
  returning id
)
insert into ai_status_test_state (key, value)
select 'main_task', id from inserted_task;

with inserted_task as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  ) values (
    'e2000000-0000-4000-8000-000000000001',
    'Fail AI result',
    (select value from ai_status_test_state where key = 'ai_member'),
    '2026-07-31',
    'not_started',
    'Failure transition fixture.'
  )
  returning id
)
insert into ai_status_test_state (key, value)
select 'failed_task', id from inserted_task;

with inserted_task as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  ) values (
    'e2000000-0000-4000-8000-000000000001',
    'Restore task after credential failure',
    (select value from ai_status_test_state where key = 'ai_member'),
    '2026-07-31',
    'in_review',
    'Credential failures must restore the exact pre-run status.'
  )
  returning id
)
insert into ai_status_test_state (key, value)
select 'credential_task', id from inserted_task;

with inserted_task as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  ) values (
    'e2000000-0000-4000-8000-000000000001',
    'Reassign during AI execution',
    (select value from ai_status_test_state where key = 'ai_member'),
    '2026-08-01',
    'not_started',
    'Assignee safety fixture.'
  )
  returning id
)
insert into ai_status_test_state (key, value)
select 'reassigned_task', id from inserted_task;

with inserted_task as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  ) values (
    'e2000000-0000-4000-8000-000000000001',
    'Preserve manual status during AI execution',
    (select value from ai_status_test_state where key = 'ai_member'),
    '2026-08-01',
    'not_started',
    'Status overwrite safety fixture.'
  )
  returning id
)
insert into ai_status_test_state (key, value)
select 'manual_status_task', id from inserted_task;

with inserted_task as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  ) values (
    'e2000000-0000-4000-8000-000000000001',
    'Recover stale AI execution',
    (select value from ai_status_test_state where key = 'ai_member'),
    '2026-08-02',
    'not_started',
    'Stale running lease fixture.'
  )
  returning id
)
insert into ai_status_test_state (key, value)
select 'stale_task', id from inserted_task;

insert into ai_status_test_state (key, value)
select
  'main_run',
  ((public.start_ai_run(
    (select value from ai_status_test_state where key = 'ai_member'),
    (select value from ai_status_test_state where key = 'main_task'),
    '{"task":{"title":"Review and apply AI result"}}'::jsonb,
    'live',
    'gemini',
    'gemini-3.5-flash'
  ) -> 'aiRun' ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'running'
    from public.ai_runs
    where id = (select value from ai_status_test_state where key = 'main_run')
  )
  and (
    select status = 'in_progress'
    from public.tasks
    where id = (select value from ai_status_test_state where key = 'main_task')
  ),
  'starting an AI run must atomically set running and task in_progress'
);

select set_config(
  'request.jwt.claim.sub',
  'e1000000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated","email":"teamflow-ai-status-outsider@example.invalid"}',
  true
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.start_ai_run(
        %L,
        %L,
        '{}'::jsonb,
        'mock',
        null,
        null
      )
    $sql$,
    (select value from ai_status_test_state where key = 'ai_member'),
    (select value from ai_status_test_state where key = 'main_task')
  ),
  'AI_AGENT_NOT_FOUND'
);

select pg_temp.expect_error(
  format(
    'select public.complete_ai_run(%L, %L, %L::jsonb, 0)',
    (select value from ai_status_test_state where key = 'main_run'),
    '# Unauthorized result',
    '{}'
  ),
  'AI_RUN_NOT_FOUND'
);

select pg_temp.expect_error(
  format(
    'select public.fail_ai_run(%L, %L, %L::jsonb, 0, false)',
    (select value from ai_status_test_state where key = 'main_run'),
    'Unauthorized failure',
    '{}'
  ),
  'AI_RUN_NOT_FOUND'
);

select set_config(
  'request.jwt.claim.sub',
  'e1000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated","email":"teamflow-ai-status@example.invalid"}',
  true
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.start_ai_run(
        %L,
        %L,
        '{}'::jsonb,
        'live',
        'gemini',
        'gemini-3.5-flash'
      )
    $sql$,
    (select value from ai_status_test_state where key = 'ai_member'),
    (select value from ai_status_test_state where key = 'main_task')
  ),
  'TEAMFLOW_CONFLICT:AI_RUN_PENDING'
);

select public.complete_ai_run(
  (select value from ai_status_test_state where key = 'main_run'),
  '## 작업 요청 요약

완료된 테스트 결과입니다.',
  '{"inputTokens":20,"outputTokens":10,"totalTokens":30}'::jsonb,
  250
);

select pg_temp.assert_true(
  (
    select status = 'pending_review'
    from public.ai_runs
    where id = (select value from ai_status_test_state where key = 'main_run')
  )
  and (
    select status = 'in_review'
    from public.tasks
    where id = (select value from ai_status_test_state where key = 'main_task')
  ),
  'successful AI output must atomically set pending_review and task in_review'
);

select public.reject_ai_run(
  (select value from ai_status_test_state where key = 'main_run')
);

select pg_temp.assert_true(
  (
    select status = 'rejected'
    from public.ai_runs
    where id = (select value from ai_status_test_state where key = 'main_run')
  )
  and (
    select status = 'in_progress'
    from public.tasks
    where id = (select value from ai_status_test_state where key = 'main_task')
  ),
  'rejecting AI output must return the task to in_progress'
);

insert into ai_status_test_state (key, value)
select
  'retry_run',
  ((public.start_ai_run(
    (select value from ai_status_test_state where key = 'ai_member'),
    (select value from ai_status_test_state where key = 'main_task'),
    '{"task":{"title":"Review and apply AI result"}}'::jsonb,
    'mock',
    null,
    null
  ) -> 'aiRun' ->> 'id')::uuid);

select public.complete_ai_run(
  (select value from ai_status_test_state where key = 'retry_run'),
  '# Mock result',
  '{}'::jsonb,
  0
);

select public.apply_ai_run(
  (select value from ai_status_test_state where key = 'retry_run')
);

select pg_temp.assert_true(
  (
    select status = 'applied'
    from public.ai_runs
    where id = (select value from ai_status_test_state where key = 'retry_run')
  )
  and (
    select status = 'completed'
    from public.tasks
    where id = (select value from ai_status_test_state where key = 'main_task')
  ),
  'applying AI output must atomically set applied and task completed'
);

select pg_temp.expect_error(
  format(
    'select public.reject_ai_run(%L)',
    (select value from ai_status_test_state where key = 'retry_run')
  ),
  'TEAMFLOW_CONFLICT:INVALID_AI_RUN_TRANSITION'
);

insert into ai_status_test_state (key, value)
select
  'failed_run',
  ((public.start_ai_run(
    (select value from ai_status_test_state where key = 'ai_member'),
    (select value from ai_status_test_state where key = 'failed_task'),
    '{"task":{"title":"Fail AI result"}}'::jsonb,
    'live',
    'gemini',
    'gemini-3.5-flash'
  ) -> 'aiRun' ->> 'id')::uuid);

select public.fail_ai_run(
  (select value from ai_status_test_state where key = 'failed_run'),
  'Gemini request timed out.',
  '{}'::jsonb,
  45000,
  false
);

select pg_temp.assert_true(
  (
    select status = 'failed'
    from public.ai_runs
    where id = (select value from ai_status_test_state where key = 'failed_run')
  )
  and (
    select status = 'in_progress'
    from public.tasks
    where id = (select value from ai_status_test_state where key = 'failed_task')
  ),
  'failed AI output must keep the task in_progress for retry'
);

insert into ai_status_test_state (key, value)
select
  'credential_run',
  ((public.start_ai_run(
    (select value from ai_status_test_state where key = 'ai_member'),
    (select value from ai_status_test_state where key = 'credential_task'),
    '{"task":{"title":"Restore task after credential failure"}}'::jsonb,
    'live',
    'gemini',
    'gemini-3.5-flash'
  ) -> 'aiRun' ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'in_progress'
    from public.tasks
    where id = (select value from ai_status_test_state where key = 'credential_task')
  ),
  'a verified credential starts work before the provider can later reject it'
);

select public.fail_ai_run(
  (select value from ai_status_test_state where key = 'credential_run'),
  'Gemini API key is no longer valid.',
  '{}'::jsonb,
  120,
  true
);

select pg_temp.assert_true(
  (
    select status = 'failed'
      and task_status_before_run = 'in_review'
    from public.ai_runs
    where id = (select value from ai_status_test_state where key = 'credential_run')
  )
  and (
    select status = 'in_review'
    from public.tasks
    where id = (select value from ai_status_test_state where key = 'credential_task')
  ),
  'credential failures must restore the exact task status captured at start'
);

insert into ai_status_test_state (key, value)
select
  'reassigned_run',
  ((public.start_ai_run(
    (select value from ai_status_test_state where key = 'ai_member'),
    (select value from ai_status_test_state where key = 'reassigned_task'),
    '{"task":{"title":"Reassign during AI execution"}}'::jsonb,
    'mock',
    null,
    null
  ) -> 'aiRun' ->> 'id')::uuid);

update public.tasks
set
  assignee_id = 'e3000000-0000-4000-8000-000000000001',
  status = 'not_started'
where id = (select value from ai_status_test_state where key = 'reassigned_task');

select public.complete_ai_run(
  (select value from ai_status_test_state where key = 'reassigned_run'),
  '# Result after reassignment',
  '{}'::jsonb,
  0
);

select pg_temp.assert_true(
  (
    select status = 'not_started'
      and assignee_id = 'e3000000-0000-4000-8000-000000000001'
    from public.tasks
    where id = (select value from ai_status_test_state where key = 'reassigned_task')
  ),
  'AI completion must not overwrite a task reassigned to a human collaborator'
);

insert into ai_status_test_state (key, value)
select
  'manual_status_run',
  ((public.start_ai_run(
    (select value from ai_status_test_state where key = 'ai_member'),
    (select value from ai_status_test_state where key = 'manual_status_task'),
    '{"task":{"title":"Preserve manual status during AI execution"}}'::jsonb,
    'mock',
    null,
    null
  ) -> 'aiRun' ->> 'id')::uuid);

update public.tasks
set status = 'not_started'
where id = (select value from ai_status_test_state where key = 'manual_status_task');

select public.complete_ai_run(
  (select value from ai_status_test_state where key = 'manual_status_run'),
  '# Result after a collaborator changed task status',
  '{}'::jsonb,
  0
);

select public.reject_ai_run(
  (select value from ai_status_test_state where key = 'manual_status_run')
);

select pg_temp.assert_true(
  (
    select status = 'not_started'
      and assignee_id = (select value from ai_status_test_state where key = 'ai_member')
    from public.tasks
    where id = (select value from ai_status_test_state where key = 'manual_status_task')
  ),
  'AI completion and rejection must not overwrite a collaborator status change'
);

insert into ai_status_test_state (key, value)
select
  'stale_run',
  ((public.start_ai_run(
    (select value from ai_status_test_state where key = 'ai_member'),
    (select value from ai_status_test_state where key = 'stale_task'),
    '{"task":{"title":"Recover stale AI execution"}}'::jsonb,
    'mock',
    null,
    null
  ) -> 'aiRun' ->> 'id')::uuid);

reset role;

update public.ai_runs
set created_at = now() - interval '6 minutes'
where id = (select value from ai_status_test_state where key = 'stale_run');

set local role authenticated;

insert into ai_status_test_state (key, value)
select
  'stale_retry_run',
  ((public.start_ai_run(
    (select value from ai_status_test_state where key = 'ai_member'),
    (select value from ai_status_test_state where key = 'stale_task'),
    '{"task":{"title":"Recover stale AI execution"}}'::jsonb,
    'mock',
    null,
    null
  ) -> 'aiRun' ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'failed'
    from public.ai_runs
    where id = (select value from ai_status_test_state where key = 'stale_run')
  )
  and (
    select status = 'running'
    from public.ai_runs
    where id = (select value from ai_status_test_state where key = 'stale_retry_run')
  ),
  'a stale running lease must be closed before a retry starts'
);

reset role;
rollback;
