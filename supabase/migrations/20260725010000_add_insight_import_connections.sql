create table public.insight_import_connections (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null,
  provider text not null check (provider = 'notion'),
  status text not null check (
    status in (
      'pending', 'exchanging', 'connected', 'analyzing',
      'completed', 'canceled', 'failed'
    )
  ),
  return_mode text not null check (return_mode in ('web', 'android')),
  include_page_urls boolean not null default false,
  state_hash text not null unique check (state_hash ~ '^[0-9a-f]{64}$'),
  state_expires_at timestamptz not null,
  access_ciphertext text,
  access_nonce text,
  access_auth_tag text,
  refresh_ciphertext text,
  refresh_nonce text,
  refresh_auth_tag text,
  key_version smallint check (key_version = 1),
  workspace_name text check (
    workspace_name is null or char_length(workspace_name) <= 200
  ),
  workspace_id text check (
    workspace_id is null or char_length(workspace_id) <= 100
  ),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insight_import_connections_job_user_fkey
    foreign key (job_id, user_id)
    references public.insight_import_jobs (id, user_id)
    on delete cascade,
  constraint insight_import_connections_state_expiry_check check (
    state_expires_at > created_at
    and state_expires_at <= created_at + interval '10 minutes'
  ),
  constraint insight_import_connections_expiry_check check (
    expires_at > created_at
    and expires_at <= created_at + interval '24 hours'
  ),
  constraint insight_import_connections_access_token_check check (
    (
      status in ('connected', 'analyzing')
      and access_ciphertext is not null
      and access_nonce is not null
      and access_auth_tag is not null
      and key_version = 1
    )
    or (
      status not in ('connected', 'analyzing')
      and access_ciphertext is null
      and access_nonce is null
      and access_auth_tag is null
    )
  ),
  constraint insight_import_connections_refresh_token_check check (
    (
      refresh_ciphertext is null
      and refresh_nonce is null
      and refresh_auth_tag is null
    )
    or (
      refresh_ciphertext is not null
      and refresh_nonce is not null
      and refresh_auth_tag is not null
      and key_version = 1
    )
  ),
  constraint insight_import_connections_terminal_token_check check (
    status not in ('completed', 'canceled', 'failed')
    or (
      access_ciphertext is null
      and access_nonce is null
      and access_auth_tag is null
      and refresh_ciphertext is null
      and refresh_nonce is null
      and refresh_auth_tag is null
    )
  )
);

create index insight_import_connections_user_created_at_idx
on public.insight_import_connections (user_id, created_at desc);

alter table public.insight_import_connections enable row level security;

create policy "Users can read their import connections"
on public.insight_import_connections
for select
to authenticated
using ((select auth.uid()) = user_id);

create function public.set_insight_import_connections_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_insight_import_connections_updated_at
before update on public.insight_import_connections
for each row
execute function public.set_insight_import_connections_updated_at();

create view public.my_insight_import_connections
with (security_invoker = true)
as
select
  id,
  user_id,
  job_id,
  provider,
  status,
  return_mode,
  include_page_urls,
  workspace_name,
  expires_at,
  created_at,
  updated_at
from public.insight_import_connections;

revoke all on table public.insight_import_connections
from public, anon, authenticated;
revoke all on table public.my_insight_import_connections
from public, anon, authenticated;

grant select (
  id,
  user_id,
  job_id,
  provider,
  status,
  return_mode,
  include_page_urls,
  workspace_name,
  expires_at,
  created_at,
  updated_at
) on public.insight_import_connections to authenticated;
grant select on public.my_insight_import_connections to authenticated;

create function public.consume_insight_import_oauth_state(p_state_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.insight_import_connections%rowtype;
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception using errcode = '42501', message = '실행 권한이 없습니다.';
  end if;

  update public.insight_import_connections
  set status = 'exchanging'
  where state_hash = p_state_hash
    and status = 'pending'
    and state_expires_at > now()
  returning * into v_connection;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_connection.id,
    'userId', v_connection.user_id,
    'jobId', v_connection.job_id,
    'provider', v_connection.provider,
    'returnMode', v_connection.return_mode,
    'includePageUrls', v_connection.include_page_urls,
    'expiresAt', v_connection.expires_at
  );
end;
$$;

create function public.store_insight_import_oauth_tokens(
  p_connection_id uuid,
  p_tokens jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception using errcode = '42501', message = '실행 권한이 없습니다.';
  end if;

  update public.insight_import_connections
  set
    status = 'connected',
    access_ciphertext = p_tokens ->> 'accessCiphertext',
    access_nonce = p_tokens ->> 'accessNonce',
    access_auth_tag = p_tokens ->> 'accessAuthTag',
    refresh_ciphertext = p_tokens ->> 'refreshCiphertext',
    refresh_nonce = p_tokens ->> 'refreshNonce',
    refresh_auth_tag = p_tokens ->> 'refreshAuthTag',
    key_version = (p_tokens ->> 'keyVersion')::smallint,
    workspace_name = p_tokens ->> 'workspaceName',
    workspace_id = p_tokens ->> 'workspaceId'
  where id = p_connection_id
    and status = 'exchanging';

  if not found then
    raise exception using errcode = '22023', message = '연결을 저장할 수 없습니다.';
  end if;
end;
$$;

create function public.finish_insight_import_connection(
  p_connection_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception using errcode = '42501', message = '실행 권한이 없습니다.';
  end if;

  if p_status not in ('completed', 'canceled', 'failed') then
    raise exception using errcode = '22023', message = '완료 상태가 올바르지 않습니다.';
  end if;

  update public.insight_import_connections
  set
    status = p_status,
    access_ciphertext = null,
    access_nonce = null,
    access_auth_tag = null,
    refresh_ciphertext = null,
    refresh_nonce = null,
    refresh_auth_tag = null,
    key_version = null
  where id = p_connection_id;

  if not found then
    raise exception using errcode = '22023', message = '연결을 찾을 수 없습니다.';
  end if;
end;
$$;

create or replace function public.cleanup_expired_insight_imports()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection_job_ids uuid[];
  v_connection_job_count integer := 0;
  v_expired_job_count integer := 0;
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception using errcode = '42501', message = '실행 권한이 없습니다.';
  end if;

  select coalesce(array_agg(job_id), array[]::uuid[])
  into v_connection_job_ids
  from public.insight_import_connections
  where expires_at < now();

  delete from public.insight_import_connections
  where expires_at < now();

  delete from public.insight_import_jobs
  where id = any(v_connection_job_ids)
    and status in ('analyzing', 'ready', 'failed');

  get diagnostics v_connection_job_count = row_count;

  delete from public.insight_import_jobs
  where expires_at < now()
    and status in ('analyzing', 'ready', 'failed');

  get diagnostics v_expired_job_count = row_count;

  return v_connection_job_count + v_expired_job_count;
end;
$$;

revoke all on function public.consume_insight_import_oauth_state(text)
from public, anon, authenticated, service_role;
revoke all on function public.store_insight_import_oauth_tokens(uuid, jsonb)
from public, anon, authenticated, service_role;
revoke all on function public.finish_insight_import_connection(uuid, text)
from public, anon, authenticated, service_role;

grant execute on function public.consume_insight_import_oauth_state(text)
to service_role;
grant execute on function public.store_insight_import_oauth_tokens(uuid, jsonb)
to service_role;
grant execute on function public.finish_insight_import_connection(uuid, text)
to service_role;
