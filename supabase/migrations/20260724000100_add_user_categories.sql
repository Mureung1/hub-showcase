create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text generated always as (
    lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
  ) stored,
  color_key text not null,
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_check check (
    name = regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')
    and char_length(name) between 1 and 50
  ),
  constraint categories_color_key_check check (
    color_key in (
      'slate-1',
      'slate-2',
      'slate-3',
      'blue-1',
      'blue-2',
      'blue-3',
      'indigo-1',
      'indigo-2',
      'indigo-3',
      'violet-1',
      'violet-2',
      'violet-3',
      'green-1',
      'green-2',
      'green-3',
      'teal-1',
      'teal-2',
      'teal-3',
      'amber-1',
      'amber-2',
      'amber-3',
      'coral-1',
      'coral-2',
      'coral-3'
    )
  ),
  constraint categories_id_user_id_key unique (id, user_id),
  constraint categories_user_normalized_name_key unique (
    user_id,
    normalized_name
  )
);

create index categories_user_sort_order_idx
on public.categories (user_id, sort_order, created_at, id);

create function public.set_categories_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_categories_updated_at();

alter table public.categories enable row level security;

revoke all on table public.categories from anon;
grant select, insert, update, delete on table public.categories to authenticated;

create policy "사용자는 자신의 카테고리를 조회할 수 있다"
on public.categories
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "사용자는 자신의 카테고리를 생성할 수 있다"
on public.categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "사용자는 자신의 카테고리를 수정할 수 있다"
on public.categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "사용자는 자신의 카테고리를 삭제할 수 있다"
on public.categories
for delete
to authenticated
using ((select auth.uid()) = user_id);

alter table public.insights
add column category_id uuid;

with normalized_categories as (
  select
    user_id,
    lower(
      regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g')
    ) as normalized_name,
    (
      array_agg(
        regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g')
        order by created_at, id
      )
    )[1] as name,
    min(created_at) as first_used_at
  from public.insights
  where nullif(btrim(category), '') is not null
  group by
    user_id,
    lower(regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g'))
),
ranked_categories as (
  select
    user_id,
    normalized_name,
    name,
    row_number() over (
      partition by user_id
      order by first_used_at, normalized_name
    ) - 1 as sort_order
  from normalized_categories
),
prepared_categories as (
  select
    user_id,
    name,
    sort_order,
    case normalized_name
      when '개발' then 'green-2'
      when '디자인' then 'blue-2'
      when '팀프로젝트' then 'amber-2'
      when '공부' then 'slate-2'
      when '취업' then 'coral-2'
      else (
        array[
          'slate-1',
          'slate-2',
          'slate-3',
          'blue-1',
          'blue-2',
          'blue-3',
          'indigo-1',
          'indigo-2',
          'indigo-3',
          'violet-1',
          'violet-2',
          'violet-3',
          'green-1',
          'green-2',
          'green-3',
          'teal-1',
          'teal-2',
          'teal-3',
          'amber-1',
          'amber-2',
          'amber-3',
          'coral-1',
          'coral-2',
          'coral-3'
        ]::text[]
      )[(sort_order % 24) + 1]
    end as color_key
  from ranked_categories
)
insert into public.categories (
  user_id,
  name,
  color_key,
  sort_order
)
select
  user_id,
  name,
  color_key,
  sort_order
from prepared_categories;

create temporary table category_backfill_updated_at_snapshot
on commit drop
as
select id, updated_at
from public.insights
where nullif(btrim(category), '') is not null;

alter table public.insights
disable trigger set_insights_updated_at;

update public.insights as insight
set category_id = category.id
from public.categories as category
where category.user_id = insight.user_id
  and category.normalized_name = lower(
    regexp_replace(btrim(insight.category), '[[:space:]]+', ' ', 'g')
  )
  and nullif(btrim(insight.category), '') is not null;

alter table public.insights
enable trigger set_insights_updated_at;

do $$
begin
  if exists (
    select 1
    from public.insights
    where nullif(btrim(category), '') is not null
      and category_id is null
  ) then
    raise exception '기존 카테고리 문자열을 category_id로 모두 이전하지 못했습니다.';
  end if;

  if exists (
    select 1
    from category_backfill_updated_at_snapshot as snapshot
    join public.insights as insight using (id)
    where insight.updated_at is distinct from snapshot.updated_at
  ) then
    raise exception '카테고리 이전 중 인사이트 수정 시각이 변경되었습니다.';
  end if;
end;
$$;

alter table public.insights
add constraint insights_category_user_id_fkey
foreign key (category_id, user_id)
references public.categories (id, user_id);

create index insights_category_user_id_idx
on public.insights (category_id, user_id)
where category_id is not null;

create or replace function public.set_insights_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    to_jsonb(new) - 'category' - 'updated_at'
  ) = (
    to_jsonb(old) - 'category' - 'updated_at'
  ) then
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;

  return new;
end;
$$;

create function public.sync_insight_category_compatibility()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_legacy_name text;
  resolved_category_id uuid;
  resolved_category_name text;
  canonical_category_name text;
  next_sort_order integer;
  next_color_key text;
  color_keys constant text[] := array[
    'slate-1',
    'slate-2',
    'slate-3',
    'blue-1',
    'blue-2',
    'blue-3',
    'indigo-1',
    'indigo-2',
    'indigo-3',
    'violet-1',
    'violet-2',
    'violet-3',
    'green-1',
    'green-2',
    'green-3',
    'teal-1',
    'teal-2',
    'teal-3',
    'amber-1',
    'amber-2',
    'amber-3',
    'coral-1',
    'coral-2',
    'coral-3'
  ]::text[];
begin
  if tg_op = 'UPDATE' then
    if new.category_id is distinct from old.category_id then
      if new.category_id is null then
        new.category = null;
        return new;
      end if;

      select category.name
      into canonical_category_name
      from public.categories as category
      where category.id = new.category_id
        and category.user_id = new.user_id;

      new.category = canonical_category_name;
      return new;
    end if;

    if new.category is not distinct from old.category then
      return new;
    end if;
  elsif new.category_id is not null then
    select category.name
    into canonical_category_name
    from public.categories as category
    where category.id = new.category_id
      and category.user_id = new.user_id;

    new.category = canonical_category_name;
    return new;
  end if;

  if nullif(btrim(new.category), '') is null then
    new.category = null;
    new.category_id = null;
    return new;
  end if;

  resolved_category_name := regexp_replace(
    btrim(new.category),
    '[[:space:]]+',
    ' ',
    'g'
  );
  normalized_legacy_name := lower(resolved_category_name);

  select category.id, category.name
  into resolved_category_id, canonical_category_name
  from public.categories as category
  where category.user_id = new.user_id
    and category.normalized_name = normalized_legacy_name;

  if resolved_category_id is null then
    select coalesce(max(category.sort_order) + 1, 0)
    into next_sort_order
    from public.categories as category
    where category.user_id = new.user_id;

    next_color_key := case normalized_legacy_name
      when '개발' then 'green-2'
      when '디자인' then 'blue-2'
      when '사이드프로젝트' then 'amber-2'
      when '공부' then 'slate-2'
      when '취업' then 'coral-2'
      else color_keys[(next_sort_order % array_length(color_keys, 1)) + 1]
    end;

    insert into public.categories (
      user_id,
      name,
      color_key,
      sort_order
    ) values (
      new.user_id,
      resolved_category_name,
      next_color_key,
      next_sort_order
    )
    on conflict (user_id, normalized_name) do nothing
    returning id, name
    into resolved_category_id, canonical_category_name;

    if resolved_category_id is null then
      select category.id, category.name
      into resolved_category_id, canonical_category_name
      from public.categories as category
      where category.user_id = new.user_id
        and category.normalized_name = normalized_legacy_name;
    end if;
  end if;

  new.category_id = resolved_category_id;
  new.category = canonical_category_name;
  return new;
end;
$$;

create trigger sync_insight_category_compatibility
before insert or update on public.insights
for each row
execute function public.sync_insight_category_compatibility();

create function public.sync_category_name_compatibility()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.insights
  set category = new.name
  where category_id = new.id
    and user_id = new.user_id
    and category is distinct from new.name;

  return new;
end;
$$;

create trigger sync_category_name_compatibility
after update of name on public.categories
for each row
when (new.name is distinct from old.name)
execute function public.sync_category_name_compatibility();

create function public.delete_user_category(target_category_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = '로그인한 사용자만 카테고리를 삭제할 수 있습니다.';
  end if;

  if not exists (
    select 1
    from public.categories
    where id = target_category_id
      and user_id = current_user_id
  ) then
    raise exception using
      errcode = '42501',
      message = '삭제할 수 있는 카테고리가 아닙니다.';
  end if;

  update public.insights
  set category_id = null
  where category_id = target_category_id
    and user_id = current_user_id;

  delete from public.categories
  where id = target_category_id
    and user_id = current_user_id;
end;
$$;

revoke all on function public.delete_user_category(uuid) from public;
revoke all on function public.delete_user_category(uuid) from anon;
grant execute on function public.delete_user_category(uuid) to authenticated;
