-- TeamFlow atomic AI-run and assigned-task status transitions.
-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.
-- Never apply this migration to TimeBox project vimywtpiqsixlfiegpdd.
--
-- External provider calls stay outside database transactions. A short start
-- transaction records the running lease and moves the assigned task to
-- in_progress; a later complete/fail/review transaction changes both rows
-- atomically.
do $$
begin
  if to_regclass('public.ai_runs') is null
    or to_regclass('public.tasks') is null
    or to_regprocedure(
      'private.is_valid_ai_run_metadata(text,text,text,jsonb,integer)'
    ) is null
    or to_regprocedure(
      'private.create_ai_run(uuid,uuid,jsonb,text,text,text,text,jsonb,integer)'
    ) is null
    or to_regprocedure('private.apply_ai_run(uuid)') is null
    or to_regprocedure('private.reject_ai_run(uuid)') is null then
    raise exception
      'TEAMFLOW_PROJECT_PREFLIGHT_FAILED: expected TeamFlow live AI schema';
  end if;
end;
$$;

alter table public.ai_runs
  add column task_status_before_run text,
  add constraint ai_runs_task_status_before_run_check
    check (
      task_status_before_run is null
      or task_status_before_run in (
        'not_started',
        'in_progress',
        'in_review',
        'completed'
      )
    );

create function private.start_ai_run(
  p_member_id uuid,
  p_task_id uuid,
  p_context_snapshot jsonb,
  p_execution_mode text,
  p_provider text,
  p_model text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_agent public.ai_agents;
  target_task public.tasks;
  updated_task public.tasks;
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

  if exists (
    select 1
    from public.ai_runs run
    where run.ai_member_id = existing_agent.member_id
      and run.task_id = target_task.id
      and run.status = 'applied'
  ) then
    raise exception 'TEAMFLOW_CONFLICT:AI_RUN_APPLIED';
  end if;

  if target_task.status = 'completed' then
    raise exception 'TEAMFLOW_CONFLICT:TASK_COMPLETED';
  end if;
  if p_context_snapshot is null
    or jsonb_typeof(p_context_snapshot) <> 'object'
    or char_length(p_context_snapshot::text) > 100000 then
    raise exception 'INVALID_AI_CONTEXT_SNAPSHOT';
  end if;
  if not private.is_valid_ai_run_metadata(
    p_execution_mode,
    p_provider,
    p_model,
    '{}'::jsonb,
    null
  ) then
    raise exception 'INVALID_AI_RUN_METADATA';
  end if;

  -- A process can disappear after start and before complete/fail. Release a
  -- stale running row before enforcing the open-run invariant so the task can
  -- be retried. SKIP LOCKED avoids deadlocking a completion already holding
  -- the run row while this transaction owns the task row.
  with stale_runs as (
    select run.id
    from public.ai_runs run
    where run.ai_member_id = existing_agent.member_id
      and run.task_id = target_task.id
      and run.status = 'running'
      and run.created_at <= now() - interval '5 minutes'
    for update skip locked
  )
  update public.ai_runs run
  set
    status = 'failed',
    result_markdown = null,
    error_message = 'AI 작업 실행이 중단되어 다시 실행할 수 있습니다.',
    duration_ms = coalesce(run.duration_ms, 300000)
  from stale_runs stale
  where run.id = stale.id;

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
    created_by,
    execution_mode,
    provider,
    model,
    usage,
    duration_ms,
    task_status_before_run
  ) values (
    existing_agent.project_id,
    existing_agent.member_id,
    target_task.id,
    'running',
    p_context_snapshot,
    (select auth.uid()),
    p_execution_mode,
    p_provider,
    btrim(p_model),
    '{}'::jsonb,
    null,
    target_task.status
  )
  returning * into created_run;

  update public.tasks
  set status = 'in_progress'
  where id = target_task.id
    and project_id = existing_agent.project_id
    and assignee_id = existing_agent.member_id
  returning * into updated_task;

  if updated_task.id is null then
    raise exception 'TEAMFLOW_CONFLICT:TASK_NOT_ASSIGNED_TO_AI';
  end if;

  return jsonb_build_object(
    'aiRun', to_jsonb(created_run),
    'task', to_jsonb(updated_task)
  );
exception
  when unique_violation then
    raise exception 'TEAMFLOW_CONFLICT:AI_RUN_PENDING';
end;
$$;

create function private.complete_ai_run(
  p_run_id uuid,
  p_result_markdown text,
  p_usage jsonb,
  p_duration_ms integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_run public.ai_runs;
  updated_run public.ai_runs;
  synchronized_task public.tasks;
begin
  select * into existing_run
  from public.ai_runs
  where id = p_run_id
  for update;

  if existing_run.id is null
    or not (select private.is_project_collaborator(existing_run.project_id)) then
    raise exception 'AI_RUN_NOT_FOUND';
  end if;

  if existing_run.status <> 'running' then
    raise exception 'TEAMFLOW_CONFLICT:INVALID_AI_RUN_TRANSITION';
  end if;
  if p_result_markdown is null
    or char_length(btrim(p_result_markdown)) = 0
    or char_length(p_result_markdown) > 100000 then
    raise exception 'INVALID_AI_RESULT';
  end if;
  if p_usage is null
    or not private.is_valid_ai_run_metadata(
      existing_run.execution_mode,
      existing_run.provider,
      existing_run.model,
      p_usage,
      p_duration_ms
    ) then
    raise exception 'INVALID_AI_RUN_METADATA';
  end if;

  update public.ai_runs
  set
    status = 'pending_review',
    result_markdown = p_result_markdown,
    error_message = null,
    usage = p_usage,
    duration_ms = p_duration_ms
  where id = existing_run.id
  returning * into updated_run;

  if existing_run.task_id is not null then
    update public.tasks
    set status = 'in_review'
    where id = existing_run.task_id
      and project_id = existing_run.project_id
      and assignee_id = existing_run.ai_member_id
      and status = 'in_progress'
    returning * into synchronized_task;

    if synchronized_task.id is null then
      select * into synchronized_task
      from public.tasks
      where id = existing_run.task_id
        and project_id = existing_run.project_id;
    end if;
  end if;

  return jsonb_build_object(
    'aiRun', to_jsonb(updated_run),
    'task', to_jsonb(synchronized_task)
  );
end;
$$;

create function private.fail_ai_run(
  p_run_id uuid,
  p_error_message text,
  p_usage jsonb,
  p_duration_ms integer,
  p_restore_task_status boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_run public.ai_runs;
  updated_run public.ai_runs;
  synchronized_task public.tasks;
  target_task_status text;
begin
  select * into existing_run
  from public.ai_runs
  where id = p_run_id
  for update;

  if existing_run.id is null
    or not (select private.is_project_collaborator(existing_run.project_id)) then
    raise exception 'AI_RUN_NOT_FOUND';
  end if;

  if existing_run.status <> 'running' then
    raise exception 'TEAMFLOW_CONFLICT:INVALID_AI_RUN_TRANSITION';
  end if;
  if p_error_message is null
    or char_length(btrim(p_error_message)) = 0
    or char_length(p_error_message) > 2000 then
    raise exception 'INVALID_AI_ERROR';
  end if;
  if p_restore_task_status is null then
    raise exception 'INVALID_AI_TASK_RESTORE_MODE';
  end if;
  if p_usage is null
    or not private.is_valid_ai_run_metadata(
      existing_run.execution_mode,
      existing_run.provider,
      existing_run.model,
      p_usage,
      p_duration_ms
    ) then
    raise exception 'INVALID_AI_RUN_METADATA';
  end if;

  update public.ai_runs
  set
    status = 'failed',
    result_markdown = null,
    error_message = p_error_message,
    usage = p_usage,
    duration_ms = p_duration_ms
  where id = existing_run.id
  returning * into updated_run;

  target_task_status := case
    when p_restore_task_status
      then coalesce(existing_run.task_status_before_run, 'in_progress')
    else 'in_progress'
  end;

  if existing_run.task_id is not null then
    update public.tasks
    set status = target_task_status
    where id = existing_run.task_id
      and project_id = existing_run.project_id
      and assignee_id = existing_run.ai_member_id
      and status = 'in_progress'
    returning * into synchronized_task;

    if synchronized_task.id is null then
      select * into synchronized_task
      from public.tasks
      where id = existing_run.task_id
        and project_id = existing_run.project_id;
    end if;
  end if;

  return jsonb_build_object(
    'aiRun', to_jsonb(updated_run),
    'task', to_jsonb(synchronized_task)
  );
end;
$$;

create function public.start_ai_run(
  p_member_id uuid,
  p_task_id uuid,
  p_context_snapshot jsonb,
  p_execution_mode text,
  p_provider text,
  p_model text
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.start_ai_run(
    p_member_id,
    p_task_id,
    p_context_snapshot,
    p_execution_mode,
    p_provider,
    p_model
  );
$$;

create function public.complete_ai_run(
  p_run_id uuid,
  p_result_markdown text,
  p_usage jsonb,
  p_duration_ms integer
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.complete_ai_run(
    p_run_id,
    p_result_markdown,
    p_usage,
    p_duration_ms
  );
$$;

create function public.fail_ai_run(
  p_run_id uuid,
  p_error_message text,
  p_usage jsonb,
  p_duration_ms integer,
  p_restore_task_status boolean
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.fail_ai_run(
    p_run_id,
    p_error_message,
    p_usage,
    p_duration_ms,
    p_restore_task_status
  );
$$;

-- Keep the established one-shot RPC signatures for older clients. They now
-- compose the same start/finish transitions inside one transaction and return
-- the original AI-run row payload.
create or replace function private.create_ai_run(
  p_member_id uuid,
  p_task_id uuid,
  p_context_snapshot jsonb,
  p_result_markdown text,
  p_execution_mode text,
  p_provider text,
  p_model text,
  p_usage jsonb,
  p_duration_ms integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  started_result jsonb;
  completed_result jsonb;
begin
  started_result := private.start_ai_run(
    p_member_id,
    p_task_id,
    p_context_snapshot,
    p_execution_mode,
    p_provider,
    p_model
  );

  completed_result := private.complete_ai_run(
    (started_result -> 'aiRun' ->> 'id')::uuid,
    p_result_markdown,
    p_usage,
    p_duration_ms
  );

  return completed_result -> 'aiRun';
end;
$$;

create or replace function private.create_failed_ai_run(
  p_member_id uuid,
  p_task_id uuid,
  p_context_snapshot jsonb,
  p_error_message text,
  p_execution_mode text,
  p_provider text,
  p_model text,
  p_usage jsonb,
  p_duration_ms integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  started_result jsonb;
  failed_result jsonb;
begin
  started_result := private.start_ai_run(
    p_member_id,
    p_task_id,
    p_context_snapshot,
    p_execution_mode,
    p_provider,
    p_model
  );

  failed_result := private.fail_ai_run(
    (started_result -> 'aiRun' ->> 'id')::uuid,
    p_error_message,
    p_usage,
    p_duration_ms,
    false
  );

  return failed_result -> 'aiRun';
end;
$$;

create or replace function private.apply_ai_run(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_run public.ai_runs;
  updated_run public.ai_runs;
  applied_note public.notes;
  synchronized_task public.tasks;
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

    if existing_run.task_id is not null then
      select * into synchronized_task
      from public.tasks
      where id = existing_run.task_id
        and project_id = existing_run.project_id;
    end if;

    return jsonb_build_object(
      'aiRun', to_jsonb(existing_run),
      'note', to_jsonb(applied_note),
      'task', to_jsonb(synchronized_task)
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
    'AI 작업'
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

  if existing_run.task_id is not null then
    update public.tasks
    set status = 'completed'
    where id = existing_run.task_id
      and project_id = existing_run.project_id
      and assignee_id = existing_run.ai_member_id
      and status = 'in_review'
    returning * into synchronized_task;

    if synchronized_task.id is null then
      select * into synchronized_task
      from public.tasks
      where id = existing_run.task_id
        and project_id = existing_run.project_id;
    end if;
  end if;

  return jsonb_build_object(
    'aiRun', to_jsonb(updated_run),
    'note', to_jsonb(applied_note),
    'task', to_jsonb(synchronized_task)
  );
end;
$$;

create or replace function private.reject_ai_run(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_run public.ai_runs;
  updated_run public.ai_runs;
  synchronized_task public.tasks;
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
    if existing_run.task_id is not null then
      select * into synchronized_task
      from public.tasks
      where id = existing_run.task_id
        and project_id = existing_run.project_id;
    end if;

    return to_jsonb(existing_run) || jsonb_build_object(
      'aiRun', to_jsonb(existing_run),
      'task', to_jsonb(synchronized_task)
    );
  end if;

  if existing_run.status <> 'pending_review' then
    raise exception 'TEAMFLOW_CONFLICT:INVALID_AI_RUN_TRANSITION';
  end if;

  update public.ai_runs
  set status = 'rejected'
  where id = existing_run.id
  returning * into updated_run;

  if existing_run.task_id is not null then
    update public.tasks
    set status = 'in_progress'
    where id = existing_run.task_id
      and project_id = existing_run.project_id
      and assignee_id = existing_run.ai_member_id
      and status = 'in_review'
    returning * into synchronized_task;

    if synchronized_task.id is null then
      select * into synchronized_task
      from public.tasks
      where id = existing_run.task_id
        and project_id = existing_run.project_id;
    end if;
  end if;

  -- Preserve the top-level legacy AI-run fields while adding the new atomic
  -- response contract consumed by current API clients.
  return to_jsonb(updated_run) || jsonb_build_object(
    'aiRun', to_jsonb(updated_run),
    'task', to_jsonb(synchronized_task)
  );
end;
$$;

revoke all on function private.start_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text
) from public, anon, authenticated;
revoke all on function private.complete_ai_run(
  uuid,
  text,
  jsonb,
  integer
) from public, anon, authenticated;
revoke all on function private.fail_ai_run(
  uuid,
  text,
  jsonb,
  integer,
  boolean
) from public, anon, authenticated;
revoke all on function public.start_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.complete_ai_run(
  uuid,
  text,
  jsonb,
  integer
) from public, anon, authenticated;
revoke all on function public.fail_ai_run(
  uuid,
  text,
  jsonb,
  integer,
  boolean
) from public, anon, authenticated;

grant execute on function private.start_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text
) to authenticated;
grant execute on function private.complete_ai_run(
  uuid,
  text,
  jsonb,
  integer
) to authenticated;
grant execute on function private.fail_ai_run(
  uuid,
  text,
  jsonb,
  integer,
  boolean
) to authenticated;
grant execute on function public.start_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text
) to authenticated;
grant execute on function public.complete_ai_run(
  uuid,
  text,
  jsonb,
  integer
) to authenticated;
grant execute on function public.fail_ai_run(
  uuid,
  text,
  jsonb,
  integer,
  boolean
) to authenticated;
