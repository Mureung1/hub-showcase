-- Remove non-login manual assignees from TeamFlow.
-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.
-- Do not automatically delete or reassign legacy manual-member data.

do $$
begin
  if exists (select 1 from public.members where kind = 'manual') then
    raise exception 'MANUAL_MEMBER_MIGRATION_BLOCKED: manual members must be reviewed before removal';
  end if;

  if exists (
    select 1
    from public.tasks task
    left join public.project_access access
      on access.project_id = task.project_id
      and access.member_id = task.assignee_id
    where access.member_id is null
  ) then
    raise exception 'MANUAL_MEMBER_MIGRATION_BLOCKED: every task assignee must be a project collaborator';
  end if;

  if exists (
    select 1
    from public.notes note
    join public.members member on member.id = note.author_id
    where member.kind = 'manual'
  ) then
    raise exception 'MANUAL_MEMBER_MIGRATION_BLOCKED: manual note authors must be reviewed before removal';
  end if;

  if exists (
    select 1
    from public.resources resource
    join public.members member on member.id = resource.owner_id
    where member.kind = 'manual'
  ) then
    raise exception 'MANUAL_MEMBER_MIGRATION_BLOCKED: manual resource owners must be reviewed before removal';
  end if;
end;
$$;

-- A task may now point only at a login-backed project collaborator.
alter table public.tasks
  drop constraint if exists tasks_project_assignee_fkey;

alter table public.tasks
  add constraint tasks_project_assignee_fkey
    foreign key (project_id, assignee_id)
    references public.project_access(project_id, member_id);

-- The manual-member RPC is removed from both the private implementation and
-- the exposed RPC schema. Existing API callers receive a normal 404 route
-- response because the Express route is removed in the same change.
drop function if exists public.add_project_member(uuid, text, text, text, text, text);
drop function if exists private.add_project_member(uuid, text, text, text, text, text);

-- Keep collaborator profile editing, but remove the manual-only name and
-- initials fields. Google identity fields stay read-only.
drop function if exists public.update_project_member(uuid, text, text, text, text, text);
drop function if exists private.update_project_member(uuid, text, text, text, text, text);

create function private.update_project_member(
  p_member_id uuid,
  p_role text,
  p_description text,
  p_color text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_member public.members;
  updated_member public.members;
begin
  select * into existing_member
  from public.members
  where id = p_member_id
  for update;

  if existing_member.id is null
    or not (select private.is_project_collaborator(existing_member.project_id))
    or not exists (
      select 1
      from public.project_access access
      where access.project_id = existing_member.project_id
        and access.member_id = existing_member.id
    ) then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  update public.members
  set
    role = p_role,
    description = coalesce(p_description, ''),
    color = p_color
  where id = existing_member.id
  returning * into updated_member;

  return to_jsonb(updated_member);
end;
$$;

create function public.update_project_member(
  p_member_id uuid,
  p_role text,
  p_description text,
  p_color text
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.update_project_member(p_member_id, p_role, p_description, p_color);
$$;

-- Collaborator removal and leaving remain available, but a target must be a
-- project_access member. The final collaborator and collaborators with tasks
-- continue to be protected.
drop function if exists public.remove_project_member(uuid);
drop function if exists private.remove_project_member(uuid);

create function private.remove_project_member(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_member public.members;
  access_count integer;
begin
  select * into existing_member
  from public.members
  where id = p_member_id
  for update;

  if existing_member.id is null
    or not (select private.is_project_collaborator(existing_member.project_id))
    or not exists (
      select 1
      from public.project_access access
      where access.project_id = existing_member.project_id
        and access.member_id = existing_member.id
    ) then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  perform 1
  from public.projects
  where id = existing_member.project_id
  for update;

  if exists (
    select 1
    from public.tasks task
    where task.project_id = existing_member.project_id
      and task.assignee_id = existing_member.id
  ) then
    raise exception 'TEAMFLOW_CONFLICT:MEMBER_HAS_TASKS';
  end if;

  select count(*) into access_count
  from public.project_access
  where project_id = existing_member.project_id;

  if access_count <= 1 then
    raise exception 'TEAMFLOW_CONFLICT:LAST_COLLABORATOR';
  end if;

  delete from public.project_access
  where project_id = existing_member.project_id
    and member_id = existing_member.id;

  delete from public.members
  where id = existing_member.id;

  return jsonb_build_object(
    'memberId', existing_member.id,
    'projectId', existing_member.project_id,
    'wasCollaborator', true
  );
end;
$$;

create function public.remove_project_member(p_member_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.remove_project_member(p_member_id);
$$;

revoke all on function private.update_project_member(uuid, text, text, text) from public, anon, authenticated;
grant execute on function private.update_project_member(uuid, text, text, text) to authenticated;
revoke all on function public.update_project_member(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.update_project_member(uuid, text, text, text) to authenticated;

revoke all on function private.remove_project_member(uuid) from public, anon, authenticated;
grant execute on function private.remove_project_member(uuid) to authenticated;
revoke all on function public.remove_project_member(uuid) from public, anon, authenticated;
grant execute on function public.remove_project_member(uuid) to authenticated;
