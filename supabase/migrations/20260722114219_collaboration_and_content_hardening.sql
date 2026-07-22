-- TeamFlow collaboration and content hardening.
-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.

create index if not exists project_invitations_invited_by_idx
  on public.project_invitations (invited_by)
  where invited_by is not null;

alter table public.members
  drop constraint if exists members_auth_user_id_fkey;
alter table public.members
  add constraint members_auth_user_id_fkey
    foreign key (auth_user_id) references auth.users(id) on delete restrict;

alter table public.members
  add constraint members_project_auth_user_id_unique
    unique (project_id, auth_user_id, id);

alter table public.project_access
  drop constraint if exists project_access_project_member_fkey;
alter table public.project_access
  add constraint project_access_user_member_fkey
    foreign key (project_id, user_id, member_id)
    references public.members(project_id, auth_user_id, id)
    on delete cascade;

alter table public.notes
  drop constraint if exists notes_author_id_fkey;
alter table public.notes
  add constraint notes_project_author_fkey
    foreign key (project_id, author_id)
    references public.members(project_id, id)
    on delete set null (author_id);

alter table public.resources
  drop constraint if exists resources_owner_id_fkey;
alter table public.resources
  add constraint resources_project_owner_fkey
    foreign key (project_id, owner_id)
    references public.members(project_id, id)
    on delete set null (owner_id);

alter table public.resources
  add constraint resources_folder_url_check
    check (type <> 'folder' or url is null);

create or replace function private.current_auth_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(auth_user.email)
  from auth.users auth_user
  where auth_user.id = (select auth.uid())
    and (
      auth_user.raw_app_meta_data ->> 'provider' = 'google'
      or auth_user.raw_app_meta_data -> 'providers' ? 'google'
    );
$$;

revoke all on function private.current_auth_email() from public, anon, authenticated;
grant execute on function private.current_auth_email() to authenticated;

drop policy if exists project_invitations_select_relevant on public.project_invitations;
create policy project_invitations_select_relevant on public.project_invitations
for select to authenticated using (
  (select private.is_project_collaborator(project_id))
  or (
    status = 'pending'
    and invitee_email = (select private.current_auth_email())
  )
);

create or replace function private.validate_resource_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.projects where id = new.project_id for update;

  if new.url is not null and new.url !~* '^https?://' then
    raise exception 'INVALID_RESOURCE_URL';
  end if;
  if new.type = 'link' and new.url is null then
    raise exception 'RESOURCE_URL_REQUIRED';
  end if;
  if new.type = 'folder' and new.url is not null then
    raise exception 'FOLDER_URL_NOT_ALLOWED';
  end if;
  if new.type = 'folder' and new.parent_id is not null then
    raise exception 'FOLDER_MUST_BE_ROOT';
  end if;
  if new.parent_id = new.id then
    raise exception 'INVALID_RESOURCE_PARENT';
  end if;
  if tg_op = 'UPDATE' and (old.type = 'folder') <> (new.type = 'folder') then
    raise exception 'INVALID_RESOURCE_TYPE_CHANGE';
  end if;
  if new.parent_id is not null and not exists (
    select 1 from public.resources parent
    where parent.id = new.parent_id
      and parent.project_id = new.project_id
      and parent.type = 'folder'
  ) then
    raise exception 'INVALID_RESOURCE_PARENT';
  end if;
  return new;
end;
$$;

create or replace function public.create_project_with_owner(
  p_name text,
  p_description text,
  p_status text,
  p_start_date date,
  p_end_date date
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_email text := (select private.current_auth_email());
  actor_name text := coalesce(
    nullif((select auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif((select auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    nullif(split_part(actor_email, '@', 1), ''),
    'TeamFlow 사용자'
  );
  actor_avatar text := coalesce(
    nullif((select auth.jwt() -> 'user_metadata' ->> 'avatar_url'), ''),
    nullif((select auth.jwt() -> 'user_metadata' ->> 'picture'), '')
  );
  created_project public.projects;
  created_member public.members;
begin
  if actor_id is null or actor_email is null or actor_email = '' then raise exception 'AUTH_REQUIRED'; end if;

  insert into public.projects (owner_id, name, description, status, start_date, end_date)
  values (actor_id, p_name, coalesce(p_description, ''), p_status, p_start_date, p_end_date)
  returning * into created_project;

  insert into public.members (
    project_id, auth_user_id, email, kind, name, initial, role,
    description, avatar_url, color, is_ai
  ) values (
    created_project.id, actor_id, actor_email, 'user', actor_name,
    left(actor_name, 1), '프로젝트 생성자', '', actor_avatar, '#3a6898', false
  ) returning * into created_member;

  insert into public.project_access (project_id, user_id, member_id)
  values (created_project.id, actor_id, created_member.id);

  return to_jsonb(created_project);
end;
$$;

create or replace function public.remove_project_member(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_project_id uuid;
  existing_member public.members;
  access_count integer;
  removed_access public.project_access;
begin
  select project_id into member_project_id from public.members where id = p_member_id;
  if member_project_id is null or not (select private.is_project_collaborator(member_project_id)) then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  perform 1 from public.projects where id = member_project_id for update;
  select * into existing_member from public.members where id = p_member_id for update;
  if existing_member.id is null then raise exception 'MEMBER_NOT_FOUND'; end if;

  if exists (select 1 from public.tasks where assignee_id = p_member_id) then
    raise exception 'TEAMFLOW_CONFLICT:MEMBER_HAS_TASKS';
  end if;
  select * into removed_access from public.project_access where member_id = p_member_id;
  if removed_access.member_id is not null then
    select count(*) into access_count from public.project_access where project_id = member_project_id;
    if access_count <= 1 then raise exception 'TEAMFLOW_CONFLICT:LAST_COLLABORATOR'; end if;
    delete from public.project_access where member_id = p_member_id;
  end if;
  delete from public.members where id = p_member_id;
  return jsonb_build_object(
    'memberId', p_member_id,
    'projectId', member_project_id,
    'wasCollaborator', removed_access.member_id is not null
  );
end;
$$;

create or replace function public.list_project_invitations()
returns table (
  id uuid,
  project_id uuid,
  project_name text,
  invitee_email text,
  invited_by uuid,
  inviter_name text,
  status text,
  created_at timestamptz,
  direction text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    invitation.id,
    invitation.project_id,
    project.name,
    invitation.invitee_email,
    invitation.invited_by,
    coalesce(inviter.name, 'TeamFlow 사용자'),
    invitation.status,
    invitation.created_at,
    case when invitation.invitee_email = (select private.current_auth_email())
      then 'incoming' else 'outgoing' end
  from public.project_invitations invitation
  join public.projects project on project.id = invitation.project_id
  left join public.project_access inviter_access
    on inviter_access.project_id = invitation.project_id and inviter_access.user_id = invitation.invited_by
  left join public.members inviter on inviter.id = inviter_access.member_id
  where (select auth.uid()) is not null
    and (select private.current_auth_email()) is not null
    and invitation.status = 'pending'
    and (
      invitation.invitee_email = (select private.current_auth_email())
      or (select private.is_project_collaborator(invitation.project_id))
    )
  order by invitation.created_at desc;
$$;

create or replace function public.accept_project_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_email text := (select private.current_auth_email());
  actor_name text := coalesce(
    nullif((select auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif((select auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    nullif(split_part(actor_email, '@', 1), ''),
    'TeamFlow 사용자'
  );
  actor_avatar text := coalesce(
    nullif((select auth.jwt() -> 'user_metadata' ->> 'avatar_url'), ''),
    nullif((select auth.jwt() -> 'user_metadata' ->> 'picture'), '')
  );
  invitation public.project_invitations;
  created_member public.members;
begin
  if actor_id is null or actor_email is null or actor_email = '' then raise exception 'AUTH_REQUIRED'; end if;
  select * into invitation from public.project_invitations
  where id = p_invitation_id and status = 'pending' for update;
  if invitation.id is null or invitation.invitee_email <> actor_email then raise exception 'INVITATION_NOT_FOUND'; end if;

  insert into public.members (
    project_id, auth_user_id, email, kind, name, initial, role,
    description, avatar_url, color, is_ai
  ) values (
    invitation.project_id, actor_id, actor_email, 'user', actor_name,
    left(actor_name, 1), '프로젝트 협업자', '', actor_avatar, '#3a6898', false
  )
  on conflict (project_id, auth_user_id) where auth_user_id is not null
  do update set email = excluded.email, avatar_url = excluded.avatar_url
  returning * into created_member;

  insert into public.project_access (project_id, user_id, member_id)
  values (invitation.project_id, actor_id, created_member.id)
  on conflict (project_id, user_id) do nothing;

  update public.project_invitations set status = 'accepted', responded_at = now()
  where id = invitation.id;

  return jsonb_build_object('projectId', invitation.project_id, 'memberId', created_member.id);
end;
$$;

create or replace function public.reject_project_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare changed_id uuid;
begin
  update public.project_invitations set status = 'rejected', responded_at = now()
  where id = p_invitation_id
    and status = 'pending'
    and invitee_email = (select private.current_auth_email())
  returning id into changed_id;
  if changed_id is null then raise exception 'INVITATION_NOT_FOUND'; end if;
  return changed_id;
end;
$$;

revoke insert on table public.tasks from authenticated;
revoke insert on table public.notes from authenticated;
revoke insert on table public.resources from authenticated;

grant insert (project_id, title, assignee_id, due_date, status, description)
  on public.tasks to authenticated;
grant insert (project_id, title, content, author_id)
  on public.notes to authenticated;
grant insert (project_id, parent_id, type, name, description, url, owner_id)
  on public.resources to authenticated;


