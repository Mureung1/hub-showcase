create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  record_id bigint not null references public.music_records(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, record_id)
);

create index if not exists likes_record_id_idx
on public.likes (record_id);

alter table public.likes enable row level security;

drop policy if exists "users_can_read_own_likes" on public.likes;
create policy "users_can_read_own_likes"
on public.likes
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "users_can_create_own_likes" on public.likes;
create policy "users_can_create_own_likes"
on public.likes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.music_records
    where music_records.id = likes.record_id
  )
);

drop policy if exists "users_can_delete_own_likes" on public.likes;
create policy "users_can_delete_own_likes"
on public.likes
for delete
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.get_music_record_like_counts(
  p_record_ids bigint[]
)
returns table (
  record_id bigint,
  like_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    music_records.id as record_id,
    count(likes.user_id) as like_count
  from public.music_records
  left join public.likes
    on likes.record_id = music_records.id
  where music_records.id = any(p_record_ids)
    and (select auth.uid()) is not null
  group by music_records.id;
$$;

revoke all on function public.get_music_record_like_counts(bigint[]) from public;
revoke all on function public.get_music_record_like_counts(bigint[]) from anon;
grant execute on function public.get_music_record_like_counts(bigint[]) to authenticated;

create or replace function public.get_music_record_like_users(
  p_record_id bigint,
  p_limit integer default 21,
  p_cursor_nickname text default null
)
returns table (
  nickname text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profiles.nickname,
    profiles.avatar_url
  from public.likes
  join public.profiles
    on profiles.id = likes.user_id
  where likes.record_id = p_record_id
    and exists (
      select 1
      from public.music_records
      where music_records.id = p_record_id
        and (select auth.uid()) is not null
    )
    and (
      p_cursor_nickname is null
      or profiles.nickname > p_cursor_nickname
    )
  order by profiles.nickname asc
  limit least(greatest(coalesce(p_limit, 21), 1), 21);
$$;

revoke all on function public.get_music_record_like_users(
  bigint,
  integer,
  text
) from public;
revoke all on function public.get_music_record_like_users(
  bigint,
  integer,
  text
) from anon;
grant execute on function public.get_music_record_like_users(
  bigint,
  integer,
  text
) to authenticated;
