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
create table if not exists public.spotify_playlist_exports (
  user_id uuid not null references auth.users(id) on delete cascade,
  recap_year integer not null check (recap_year between 2000 and 9999),
  recap_month integer not null check (recap_month between 1 and 12),
  spotify_playlist_id text,
  spotify_playlist_url text,
  track_count integer not null check (track_count > 0),
  status text not null default 'creating',
  constraint spotify_playlist_exports_status_check
    check (status in ('creating', 'completed', 'failed')),
  constraint spotify_playlist_exports_playlist_pair_check
    check (
      (spotify_playlist_id is null and spotify_playlist_url is null)
      or (spotify_playlist_id is not null and spotify_playlist_url is not null)
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, recap_year, recap_month)
);

alter table public.spotify_playlist_exports
  add column if not exists updated_at timestamptz not null default now();

alter table public.spotify_playlist_exports
  drop constraint if exists spotify_playlist_exports_status_check;

alter table public.spotify_playlist_exports
  drop constraint if exists spotify_playlist_exports_check;

alter table public.spotify_playlist_exports
  drop constraint if exists spotify_playlist_exports_playlist_pair_check;

alter table public.spotify_playlist_exports
  add constraint spotify_playlist_exports_status_check
  check (status in ('creating', 'completed', 'failed'));

alter table public.spotify_playlist_exports
  add constraint spotify_playlist_exports_playlist_pair_check
  check (
    (spotify_playlist_id is null and spotify_playlist_url is null)
    or (spotify_playlist_id is not null and spotify_playlist_url is not null)
  );

alter table public.spotify_playlist_exports enable row level security;
revoke all on table public.spotify_playlist_exports from public, anon, authenticated;
