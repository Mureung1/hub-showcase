-- TeamFlow collaboration and persistent content schema.
-- Applied only to project lmmeuoeuiouyowpthxwg.

create schema if not exists private;
revoke all on schema private from public, anon;

drop function if exists public.create_project_with_owner(text, text, text, date, date);
drop function if exists public.add_project_member(uuid, text, text, text, text, text);

alter table public.tasks drop constraint if exists tasks_project_assignee_fkey;

alter table public.members rename to workspace_members_legacy;
alter table public.workspace_members_legacy rename constraint members_pkey to workspace_members_legacy_pkey;
alter table public.project_members rename to project_members_legacy;
alter table public.project_members_legacy rename constraint project_members_pkey to project_members_legacy_pkey;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  email text,
  kind text not null default 'manual',
  name text not null,
  initial text not null,
  role text not null,
  description text not null default '',
  avatar_url text,
  color text not null default '#3a6898',
  is_ai boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_project_id_id_unique unique (project_id, id),
  constraint members_kind_check check (kind in ('manual', 'user')),
  constraint members_link_check check (
    (kind = 'manual' and auth_user_id is null)
    or (kind = 'user' and auth_user_id is not null and email is not null)
  ),
  constraint members_name_length_check check (char_length(btrim(name)) between 1 and 80),
  constraint members_initial_length_check check (char_length(initial) between 1 and 4),
  constraint members_role_length_check check (char_length(btrim(role)) between 1 and 120),
  constraint members_description_length_check check (char_length(description) <= 500),
  constraint members_email_normalized_check check (email is null or email = lower(btrim(email)))
);

create unique index members_project_auth_user_unique
  on public.members (project_id, auth_user_id)
  where auth_user_id is not null;
create index members_project_created_at_idx on public.members (project_id, created_at);
create index members_auth_user_id_idx on public.members (auth_user_id) where auth_user_id is not null;

create temporary table member_migration_map (
  project_id uuid not null,
  old_member_id uuid not null,
  new_member_id uuid not null,
  primary key (project_id, old_member_id)
) on commit drop;

insert into member_migration_map (project_id, old_member_id, new_member_id)
select project_id, member_id, gen_random_uuid()
from public.project_members_legacy;

insert into public.members (
  id, project_id, auth_user_id, email, kind, name, initial, role,
  description, avatar_url, color, is_ai, created_at, updated_at
)
select
  map.new_member_id,
  map.project_id,
  legacy.auth_user_id,
  case when legacy.auth_user_id is null then null else lower(auth_user.email) end,
  case when legacy.auth_user_id is null then 'manual' else 'user' end,
  legacy.name,
  legacy.initial,
  legacy.role,
  legacy.description,
  legacy.avatar_url,
  legacy.color,
  legacy.is_ai,
  legacy.created_at,
  legacy.updated_at
from member_migration_map map
join public.workspace_members_legacy legacy on legacy.id = map.old_member_id
left join auth.users auth_user on auth_user.id = legacy.auth_user_id;

insert into public.members (
  project_id, auth_user_id, email, kind, name, initial, role,
  description, avatar_url, color, is_ai
)
select
  project.id,
  project.owner_id,
  lower(auth_user.email),
  'user',
  coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
    nullif(auth_user.raw_user_meta_data ->> 'name', ''),
    split_part(auth_user.email, '@', 1),
    'TeamFlow 사용자'
  ),
  left(coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
    nullif(auth_user.raw_user_meta_data ->> 'name', ''),
    split_part(auth_user.email, '@', 1),
    'T'
  ), 1),
  '프로젝트 생성자',
  '',
  coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(auth_user.raw_user_meta_data ->> 'picture', '')
  ),
  '#3a6898',
  false
from public.projects project
join auth.users auth_user on auth_user.id = project.owner_id
where not exists (
  select 1 from public.members member
  where member.project_id = project.id and member.auth_user_id = project.owner_id
);

update public.tasks task
set assignee_id = map.new_member_id
from member_migration_map map
where task.project_id = map.project_id and task.assignee_id = map.old_member_id;

create table public.project_access (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null,
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id),
  constraint project_access_project_member_unique unique (project_id, member_id),
  constraint project_access_project_member_fkey foreign key (project_id, member_id)
    references public.members(project_id, id) on delete cascade
);

insert into public.project_access (project_id, user_id, member_id, joined_at)
select project.id, project.owner_id, member.id, project.created_at
from public.projects project
join public.members member
  on member.project_id = project.id and member.auth_user_id = project.owner_id;

drop table public.project_members_legacy;
drop table public.workspace_members_legacy;

alter table public.tasks
  add constraint tasks_project_assignee_fkey foreign key (project_id, assignee_id)
    references public.members(project_id, id);

create index tasks_project_assignee_idx on public.tasks (project_id, assignee_id);
create index project_access_user_id_idx on public.project_access (user_id, project_id);

alter table public.projects drop constraint if exists projects_owner_id_fkey;
alter table public.projects alter column owner_id drop not null;
alter table public.projects
  add constraint projects_owner_id_fkey foreign key (owner_id) references auth.users(id) on delete set null;

create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invitee_email text not null,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint project_invitations_status_check check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  constraint project_invitations_email_check check (
    invitee_email = lower(btrim(invitee_email))
    and char_length(invitee_email) between 3 and 320
    and position('@' in invitee_email) > 1
  )
);

create unique index project_invitations_pending_unique
  on public.project_invitations (project_id, invitee_email)
  where status = 'pending';
create index project_invitations_email_status_idx
  on public.project_invitations (invitee_email, status, created_at desc);
create index project_invitations_project_idx
  on public.project_invitations (project_id, created_at desc);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  content text not null default '',
  author_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_title_length_check check (char_length(btrim(title)) between 1 and 200),
  constraint notes_content_length_check check (char_length(content) <= 100000)
);

create index notes_project_updated_at_idx on public.notes (project_id, updated_at desc);
create index notes_author_id_idx on public.notes (author_id) where author_id is not null;

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid,
  type text not null,
  name text not null,
  description text not null default '',
  url text,
  owner_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_project_id_id_unique unique (project_id, id),
  constraint resources_parent_fkey foreign key (project_id, parent_id)
    references public.resources(project_id, id),
  constraint resources_type_check check (type in ('folder', 'document', 'link', 'image')),
  constraint resources_name_length_check check (char_length(btrim(name)) between 1 and 200),
  constraint resources_description_length_check check (char_length(description) <= 2000),
  constraint resources_url_length_check check (url is null or char_length(url) <= 2048),
  constraint resources_folder_root_check check (type <> 'folder' or parent_id is null),
  constraint resources_link_url_check check (type <> 'link' or url is not null)
);

create index resources_project_parent_updated_idx
  on public.resources (project_id, parent_id, updated_at desc);
create index resources_owner_id_idx on public.resources (owner_id) where owner_id is not null;

create or replace function private.is_project_collaborator(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.project_access access
    where access.project_id = p_project_id
      and access.user_id = (select auth.uid())
  );
$$;

create or replace function private.current_project_member_id(p_project_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select access.member_id
  from public.project_access access
  where access.project_id = p_project_id
    and access.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.validate_resource_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.url is not null and new.url !~* '^https?://' then
    raise exception 'INVALID_RESOURCE_URL';
  end if;
  if new.type = 'link' and new.url is null then
    raise exception 'RESOURCE_URL_REQUIRED';
  end if;
  if new.type = 'folder' and new.parent_id is not null then
    raise exception 'FOLDER_MUST_BE_ROOT';
  end if;
  if new.parent_id is not null and not exists (
    select 1 from public.resources parent
    where parent.id = new.parent_id
      and parent.project_id = new.project_id
      and parent.type = 'folder'
  ) then
    raise exception 'INVALID_RESOURCE_PARENT';
  end if;
  if tg_op = 'UPDATE' and old.type = 'folder' and new.type <> 'folder' and exists (
    select 1 from public.resources child where child.parent_id = old.id
  ) then
    raise exception 'TEAMFLOW_CONFLICT:FOLDER_NOT_EMPTY';
  end if;
  return new;
end;
$$;

create trigger projects_touch_updated_at before update on public.projects
for each row execute function private.touch_updated_at();
create trigger members_touch_updated_at before update on public.members
for each row execute function private.touch_updated_at();
create trigger tasks_touch_updated_at before update on public.tasks
for each row execute function private.touch_updated_at();
create trigger notes_touch_updated_at before update on public.notes
for each row execute function private.touch_updated_at();
create trigger resources_touch_updated_at before update on public.resources
for each row execute function private.touch_updated_at();
create trigger resources_validate_parent before insert or update on public.resources
for each row execute function private.validate_resource_parent();

drop policy if exists projects_select_owned on public.projects;
drop policy if exists projects_insert_owned on public.projects;
drop policy if exists projects_update_owned on public.projects;
drop policy if exists tasks_select_owned on public.tasks;
drop policy if exists tasks_insert_owned on public.tasks;
drop policy if exists tasks_update_owned on public.tasks;
drop policy if exists tasks_delete_owned on public.tasks;

alter table public.members enable row level security;
alter table public.project_access enable row level security;
alter table public.project_invitations enable row level security;
alter table public.notes enable row level security;
alter table public.resources enable row level security;

revoke all privileges on table public.projects from public, anon, authenticated, service_role;
revoke all privileges on table public.members from public, anon, authenticated, service_role;
revoke all privileges on table public.project_access from public, anon, authenticated, service_role;
revoke all privileges on table public.project_invitations from public, anon, authenticated, service_role;
revoke all privileges on table public.tasks from public, anon, authenticated, service_role;
revoke all privileges on table public.notes from public, anon, authenticated, service_role;
revoke all privileges on table public.resources from public, anon, authenticated, service_role;

grant usage on schema public to authenticated;
grant usage on schema private to authenticated;
grant select, delete on table public.projects to authenticated;
grant update (name, description, status, start_date, end_date, updated_at) on public.projects to authenticated;
grant select on table public.members to authenticated;
grant select on table public.project_access to authenticated;
grant select on table public.project_invitations to authenticated;
grant select, insert, delete on table public.tasks to authenticated;
grant update (title, assignee_id, due_date, status, description, updated_at) on public.tasks to authenticated;
grant select, insert, delete on table public.notes to authenticated;
grant update (title, content, updated_at) on public.notes to authenticated;
grant select, insert, delete on table public.resources to authenticated;
grant update (parent_id, type, name, description, url, updated_at) on public.resources to authenticated;

create policy projects_select_collaborator on public.projects
for select to authenticated using ((select private.is_project_collaborator(id)));
create policy projects_update_collaborator on public.projects
for update to authenticated
using ((select private.is_project_collaborator(id)))
with check ((select private.is_project_collaborator(id)));
create policy projects_delete_collaborator on public.projects
for delete to authenticated using ((select private.is_project_collaborator(id)));

create policy members_select_collaborator on public.members
for select to authenticated using ((select private.is_project_collaborator(project_id)));

create policy project_access_select_collaborator on public.project_access
for select to authenticated using ((select private.is_project_collaborator(project_id)));

create policy project_invitations_select_relevant on public.project_invitations
for select to authenticated using (
  (select private.is_project_collaborator(project_id))
  or (
    status = 'pending'
    and invitee_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

create policy tasks_select_collaborator on public.tasks
for select to authenticated using ((select private.is_project_collaborator(project_id)));
create policy tasks_insert_collaborator on public.tasks
for insert to authenticated with check ((select private.is_project_collaborator(project_id)));
create policy tasks_update_collaborator on public.tasks
for update to authenticated
using ((select private.is_project_collaborator(project_id)))
with check ((select private.is_project_collaborator(project_id)));
create policy tasks_delete_collaborator on public.tasks
for delete to authenticated using ((select private.is_project_collaborator(project_id)));

create policy notes_select_collaborator on public.notes
for select to authenticated using ((select private.is_project_collaborator(project_id)));
create policy notes_insert_collaborator on public.notes
for insert to authenticated with check (
  (select private.is_project_collaborator(project_id))
  and author_id = (select private.current_project_member_id(project_id))
);
create policy notes_update_collaborator on public.notes
for update to authenticated
using ((select private.is_project_collaborator(project_id)))
with check ((select private.is_project_collaborator(project_id)));
create policy notes_delete_collaborator on public.notes
for delete to authenticated using ((select private.is_project_collaborator(project_id)));

create policy resources_select_collaborator on public.resources
for select to authenticated using ((select private.is_project_collaborator(project_id)));
create policy resources_insert_collaborator on public.resources
for insert to authenticated with check (
  (select private.is_project_collaborator(project_id))
  and owner_id = (select private.current_project_member_id(project_id))
);
create policy resources_update_collaborator on public.resources
for update to authenticated
using ((select private.is_project_collaborator(project_id)))
with check ((select private.is_project_collaborator(project_id)));
create policy resources_delete_collaborator on public.resources
for delete to authenticated using ((select private.is_project_collaborator(project_id)));

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
  actor_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
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
  if actor_id is null or actor_email = '' then raise exception 'AUTH_REQUIRED'; end if;

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

create or replace function public.add_project_member(
  p_project_id uuid,
  p_name text,
  p_initial text,
  p_role text,
  p_description text,
  p_color text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare created_member public.members;
begin
  if not (select private.is_project_collaborator(p_project_id)) then raise exception 'PROJECT_NOT_FOUND'; end if;
  insert into public.members (
    project_id, auth_user_id, email, kind, name, initial, role,
    description, avatar_url, color, is_ai
  ) values (
    p_project_id, null, null, 'manual', p_name, p_initial, p_role,
    coalesce(p_description, ''), null, p_color, false
  ) returning * into created_member;
  return to_jsonb(created_member);
end;
$$;

create or replace function public.update_project_member(
  p_member_id uuid,
  p_name text,
  p_initial text,
  p_role text,
  p_description text,
  p_color text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare existing_member public.members; updated_member public.members;
begin
  select * into existing_member from public.members where id = p_member_id;
  if existing_member.id is null or not (select private.is_project_collaborator(existing_member.project_id)) then
    raise exception 'MEMBER_NOT_FOUND';
  end if;
  update public.members set
    name = case when kind = 'manual' then p_name else name end,
    initial = case when kind = 'manual' then p_initial else initial end,
    role = p_role,
    description = coalesce(p_description, ''),
    color = p_color
  where id = p_member_id
  returning * into updated_member;
  return to_jsonb(updated_member);
end;
$$;

create or replace function public.remove_project_member(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare existing_member public.members; access_count integer; removed_access public.project_access;
begin
  select * into existing_member from public.members where id = p_member_id for update;
  if existing_member.id is null or not (select private.is_project_collaborator(existing_member.project_id)) then
    raise exception 'MEMBER_NOT_FOUND';
  end if;
  if exists (select 1 from public.tasks where assignee_id = p_member_id) then
    raise exception 'TEAMFLOW_CONFLICT:MEMBER_HAS_TASKS';
  end if;
  select * into removed_access from public.project_access where member_id = p_member_id;
  if removed_access.member_id is not null then
    select count(*) into access_count from public.project_access where project_id = existing_member.project_id;
    if access_count <= 1 then raise exception 'TEAMFLOW_CONFLICT:LAST_COLLABORATOR'; end if;
    delete from public.project_access where member_id = p_member_id;
  end if;
  delete from public.members where id = p_member_id;
  return jsonb_build_object(
    'memberId', p_member_id,
    'projectId', existing_member.project_id,
    'wasCollaborator', removed_access.member_id is not null
  );
end;
$$;

create or replace function public.create_project_invitation(p_project_id uuid, p_invitee_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare normalized_email text := lower(btrim(p_invitee_email)); created_invitation public.project_invitations;
begin
  if not (select private.is_project_collaborator(p_project_id)) then raise exception 'PROJECT_NOT_FOUND'; end if;
  if exists (
    select 1 from public.project_access access
    join auth.users auth_user on auth_user.id = access.user_id
    where access.project_id = p_project_id and lower(auth_user.email) = normalized_email
  ) then raise exception 'TEAMFLOW_CONFLICT:ALREADY_COLLABORATOR'; end if;
  if exists (
    select 1 from public.project_invitations invitation
    where invitation.project_id = p_project_id
      and invitation.invitee_email = normalized_email
      and invitation.status = 'pending'
  ) then raise exception 'TEAMFLOW_CONFLICT:INVITATION_EXISTS'; end if;
  insert into public.project_invitations (project_id, invitee_email, invited_by)
  values (p_project_id, normalized_email, (select auth.uid()))
  returning * into created_invitation;
  return to_jsonb(created_invitation);
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
    case when invitation.invitee_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      then 'incoming' else 'outgoing' end
  from public.project_invitations invitation
  join public.projects project on project.id = invitation.project_id
  left join public.project_access inviter_access
    on inviter_access.project_id = invitation.project_id and inviter_access.user_id = invitation.invited_by
  left join public.members inviter on inviter.id = inviter_access.member_id
  where (select auth.uid()) is not null
    and invitation.status = 'pending'
    and (
      invitation.invitee_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
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
  actor_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
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
  if actor_id is null or actor_email = '' then raise exception 'AUTH_REQUIRED'; end if;
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
    and invitee_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  returning id into changed_id;
  if changed_id is null then raise exception 'INVITATION_NOT_FOUND'; end if;
  return changed_id;
end;
$$;

create or replace function public.cancel_project_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare invitation public.project_invitations;
begin
  select * into invitation from public.project_invitations where id = p_invitation_id and status = 'pending' for update;
  if invitation.id is null or not (select private.is_project_collaborator(invitation.project_id)) then
    raise exception 'INVITATION_NOT_FOUND';
  end if;
  update public.project_invitations set status = 'cancelled', responded_at = now() where id = invitation.id;
  return invitation.id;
end;
$$;

revoke all on function private.is_project_collaborator(uuid) from public, anon, authenticated;
revoke all on function private.current_project_member_id(uuid) from public, anon, authenticated;
grant execute on function private.is_project_collaborator(uuid) to authenticated;
grant execute on function private.current_project_member_id(uuid) to authenticated;

revoke all on function public.create_project_with_owner(text, text, text, date, date) from public, anon, authenticated;
revoke all on function public.add_project_member(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_project_member(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.remove_project_member(uuid) from public, anon, authenticated;
revoke all on function public.create_project_invitation(uuid, text) from public, anon, authenticated;
revoke all on function public.list_project_invitations() from public, anon, authenticated;
revoke all on function public.accept_project_invitation(uuid) from public, anon, authenticated;
revoke all on function public.reject_project_invitation(uuid) from public, anon, authenticated;
revoke all on function public.cancel_project_invitation(uuid) from public, anon, authenticated;

grant execute on function public.create_project_with_owner(text, text, text, date, date) to authenticated;
grant execute on function public.add_project_member(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.update_project_member(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.remove_project_member(uuid) to authenticated;
grant execute on function public.create_project_invitation(uuid, text) to authenticated;
grant execute on function public.list_project_invitations() to authenticated;
grant execute on function public.accept_project_invitation(uuid) to authenticated;
grant execute on function public.reject_project_invitation(uuid) to authenticated;
grant execute on function public.cancel_project_invitation(uuid) to authenticated;

