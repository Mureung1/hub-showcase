-- Keep PostgREST RPC names public while moving privileged bodies out of the exposed schema.
-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.

create index if not exists project_access_user_member_fk_idx
  on public.project_access (project_id, user_id, member_id);
create index if not exists notes_project_author_fk_idx
  on public.notes (project_id, author_id)
  where author_id is not null;
create index if not exists resources_project_owner_fk_idx
  on public.resources (project_id, owner_id)
  where owner_id is not null;

alter function public.create_project_with_owner(text, text, text, date, date) set schema private;
alter function public.add_project_member(uuid, text, text, text, text, text) set schema private;
alter function public.update_project_member(uuid, text, text, text, text, text) set schema private;
alter function public.remove_project_member(uuid) set schema private;
alter function public.create_project_invitation(uuid, text) set schema private;
alter function public.list_project_invitations() set schema private;
alter function public.accept_project_invitation(uuid) set schema private;
alter function public.reject_project_invitation(uuid) set schema private;
alter function public.cancel_project_invitation(uuid) set schema private;

create function public.create_project_with_owner(
  p_name text,
  p_description text,
  p_status text,
  p_start_date date,
  p_end_date date
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_project_with_owner(p_name, p_description, p_status, p_start_date, p_end_date);
$$;

create function public.add_project_member(
  p_project_id uuid,
  p_name text,
  p_initial text,
  p_role text,
  p_description text,
  p_color text
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.add_project_member(p_project_id, p_name, p_initial, p_role, p_description, p_color);
$$;

create function public.update_project_member(
  p_member_id uuid,
  p_name text,
  p_initial text,
  p_role text,
  p_description text,
  p_color text
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.update_project_member(p_member_id, p_name, p_initial, p_role, p_description, p_color);
$$;

create function public.remove_project_member(p_member_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.remove_project_member(p_member_id);
$$;

create function public.create_project_invitation(p_project_id uuid, p_invitee_email text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_project_invitation(p_project_id, p_invitee_email);
$$;

create function public.list_project_invitations()
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
security invoker
set search_path = ''
as $$
  select * from private.list_project_invitations();
$$;

create function public.accept_project_invitation(p_invitation_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.accept_project_invitation(p_invitation_id);
$$;

create function public.reject_project_invitation(p_invitation_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.reject_project_invitation(p_invitation_id);
$$;

create function public.cancel_project_invitation(p_invitation_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.cancel_project_invitation(p_invitation_id);
$$;

revoke all on function private.create_project_with_owner(text, text, text, date, date) from public, anon;
revoke all on function private.add_project_member(uuid, text, text, text, text, text) from public, anon;
revoke all on function private.update_project_member(uuid, text, text, text, text, text) from public, anon;
revoke all on function private.remove_project_member(uuid) from public, anon;
revoke all on function private.create_project_invitation(uuid, text) from public, anon;
revoke all on function private.list_project_invitations() from public, anon;
revoke all on function private.accept_project_invitation(uuid) from public, anon;
revoke all on function private.reject_project_invitation(uuid) from public, anon;
revoke all on function private.cancel_project_invitation(uuid) from public, anon;

grant execute on function private.create_project_with_owner(text, text, text, date, date) to authenticated;
grant execute on function private.add_project_member(uuid, text, text, text, text, text) to authenticated;
grant execute on function private.update_project_member(uuid, text, text, text, text, text) to authenticated;
grant execute on function private.remove_project_member(uuid) to authenticated;
grant execute on function private.create_project_invitation(uuid, text) to authenticated;
grant execute on function private.list_project_invitations() to authenticated;
grant execute on function private.accept_project_invitation(uuid) to authenticated;
grant execute on function private.reject_project_invitation(uuid) to authenticated;
grant execute on function private.cancel_project_invitation(uuid) to authenticated;

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


