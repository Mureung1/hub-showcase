create table public.insight_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_kind text not null check (
    input_kind in ('pasted-text', 'file', 'connected-account')
  ),
  adapter_key text not null check (
    adapter_key in (
      'pasted-text',
      'bookmark-html',
      'generic-csv',
      'generic-json',
      'generic-html',
      'generic-markdown',
      'generic-text',
      'zip',
      'notion'
    )
  ),
  status text not null check (
    status in ('analyzing', 'ready', 'committing', 'completed', 'failed', 'undone')
  ),
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  total_count integer not null default 0 check (total_count >= 0),
  new_count integer not null default 0 check (new_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  input_duplicate_count integer not null default 0 check (input_duplicate_count >= 0),
  excluded_count integer not null default 0 check (excluded_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  preserved_count integer not null default 0 check (preserved_count >= 0),
  already_deleted_count integer not null default 0 check (already_deleted_count >= 0),
  provider_cursor jsonb,
  failure_code text,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint insight_import_jobs_id_user_key unique (id, user_id),
  constraint insight_import_jobs_user_idempotency_key unique (user_id, idempotency_key)
);

alter table public.insights
add constraint insights_id_user_id_key unique (id, user_id);

create table public.insight_import_items (
  job_id uuid not null,
  user_id uuid not null,
  candidate_id text not null check (btrim(candidate_id) <> ''),
  captured_at_candidate timestamptz,
  collection_path text[] not null default '{}',
  explicit_memo_candidate text,
  original_url text not null,
  normalized_url text,
  domain text,
  source_location text not null,
  title_candidate text,
  warnings jsonb not null default '[]'::jsonb,
  classification text not null check (
    classification in ('new', 'existing_duplicate', 'input_duplicate', 'excluded')
  ),
  exclusion_code text check (
    exclusion_code is null
    or exclusion_code in (
      'invalid-url',
      'unsupported-protocol',
      'private-address',
      'limit-exceeded'
    )
  ),
  created_insight_id uuid,
  imported_updated_at timestamptz,
  selected_category_id uuid,
  ordinal integer not null check (ordinal >= 1),
  constraint insight_import_items_original_url_length_check check (
    char_length(original_url) <= 4096
  ),
  constraint insight_import_items_normalized_url_length_check check (
    normalized_url is null or char_length(normalized_url) <= 4096
  ),
  constraint insight_import_items_title_length_check check (
    title_candidate is null or char_length(title_candidate) <= 500
  ),
  constraint insight_import_items_memo_length_check check (
    explicit_memo_candidate is null or char_length(explicit_memo_candidate) <= 200
  ),
  constraint insight_import_items_source_location_length_check check (
    char_length(source_location) <= 500
  ),
  constraint insight_import_items_collection_path_depth_check check (
    cardinality(collection_path) <= 20
  ),
  constraint insight_import_items_warnings_array_check check (
    jsonb_typeof(warnings) = 'array'
  ),
  constraint insight_import_items_classification_exclusion_check check (
    (classification = 'excluded' and exclusion_code is not null)
    or (classification <> 'excluded' and exclusion_code is null)
  ),
  constraint insight_import_items_job_candidate_key unique (job_id, candidate_id),
  constraint insight_import_items_job_ordinal_key unique (job_id, ordinal),
  constraint insight_import_items_job_user_id_fkey
    foreign key (job_id, user_id)
    references public.insight_import_jobs (id, user_id)
    on delete cascade,
  constraint insight_import_items_created_insight_user_id_fkey
    foreign key (created_insight_id, user_id)
    references public.insights (id, user_id)
    on delete set null (created_insight_id),
  constraint insight_import_items_category_user_id_fkey
    foreign key (selected_category_id, user_id)
    references public.categories (id, user_id)
);

create index insight_import_jobs_user_created_at_idx
on public.insight_import_jobs (user_id, created_at desc);

create index insight_import_items_job_classification_ordinal_idx
on public.insight_import_items (job_id, classification, ordinal);

create function public.set_insight_import_jobs_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_insight_import_jobs_updated_at
before update on public.insight_import_jobs
for each row
execute function public.set_insight_import_jobs_updated_at();

alter table public.insight_import_jobs enable row level security;
alter table public.insight_import_items enable row level security;

revoke all on table public.insight_import_jobs from anon;
revoke all on table public.insight_import_jobs from authenticated;
grant select on table public.insight_import_jobs to authenticated;

revoke all on table public.insight_import_items from anon;
revoke all on table public.insight_import_items from authenticated;
grant select on table public.insight_import_items to authenticated;

create policy "사용자는 자신의 가져오기 작업을 조회할 수 있다"
on public.insight_import_jobs
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "사용자는 자신의 가져오기 항목을 조회할 수 있다"
on public.insight_import_items
for select
to authenticated
using ((select auth.uid()) = user_id);
