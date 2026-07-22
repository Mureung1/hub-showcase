create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_nickname_length check (char_length(trim(nickname)) between 2 and 20)
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_are_publicly_readable" on public.profiles;
create policy "profiles_are_publicly_readable"
on public.profiles
for select
to anon, authenticated
using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, trim(new.raw_user_meta_data ->> 'nickname'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
