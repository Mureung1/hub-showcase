create or replace function public.create_store_with_owner(
  p_owner_id uuid,
  p_name text,
  p_address text default null
)
returns table (
  store_id uuid,
  store_name text,
  store_address text,
  store_owner_id uuid,
  store_created_at timestamptz,
  store_updated_at timestamptz,
  membership_id uuid,
  membership_store_id uuid,
  membership_user_id uuid,
  membership_role text,
  membership_joined_at timestamptz,
  membership_created_at timestamptz,
  membership_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores%rowtype;
  v_membership public.store_members%rowtype;
  v_name text := trim(p_name);
  v_address text := nullif(trim(coalesce(p_address, '')), '');
begin
  if v_name = '' then
    raise exception 'Store name is required' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_owner_id
  ) then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  insert into public.stores (owner_id, name, address)
  values (p_owner_id, v_name, v_address)
  returning * into v_store;

  insert into public.store_members (store_id, user_id, role)
  values (v_store.id, p_owner_id, 'OWNER')
  returning * into v_membership;

  return query
  select
    v_store.id,
    v_store.name,
    v_store.address,
    v_store.owner_id,
    v_store.created_at,
    v_store.updated_at,
    v_membership.id,
    v_membership.store_id,
    v_membership.user_id,
    v_membership.role,
    v_membership.joined_at,
    v_membership.created_at,
    v_membership.updated_at;
end;
$$;

revoke all on function public.create_store_with_owner(uuid, text, text) from public;
