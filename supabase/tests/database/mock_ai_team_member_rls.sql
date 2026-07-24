-- TeamFlow Mock AI teammate database verification.
-- Run only against TeamFlow project lmmeuoeuiouyowpthxwg after applying
-- 20260724090000_mock_ai_team_member.sql.
-- Every fixture and assertion is enclosed by this transaction and ROLLBACK.

begin;

create temporary table ai_test_state (
  key text primary key,
  value uuid not null
) on commit drop;

grant select, insert, update, delete on table ai_test_state
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

-- Dedicated test identities. These UUIDs and emails are reserved for this
-- transaction and never remain because the script ends in ROLLBACK.
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
    'a1000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'teamflow-ai-rls-a@example.invalid',
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{"full_name":"AI RLS A"}'::jsonb,
    now(),
    now()
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'teamflow-ai-rls-b@example.invalid',
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{"full_name":"AI RLS B"}'::jsonb,
    now(),
    now()
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'teamflow-ai-rls-c@example.invalid',
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{"full_name":"AI RLS C"}'::jsonb,
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
    'b1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'AI RLS 프로젝트 A',
    '협업자 A와 B가 사용하는 테스트 프로젝트',
    'in_progress',
    '2026-07-24',
    '2026-07-31'
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000003',
    'AI RLS 프로젝트 C',
    '비협업자 격리 테스트 프로젝트',
    'in_progress',
    '2026-07-24',
    '2026-07-31'
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
    'c1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'teamflow-ai-rls-a@example.invalid',
    'user',
    'AI RLS A',
    'A',
    '개발',
    '',
    '#3a6898',
    false
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'teamflow-ai-rls-b@example.invalid',
    'user',
    'AI RLS B',
    'B',
    '기획',
    '',
    '#8a4e68',
    false
  ),
  (
    'c1000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000003',
    'teamflow-ai-rls-c@example.invalid',
    'user',
    'AI RLS C',
    'C',
    '검증',
    '',
    '#3d7a54',
    false
  );

insert into public.project_access (project_id, user_id, member_id) values
  (
    'b1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001'
  ),
  (
    'b1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000002'
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-000000000003'
  );

-- Member-kind constraints: manual members and inconsistent user/AI identity
-- combinations must fail before any AI RPC is exercised.
select pg_temp.expect_error(
  $sql$
    insert into public.members (
      project_id, auth_user_id, email, kind, name, initial, role, is_ai
    ) values (
      'b1000000-0000-4000-8000-000000000001',
      null,
      null,
      'manual',
      '수동 담당자',
      '수',
      '담당자',
      false
    )
  $sql$,
  'violates check constraint'
);

select pg_temp.expect_error(
  $sql$
    insert into public.members (
      project_id, auth_user_id, email, kind, name, initial, role, is_ai
    ) values (
      'b1000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000003',
      'teamflow-ai-rls-c@example.invalid',
      'ai',
      '자료조사 AI',
      'AI',
      '자료 조사',
      true
    )
  $sql$,
  'violates check constraint'
);

select pg_temp.expect_error(
  $sql$
    insert into public.members (
      project_id, auth_user_id, email, kind, name, initial, role, is_ai
    ) values (
      'b1000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000003',
      'teamflow-ai-rls-c@example.invalid',
      'user',
      '잘못된 사용자',
      '오',
      '개발',
      true
    )
  $sql$,
  'violates check constraint'
);

select pg_temp.expect_error(
  $sql$
    insert into public.ai_agents (member_id, project_id)
    values (
      'c1000000-0000-4000-8000-000000000001',
      'b1000000-0000-4000-8000-000000000001'
    )
  $sql$,
  'AI_MEMBER_REQUIRED'
);

-- User A creates the sole AI teammate in project A.
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","email":"teamflow-ai-rls-a@example.invalid"}',
  true
);
set local role authenticated;

insert into ai_test_state (key, value)
select
  'ai_a',
  ((public.create_project_ai_agent(
    'b1000000-0000-4000-8000-000000000001'
  ) -> 'member' ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.ai_agents
    where project_id = 'b1000000-0000-4000-8000-000000000001'
  ),
  'project A must have exactly one AI agent'
);

select pg_temp.expect_error(
  $sql$
    select public.create_project_ai_agent(
      'b1000000-0000-4000-8000-000000000001'
    )
  $sql$,
  'TEAMFLOW_CONFLICT:AI_AGENT_EXISTS'
);

reset role;

-- The AI can never become a project_access principal because it has no
-- auth_user_id and therefore cannot satisfy the composite access FK.
select pg_temp.expect_error(
  format(
    $sql$
      insert into public.project_access (project_id, user_id, member_id)
      values (
        'b1000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000003',
        %L
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_a')
  ),
  'project_access_user_member_fkey'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.project_access
    where member_id = (select value from ai_test_state where key = 'ai_a')
  ),
  'AI member must not receive project_access'
);

-- User C creates the sole AI in the isolated project.
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000003',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated","email":"teamflow-ai-rls-c@example.invalid"}',
  true
);
set local role authenticated;

insert into ai_test_state (key, value)
select
  'ai_c',
  ((public.create_project_ai_agent(
    'b1000000-0000-4000-8000-000000000002'
  ) -> 'member' ->> 'id')::uuid);

reset role;

-- Same-project AI assignment succeeds; cross-project assignment is rejected
-- by the task/member composite FK.
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","email":"teamflow-ai-rls-a@example.invalid"}',
  true
);
set local role authenticated;

with inserted_task as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  ) values (
    'b1000000-0000-4000-8000-000000000001',
    'AI 조사 보고서 작성',
    (select value from ai_test_state where key = 'ai_a'),
    '2026-07-28',
    'in_progress',
    '동일 프로젝트 AI에게 배정된 작업'
  )
  returning id
)
insert into ai_test_state (key, value)
select 'task_applied', id from inserted_task;

select pg_temp.assert_true(
  exists (
    select 1
    from public.tasks
    where id = (select value from ai_test_state where key = 'task_applied')
      and assignee_id = (select value from ai_test_state where key = 'ai_a')
  ),
  'same-project AI assignment must succeed'
);

select pg_temp.expect_error(
  format(
    $sql$
      insert into public.tasks (
        project_id, title, assignee_id, due_date, status, description
      ) values (
        'b1000000-0000-4000-8000-000000000001',
        '다른 프로젝트 AI 배정',
        %L,
        '2026-07-29',
        'not_started',
        ''
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_c')
  ),
  'tasks_project_assignee_fkey'
);

reset role;

-- Collaborator B has the same management permission as A.
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated","email":"teamflow-ai-rls-b@example.invalid"}',
  true
);
set local role authenticated;

select public.update_ai_agent_settings(
  (select value from ai_test_state where key = 'ai_a'),
  '자료를 근거별로 나눠 정리한다.',
  '{"project":true,"notes":true,"tasks":true,"team":true,"resources":false}'::jsonb
);

select pg_temp.assert_true(
  (
    select instructions = '자료를 근거별로 나눠 정리한다.'
      and context_config ->> 'team' = 'true'
      and context_config ->> 'resources' = 'false'
    from public.ai_agents
    where member_id = (select value from ai_test_state where key = 'ai_a')
  ),
  'collaborator B must be able to update AI settings'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.update_ai_agent_settings(
        %L,
        '잘못된 설정',
        '{"project":true,"notes":true,"tasks":true,"team":false,"resources":true,"extra":true}'::jsonb
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_a')
  ),
  'INVALID_AI_CONTEXT'
);

insert into ai_test_state (key, value)
select
  'run_applied',
  ((public.create_mock_ai_run(
    (select value from ai_test_state where key = 'ai_a'),
    (select value from ai_test_state where key = 'task_applied'),
    '{"task":{"title":"AI 조사 보고서 작성"},"context":{"project":"테스트"}}'::jsonb,
    '# 모의 실행 결과

## 작업 요청 요약

AI 조사 보고서를 작성합니다.

## 참고한 컨텍스트

- 프로젝트 설명

## Mock 작업 결과

결정론적 테스트 결과입니다.

## 제안하는 다음 행동

- 협업자가 결과를 검토합니다.'
  ) ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'pending_review'
      and created_by = 'a1000000-0000-4000-8000-000000000002'
    from public.ai_runs
    where id = (select value from ai_test_state where key = 'run_applied')
  ),
  'successful run must be pending_review and record the collaborator'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.create_mock_ai_run(
        %L,
        %L,
        '{"task":{"title":"AI 조사 보고서 작성"}}'::jsonb,
        '# 모의 실행 결과'
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_a'),
    (select value from ai_test_state where key = 'task_applied')
  ),
  'TEAMFLOW_CONFLICT:AI_RUN_PENDING'
);

insert into ai_test_state (key, value)
select
  'applied_note',
  ((public.apply_ai_run(
    (select value from ai_test_state where key = 'run_applied')
  ) -> 'note' ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'applied'
      and applied_note_id = (select value from ai_test_state where key = 'applied_note')
    from public.ai_runs
    where id = (select value from ai_test_state where key = 'run_applied')
  ),
  'apply must atomically link one note and mark the run applied'
);

select pg_temp.assert_true(
  (
    public.apply_ai_run(
      (select value from ai_test_state where key = 'run_applied')
    ) -> 'note' ->> 'id'
  )::uuid = (select value from ai_test_state where key = 'applied_note'),
  'repeated apply must return the existing note'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.notes
    where id = (select value from ai_test_state where key = 'applied_note')
  ),
  'repeated apply must not create a duplicate note'
);

-- Deleting an applied note does not reopen the run and reapply does not
-- recreate a deleted note.
delete from public.notes
where id = (select value from ai_test_state where key = 'applied_note');

select pg_temp.assert_true(
  (
    select status = 'applied' and applied_note_id is null
    from public.ai_runs
    where id = (select value from ai_test_state where key = 'run_applied')
  ),
  'deleting the note must preserve applied history'
);

select pg_temp.assert_true(
  public.apply_ai_run(
    (select value from ai_test_state where key = 'run_applied')
  ) -> 'note' = 'null'::jsonb,
  'reapplying after note deletion must not create a replacement'
);

reset role;

-- A non-collaborator cannot see or mutate project A AI data.
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000003',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated","email":"teamflow-ai-rls-c@example.invalid"}',
  true
);
set local role authenticated;

select pg_temp.assert_true(
  (
    select count(*) = 0
    from public.ai_agents
    where project_id = 'b1000000-0000-4000-8000-000000000001'
  ),
  'non-collaborator must not select project A AI settings'
);

select pg_temp.assert_true(
  (
    select count(*) = 0
    from public.ai_runs
    where project_id = 'b1000000-0000-4000-8000-000000000001'
  ),
  'non-collaborator must not select project A AI runs'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.update_ai_agent_settings(
        %L,
        '권한 없는 수정',
        '{"project":true,"notes":true,"tasks":true,"team":false,"resources":true}'::jsonb
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_a')
  ),
  'AI_AGENT_NOT_FOUND'
);

-- The existing collaborator-removal invariant still protects the final human.
select pg_temp.expect_error(
  $sql$
    select public.remove_project_member(
      'c1000000-0000-4000-8000-000000000003'
    )
  $sql$,
  'TEAMFLOW_CONFLICT:LAST_COLLABORATOR'
);

reset role;

-- Anonymous users have neither table nor RPC privileges.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select pg_temp.expect_error(
  'select count(*) from public.ai_agents',
  'permission denied'
);
select pg_temp.expect_error(
  $sql$
    select public.create_project_ai_agent(
      'b1000000-0000-4000-8000-000000000001'
    )
  $sql$,
  'permission denied'
);

reset role;

-- Rejection is idempotent, cannot be reversed into applied, and task deletion
-- preserves the historical run with task_id set to NULL.
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","email":"teamflow-ai-rls-a@example.invalid"}',
  true
);
set local role authenticated;

with inserted_task as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  ) values (
    'b1000000-0000-4000-8000-000000000001',
    '보류할 AI 작업',
    (select value from ai_test_state where key = 'ai_a'),
    '2026-07-29',
    'not_started',
    ''
  )
  returning id
)
insert into ai_test_state (key, value)
select 'task_rejected', id from inserted_task;

insert into ai_test_state (key, value)
select
  'run_rejected',
  ((public.create_mock_ai_run(
    (select value from ai_test_state where key = 'ai_a'),
    (select value from ai_test_state where key = 'task_rejected'),
    '{"task":{"title":"보류할 AI 작업"}}'::jsonb,
    '# 모의 실행 결과

보류 대상 결과'
  ) ->> 'id')::uuid);

select public.reject_ai_run(
  (select value from ai_test_state where key = 'run_rejected')
);
select pg_temp.assert_true(
  public.reject_ai_run(
    (select value from ai_test_state where key = 'run_rejected')
  ) ->> 'status' = 'rejected',
  'repeated reject must return the same rejected run'
);

select pg_temp.expect_error(
  format(
    'select public.apply_ai_run(%L)',
    (select value from ai_test_state where key = 'run_rejected')
  ),
  'TEAMFLOW_CONFLICT:INVALID_AI_RUN_TRANSITION'
);

delete from public.tasks
where id = (select value from ai_test_state where key = 'task_rejected');

select pg_temp.assert_true(
  (
    select status = 'rejected' and task_id is null
    from public.ai_runs
    where id = (select value from ai_test_state where key = 'run_rejected')
  ),
  'task deletion must preserve AI run history'
);

-- Generator failures are persisted as failed and cannot be applied.
with inserted_task as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  ) values (
    'b1000000-0000-4000-8000-000000000001',
    '실패할 AI 작업',
    (select value from ai_test_state where key = 'ai_a'),
    '2026-07-30',
    'in_progress',
    ''
  )
  returning id
)
insert into ai_test_state (key, value)
select 'task_failed', id from inserted_task;

insert into ai_test_state (key, value)
select
  'run_failed',
  ((public.create_failed_mock_ai_run(
    (select value from ai_test_state where key = 'ai_a'),
    (select value from ai_test_state where key = 'task_failed'),
    '{"task":{"title":"실패할 AI 작업"}}'::jsonb,
    '결정론적 생성기 실패'
  ) ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'failed'
      and error_message = '결정론적 생성기 실패'
    from public.ai_runs
    where id = (select value from ai_test_state where key = 'run_failed')
  ),
  'generator errors must persist as failed history'
);

select pg_temp.expect_error(
  format(
    'select public.apply_ai_run(%L)',
    (select value from ai_test_state where key = 'run_failed')
  ),
  'TEAMFLOW_CONFLICT:INVALID_AI_RUN_TRANSITION'
);

-- Completed AI tasks remain assignable and visible, but cannot be executed.
with inserted_task as (
  insert into public.tasks (
    project_id,
    title,
    assignee_id,
    due_date,
    status,
    description
  ) values (
    'b1000000-0000-4000-8000-000000000001',
    '완료된 AI 작업',
    (select value from ai_test_state where key = 'ai_a'),
    '2026-07-27',
    'completed',
    ''
  )
  returning id
)
insert into ai_test_state (key, value)
select 'task_completed', id from inserted_task;

select pg_temp.expect_error(
  format(
    $sql$
      select public.create_mock_ai_run(
        %L,
        %L,
        '{"task":{"title":"완료된 AI 작업"}}'::jsonb,
        '# 모의 실행 결과'
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_a'),
    (select value from ai_test_state where key = 'task_completed')
  ),
  'TEAMFLOW_CONFLICT:TASK_COMPLETED'
);

-- Authenticated callers cannot bypass RPC state transitions with direct writes.
select pg_temp.expect_error(
  format(
    $sql$
      insert into public.ai_runs (
        project_id, ai_member_id, task_id, status, context_snapshot,
        result_markdown, created_by
      ) values (
        'b1000000-0000-4000-8000-000000000001',
        %L,
        %L,
        'pending_review',
        '{}'::jsonb,
        '# 우회 결과',
        'a1000000-0000-4000-8000-000000000001'
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_a'),
    (select value from ai_test_state where key = 'task_failed')
  ),
  'permission denied'
);

reset role;

rollback;
