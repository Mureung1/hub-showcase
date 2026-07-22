create or replace function public.vote_group_buy(
  target_group_buy_id uuid,
  voter_user_id text,
  selected_candidate text
)
returns void language plpgsql security invoker set search_path = public
as $$
declare target_group_buy public.group_buys;
begin
  select * into target_group_buy from public.group_buys
  where id = target_group_buy_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'GROUP_BUY_NOT_FOUND'; end if;
  if not exists (select 1 from public.group_buy_participants where group_buy_id = target_group_buy_id and user_id = voter_user_id)
    then raise exception using errcode = 'P0001', message = 'VOTER_NOT_PARTICIPANT'; end if;
  if target_group_buy.status <> 'closed' then raise exception using errcode = 'P0001', message = 'VOTE_NOT_OPEN'; end if;
  if target_group_buy.final_pickup is not null then raise exception using errcode = 'P0001', message = 'VOTE_ALREADY_FINALIZED'; end if;
  insert into public.group_buy_votes (group_buy_id, user_id, candidate)
  values (target_group_buy_id, voter_user_id, selected_candidate)
  on conflict (group_buy_id, user_id) do update
  set candidate = excluded.candidate, updated_at = now();
end;
$$;

create or replace function public.finalize_group_buy_pickup(
  target_group_buy_id uuid,
  requester_user_id text
)
returns void language plpgsql security invoker set search_path = public
as $$
declare
  target_group_buy public.group_buys;
  winning_candidate text;
begin
  select * into target_group_buy from public.group_buys
  where id = target_group_buy_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'GROUP_BUY_NOT_FOUND'; end if;
  if target_group_buy.owner_id <> requester_user_id then raise exception using errcode = 'P0001', message = 'ONLY_OWNER_CAN_FINALIZE'; end if;
  if target_group_buy.final_pickup is not null then raise exception using errcode = 'P0001', message = 'PICKUP_ALREADY_FINALIZED'; end if;
  select candidate into winning_candidate from public.group_buy_votes
  where group_buy_id = target_group_buy_id
  group by candidate order by count(*) desc, candidate asc limit 1;
  if winning_candidate is null then raise exception using errcode = 'P0001', message = 'VOTE_REQUIRED'; end if;
  update public.group_buys set final_pickup = winning_candidate, pickup_location = winning_candidate
  where id = target_group_buy_id;
end;
$$;

revoke all on function public.vote_group_buy(uuid, text, text) from public, anon, authenticated;
grant execute on function public.vote_group_buy(uuid, text, text) to service_role;
revoke all on function public.finalize_group_buy_pickup(uuid, text) from public, anon, authenticated;
grant execute on function public.finalize_group_buy_pickup(uuid, text) to service_role;
