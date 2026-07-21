create table if not exists public.group_buy_participants (
  id uuid primary key default gen_random_uuid(),
  group_buy_id uuid not null references public.group_buys(id) on delete cascade,
  user_id text not null,
  quantity integer not null check (quantity between 1 and 10),
  start_location text not null check (
    start_location in ('생활관 1동', '생활관 3동', '공학관', '인문관', '경영관', '중앙도서관', '학생회관', '정문')
  ),
  created_at timestamptz not null default now(),
  unique (group_buy_id, user_id)
);

create index if not exists group_buy_participants_group_buy_id_idx
  on public.group_buy_participants (group_buy_id);

alter table public.group_buy_participants enable row level security;

revoke all on table public.group_buy_participants from anon, authenticated;
grant all on table public.group_buy_participants to service_role;

create or replace function public.join_group_buy(
  target_group_buy_id uuid,
  participant_user_id text,
  participant_quantity integer,
  participant_start_location text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_group_buy public.group_buys;
begin
  select * into target_group_buy
  from public.group_buys
  where id = target_group_buy_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'GROUP_BUY_NOT_FOUND';
  end if;

  if target_group_buy.owner_id = participant_user_id then
    raise exception using errcode = 'P0001', message = 'OWNER_CANNOT_JOIN';
  end if;

  if exists (
    select 1
    from public.group_buy_participants
    where group_buy_id = target_group_buy_id
      and user_id = participant_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'DUPLICATE_PARTICIPANT';
  end if;

  if target_group_buy.status = 'closed' then
    raise exception using errcode = 'P0001', message = 'GROUP_BUY_CLOSED';
  end if;

  insert into public.group_buy_participants (
    group_buy_id,
    user_id,
    quantity,
    start_location
  ) values (
    target_group_buy_id,
    participant_user_id,
    participant_quantity,
    participant_start_location
  );

  update public.group_buys
  set
    current_people = current_people + 1,
    status = case
      when current_people + 1 >= target_people then 'closed'
      else status
    end
  where id = target_group_buy_id;
end;
$$;

revoke all on function public.join_group_buy(uuid, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.join_group_buy(uuid, text, integer, text)
  to service_role;
