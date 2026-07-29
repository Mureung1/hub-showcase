begin;

create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  expires_at timestamptz not null,

  constraint guest_sessions_key_hash_check
    check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint guest_sessions_expiration_check
    check (expires_at > created_at)
);

create index guest_sessions_expires_at_idx
  on public.guest_sessions (expires_at);

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  guest_session_id uuid not null
    references public.guest_sessions (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),

  constraint conversation_messages_role_check
    check (role in ('user', 'assistant')),
  constraint conversation_messages_content_check
    check (char_length(btrim(content)) between 1 and 4000)
);

create index conversation_messages_guest_created_at_idx
  on public.conversation_messages (guest_session_id, created_at asc);

alter table public.emotion_analyses
  alter column session_id drop not null,
  add column guest_session_id uuid
    references public.guest_sessions (id) on delete cascade;

create index emotion_analyses_guest_created_at_idx
  on public.emotion_analyses (guest_session_id, created_at desc)
  where guest_session_id is not null;

alter table public.guest_sessions enable row level security;
alter table public.conversation_messages enable row level security;

revoke all on table public.guest_sessions from anon, authenticated;
revoke all on table public.conversation_messages from anon, authenticated;
grant select, insert, update, delete on table public.guest_sessions to service_role;
grant select, insert, delete on table public.conversation_messages to service_role;

comment on table public.guest_sessions is
  'Guest recovery sessions. Only a server-side HMAC hash of the recovery key is stored.';
comment on column public.guest_sessions.key_hash is
  'HMAC-SHA256 digest of the normalized recovery key; never the plaintext key.';
comment on column public.emotion_analyses.guest_session_id is
  'Guest ownership boundary. This becomes required after the guest-protected API migration.';

commit;
