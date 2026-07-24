-- TeamFlow deterministic Mock AI teammate MVP.
-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.
-- Never apply this migration to TimeBox project vimywtpiqsixlfiegpdd.

do $$
begin
  if exists (select 1 from public.members where kind = 'manual') then
    raise exception 'AI_MEMBER_MIGRATION_BLOCKED: manual members must be removed first';
  end if;

  if exists (
    select 1
    from public.members
    where kind <> 'user'
      or auth_user_id is null
      or email is null
      or is_ai
  ) then
    raise exception 'AI_MEMBER_MIGRATION_BLOCKED: existing members must be valid login users';
  end if;
end;
$$;

-- Keep a single RESTRICT relationship to auth.users. Earlier migrations can
-- leave both SET NULL and RESTRICT constraints with different generated names.
do $$
declare
  auth_fk record;
begin
  for auth_fk in
    select constraint_row.conname
    from pg_catalog.pg_constraint constraint_row
    where constraint_row.conrelid = 'public.members'::regclass
      and constraint_row.contype = 'f'
      and constraint_row.confrelid = 'auth.users'::regclass
      and pg_catalog.pg_get_constraintdef(constraint_row.oid)
        like 'FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)%'
  loop
    execute format(
      'alter table public.members drop constraint %I',
      auth_fk.conname
    );
  end loop;
end;
$$;

alter table public.members
  add constraint members_auth_user_id_fkey
    foreign key (auth_user_id) references auth.users(id) on delete restrict;

alter table public.members
  alter column kind drop default,
  drop constraint if exists members_kind_check,
  drop constraint if exists members_link_check;

alter table public.members
  add constraint members_kind_check
    check (kind in ('user', 'ai')),
  add constraint members_identity_check
    check (
      (
        kind = 'user'
        and auth_user_id is not null
        and email is not null
        and is_ai = false
      )
      or (
        kind = 'ai'
        and auth_user_id is null
        and email is null
        and is_ai = true
      )
    ),
  add constraint members_ai_identity_check
    check (
      kind <> 'ai'
      or (
        name = '자료조사 AI'
        and initial = 'AI'
        and role = '자료 조사'
      )
    );

create unique index members_project_ai_unique
  on public.members (project_id)
  where kind = 'ai';

-- project_access remains the source of human authorization. Tasks instead
-- reference any same-project member so an AI can be an assignee without
-- receiving project access.
alter table public.tasks
  drop constraint if exists tasks_project_assignee_fkey;

alter table public.tasks
  add constraint tasks_project_id_id_unique unique (project_id, id),
  add constraint tasks_project_assignee_fkey
    foreign key (project_id, assignee_id)
    references public.members(project_id, id)
    on delete restrict;

alter table public.notes
  add constraint notes_project_id_id_unique unique (project_id, id);

create or replace function private.is_valid_ai_context_config(p_context_config jsonb)
returns boolean
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select
    jsonb_typeof(p_context_config) = 'object'
    and p_context_config ?& array['project', 'notes', 'tasks', 'team', 'resources']
    and (p_context_config - array['project', 'notes', 'tasks', 'team', 'resources']) = '{}'::jsonb
    and jsonb_typeof(p_context_config -> 'project') = 'boolean'
    and jsonb_typeof(p_context_config -> 'notes') = 'boolean'
    and jsonb_typeof(p_context_config -> 'tasks') = 'boolean'
    and jsonb_typeof(p_context_config -> 'team') = 'boolean'
    and jsonb_typeof(p_context_config -> 'resources') = 'boolean';
$$;

revoke all on function private.is_valid_ai_context_config(jsonb)
  from public, anon, authenticated;

create table public.ai_agents (
  member_id uuid primary key,
  project_id uuid not null unique,
  instructions text not null default '',
  context_config jsonb not null default
    '{"project":true,"notes":true,"tasks":true,"team":false,"resources":true}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_agents_project_member_unique unique (project_id, member_id),
  constraint ai_agents_project_member_fkey
    foreign key (project_id, member_id)
    references public.members(project_id, id)
    on delete cascade,
  constraint ai_agents_instructions_length_check
    check (char_length(instructions) <= 10000),
  constraint ai_agents_context_config_check
    check (private.is_valid_ai_context_config(context_config))
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  ai_member_id uuid not null,
  task_id uuid,
  status text not null,
  context_snapshot jsonb not null default '{}'::jsonb,
  result_markdown text,
  error_message text,
  applied_note_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_runs_project_agent_fkey
    foreign key (project_id, ai_member_id)
    references public.ai_agents(project_id, member_id)
    on delete cascade,
  constraint ai_runs_project_task_fkey
    foreign key (project_id, task_id)
    references public.tasks(project_id, id)
    on delete set null (task_id),
  constraint ai_runs_project_note_fkey
    foreign key (project_id, applied_note_id)
    references public.notes(project_id, id)
    on delete set null (applied_note_id),
  constraint ai_runs_status_check
    check (status in ('running', 'pending_review', 'applied', 'rejected', 'failed')),
  constraint ai_runs_context_snapshot_check
    check (
      jsonb_typeof(context_snapshot) = 'object'
      and char_length(context_snapshot::text) <= 100000
    ),
  constraint ai_runs_result_length_check
    check (result_markdown is null or char_length(result_markdown) <= 100000),
  constraint ai_runs_error_length_check
    check (error_message is null or char_length(error_message) <= 2000),
  constraint ai_runs_state_payload_check
    check (
      (status = 'running' and result_markdown is null and error_message is null)
      or (
        status in ('pending_review', 'applied', 'rejected')
        and result_markdown is not null
        and char_length(btrim(result_markdown)) > 0
        and error_message is null
      )
      or (
        status = 'failed'
        and result_markdown is null
        and error_message is not null
        and char_length(btrim(error_message)) > 0
      )
    )
);

create unique index ai_runs_open_task_unique
  on public.ai_runs (ai_member_id, task_id)
  where status in ('running', 'pending_review');
create index ai_runs_project_created_at_idx
  on public.ai_runs (project_id, created_at desc);
create index ai_runs_project_agent_idx
  on public.ai_runs (project_id, ai_member_id);
create index ai_runs_project_task_idx
  on public.ai_runs (project_id, task_id)
  where task_id is not null;
create index ai_runs_project_note_idx
  on public.ai_runs (project_id, applied_note_id)
  where applied_note_id is not null;
create index ai_runs_task_created_at_idx
  on public.ai_runs (task_id, created_at desc)
  where task_id is not null;
create index ai_runs_created_by_idx
  on public.ai_runs (created_by)
  where created_by is not null;

create or replace function private.validate_ai_agent_member()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.members member
    where member.project_id = new.project_id
      and member.id = new.member_id
      and member.kind = 'ai'
      and member.is_ai = true
      and member.auth_user_id is null
      and member.email is null
  ) then
    raise exception 'AI_MEMBER_REQUIRED';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_ai_agent_member()
  from public, anon, authenticated;

create trigger ai_agents_validate_member
before insert or update of project_id, member_id on public.ai_agents
for each row execute function private.validate_ai_agent_member();

create trigger ai_agents_touch_updated_at
before update on public.ai_agents
for each row execute function private.touch_updated_at();

create trigger ai_runs_touch_updated_at
before update on public.ai_runs
for each row execute function private.touch_updated_at();

alter table public.ai_agents enable row level security;
alter table public.ai_runs enable row level security;

revoke all privileges on table public.ai_agents
  from public, anon, authenticated, service_role;
revoke all privileges on table public.ai_runs
  from public, anon, authenticated, service_role;

grant select on table public.ai_agents to authenticated;
grant select on table public.ai_runs to authenticated;

create policy ai_agents_select_collaborator
  on public.ai_agents
  for select
  to authenticated
  using ((select private.is_project_collaborator(project_id)));

create policy ai_runs_select_collaborator
  on public.ai_runs
  for select
  to authenticated
  using ((select private.is_project_collaborator(project_id)));

create function private.create_project_ai_agent(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_member public.members;
  created_agent public.ai_agents;
begin
  if not (select private.is_project_collaborator(p_project_id)) then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  perform 1
  from public.projects
  where id = p_project_id
  for update;

  if exists (
    select 1 from public.members
    where project_id = p_project_id and kind = 'ai'
  ) then
    raise exception 'TEAMFLOW_CONFLICT:AI_AGENT_EXISTS';
  end if;

  insert into public.members (
    project_id,
    auth_user_id,
    email,
    kind,
    name,
    initial,
    role,
    description,
    avatar_url,
    color,
    is_ai
  ) values (
    p_project_id,
    null,
    null,
    'ai',
    '자료조사 AI',
    'AI',
    '자료 조사',
    '프로젝트 컨텍스트를 바탕으로 모의 조사 결과를 작성합니다.',
    null,
    '#3d4a63',
    true
  )
  returning * into created_member;

  insert into public.ai_agents (member_id, project_id)
  values (created_member.id, created_member.project_id)
  returning * into created_agent;

  return jsonb_build_object(
    'member', to_jsonb(created_member),
    'aiAgent', to_jsonb(created_agent)
  );
exception
  when unique_violation then
    raise exception 'TEAMFLOW_CONFLICT:AI_AGENT_EXISTS';
end;
$$;

create function private.update_ai_agent_settings(
  p_member_id uuid,
  p_instructions text,
  p_context_config jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_agent public.ai_agents;
  updated_agent public.ai_agents;
begin
  select * into existing_agent
  from public.ai_agents
  where member_id = p_member_id
  for update;

  if existing_agent.member_id is null
    or not (select private.is_project_collaborator(existing_agent.project_id)) then
    raise exception 'AI_AGENT_NOT_FOUND';
  end if;

  if char_length(coalesce(p_instructions, '')) > 10000 then
    raise exception 'INVALID_AI_INSTRUCTIONS';
  end if;

  if p_context_config is null
    or not private.is_valid_ai_context_config(p_context_config) then
    raise exception 'INVALID_AI_CONTEXT';
  end if;

  update public.ai_agents
  set
    instructions = coalesce(p_instructions, ''),
    context_config = p_context_config
  where member_id = existing_agent.member_id
  returning * into updated_agent;

  return to_jsonb(updated_agent);
end;
$$;

create function private.create_mock_ai_run(
  p_member_id uuid,
  p_task_id uuid,
  p_context_snapshot jsonb,
  p_result_markdown text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_agent public.ai_agents;
  target_task public.tasks;
  created_run public.ai_runs;
begin
  select * into existing_agent
  from public.ai_agents
  where member_id = p_member_id;

  if existing_agent.member_id is null
    or not (select private.is_project_collaborator(existing_agent.project_id)) then
    raise exception 'AI_AGENT_NOT_FOUND';
  end if;

  if not existing_agent.enabled then
    raise exception 'TEAMFLOW_CONFLICT:AI_AGENT_DISABLED';
  end if;

  select * into target_task
  from public.tasks
  where id = p_task_id
    and project_id = existing_agent.project_id
  for update;

  if target_task.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;
  if target_task.assignee_id <> existing_agent.member_id then
    raise exception 'TEAMFLOW_CONFLICT:TASK_NOT_ASSIGNED_TO_AI';
  end if;
  if target_task.status = 'completed' then
    raise exception 'TEAMFLOW_CONFLICT:TASK_COMPLETED';
  end if;
  if p_context_snapshot is null
    or jsonb_typeof(p_context_snapshot) <> 'object'
    or char_length(p_context_snapshot::text) > 100000 then
    raise exception 'INVALID_AI_CONTEXT_SNAPSHOT';
  end if;
  if p_result_markdown is null
    or char_length(btrim(p_result_markdown)) = 0
    or char_length(p_result_markdown) > 100000 then
    raise exception 'INVALID_AI_RESULT';
  end if;

  if exists (
    select 1
    from public.ai_runs run
    where run.ai_member_id = existing_agent.member_id
      and run.task_id = target_task.id
      and run.status in ('running', 'pending_review')
  ) then
    raise exception 'TEAMFLOW_CONFLICT:AI_RUN_PENDING';
  end if;

  insert into public.ai_runs (
    project_id,
    ai_member_id,
    task_id,
    status,
    context_snapshot,
    result_markdown,
    created_by
  ) values (
    existing_agent.project_id,
    existing_agent.member_id,
    target_task.id,
    'pending_review',
    p_context_snapshot,
    p_result_markdown,
    (select auth.uid())
  )
  returning * into created_run;

  return to_jsonb(created_run);
exception
  when unique_violation then
    raise exception 'TEAMFLOW_CONFLICT:AI_RUN_PENDING';
end;
$$;

create function private.create_failed_mock_ai_run(
  p_member_id uuid,
  p_task_id uuid,
  p_context_snapshot jsonb,
  p_error_message text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_agent public.ai_agents;
  target_task public.tasks;
  created_run public.ai_runs;
begin
  select * into existing_agent
  from public.ai_agents
  where member_id = p_member_id;

  if existing_agent.member_id is null
    or not (select private.is_project_collaborator(existing_agent.project_id)) then
    raise exception 'AI_AGENT_NOT_FOUND';
  end if;

  if not existing_agent.enabled then
    raise exception 'TEAMFLOW_CONFLICT:AI_AGENT_DISABLED';
  end if;

  select * into target_task
  from public.tasks
  where id = p_task_id
    and project_id = existing_agent.project_id
  for update;

  if target_task.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;
  if target_task.assignee_id <> existing_agent.member_id then
    raise exception 'TEAMFLOW_CONFLICT:TASK_NOT_ASSIGNED_TO_AI';
  end if;
  if target_task.status = 'completed' then
    raise exception 'TEAMFLOW_CONFLICT:TASK_COMPLETED';
  end if;
  if p_context_snapshot is null
    or jsonb_typeof(p_context_snapshot) <> 'object'
    or char_length(p_context_snapshot::text) > 100000 then
    raise exception 'INVALID_AI_CONTEXT_SNAPSHOT';
  end if;
  if p_error_message is null
    or char_length(btrim(p_error_message)) = 0
    or char_length(p_error_message) > 2000 then
    raise exception 'INVALID_AI_ERROR';
  end if;

  if exists (
    select 1
    from public.ai_runs run
    where run.ai_member_id = existing_agent.member_id
      and run.task_id = target_task.id
      and run.status in ('running', 'pending_review')
  ) then
    raise exception 'TEAMFLOW_CONFLICT:AI_RUN_PENDING';
  end if;

  insert into public.ai_runs (
    project_id,
    ai_member_id,
    task_id,
    status,
    context_snapshot,
    error_message,
    created_by
  ) values (
    existing_agent.project_id,
    existing_agent.member_id,
    target_task.id,
    'failed',
    p_context_snapshot,
    p_error_message,
    (select auth.uid())
  )
  returning * into created_run;

  return to_jsonb(created_run);
end;
$$;

create function private.apply_ai_run(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_run public.ai_runs;
  updated_run public.ai_runs;
  applied_note public.notes;
  actor_member_id uuid;
  task_title text;
begin
  select * into existing_run
  from public.ai_runs
  where id = p_run_id
  for update;

  if existing_run.id is null
    or not (select private.is_project_collaborator(existing_run.project_id)) then
    raise exception 'AI_RUN_NOT_FOUND';
  end if;

  if existing_run.status = 'applied' then
    if existing_run.applied_note_id is not null then
      select * into applied_note
      from public.notes
      where id = existing_run.applied_note_id
        and project_id = existing_run.project_id;
    end if;

    return jsonb_build_object(
      'aiRun', to_jsonb(existing_run),
      'note', to_jsonb(applied_note)
    );
  end if;

  if existing_run.status <> 'pending_review' then
    raise exception 'TEAMFLOW_CONFLICT:INVALID_AI_RUN_TRANSITION';
  end if;

  actor_member_id := private.current_project_member_id(existing_run.project_id);
  if actor_member_id is null then
    raise exception 'AI_RUN_NOT_FOUND';
  end if;

  select task.title into task_title
  from public.tasks task
  where task.id = existing_run.task_id
    and task.project_id = existing_run.project_id;

  task_title := coalesce(
    nullif(task_title, ''),
    nullif(existing_run.context_snapshot #>> '{task,title}', ''),
    '모의 작업'
  );

  insert into public.notes (
    project_id,
    title,
    content,
    author_id
  ) values (
    existing_run.project_id,
    left('AI 결과 · ' || task_title, 200),
    existing_run.result_markdown,
    actor_member_id
  )
  returning * into applied_note;

  update public.ai_runs
  set
    status = 'applied',
    applied_note_id = applied_note.id
  where id = existing_run.id
  returning * into updated_run;

  return jsonb_build_object(
    'aiRun', to_jsonb(updated_run),
    'note', to_jsonb(applied_note)
  );
end;
$$;

create function private.reject_ai_run(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_run public.ai_runs;
  updated_run public.ai_runs;
begin
  select * into existing_run
  from public.ai_runs
  where id = p_run_id
  for update;

  if existing_run.id is null
    or not (select private.is_project_collaborator(existing_run.project_id)) then
    raise exception 'AI_RUN_NOT_FOUND';
  end if;

  if existing_run.status = 'rejected' then
    return to_jsonb(existing_run);
  end if;

  if existing_run.status <> 'pending_review' then
    raise exception 'TEAMFLOW_CONFLICT:INVALID_AI_RUN_TRANSITION';
  end if;

  update public.ai_runs
  set status = 'rejected'
  where id = existing_run.id
  returning * into updated_run;

  return to_jsonb(updated_run);
end;
$$;

create function public.create_project_ai_agent(p_project_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_project_ai_agent(p_project_id);
$$;

create function public.update_ai_agent_settings(
  p_member_id uuid,
  p_instructions text,
  p_context_config jsonb
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.update_ai_agent_settings(
    p_member_id,
    p_instructions,
    p_context_config
  );
$$;

create function public.create_mock_ai_run(
  p_member_id uuid,
  p_task_id uuid,
  p_context_snapshot jsonb,
  p_result_markdown text
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_mock_ai_run(
    p_member_id,
    p_task_id,
    p_context_snapshot,
    p_result_markdown
  );
$$;

create function public.create_failed_mock_ai_run(
  p_member_id uuid,
  p_task_id uuid,
  p_context_snapshot jsonb,
  p_error_message text
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_failed_mock_ai_run(
    p_member_id,
    p_task_id,
    p_context_snapshot,
    p_error_message
  );
$$;

create function public.apply_ai_run(p_run_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.apply_ai_run(p_run_id);
$$;

create function public.reject_ai_run(p_run_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.reject_ai_run(p_run_id);
$$;

revoke all on function private.create_project_ai_agent(uuid)
  from public, anon, authenticated;
revoke all on function private.update_ai_agent_settings(uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function private.create_mock_ai_run(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
revoke all on function private.create_failed_mock_ai_run(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
revoke all on function private.apply_ai_run(uuid)
  from public, anon, authenticated;
revoke all on function private.reject_ai_run(uuid)
  from public, anon, authenticated;

grant execute on function private.create_project_ai_agent(uuid)
  to authenticated;
grant execute on function private.update_ai_agent_settings(uuid, text, jsonb)
  to authenticated;
grant execute on function private.create_mock_ai_run(uuid, uuid, jsonb, text)
  to authenticated;
grant execute on function private.create_failed_mock_ai_run(uuid, uuid, jsonb, text)
  to authenticated;
grant execute on function private.apply_ai_run(uuid)
  to authenticated;
grant execute on function private.reject_ai_run(uuid)
  to authenticated;

revoke all on function public.create_project_ai_agent(uuid)
  from public, anon, authenticated;
revoke all on function public.update_ai_agent_settings(uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.create_mock_ai_run(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.create_failed_mock_ai_run(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.apply_ai_run(uuid)
  from public, anon, authenticated;
revoke all on function public.reject_ai_run(uuid)
  from public, anon, authenticated;

grant execute on function public.create_project_ai_agent(uuid)
  to authenticated;
grant execute on function public.update_ai_agent_settings(uuid, text, jsonb)
  to authenticated;
grant execute on function public.create_mock_ai_run(uuid, uuid, jsonb, text)
  to authenticated;
grant execute on function public.create_failed_mock_ai_run(uuid, uuid, jsonb, text)
  to authenticated;
grant execute on function public.apply_ai_run(uuid)
  to authenticated;
grant execute on function public.reject_ai_run(uuid)
  to authenticated;

-- Bring the public read-only demo payload onto the same project-scoped AI
-- contract used by authenticated bootstrap responses.
update public.demo_workspaces
set
  payload = (
    payload
      - 'aiSettings'
      - 'aiHistory'
      - 'aiMemberId'
  )
  || jsonb_build_object(
    'members',
    coalesce(
      (
        select jsonb_agg(
          member_item
          || jsonb_build_object(
            'kind',
            case when coalesce((member_item ->> 'isAi')::boolean, false)
              then 'ai' else 'user' end,
            'authUserId', null,
            'email', null
          )
          order by member_ordinality
        )
        from jsonb_array_elements(payload -> 'members')
          with ordinality as member_rows(member_item, member_ordinality)
      ),
      '[]'::jsonb
    ),
    'aiAgents',
    jsonb_build_array(
      jsonb_build_object(
        'memberId', 'member-ai',
        'projectId', '1',
        'instructions',
          '너는 TeamFlow 프로젝트의 자료조사 담당 AI 팀원이야. 항상 결과를 마크다운으로 정리해줘.',
        'contextConfig',
          jsonb_build_object(
            'project', true,
            'notes', true,
            'tasks', true,
            'team', false,
            'resources', true
          ),
        'enabled', true,
        'createdAt', '2026-07-08T00:00:00.000Z',
        'updatedAt', '2026-07-11T00:00:00.000Z'
      )
    ),
    'aiRuns',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'history-1',
        'projectId', '1',
        'aiMemberId', 'member-ai',
        'taskId', '5',
        'status', 'applied',
        'contextSnapshot', jsonb_build_object('task', jsonb_build_object('title', '유사 서비스 레퍼런스 분석')),
        'resultMarkdown', E'# 모의 실행 결과\n\n유사 서비스 비교 분석을 완료했습니다.',
        'errorMessage', null,
        'appliedNoteId', 'note-2',
        'createdBy', null,
        'createdAt', '2026-07-11T00:00:00.000Z',
        'updatedAt', '2026-07-11T00:00:00.000Z'
      ),
      jsonb_build_object(
        'id', 'history-2',
        'projectId', '1',
        'aiMemberId', 'member-ai',
        'taskId', null,
        'status', 'pending_review',
        'contextSnapshot', jsonb_build_object('task', jsonb_build_object('title', '대학생 팀플 페인포인트 조사')),
        'resultMarkdown', E'# 모의 실행 결과\n\n설문 결과에서 다섯 가지 패턴을 정리했습니다.',
        'errorMessage', null,
        'appliedNoteId', null,
        'createdBy', null,
        'createdAt', '2026-07-10T00:00:00.000Z',
        'updatedAt', '2026-07-10T00:00:00.000Z'
      ),
      jsonb_build_object(
        'id', 'history-3',
        'projectId', '1',
        'aiMemberId', 'member-ai',
        'taskId', null,
        'status', 'rejected',
        'contextSnapshot', jsonb_build_object('task', jsonb_build_object('title', '경쟁사 기능 비교표 작성')),
        'resultMarkdown', E'# 모의 실행 결과\n\n비교표 초안을 작성했습니다.',
        'errorMessage', null,
        'appliedNoteId', null,
        'createdBy', null,
        'createdAt', '2026-07-08T00:00:00.000Z',
        'updatedAt', '2026-07-08T00:00:00.000Z'
      )
    ),
    'capabilities',
      coalesce(payload -> 'capabilities', '{}'::jsonb)
      || jsonb_build_object('ai', true)
  ),
  updated_at = now()
where slug = 'teamflow';
