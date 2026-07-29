alter table public.group_buy_participants
  drop constraint if exists group_buy_participants_start_location_check;

alter table public.group_buy_participants
  add column if not exists latitude double precision
    check (latitude is null or latitude between -90 and 90),
  add column if not exists longitude double precision
    check (longitude is null or longitude between -180 and 180);

alter table public.group_buy_participants
  drop constraint if exists group_buy_participants_coordinate_pair_check;

alter table public.group_buy_participants
  add constraint group_buy_participants_coordinate_pair_check
  check ((latitude is null) = (longitude is null));

alter table public.group_buy_participants
  drop constraint if exists group_buy_participants_start_location_length_check;

alter table public.group_buy_participants
  add constraint group_buy_participants_start_location_length_check
  check (char_length(btrim(start_location)) between 2 and 80);

drop function if exists public.join_group_buy(uuid, text, text, integer, text);

create or replace function public.join_group_buy(
  target_group_buy_id uuid,
  participant_user_id text,
  participant_nickname text,
  participant_quantity integer,
  participant_start_location text,
  participant_latitude double precision default null,
  participant_longitude double precision default null
)
returns void language plpgsql security invoker set search_path = public
as $$
declare target_group_buy public.group_buys;
begin
  select * into target_group_buy from public.group_buys
  where id = target_group_buy_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'GROUP_BUY_NOT_FOUND'; end if;
  if target_group_buy.owner_id = participant_user_id then raise exception using errcode = 'P0001', message = 'OWNER_CANNOT_JOIN'; end if;
  if exists (select 1 from public.group_buy_participants where group_buy_id = target_group_buy_id and user_id = participant_user_id)
    then raise exception using errcode = 'P0001', message = 'DUPLICATE_PARTICIPANT'; end if;
  if target_group_buy.status = 'closed' then raise exception using errcode = 'P0001', message = 'GROUP_BUY_CLOSED'; end if;

  insert into public.group_buy_participants (
    group_buy_id, user_id, nickname, quantity, start_location, latitude, longitude
  ) values (
    target_group_buy_id, participant_user_id, participant_nickname,
    participant_quantity, participant_start_location, participant_latitude, participant_longitude
  );

  update public.group_buys set current_people = current_people + 1,
    status = case when current_people + 1 >= target_people then 'closed' else status end
  where id = target_group_buy_id;
end;
$$;

revoke all on function public.join_group_buy(uuid, text, text, integer, text, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.join_group_buy(uuid, text, text, integer, text, double precision, double precision)
  to service_role;
