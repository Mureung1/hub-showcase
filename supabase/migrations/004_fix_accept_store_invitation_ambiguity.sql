create or replace function public.accept_store_invitation(
  p_invitation_id uuid,
  p_user_id uuid,
  p_user_email text
)
returns table (
  invitation_id uuid,
  store_id uuid,
  store_name text,
  store_address text,
  membership_id uuid,
  membership_user_id uuid,
  membership_role text,
  membership_hourly_wage numeric,
  membership_default_work_start_time time,
  membership_default_work_end_time time,
  membership_joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.store_invitations%rowtype;
  v_membership public.store_members%rowtype;
  v_normalized_email text := lower(trim(p_user_email));
begin
  if v_normalized_email is null or length(v_normalized_email) = 0 then
    raise exception 'INVITATION_EMAIL_REQUIRED';
  end if;

  select si.*
    into v_invitation
    from public.store_invitations as si
   where si.id = p_invitation_id
   for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  if v_invitation.status <> 'PENDING' then
    raise exception 'INVITATION_NOT_PENDING';
  end if;

  if lower(trim(v_invitation.invitee_email)) <> v_normalized_email then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;

  if not exists (
    select 1
      from public.profiles as p
     where p.id = p_user_id
  ) then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if exists (
    select 1
      from public.store_members as sm
     where sm.store_id = v_invitation.store_id
       and sm.user_id = p_user_id
  ) then
    raise exception 'ALREADY_STORE_MEMBER';
  end if;

  insert into public.store_members (
    store_id,
    user_id,
    role,
    hourly_wage,
    default_work_start_time,
    default_work_end_time
  )
  values (
    v_invitation.store_id,
    p_user_id,
    'WORKER',
    v_invitation.hourly_wage,
    v_invitation.default_work_start_time,
    v_invitation.default_work_end_time
  )
  returning * into v_membership;

  update public.store_invitations as si
     set status = 'ACCEPTED',
         accepted_at = now()
   where si.id = v_invitation.id;

  return query
  select
    v_invitation.id,
    s.id,
    s.name,
    s.address,
    v_membership.id,
    v_membership.user_id,
    v_membership.role,
    v_membership.hourly_wage,
    v_membership.default_work_start_time,
    v_membership.default_work_end_time,
    v_membership.joined_at
  from public.stores as s
  where s.id = v_invitation.store_id;
end;
$$;
