create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_cannot_follow_self check (follower_id <> following_id)
);

create index if not exists follows_following_id_idx
on public.follows (following_id);

alter table public.follows enable row level security;

drop policy if exists "users_can_read_own_follows" on public.follows;
create policy "users_can_read_own_follows"
on public.follows
for select
to authenticated
using (follower_id = (select auth.uid()));

