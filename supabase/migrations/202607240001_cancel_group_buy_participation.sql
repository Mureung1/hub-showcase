create or replace function public.cancel_group_buy_participation(
  target_group_buy_id uuid,
  participant_user_id text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_group_buy public.group_buys;
  remaining_people integer;
begin
  select * into target_group_buy
  from public.group_buys
  where id = target_group_buy_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'GROUP_BUY_NOT_FOUND';
  end if;

  if target_group_buy.owner_id = participant_user_id then
    raise exception using errcode = 'P0001', message = 'OWNER_CANNOT_CANCEL';
  end if;

  if not exists (
    select 1
    from public.group_buy_participants
    where group_buy_id = target_group_buy_id
      and user_id = participant_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'PARTICIPANT_NOT_FOUND';
  end if;

  if target_group_buy.final_pickup is not null
    or target_group_buy.stage <> '모집 중'
  then
    raise exception using errcode = 'P0001', message = 'CANCEL_NOT_ALLOWED';
  end if;

  delete from public.group_buy_votes
  where group_buy_id = target_group_buy_id
    and user_id = participant_user_id;

  delete from public.group_buy_participants
  where group_buy_id = target_group_buy_id
    and user_id = participant_user_id;

  remaining_people := greatest(target_group_buy.current_people - 1, 1);

  update public.group_buys
  set
    current_people = remaining_people,
    status = case
      when remaining_people < target_people then 'open'
      else status
    end
  where id = target_group_buy_id;
end;
$$;

revoke all on function public.cancel_group_buy_participation(uuid, text)
  from public, anon, authenticated;
grant execute on function public.cancel_group_buy_participation(uuid, text)
  to service_role;
