create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 12),
  created_at timestamptz not null default now(),
  unique (nickname)
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant all on table public.profiles to service_role;

alter table public.group_buy_participants
  add column if not exists nickname text not null default '참여자';

create or replace function public.join_group_buy(
  target_group_buy_id uuid,
  participant_user_id text,
  participant_nickname text,
  participant_quantity integer,
  participant_start_location text
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
  insert into public.group_buy_participants (group_buy_id, user_id, nickname, quantity, start_location)
  values (target_group_buy_id, participant_user_id, participant_nickname, participant_quantity, participant_start_location);
  update public.group_buys set current_people = current_people + 1,
    status = case when current_people + 1 >= target_people then 'closed' else status end
  where id = target_group_buy_id;
end;
$$;

revoke all on function public.join_group_buy(uuid, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.join_group_buy(uuid, text, text, integer, text) to service_role;
