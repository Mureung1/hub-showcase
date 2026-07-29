create table if not exists public.spotify_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists spotify_oauth_states_user_id_idx
  on public.spotify_oauth_states (user_id);

alter table public.spotify_oauth_states enable row level security;

revoke all on table public.spotify_oauth_states from public, anon, authenticated;

create table if not exists public.spotify_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  spotify_user_id text not null,
  spotify_display_name text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz not null,
  scope text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spotify_connections enable row level security;

revoke all on table public.spotify_connections from public, anon, authenticated;

comment on table public.spotify_oauth_states is
  'Server-only, one-time Spotify OAuth state hashes.';

comment on table public.spotify_connections is
  'Server-only encrypted Spotify user OAuth tokens.';
