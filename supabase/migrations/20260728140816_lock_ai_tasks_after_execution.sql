-- TeamFlow AI tasks may be edited or deleted only before their first run.
-- Rejected and failed runs remain retryable through the AI execution flow, but
-- their task definition becomes immutable history once execution has started.
-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.
-- Never apply to TimeBox project vimywtpiqsixlfiegpdd.

do $$
begin
  if to_regclass('public.tasks') is null
    or to_regclass('public.members') is null
    or to_regclass('public.ai_runs') is null
    or to_regprocedure('private.update_task(uuid,jsonb)') is null
    or to_regprocedure('private.delete_task(uuid)') is null
    or to_regprocedure('private.is_project_collaborator(uuid)') is null then
    raise exception 'TEAMFLOW_PROJECT_PREFLIGHT_FAILED: expected guarded TeamFlow AI task schema';
  end if;
end;
$$;

create or replace function private.update_task(
  p_task_id uuid,
  p_patch jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_task public.tasks;
  updated_task public.tasks;
  current_assignee_kind text;
  next_assignee_id uuid;
  next_assignee_kind text;
  next_ai_enabled boolean;
  has_ai_run boolean;
begin
  if p_patch is null
    or jsonb_typeof(p_patch) <> 'object'
    or p_patch = '{}'::jsonb
    or exists (
      select 1
      from jsonb_object_keys(p_patch) as patch_key
      where patch_key not in ('title', 'assigneeId', 'dueDate', 'status', 'description')
    ) then
    raise exception 'INVALID_TASK_PATCH';
  end if;

  if p_patch ? 'title' and (
    jsonb_typeof(p_patch -> 'title') <> 'string'
    or char_length(btrim(p_patch ->> 'title')) not between 1 and 200
  ) then
    raise exception 'INVALID_TASK_TITLE';
  end if;
  if p_patch ? 'description' and (
    jsonb_typeof(p_patch -> 'description') <> 'string'
    or char_length(p_patch ->> 'description') > 2000
  ) then
    raise exception 'INVALID_TASK_DESCRIPTION';
  end if;
  if p_patch ? 'status' and (
    jsonb_typeof(p_patch -> 'status') <> 'string'
    or (p_patch ->> 'status') not in ('not_started', 'in_progress', 'in_review', 'completed')
  ) then
    raise exception 'INVALID_TASK_STATUS';
  end if;
  if p_patch ? 'dueDate' and (
    jsonb_typeof(p_patch -> 'dueDate') <> 'string'
    or (p_patch ->> 'dueDate') !~ '^\d{4}-\d{2}-\d{2}$'
  ) then
    raise exception 'INVALID_TASK_DUE_DATE';
  end if;
  if p_patch ? 'assigneeId' and (
    jsonb_typeof(p_patch -> 'assigneeId') <> 'string'
    or (p_patch ->> 'assigneeId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) then
    raise exception 'INVALID_TASK_ASSIGNEE';
  end if;

  select * into target_task
  from public.tasks
  where id = p_task_id
  for update;

  if target_task.id is null
    or not (select private.is_project_collaborator(target_task.project_id)) then
    raise exception 'TASK_NOT_FOUND';
  end if;

  select member.kind into current_assignee_kind
  from public.members member
  where member.id = target_task.assignee_id
    and member.project_id = target_task.project_id;

  select exists (
    select 1
    from public.ai_runs run
    where run.task_id = target_task.id
  ) into has_ai_run;

  if has_ai_run then
    raise exception 'TEAMFLOW_CONFLICT:AI_TASK_LOCKED';
  end if;
  if current_assignee_kind = 'ai' and target_task.status <> 'not_started' then
    raise exception 'TEAMFLOW_CONFLICT:AI_TASK_LOCKED';
  end if;
  if current_assignee_kind = 'ai' and p_patch ? 'status' then
    raise exception 'TEAMFLOW_CONFLICT:AI_TASK_STATUS_MANAGED';
  end if;

  if p_patch ? 'assigneeId' then
    next_assignee_id := (p_patch ->> 'assigneeId')::uuid;

    select
      member.kind,
      agent.enabled
    into
      next_assignee_kind,
      next_ai_enabled
    from public.members member
    left join public.ai_agents agent on agent.member_id = member.id
    where member.id = next_assignee_id
      and member.project_id = target_task.project_id;

    if next_assignee_kind is null then
      raise exception 'TEAMFLOW_CONFLICT:INVALID_TASK_ASSIGNEE';
    end if;
    if next_assignee_kind = 'ai' and coalesce(next_ai_enabled, false) = false then
      raise exception 'TEAMFLOW_CONFLICT:AI_AGENT_DISABLED';
    end if;
    if next_assignee_kind = 'ai'
      and p_patch ? 'status'
      and (p_patch ->> 'status') <> 'not_started' then
      raise exception 'TEAMFLOW_CONFLICT:AI_TASK_STATUS_MANAGED';
    end if;
  else
    next_assignee_id := target_task.assignee_id;
    next_assignee_kind := current_assignee_kind;
  end if;

  update public.tasks
  set
    title = case when p_patch ? 'title' then btrim(p_patch ->> 'title') else target_task.title end,
    assignee_id = next_assignee_id,
    due_date = case when p_patch ? 'dueDate' then (p_patch ->> 'dueDate')::date else target_task.due_date end,
    status = case
      when current_assignee_kind <> 'ai' and next_assignee_kind = 'ai' then 'not_started'
      when p_patch ? 'status' then p_patch ->> 'status'
      else target_task.status
    end,
    description = case when p_patch ? 'description' then p_patch ->> 'description' else target_task.description end
  where id = target_task.id
  returning * into updated_task;

  return to_jsonb(updated_task);
end;
$$;

create or replace function private.delete_task(p_task_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_task public.tasks;
  assignee_kind text;
  has_ai_run boolean;
begin
  select * into target_task
  from public.tasks
  where id = p_task_id
  for update;

  if target_task.id is null
    or not (select private.is_project_collaborator(target_task.project_id)) then
    raise exception 'TASK_NOT_FOUND';
  end if;

  select member.kind into assignee_kind
  from public.members member
  where member.id = target_task.assignee_id
    and member.project_id = target_task.project_id;

  select exists (
    select 1
    from public.ai_runs run
    where run.task_id = target_task.id
  ) into has_ai_run;

  if has_ai_run
    or (assignee_kind = 'ai' and target_task.status <> 'not_started') then
    raise exception 'TEAMFLOW_CONFLICT:AI_TASK_LOCKED';
  end if;

  delete from public.tasks
  where id = target_task.id;

  return target_task.id;
end;
$$;

revoke all on function private.update_task(uuid, jsonb) from public, anon;
revoke all on function private.delete_task(uuid) from public, anon;
