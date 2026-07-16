create extension if not exists pgcrypto;

create table if not exists public.quest_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  anonymous_session_id text null,
  quest_id uuid null,
  event_type text not null check (event_type in ('quest_suggested', 'quest_accepted', 'quest_completed', 'quest_failed', 'recovery_started', 'recovery_completed', 'manager_reaction', 'reward_unlocked')),
  title text not null,
  quest_type text not null check (quest_type in ('time', 'quantity', 'action')),
  amount integer not null check (amount > 0),
  unit text not null,
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard')),
  deadline_at timestamptz null,
  result text null check (result is null or result in ('success', 'failed', 'recovery')),
  exp_delta integer not null,
  failure_reason text null,
  previous_quest_title text null,
  recovery_from_event_id uuid null references public.quest_logs(id) on delete set null,
  manager_mood_after text null check (manager_mood_after is null or manager_mood_after in ('waiting', 'focused', 'happy', 'recovering')),
  manager_line text null,
  client_created_at timestamptz null,
  created_at timestamptz not null default now(),
  visibility text not null default 'private' check (visibility in ('private', 'anonymous_public', 'friends_only')),
  event_version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.quest_logs enable row level security;

create index if not exists quest_logs_created_at_idx
  on public.quest_logs (created_at desc);

create index if not exists quest_logs_user_created_at_idx
  on public.quest_logs (user_id, created_at desc);

create index if not exists quest_logs_session_created_at_idx
  on public.quest_logs (anonymous_session_id, created_at desc);

create index if not exists quest_logs_result_created_at_idx
  on public.quest_logs (result, created_at desc);

create index if not exists quest_logs_event_type_created_at_idx
  on public.quest_logs (event_type, created_at desc);
