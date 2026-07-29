begin;

alter table public.guest_sessions
  add column ai_window_started_at timestamptz not null default now(),
  add column ai_request_count integer not null default 0,
  add constraint guest_sessions_ai_request_count_check
    check (ai_request_count >= 0);

create or replace function public.consume_guest_ai_quota(
  p_guest_session_id uuid,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quota_consumed boolean := false;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid AI quota configuration';
  end if;

  update public.guest_sessions
  set
    ai_window_started_at = case
      when ai_window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else ai_window_started_at
    end,
    ai_request_count = case
      when ai_window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else ai_request_count + 1
    end
  where id = p_guest_session_id
    and expires_at > now()
    and (
      ai_window_started_at <= now() - make_interval(secs => p_window_seconds)
      or ai_request_count < p_limit
    )
  returning true into quota_consumed;

  return coalesce(quota_consumed, false);
end;
$$;

revoke all on function public.consume_guest_ai_quota(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_guest_ai_quota(uuid, integer, integer)
  to service_role;

create or replace function public.enforce_guest_emotion_analysis_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.guest_session_id is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.guest_session_id::text, 0)
  );

  if (
    select count(*)
    from public.emotion_analyses
    where guest_session_id = new.guest_session_id
  ) >= 200 then
    raise exception using
      errcode = 'P0001',
      message = 'GUEST_STORAGE_LIMIT_EXCEEDED';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_guest_emotion_analysis_limit()
  from public, anon, authenticated;

create trigger enforce_guest_emotion_analysis_limit_before_insert
before insert on public.emotion_analyses
for each row execute function public.enforce_guest_emotion_analysis_limit();

commit;
