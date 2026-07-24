-- TeamFlow multi-AI agent database and RLS verification.
-- Run only against TeamFlow project lmmeuoeuiouyowpthxwg after applying
-- 20260724114500_reject_disabled_ai_task_assignment.sql and all preceding migrations.
-- Do not run against TimeBox project vimywtpiqsixlfiegpdd.
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

-- Dedicated identities. The final ROLLBACK ensures they cannot remain in the
-- TeamFlow Auth schema or application tables.
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
    'Multi AI project A',
    'A and B collaborate in this project.',
    'in_progress',
    '2026-07-24',
    '2026-07-31'
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000003',
    'Isolated project C',
    'This project belongs only to C.',
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
    'Developer',
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
    'Planner',
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
    'Reviewer',
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

-- The multi-AI migration retains the user/AI identity model and removes the
-- old fixed identity and one-agent-per-project database objects.
select pg_temp.expect_error(
  $sql$
    insert into public.members (
      project_id, auth_user_id, email, kind, name, initial, role, is_ai
    ) values (
      'b1000000-0000-4000-8000-000000000001',
      null,
      null,
      'manual',
      'Manual member',
      'M',
      'Manual',
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
      'Invalid AI',
      'I',
      'Invalid',
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
      'Invalid user',
      'I',
      'Invalid',
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

select pg_temp.assert_true(
  to_regclass('public.members_project_ai_unique') is null
  and not exists (
    select 1
    from pg_catalog.pg_constraint constraint_row
    where constraint_row.conrelid = 'public.ai_agents'::regclass
      and constraint_row.conname = 'ai_agents_project_id_key'
  )
  and to_regclass('public.ai_agents_project_idx') is not null,
  'the fixed one-agent indexes must be removed and the project lookup index retained'
);

select pg_temp.assert_true(
  to_regprocedure('public.create_project_ai_agent(uuid)') is null
  and to_regprocedure('public.update_ai_agent_settings(uuid,text,jsonb)') is null
  and to_regprocedure('public.create_project_ai_agent(uuid,text,text,text,text,text,jsonb)') is not null
  and to_regprocedure('public.update_ai_agent(uuid,text,text,text,text,text,jsonb,boolean)') is not null,
  'the fixed single-agent RPC signatures must be replaced'
);

-- User A creates two independently configured AI agents in the same project.
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
    'b1000000-0000-4000-8000-000000000001',
    'Research Agent',
    'Research lead',
    'Collect and summarize evidence.',
    '#6950b8',
    'Return a concise evidence brief.',
    '{"project":true,"notes":true,"tasks":true,"team":false,"resources":true}'::jsonb
  ) -> 'member' ->> 'id')::uuid);

insert into ai_test_state (key, value)
select
  'ai_b',
  ((public.create_project_ai_agent(
    'b1000000-0000-4000-8000-000000000001',
    'Planning Agent',
    'Planning lead',
    'Turn evidence into an action plan.',
    '#3d7a54',
    'Produce a prioritized implementation plan.',
    '{"project":true,"notes":false,"tasks":true,"team":true,"resources":false}'::jsonb
  ) -> 'member' ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select count(*) = 2
    from public.ai_agents
    where project_id = 'b1000000-0000-4000-8000-000000000001'
  ),
  'one project must allow two AI agents'
);

select pg_temp.assert_true(
  (
    select member.name = 'Research Agent'
      and member.initial = 'R'
      and member.role = 'Research lead'
      and member.kind = 'ai'
      and member.auth_user_id is null
      and member.email is null
      and member.is_ai
      and agent.instructions = 'Return a concise evidence brief.'
    from public.members member
    join public.ai_agents agent on agent.member_id = member.id
    where member.id = (select value from ai_test_state where key = 'ai_a')
  ),
  'custom AI creation must persist its profile, generated initial, and settings'
);

select pg_temp.assert_true(
  (
    select member.name = 'Planning Agent'
      and member.initial = 'P'
      and member.role = 'Planning lead'
      and agent.instructions = 'Produce a prioritized implementation plan.'
      and agent.context_config ->> 'notes' = 'false'
    from public.members member
    join public.ai_agents agent on agent.member_id = member.id
    where member.id = (select value from ai_test_state where key = 'ai_b')
  ),
  'each AI agent must keep an independent profile and settings row'
);

reset role;

-- No AI may become an authorization principal: the project_access composite
-- foreign key requires a real auth_user_id matching user_id.
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
    where member_id in (
      (select value from ai_test_state where key = 'ai_a'),
      (select value from ai_test_state where key = 'ai_b')
    )
  ),
  'AI agents must not receive project_access'
);

-- User C owns an isolated project and can create its own AI without gaining
-- access to project A.
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
    'b1000000-0000-4000-8000-000000000002',
    'Isolated Agent',
    'Private lead',
    '',
    '#8a4e68',
    '',
    '{"project":true,"notes":true,"tasks":true,"team":false,"resources":true}'::jsonb
  ) -> 'member' ->> 'id')::uuid);

reset role;

-- Same-project AI assignment succeeds for both agents. Cross-project AI
-- assignment remains blocked by the task/member composite foreign key.
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
    'Gather competitor evidence',
    (select value from ai_test_state where key = 'ai_a'),
    '2026-07-28',
    'in_progress',
    'Research task for the evidence agent.'
  )
  returning id
)
insert into ai_test_state (key, value)
select 'task_a', id from inserted_task;

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
    'Plan the rollout',
    (select value from ai_test_state where key = 'ai_b'),
    '2026-07-29',
    'not_started',
    'Planning task for the second agent.'
  )
  returning id
)
insert into ai_test_state (key, value)
select 'task_b', id from inserted_task;

select pg_temp.assert_true(
  (
    select count(*) = 2
    from public.tasks
    where id in (
      (select value from ai_test_state where key = 'task_a'),
      (select value from ai_test_state where key = 'task_b')
    )
      and project_id = 'b1000000-0000-4000-8000-000000000001'
  ),
  'each same-project AI must be assignable to its own task'
);

select pg_temp.expect_error(
  format(
    $sql$
      insert into public.tasks (
        project_id, title, assignee_id, due_date, status, description
      ) values (
        'b1000000-0000-4000-8000-000000000001',
        'Cross project assignment',
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

-- Collaborator B has the same management rights as A, but editing A must not
-- overwrite B's profile, context settings, or execution history.
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

select public.update_ai_agent(
  (select value from ai_test_state where key = 'ai_a'),
  'Evidence Agent',
  'Evidence lead',
  'Updated by a collaborator.',
  '#6950b8',
  'Group findings by source and confidence.',
  '{"project":true,"notes":true,"tasks":true,"team":true,"resources":false}'::jsonb,
  true
);

select pg_temp.assert_true(
  (
    select member.name = 'Evidence Agent'
      and member.initial = 'E'
      and member.role = 'Evidence lead'
      and member.description = 'Updated by a collaborator.'
      and agent.instructions = 'Group findings by source and confidence.'
      and agent.context_config ->> 'team' = 'true'
      and agent.context_config ->> 'resources' = 'false'
      and agent.enabled
    from public.members member
    join public.ai_agents agent on agent.member_id = member.id
    where member.id = (select value from ai_test_state where key = 'ai_a')
  ),
  'a collaborator must be able to update an AI profile and settings'
);

select pg_temp.assert_true(
  (
    select member.name = 'Planning Agent'
      and member.role = 'Planning lead'
      and agent.instructions = 'Produce a prioritized implementation plan.'
      and agent.context_config ->> 'notes' = 'false'
      and agent.enabled
    from public.members member
    join public.ai_agents agent on agent.member_id = member.id
    where member.id = (select value from ai_test_state where key = 'ai_b')
  ),
  'updating one AI must not overwrite another AI settings'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.update_ai_agent(
        %L,
        'Evidence Agent',
        'Evidence lead',
        '',
        '#6950b8',
        '',
        '{"project":true,"notes":true,"tasks":true,"team":false,"resources":true,"extra":true}'::jsonb,
        true
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_a')
  ),
  'INVALID_AI_CONTEXT'
);

-- Each run is bound to the selected AI and its own assigned task. A pending
-- run blocks only a duplicate for the same agent/task pair.
insert into ai_test_state (key, value)
select
  'run_a',
  ((public.create_mock_ai_run(
    (select value from ai_test_state where key = 'ai_a'),
    (select value from ai_test_state where key = 'task_a'),
    '{"task":{"title":"Gather competitor evidence"},"context":{"project":"Multi AI project A"}}'::jsonb,
    '# Mock result\n\nEvidence brief for the assigned task.'
  ) ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'pending_review'
      and ai_member_id = (select value from ai_test_state where key = 'ai_a')
      and task_id = (select value from ai_test_state where key = 'task_a')
      and created_by = 'a1000000-0000-4000-8000-000000000002'
    from public.ai_runs
    where id = (select value from ai_test_state where key = 'run_a')
  ),
  'agent A must persist its own pending review run'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.create_mock_ai_run(
        %L,
        %L,
        '{"task":{"title":"Gather competitor evidence"}}'::jsonb,
        '# Duplicate result'
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_a'),
    (select value from ai_test_state where key = 'task_a')
  ),
  'TEAMFLOW_CONFLICT:AI_RUN_PENDING'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.create_mock_ai_run(
        %L,
        %L,
        '{"task":{"title":"Gather competitor evidence"}}'::jsonb,
        '# Wrong agent result'
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_b'),
    (select value from ai_test_state where key = 'task_a')
  ),
  'TEAMFLOW_CONFLICT:TASK_NOT_ASSIGNED_TO_AI'
);

insert into ai_test_state (key, value)
select
  'run_b',
  ((public.create_mock_ai_run(
    (select value from ai_test_state where key = 'ai_b'),
    (select value from ai_test_state where key = 'task_b'),
    '{"task":{"title":"Plan the rollout"},"context":{"project":"Multi AI project A"}}'::jsonb,
    '# Mock result\n\nPlanning brief for the assigned task.'
  ) ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select count(*) = 2
    from public.ai_runs
    where id in (
      (select value from ai_test_state where key = 'run_a'),
      (select value from ai_test_state where key = 'run_b')
    )
      and status = 'pending_review'
  ),
  'different agents must be able to retain separate pending runs'
);

select public.reject_ai_run((select value from ai_test_state where key = 'run_b'));

insert into ai_test_state (key, value)
select
  'applied_note',
  ((public.apply_ai_run(
    (select value from ai_test_state where key = 'run_a')
  ) -> 'note' ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'applied'
      and applied_note_id = (select value from ai_test_state where key = 'applied_note')
    from public.ai_runs
    where id = (select value from ai_test_state where key = 'run_a')
  ),
  'applying an AI run must atomically link exactly one note'
);

select pg_temp.assert_true(
  (
    public.apply_ai_run(
      (select value from ai_test_state where key = 'run_a')
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

delete from public.notes
where id = (select value from ai_test_state where key = 'applied_note');

select pg_temp.assert_true(
  (
    select status = 'applied' and applied_note_id is null
    from public.ai_runs
    where id = (select value from ai_test_state where key = 'run_a')
  ),
  'deleting an applied note must preserve applied run history'
);

select pg_temp.assert_true(
  public.apply_ai_run(
    (select value from ai_test_state where key = 'run_a')
  ) -> 'note' = 'null'::jsonb,
  'reapplying after note deletion must not create a replacement'
);

reset role;

-- C cannot discover or mutate project A AI data. The last human collaborator
-- of C's project remains protected by the existing collaborator invariant.
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
  'a non-collaborator must not select another project AI settings'
);

select pg_temp.assert_true(
  (
    select count(*) = 0
    from public.ai_runs
    where project_id = 'b1000000-0000-4000-8000-000000000001'
  ),
  'a non-collaborator must not select another project AI runs'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.update_ai_agent(
        %L,
        'Unauthorized Agent',
        'Unauthorized lead',
        '',
        '#6950b8',
        '',
        '{"project":true,"notes":true,"tasks":true,"team":false,"resources":true}'::jsonb,
        true
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_a')
  ),
  'AI_AGENT_NOT_FOUND'
);

select pg_temp.expect_error(
  $sql$
    select public.remove_project_member(
      'c1000000-0000-4000-8000-000000000003'
    )
  $sql$,
  'TEAMFLOW_CONFLICT:LAST_COLLABORATOR'
);

reset role;

-- Anonymous users have neither direct AI table access nor AI RPC execute
-- permission. Guests remain read-only through demo_workspaces, not these APIs.
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
      'b1000000-0000-4000-8000-000000000001',
      'Anonymous Agent',
      'No access',
      '',
      '#6950b8',
      '',
      '{"project":true,"notes":true,"tasks":true,"team":false,"resources":true}'::jsonb
    )
  $sql$,
  'permission denied'
);

reset role;

-- Rejection is idempotent, completed tasks cannot execute, failures are
-- persisted, and disabling one agent preserves other agents and their runs.
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
    'Rejected run task',
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
    '{"task":{"title":"Rejected run task"}}'::jsonb,
    '# Mock result\n\nRejected review result.'
  ) ->> 'id')::uuid);

select public.reject_ai_run((select value from ai_test_state where key = 'run_rejected'));

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
  'task deletion must preserve rejected AI run history'
);

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
    'Failed run task',
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
    '{"task":{"title":"Failed run task"}}'::jsonb,
    'Deterministic generator failure'
  ) ->> 'id')::uuid);

select pg_temp.assert_true(
  (
    select status = 'failed'
      and error_message = 'Deterministic generator failure'
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
    'Completed task',
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
        '{"task":{"title":"Completed task"}}'::jsonb,
        '# Mock result'
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_a'),
    (select value from ai_test_state where key = 'task_completed')
  ),
  'TEAMFLOW_CONFLICT:TASK_COMPLETED'
);

-- Create the task while agent B is active, then deactivate it. The existing
-- task remains historical data, but its next execution is rejected.
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
    'Disabled agent task',
    (select value from ai_test_state where key = 'ai_b'),
    '2026-07-30',
    'in_progress',
    ''
  )
  returning id
)
insert into ai_test_state (key, value)
select 'task_disabled', id from inserted_task;

select public.update_ai_agent(
  (select value from ai_test_state where key = 'ai_b'),
  'Planning Agent',
  'Planning lead',
  'Turn evidence into an action plan.',
  '#3d7a54',
  'Produce a prioritized implementation plan.',
  '{"project":true,"notes":false,"tasks":true,"team":true,"resources":false}'::jsonb,
  false
);

select pg_temp.assert_true(
  (
    select not enabled
    from public.ai_agents
    where member_id = (select value from ai_test_state where key = 'ai_b')
  ),
  'a collaborator must be able to deactivate one AI agent'
);

select pg_temp.expect_error(
  format(
    $sql$
      select public.create_mock_ai_run(
        %L,
        %L,
        '{"task":{"title":"Disabled agent task"}}'::jsonb,
        '# Mock result'
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_b'),
    (select value from ai_test_state where key = 'task_disabled')
  ),
  'TEAMFLOW_CONFLICT:AI_AGENT_DISABLED'
);

-- A disabled Agent cannot be assigned through direct task writes either. The
-- trigger protects create and reassignment paths while leaving people alone.
select pg_temp.expect_error(
  format(
    $sql$
      insert into public.tasks (
        project_id, title, assignee_id, due_date, status, description
      ) values (
        'b1000000-0000-4000-8000-000000000001',
        'Blocked disabled Agent assignment',
        %L,
        '2026-07-31',
        'not_started',
        ''
      )
    $sql$,
    (select value from ai_test_state where key = 'ai_b')
  ),
  'TEAMFLOW_CONFLICT:AI_AGENT_DISABLED'
);

select pg_temp.expect_error(
  format(
    $sql$
      update public.tasks
      set assignee_id = %L
      where id = %L
    $sql$,
    (select value from ai_test_state where key = 'ai_b'),
    (select value from ai_test_state where key = 'task_completed')
  ),
  'TEAMFLOW_CONFLICT:AI_AGENT_DISABLED'
);

with inserted_task as (
  insert into public.tasks (
    project_id, title, assignee_id, due_date, status, description
  ) values (
    'b1000000-0000-4000-8000-000000000001',
    'Human assignment remains allowed',
    'c1000000-0000-4000-8000-000000000001',
    '2026-07-31',
    'not_started',
    ''
  )
  returning id
)
select pg_temp.assert_true(
  exists (select 1 from inserted_task),
  'human collaborators must remain assignable after disabled AI enforcement'
);

select pg_temp.assert_true(
  (
    select exists (
      select 1
      from public.members member
      join public.ai_agents agent on agent.member_id = member.id
      where member.id = (select value from ai_test_state where key = 'ai_a')
        and member.name = 'Evidence Agent'
        and agent.enabled
    )
    and exists (
      select 1
      from public.ai_runs
      where id = (select value from ai_test_state where key = 'run_a')
        and status = 'applied'
    )
  ),
  'changing another agent must preserve existing agents and run history'
);

-- Authenticated callers cannot bypass the AI RPC state machine with direct
-- writes to ai_runs.
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
        '# Bypassed result',
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
