-- TeamFlow multi-AI agent team members.
-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.
-- Never apply this migration to TimeBox project vimywtpiqsixlfiegpdd.
--
-- This migration intentionally preserves existing ai_agents and ai_runs rows.
-- It removes only the one-agent-per-project constraint and fixed AI identity.

alter table public.members
  drop constraint if exists members_ai_identity_check;

drop index if exists public.members_project_ai_unique;

-- The original inline UNIQUE declaration on ai_agents.project_id is named
-- ai_agents_project_id_key by PostgreSQL. Keep the composite project/member
-- key because ai_runs uses it as a foreign-key target.
alter table public.ai_agents
  drop constraint if exists ai_agents_project_id_key;

create index if not exists ai_agents_project_idx
  on public.ai_agents (project_id);

-- Retire the fixed, single-agent RPCs before installing their multi-agent
-- replacements. The new creation function has a distinct signature; removing
-- the old overload prevents PostgREST callers from selecting the stale API.
drop function if exists public.create_project_ai_agent(uuid);
drop function if exists private.create_project_ai_agent(uuid);
drop function if exists public.update_ai_agent_settings(uuid, text, jsonb);
drop function if exists private.update_ai_agent_settings(uuid, text, jsonb);

create function private.create_project_ai_agent(
  p_project_id uuid,
  p_name text,
  p_role text,
  p_description text,
  p_color text,
  p_instructions text,
  p_context_config jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := btrim(coalesce(p_name, ''));
  normalized_role text := btrim(coalesce(p_role, ''));
  normalized_description text := coalesce(p_description, '');
  normalized_color text := lower(nullif(btrim(coalesce(p_color, '')), ''));
  normalized_instructions text := coalesce(p_instructions, '');
  derived_initial text;
  created_member public.members;
  created_agent public.ai_agents;
begin
  if not (select private.is_project_collaborator(p_project_id)) then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  if char_length(normalized_name) = 0 or char_length(normalized_name) > 80 then
    raise exception 'INVALID_AI_NAME';
  end if;
  if char_length(normalized_role) = 0 or char_length(normalized_role) > 120 then
    raise exception 'INVALID_AI_ROLE';
  end if;
  if char_length(normalized_description) > 500 then
    raise exception 'INVALID_AI_DESCRIPTION';
  end if;
  if normalized_color is null then
    normalized_color := '#6950b8';
  end if;
  if normalized_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'INVALID_AI_COLOR';
  end if;
  if char_length(normalized_instructions) > 10000 then
    raise exception 'INVALID_AI_INSTRUCTIONS';
  end if;
  if p_context_config is null
    or not private.is_valid_ai_context_config(p_context_config) then
    raise exception 'INVALID_AI_CONTEXT';
  end if;

  -- Keep the generated avatar initial consistent with the UI: the first
  -- visible Unicode character of the trimmed agent name.
  derived_initial := left(normalized_name, 1);

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
    normalized_name,
    derived_initial,
    normalized_role,
    normalized_description,
    null,
    normalized_color,
    true
  )
  returning * into created_member;

  insert into public.ai_agents (
    member_id,
    project_id,
    instructions,
    context_config,
    enabled
  ) values (
    created_member.id,
    created_member.project_id,
    normalized_instructions,
    p_context_config,
    true
  )
  returning * into created_agent;

  return jsonb_build_object(
    'member', to_jsonb(created_member),
    'aiAgent', to_jsonb(created_agent)
  );
end;
$$;

create function private.update_ai_agent(
  p_member_id uuid,
  p_name text,
  p_role text,
  p_description text,
  p_color text,
  p_instructions text,
  p_context_config jsonb,
  p_enabled boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := btrim(coalesce(p_name, ''));
  normalized_role text := btrim(coalesce(p_role, ''));
  normalized_description text := coalesce(p_description, '');
  normalized_color text := lower(nullif(btrim(coalesce(p_color, '')), ''));
  normalized_instructions text := coalesce(p_instructions, '');
  derived_initial text;
  existing_agent public.ai_agents;
  existing_member public.members;
  updated_agent public.ai_agents;
  updated_member public.members;
begin
  select * into existing_agent
  from public.ai_agents
  where member_id = p_member_id
  for update;

  if existing_agent.member_id is null
    or not (select private.is_project_collaborator(existing_agent.project_id)) then
    raise exception 'AI_AGENT_NOT_FOUND';
  end if;

  select * into existing_member
  from public.members
  where id = existing_agent.member_id
    and project_id = existing_agent.project_id
  for update;

  if existing_member.id is null
    or existing_member.kind <> 'ai'
    or existing_member.auth_user_id is not null
    or existing_member.email is not null
    or existing_member.is_ai is not true then
    raise exception 'AI_AGENT_NOT_FOUND';
  end if;

  if char_length(normalized_name) = 0 or char_length(normalized_name) > 80 then
    raise exception 'INVALID_AI_NAME';
  end if;
  if char_length(normalized_role) = 0 or char_length(normalized_role) > 120 then
    raise exception 'INVALID_AI_ROLE';
  end if;
  if char_length(normalized_description) > 500 then
    raise exception 'INVALID_AI_DESCRIPTION';
  end if;
  if normalized_color is null then
    normalized_color := '#6950b8';
  end if;
  if normalized_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'INVALID_AI_COLOR';
  end if;
  if char_length(normalized_instructions) > 10000 then
    raise exception 'INVALID_AI_INSTRUCTIONS';
  end if;
  if p_context_config is null
    or not private.is_valid_ai_context_config(p_context_config) then
    raise exception 'INVALID_AI_CONTEXT';
  end if;
  if p_enabled is null then
    raise exception 'INVALID_AI_ENABLED';
  end if;

  derived_initial := left(normalized_name, 1);

  update public.members
  set
    name = normalized_name,
    initial = derived_initial,
    role = normalized_role,
    description = normalized_description,
    color = normalized_color
  where id = existing_member.id
  returning * into updated_member;

  update public.ai_agents
  set
    instructions = normalized_instructions,
    context_config = p_context_config,
    enabled = p_enabled
  where member_id = existing_agent.member_id
  returning * into updated_agent;

  return jsonb_build_object(
    'member', to_jsonb(updated_member),
    'aiAgent', to_jsonb(updated_agent)
  );
end;
$$;

create function public.create_project_ai_agent(
  p_project_id uuid,
  p_name text,
  p_role text,
  p_description text,
  p_color text,
  p_instructions text,
  p_context_config jsonb
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_project_ai_agent(
    p_project_id,
    p_name,
    p_role,
    p_description,
    p_color,
    p_instructions,
    p_context_config
  );
$$;

create function public.update_ai_agent(
  p_member_id uuid,
  p_name text,
  p_role text,
  p_description text,
  p_color text,
  p_instructions text,
  p_context_config jsonb,
  p_enabled boolean
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.update_ai_agent(
    p_member_id,
    p_name,
    p_role,
    p_description,
    p_color,
    p_instructions,
    p_context_config,
    p_enabled
  );
$$;

revoke all on function private.create_project_ai_agent(uuid, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function private.update_ai_agent(uuid, text, text, text, text, text, jsonb, boolean)
  from public, anon, authenticated;
revoke all on function public.create_project_ai_agent(uuid, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.update_ai_agent(uuid, text, text, text, text, text, jsonb, boolean)
  from public, anon, authenticated;

-- The public wrappers are SECURITY INVOKER, so authenticated needs EXECUTE
-- on their private implementations for the nested call to succeed. The
-- private schema is not exposed through the Data API; authorization remains
-- inside the SECURITY DEFINER bodies via is_project_collaborator checks.
grant execute on function private.create_project_ai_agent(uuid, text, text, text, text, text, jsonb)
  to authenticated;
grant execute on function private.update_ai_agent(uuid, text, text, text, text, text, jsonb, boolean)
  to authenticated;
grant execute on function public.create_project_ai_agent(uuid, text, text, text, text, text, jsonb)
  to authenticated;
grant execute on function public.update_ai_agent(uuid, text, text, text, text, text, jsonb, boolean)
  to authenticated;
