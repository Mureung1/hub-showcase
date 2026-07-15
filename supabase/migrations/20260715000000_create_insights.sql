create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_url text not null check (btrim(original_url) <> ''),
  normalized_url text not null check (btrim(normalized_url) <> ''),
  domain text not null check (btrim(domain) <> ''),
  title text not null check (btrim(title) <> ''),
  memo text,
  category text,
  schema_version smallint not null default 1 check (schema_version = 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint insights_user_normalized_url_key unique (user_id, normalized_url)
);

create function public.set_insights_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger set_insights_updated_at
before update on public.insights
for each row
execute function public.set_insights_updated_at();

alter table public.insights enable row level security;

revoke all on table public.insights from anon;
grant select, insert, update, delete on table public.insights to authenticated;

create policy "사용자는 자신의 인사이트를 조회할 수 있다"
on public.insights
for select
to authenticated
using ((select auth.uid()) = user_id);
create policy "사용자는 자신의 인사이트를 생성할 수 있다"
on public.insights
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "사용자는 자신의 인사이트를 수정할 수 있다"
on public.insights
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "사용자는 자신의 인사이트를 삭제할 수 있다"
on public.insights
for delete
to authenticated
using ((select auth.uid()) = user_id);
