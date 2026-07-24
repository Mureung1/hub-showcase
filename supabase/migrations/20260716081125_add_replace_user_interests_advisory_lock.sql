-- 동일 사용자의 동시 replace_user_interests 호출이 delete+insert를 서로 겹치지 않게
-- 실행해 합집합/중복 결과를 만드는 문제(READ COMMITTED에서 재현됨)를 막는다.
-- 네임스페이스 2-키 advisory lock을 써서 다른 기능의 advisory lock과 키 충돌을 피한다.
-- 트랜잭션 종료(커밋/롤백) 시 자동 해제되므로 별도 unlock이 필요 없다.
create or replace function public.replace_user_interests(p_interest_ids uuid[])
returns uuid[]
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer := coalesce(cardinality(p_interest_ids), 0);
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext('replace_user_interests'), hashtext(v_user_id::text));

  if v_count < 1 or v_count > 3 then
    raise exception using errcode = 'P0001', message = 'INTEREST_COUNT_OUT_OF_RANGE';
  end if;
  if (select count(distinct id) from unnest(p_interest_ids) as ids(id)) <> v_count then
    raise exception using errcode = 'P0001', message = 'INTEREST_IDS_DUPLICATED';
  end if;
  if (
    select count(*)
    from public.interests
    where id = any(p_interest_ids)
      and launch_status in ('active', 'curated_only')
  ) <> v_count then
    raise exception using errcode = 'P0001', message = 'INTEREST_NOT_SELECTABLE';
  end if;

  delete from public.user_interests where user_id = v_user_id;
  insert into public.user_interests (user_id, interest_id)
  select v_user_id, id from unnest(p_interest_ids) as ids(id);
  return p_interest_ids;
end;
$$;

revoke execute on function public.replace_user_interests(uuid[]) from public;
revoke execute on function public.replace_user_interests(uuid[]) from anon;
grant execute on function public.replace_user_interests(uuid[]) to authenticated, service_role;
