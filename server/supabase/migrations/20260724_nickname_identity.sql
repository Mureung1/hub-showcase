-- 적용 전 확인:
-- 아래 두 조회가 행을 반환하면 데이터를 임의 수정하지 말고 사용자와 해결한다.
select lower(btrim(nickname)) as normalized_nickname, array_agg(nickname order by nickname) as nicknames
from public.profiles
group by lower(btrim(nickname))
having count(*) > 1;

select id, nickname
from public.profiles
where nickname <> btrim(nickname);

do $$
begin
  if exists (
    select 1
    from public.profiles
    group by lower(btrim(nickname))
    having count(*) > 1
  ) then
    raise exception '정규화 기준으로 중복된 닉네임이 있어 마이그레이션을 중단합니다.'
      using hint = '상단 중복 확인 조회 결과를 검토하고 닉네임 소유자와 해결한 뒤 다시 실행하세요.';
  end if;

  if exists (
    select 1
    from public.profiles
    where nickname <> btrim(nickname)
  ) then
    raise exception '앞뒤 공백이 저장된 닉네임이 있어 마이그레이션을 중단합니다.'
      using hint = '상단 공백 확인 조회 결과를 검토하고 닉네임 소유자와 해결한 뒤 다시 실행하세요.';
  end if;
end;
$$;

create unique index if not exists profiles_nickname_normalized_key
on public.profiles (lower(btrim(nickname)));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_nickname_trimmed'
  ) then
    alter table public.profiles
      add constraint profiles_nickname_trimmed
      check (nickname = btrim(nickname));
  end if;
end;
$$;

create or replace function public.is_nickname_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(char_length(btrim(candidate)) between 2 and 20, false)
    and not exists (
      select 1
      from public.profiles
      where lower(btrim(nickname)) = lower(btrim(candidate))
    );
$$;

revoke all on function public.is_nickname_available(text) from public;
grant execute on function public.is_nickname_available(text) to anon, authenticated;

