-- TeamFlow per-user Gemini credentials and provider-neutral AI run metadata.
-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.
-- Never apply this migration to TimeBox project vimywtpiqsixlfiegpdd.
--
-- Supabase does not expose the project ref as a documented PostgreSQL setting.
-- This schema preflight therefore fails closed unless the target has the exact
-- TeamFlow AI schema and latest execution-rule migration expected by this file.
do $$
begin
  if to_regclass('public.project_access') is null
    or to_regclass('public.ai_agents') is null
    or to_regclass('public.ai_runs') is null
    or to_regprocedure('private.touch_updated_at()') is null
    or to_regprocedure('private.is_project_collaborator(uuid)') is null
    or to_regprocedure(
      'public.create_mock_ai_run(uuid,uuid,jsonb,text)'
    ) is null
    or to_regprocedure(
      'private.reject_invalid_ai_run_reexecution()'
    ) is null then
    raise exception
      'TEAMFLOW_PROJECT_PREFLIGHT_FAILED: expected TeamFlow project lmmeuoeuiouyowpthxwg';
  end if;
end;
$$;

create table public.user_ai_credentials (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  encrypted_key text not null,
  iv text not null,
  auth_tag text not null,
  encryption_version smallint not null default 1,
  key_hint text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider),
  constraint user_ai_credentials_provider_check
    check (provider = 'gemini'),
  constraint user_ai_credentials_encrypted_key_check
    check (char_length(encrypted_key) between 24 and 4096),
  constraint user_ai_credentials_iv_check
    check (char_length(iv) = 16),
  constraint user_ai_credentials_auth_tag_check
    check (char_length(auth_tag) = 24),
  constraint user_ai_credentials_encryption_version_check
    check (encryption_version = 1),
  constraint user_ai_credentials_key_hint_check
    check (char_length(key_hint) = 4)
);

create trigger user_ai_credentials_touch_updated_at
before update on public.user_ai_credentials
for each row execute function private.touch_updated_at();

alter table public.user_ai_credentials enable row level security;

revoke all privileges on table public.user_ai_credentials
  from public, anon, authenticated, service_role;

grant select, insert, update, delete
  on table public.user_ai_credentials
  to authenticated;

create policy user_ai_credentials_select_own
  on public.user_ai_credentials
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy user_ai_credentials_insert_own
  on public.user_ai_credentials
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy user_ai_credentials_update_own
  on public.user_ai_credentials
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy user_ai_credentials_delete_own
  on public.user_ai_credentials
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create function private.is_valid_ai_run_metadata(
  p_execution_mode text,
  p_provider text,
  p_model text,
  p_usage jsonb,
  p_duration_ms integer
) returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce((
    p_execution_mode in ('mock', 'live')
    and (
      (
        p_execution_mode = 'mock'
        and p_provider is null
        and p_model is null
      )
      or (
        p_execution_mode = 'live'
        and p_provider = 'gemini'
        and char_length(btrim(coalesce(p_model, ''))) between 1 and 200
      )
    )
    and jsonb_typeof(p_usage) = 'object'
    and (p_usage - array['inputTokens', 'outputTokens', 'totalTokens'])
      = '{}'::jsonb
    and (
      not (p_usage ? 'inputTokens')
      or jsonb_typeof(p_usage -> 'inputTokens') = 'null'
      or (
        jsonb_typeof(p_usage -> 'inputTokens') = 'number'
        and (p_usage ->> 'inputTokens') ~ '^[0-9]+$'
      )
    )
    and (
      not (p_usage ? 'outputTokens')
      or jsonb_typeof(p_usage -> 'outputTokens') = 'null'
      or (
        jsonb_typeof(p_usage -> 'outputTokens') = 'number'
        and (p_usage ->> 'outputTokens') ~ '^[0-9]+$'
      )
    )
    and (
      not (p_usage ? 'totalTokens')
      or jsonb_typeof(p_usage -> 'totalTokens') = 'null'
      or (
        jsonb_typeof(p_usage -> 'totalTokens') = 'number'
        and (p_usage ->> 'totalTokens') ~ '^[0-9]+$'
      )
    )
    and char_length(p_usage::text) <= 2000
    and (p_duration_ms is null or p_duration_ms >= 0)
  ), false);
$$;

revoke all on function private.is_valid_ai_run_metadata(
  text,
  text,
  text,
  jsonb,
  integer
) from public, anon, authenticated;

alter table public.ai_runs
  add column execution_mode text not null default 'mock',
  add column provider text,
  add column model text,
  add column usage jsonb not null default '{}'::jsonb,
  add column duration_ms integer,
  add constraint ai_runs_execution_metadata_check
    check (
      private.is_valid_ai_run_metadata(
        execution_mode,
        provider,
        model,
        usage,
        duration_ms
      )
    );

create function private.create_ai_run(
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
  if p_usage is null
    or not private.is_valid_ai_run_metadata(
      p_execution_mode,
      p_provider,
      p_model,
      p_usage,
      p_duration_ms
    ) then
    raise exception 'INVALID_AI_RUN_METADATA';
  end if;

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
    existing_agent.project_id,
    existing_agent.member_id,
    target_task.id,
    'pending_review',
    p_context_snapshot,
    p_result_markdown,
    (select auth.uid()),
    p_execution_mode,
    p_provider,
    btrim(p_model),
    p_usage,
    p_duration_ms
  )
  returning * into created_run;

  return to_jsonb(created_run);
exception
  when unique_violation then
    raise exception 'TEAMFLOW_CONFLICT:AI_RUN_PENDING';
end;
$$;

create function private.create_failed_ai_run(
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
  if p_usage is null
    or not private.is_valid_ai_run_metadata(
      p_execution_mode,
      p_provider,
      p_model,
      p_usage,
      p_duration_ms
    ) then
    raise exception 'INVALID_AI_RUN_METADATA';
  end if;

  insert into public.ai_runs (
    project_id,
    ai_member_id,
    task_id,
    status,
    context_snapshot,
    error_message,
    created_by,
    execution_mode,
    provider,
    model,
    usage,
    duration_ms
  ) values (
    existing_agent.project_id,
    existing_agent.member_id,
    target_task.id,
    'failed',
    p_context_snapshot,
    p_error_message,
    (select auth.uid()),
    p_execution_mode,
    p_provider,
    btrim(p_model),
    p_usage,
    p_duration_ms
  )
  returning * into created_run;

  return to_jsonb(created_run);
exception
  when unique_violation then
    raise exception 'TEAMFLOW_CONFLICT:AI_RUN_PENDING';
end;
$$;

-- Preserve the established Mock RPC signatures while routing both modes
-- through one authorization and state-transition implementation.
create or replace function private.create_mock_ai_run(
  p_member_id uuid,
  p_task_id uuid,
  p_context_snapshot jsonb,
  p_result_markdown text
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.create_ai_run(
    p_member_id,
    p_task_id,
    p_context_snapshot,
    p_result_markdown,
    'mock',
    null,
    null,
    '{}'::jsonb,
    0
  );
$$;

create or replace function private.create_failed_mock_ai_run(
  p_member_id uuid,
  p_task_id uuid,
  p_context_snapshot jsonb,
  p_error_message text
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.create_failed_ai_run(
    p_member_id,
    p_task_id,
    p_context_snapshot,
    p_error_message,
    'mock',
    null,
    null,
    '{}'::jsonb,
    0
  );
$$;

create function public.create_ai_run(
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
language sql
security invoker
set search_path = ''
as $$
  select private.create_ai_run(
    p_member_id,
    p_task_id,
    p_context_snapshot,
    p_result_markdown,
    p_execution_mode,
    p_provider,
    p_model,
    p_usage,
    p_duration_ms
  );
$$;

create function public.create_failed_ai_run(
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
language sql
security invoker
set search_path = ''
as $$
  select private.create_failed_ai_run(
    p_member_id,
    p_task_id,
    p_context_snapshot,
    p_error_message,
    p_execution_mode,
    p_provider,
    p_model,
    p_usage,
    p_duration_ms
  );
$$;

-- Keep note titles neutral now that both Mock and live providers use the same
-- review/apply state machine.
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

  return jsonb_build_object(
    'aiRun', to_jsonb(updated_run),
    'note', to_jsonb(applied_note)
  );
end;
$$;

revoke all on function private.create_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text,
  text,
  jsonb,
  integer
) from public, anon, authenticated;
revoke all on function private.create_failed_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text,
  text,
  jsonb,
  integer
) from public, anon, authenticated;
revoke all on function private.create_mock_ai_run(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
revoke all on function private.create_failed_mock_ai_run(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
revoke all on function private.apply_ai_run(uuid)
  from public, anon, authenticated;
revoke all on function public.create_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text,
  text,
  jsonb,
  integer
) from public, anon, authenticated;
revoke all on function public.create_failed_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text,
  text,
  jsonb,
  integer
) from public, anon, authenticated;

grant execute on function private.create_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text,
  text,
  jsonb,
  integer
) to authenticated;
grant execute on function private.create_failed_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text,
  text,
  jsonb,
  integer
) to authenticated;
grant execute on function private.create_mock_ai_run(uuid, uuid, jsonb, text)
  to authenticated;
grant execute on function private.create_failed_mock_ai_run(uuid, uuid, jsonb, text)
  to authenticated;
grant execute on function private.apply_ai_run(uuid)
  to authenticated;
grant execute on function public.create_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text,
  text,
  jsonb,
  integer
) to authenticated;
grant execute on function public.create_failed_ai_run(
  uuid,
  uuid,
  jsonb,
  text,
  text,
  text,
  text,
  jsonb,
  integer
) to authenticated;
