create function public.delete_user_insights(target_insight_ids uuid[])
returns table (id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  requested_ids uuid[];
  matched_ids uuid[];
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = '로그인한 사용자만 인사이트를 삭제할 수 있습니다.';
  end if;

  select coalesce(
    array_agg(distinct requested.target_id order by requested.target_id),
    '{}'::uuid[]
  )
  into requested_ids
  from unnest(coalesce(target_insight_ids, '{}'::uuid[])) as requested(target_id);

  if cardinality(requested_ids) = 0 then
    raise exception using
      errcode = '22023',
      message = '삭제할 인사이트를 한 개 이상 선택해 주세요.';
  end if;

  select coalesce(array_agg(locked.id order by locked.id), '{}'::uuid[])
  into matched_ids
  from (
    select insight.id
    from public.insights as insight
    where insight.user_id = current_user_id
      and insight.id = any(requested_ids)
    for update
  ) as locked;

  if matched_ids is distinct from requested_ids then
    raise exception using
      errcode = 'P0002',
      message = '삭제할 인사이트 전체를 찾지 못했습니다.';
  end if;

  return query
  delete from public.insights as insight
  where insight.user_id = current_user_id
    and insight.id = any(requested_ids)
  returning insight.id;
end;
$$;

revoke all on function public.delete_user_insights(uuid[]) from public;
revoke all on function public.delete_user_insights(uuid[]) from anon;
grant execute on function public.delete_user_insights(uuid[]) to authenticated;
