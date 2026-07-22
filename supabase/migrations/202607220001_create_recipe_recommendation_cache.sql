create table if not exists public.recipe_recommendation_cache (
  id bigint generated always as identity primary key,
  cache_key text not null unique,
  inventory_signature text not null,
  request_options jsonb not null,
  recipes jsonb not null,
  model text not null,
  batch_number smallint not null check (batch_number between 1 and 5),
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_recommendation_cache_signature_format
    check (inventory_signature ~ '^[a-f0-9]{64}$'),
  constraint recipe_recommendation_cache_expiration
    check (expires_at > generated_at)
);

create index if not exists recipe_recommendation_cache_expires_at_idx
  on public.recipe_recommendation_cache (expires_at);

alter table public.recipe_recommendation_cache enable row level security;

comment on table public.recipe_recommendation_cache is
  'Server-only daily cache for Gemini recipe recommendations. Service role access bypasses RLS.';
