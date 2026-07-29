create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.insight_embeddings (
  insight_id uuid primary key
    references public.insights(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  embedding extensions.vector(768) not null,
  model_id text not null,
  projection_version smallint not null,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);

create table public.insight_embedding_jobs (
  insight_id uuid primary key
    references public.insights(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null,
  projection_version smallint not null,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);

create table public.embedding_usage_months (
  month_start date primary key,
  used_tokens bigint not null default 0 check (used_tokens >= 0),
  updated_at timestamptz not null default now()
);

create table public.embedding_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  month_start date not null
    references public.embedding_usage_months(month_start) on delete cascade,
  reserved_tokens bigint not null check (reserved_tokens > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index insight_embeddings_user_version_index
on public.insight_embeddings (user_id, model_id, projection_version);

create index insight_embedding_jobs_user_updated_index
on public.insight_embedding_jobs (user_id, updated_at, insight_id);

create index embedding_usage_reservations_month_expiry_index
on public.embedding_usage_reservations (month_start, expires_at);

alter table public.insight_embeddings enable row level security;
alter table public.insight_embedding_jobs enable row level security;
alter table public.embedding_usage_months enable row level security;
alter table public.embedding_usage_reservations enable row level security;

revoke all on table public.insight_embeddings
from public, anon, authenticated;
revoke all on table public.insight_embedding_jobs
from public, anon, authenticated;
revoke all on table public.embedding_usage_months
from public, anon, authenticated;
revoke all on table public.embedding_usage_reservations
from public, anon, authenticated;

grant select, insert, update, delete
on table public.insight_embeddings
to service_role;
grant select, insert, update, delete
on table public.insight_embedding_jobs
to service_role;
grant select, insert, update, delete
on table public.embedding_usage_months
to service_role;
grant select, insert, update, delete
on table public.embedding_usage_reservations
to service_role;

create function public.get_insight_embedding_source_hash(
  source_title text,
  source_memo text
)
returns text
language sql
immutable
set search_path = ''
as $$
  with normalized as (
    select
      btrim(source_title) as title,
      coalesce(nullif(btrim(source_memo), ''), btrim(source_title)) as body
  )
  select encode(
    extensions.digest(
      octet_length(title)::text || ':' || title
        || octet_length(body)::text || ':' || body,
      'sha256'
    ),
    'hex'
  )
  from normalized;
$$;

create function public.enqueue_insight_embedding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and old.title is not distinct from new.title
    and old.memo is not distinct from new.memo then
    return new;
  end if;

  insert into public.insight_embedding_jobs (
    insight_id,
    user_id,
    model_id,
    projection_version,
    source_hash,
    updated_at
  ) values (
    new.id,
    new.user_id,
    'gemini-embedding-2',
    1,
    public.get_insight_embedding_source_hash(new.title, new.memo),
    now()
  )
  on conflict (insight_id) do update
  set
    user_id = excluded.user_id,
    model_id = excluded.model_id,
    projection_version = excluded.projection_version,
    source_hash = excluded.source_hash,
    updated_at = now();

  return new;
end;
$$;

revoke execute on function public.enqueue_insight_embedding()
from public, anon, authenticated;

create trigger enqueue_insight_embedding
after insert or update of title, memo on public.insights
for each row
execute function public.enqueue_insight_embedding();

create function public.list_pending_insight_embeddings(
  requested_user_id uuid,
  requested_model_id text,
  requested_projection_version smallint,
  result_limit integer
)
returns table (
  insight_id uuid,
  title text,
  memo text,
  source_hash text
)
language sql
security definer
set search_path = ''
as $$
  select
    jobs.insight_id,
    insights.title,
    insights.memo,
    jobs.source_hash
  from public.insight_embedding_jobs as jobs
  join public.insights as insights
    on insights.id = jobs.insight_id
    and insights.user_id = jobs.user_id
  where jobs.user_id = requested_user_id
    and jobs.model_id = requested_model_id
    and jobs.projection_version = requested_projection_version
    and jobs.source_hash = public.get_insight_embedding_source_hash(
      insights.title,
      insights.memo
    )
  order by jobs.updated_at, jobs.insight_id
  limit least(greatest(coalesce(result_limit, 0), 0), 100);
$$;

revoke execute on function public.list_pending_insight_embeddings(
  uuid,
  text,
  smallint,
  integer
) from public, anon, authenticated;
grant execute on function public.list_pending_insight_embeddings(
  uuid,
  text,
  smallint,
  integer
) to service_role;

create function public.complete_insight_embedding_job(
  requested_insight_id uuid,
  requested_user_id uuid,
  requested_embedding extensions.vector(768),
  requested_model_id text,
  requested_projection_version smallint,
  requested_source_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_job public.insight_embedding_jobs%rowtype;
begin
  select jobs.*
  into locked_job
  from public.insight_embedding_jobs as jobs
  where jobs.insight_id = requested_insight_id
  for update;

  if not found
    or locked_job.user_id is distinct from requested_user_id
    or locked_job.model_id is distinct from requested_model_id
    or locked_job.projection_version is distinct from requested_projection_version
    or locked_job.source_hash is distinct from requested_source_hash then
    return false;
  end if;

  if not exists(
    select 1
    from public.insights as insights
    where insights.id = requested_insight_id
      and insights.user_id = requested_user_id
      and public.get_insight_embedding_source_hash(
        insights.title,
        insights.memo
      ) = requested_source_hash
  ) then
    return false;
  end if;

  insert into public.insight_embeddings (
    insight_id,
    user_id,
    embedding,
    model_id,
    projection_version,
    source_hash,
    updated_at
  ) values (
    requested_insight_id,
    requested_user_id,
    requested_embedding,
    requested_model_id,
    requested_projection_version,
    requested_source_hash,
    now()
  )
  on conflict (insight_id) do update
  set
    user_id = excluded.user_id,
    embedding = excluded.embedding,
    model_id = excluded.model_id,
    projection_version = excluded.projection_version,
    source_hash = excluded.source_hash,
    updated_at = now();

  delete from public.insight_embedding_jobs as jobs
  where jobs.insight_id = requested_insight_id
    and jobs.user_id = requested_user_id
    and jobs.model_id = requested_model_id
    and jobs.projection_version = requested_projection_version
    and jobs.source_hash = requested_source_hash;

  return found;
end;
$$;

revoke execute on function public.complete_insight_embedding_job(
  uuid,
  uuid,
  extensions.vector,
  text,
  smallint,
  text
) from public, anon, authenticated;
grant execute on function public.complete_insight_embedding_job(
  uuid,
  uuid,
  extensions.vector,
  text,
  smallint,
  text
) to service_role;

create function public.match_insight_embeddings(
  requested_user_id uuid,
  query_embedding extensions.vector(768),
  match_threshold real,
  requested_model_id text,
  requested_projection_version smallint
)
returns table (insight_id uuid, similarity real)
language sql
security definer
set search_path = ''
as $$
  select
    embeddings.insight_id,
    (
      1 - (
        embeddings.embedding
        operator(extensions.<=>)
        query_embedding
      )
    )::real as similarity
  from public.insight_embeddings as embeddings
  join public.insights as insights
    on insights.id = embeddings.insight_id
    and insights.user_id = embeddings.user_id
  where embeddings.user_id = requested_user_id
    and embeddings.model_id = requested_model_id
    and embeddings.projection_version = requested_projection_version
    and 1 - (
      embeddings.embedding
      operator(extensions.<=>)
      query_embedding
    ) >= match_threshold
  order by
    embeddings.embedding operator(extensions.<=>) query_embedding,
    insights.updated_at desc,
    embeddings.insight_id;
$$;

revoke execute on function public.match_insight_embeddings(
  uuid,
  extensions.vector,
  real,
  text,
  smallint
) from public, anon, authenticated;
grant execute on function public.match_insight_embeddings(
  uuid,
  extensions.vector,
  real,
  text,
  smallint
) to service_role;

create function public.reserve_embedding_usage(
  requested_tokens bigint,
  requested_ttl interval default interval '15 minutes'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_reserved_tokens bigint;
  current_month date := date_trunc(
    'month',
    timezone('utc', now())
  )::date;
  expired_reserved_tokens bigint;
  monthly_used_tokens bigint;
  reservation_id uuid;
begin
  if requested_tokens <= 0 then
    raise exception using
      errcode = '22023',
      message = '예약할 토큰 수는 1 이상이어야 합니다.';
  end if;

  if requested_ttl < interval '1 minute'
    or requested_ttl > interval '7 days' then
    raise exception using
      errcode = '22023',
      message = '토큰 예약 기간은 1분 이상 7일 이하여야 합니다.';
  end if;

  insert into public.embedding_usage_months (month_start)
  values (current_month)
  on conflict (month_start) do nothing;

  select months.used_tokens
  into monthly_used_tokens
  from public.embedding_usage_months as months
  where months.month_start = current_month
  for update;

  select coalesce(sum(reservations.reserved_tokens), 0)
  into expired_reserved_tokens
  from public.embedding_usage_reservations as reservations
  where reservations.month_start = current_month
    and reservations.expires_at <= now();

  if expired_reserved_tokens > 0 then
    update public.embedding_usage_months as months
    set
      used_tokens = months.used_tokens + expired_reserved_tokens,
      updated_at = now()
    where months.month_start = current_month;

    delete from public.embedding_usage_reservations as reservations
    where reservations.month_start = current_month
      and reservations.expires_at <= now();

    monthly_used_tokens := monthly_used_tokens + expired_reserved_tokens;
  end if;

  select coalesce(sum(reservations.reserved_tokens), 0)
  into active_reserved_tokens
  from public.embedding_usage_reservations as reservations
  where reservations.month_start = current_month;

  if monthly_used_tokens + active_reserved_tokens + requested_tokens
    > 25000000 then
    return null;
  end if;

  insert into public.embedding_usage_reservations (
    month_start,
    reserved_tokens,
    expires_at
  ) values (
    current_month,
    requested_tokens,
    now() + requested_ttl
  )
  returning id into reservation_id;

  return reservation_id;
end;
$$;

revoke execute on function public.reserve_embedding_usage(bigint, interval)
from public, anon, authenticated;
grant execute on function public.reserve_embedding_usage(bigint, interval)
to service_role;

create function public.reconcile_embedding_usage(
  requested_reservation_id uuid,
  settlement text,
  actual_prompt_tokens bigint default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  charged_tokens bigint;
  locked_reservation public.embedding_usage_reservations%rowtype;
begin
  select reservations.*
  into locked_reservation
  from public.embedding_usage_reservations as reservations
  where reservations.id = requested_reservation_id
  for update;

  if not found then
    return false;
  end if;

  if settlement = 'actual' then
    if actual_prompt_tokens is null
      or actual_prompt_tokens < 0
      or actual_prompt_tokens > locked_reservation.reserved_tokens then
      raise exception using
        errcode = '22023',
        message = '실제 토큰 수가 예약 범위를 벗어났습니다.';
    end if;

    charged_tokens := actual_prompt_tokens;
  elsif settlement = 'reserved-maximum' then
    charged_tokens := locked_reservation.reserved_tokens;
  else
    raise exception using
      errcode = '22023',
      message = '지원하지 않는 토큰 정산 방식입니다.';
  end if;

  perform 1
  from public.embedding_usage_months as months
  where months.month_start = locked_reservation.month_start
  for update;

  update public.embedding_usage_months as months
  set
    used_tokens = months.used_tokens + charged_tokens,
    updated_at = now()
  where months.month_start = locked_reservation.month_start;

  delete from public.embedding_usage_reservations as reservations
  where reservations.id = requested_reservation_id;

  return true;
end;
$$;

revoke execute on function public.reconcile_embedding_usage(
  uuid,
  text,
  bigint
) from public, anon, authenticated;
grant execute on function public.reconcile_embedding_usage(
  uuid,
  text,
  bigint
) to service_role;

insert into public.insight_embedding_jobs (
  insight_id,
  user_id,
  model_id,
  projection_version,
  source_hash
)
select
  insights.id,
  insights.user_id,
  'gemini-embedding-2',
  1,
  public.get_insight_embedding_source_hash(
    insights.title,
    insights.memo
  )
from public.insights as insights
on conflict (insight_id) do update
set
  user_id = excluded.user_id,
  model_id = excluded.model_id,
  projection_version = excluded.projection_version,
  source_hash = excluded.source_hash,
  updated_at = now();
