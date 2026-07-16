create table public.repositories (
  id uuid primary key default gen_random_uuid(),
  github_repository_id bigint not null unique,
  owner text not null,
  name text not null,
  url text not null,
  description text,
  default_branch text not null,
  visibility text not null,
  is_fork boolean not null default false,
  is_archived boolean not null default false,
  topics text[] not null default array[]::text[],
  license_spdx_id text,
  homepage_url text,
  github_created_at timestamptz not null,
  last_pushed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repositories_github_id_positive
    check (github_repository_id > 0),
  constraint repositories_visibility_valid
    check (visibility in ('public', 'private', 'internal'))
);

create table public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null
    references public.repositories(id) on delete cascade,
  target_github_login text,
  status text not null default 'pending',
  analyzed_ref text,
  head_sha text,
  analyzer_version text not null,
  result_hash text,
  repository_snapshot jsonb not null default '{}'::jsonb,
  tech_stack jsonb not null default '{}'::jsonb,
  project_structure jsonb not null default '{}'::jsonb,
  quality_signals jsonb not null default '{}'::jsonb,
  collaboration_summary jsonb not null default '{}'::jsonb,
  activity_summary jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  analyzed_at timestamptz,
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint analysis_results_status_valid
    check (status in ('pending', 'completed', 'failed')),
  constraint analysis_results_repository_snapshot_object
    check (jsonb_typeof(repository_snapshot) = 'object'),
  constraint analysis_results_tech_stack_object
    check (jsonb_typeof(tech_stack) = 'object'),
  constraint analysis_results_project_structure_object
    check (jsonb_typeof(project_structure) = 'object'),
  constraint analysis_results_quality_signals_object
    check (jsonb_typeof(quality_signals) = 'object'),
  constraint analysis_results_collaboration_summary_object
    check (jsonb_typeof(collaboration_summary) = 'object'),
  constraint analysis_results_activity_summary_object
    check (jsonb_typeof(activity_summary) = 'object'),
  constraint analysis_results_warnings_array
    check (jsonb_typeof(warnings) = 'array'),
  constraint analysis_results_completed_fields_present
    check (
      status <> 'completed'
      or (
        analyzed_ref is not null
        and head_sha is not null
        and result_hash is not null
        and analyzed_at is not null
      )
    )
);

create table public.contributor_metrics (
  id uuid primary key default gen_random_uuid(),
  analysis_result_id uuid not null
    references public.analysis_results(id) on delete cascade,
  github_login text not null,
  is_target boolean not null default false,
  commit_count integer not null default 0,
  commit_activity_percent numeric(5, 2) not null default 0,
  authored_pr_count integer not null default 0,
  merged_pr_count integer not null default 0,
  review_count integer not null default 0,
  issue_count integer not null default 0,
  touched_paths jsonb not null default '[]'::jsonb,
  touched_extensions jsonb not null default '{}'::jsonb,
  first_activity_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  constraint contributor_metrics_analysis_login_unique
    unique (analysis_result_id, github_login),
  constraint contributor_metrics_counts_nonnegative
    check (
      commit_count >= 0
      and authored_pr_count >= 0
      and merged_pr_count >= 0
      and review_count >= 0
      and issue_count >= 0
    ),
  constraint contributor_metrics_percent_valid
    check (commit_activity_percent between 0 and 100),
  constraint contributor_metrics_touched_paths_array
    check (jsonb_typeof(touched_paths) = 'array'),
  constraint contributor_metrics_touched_extensions_object
    check (jsonb_typeof(touched_extensions) = 'object')
);

create table public.analysis_evidence (
  id uuid primary key default gen_random_uuid(),
  analysis_result_id uuid not null
    references public.analysis_results(id) on delete cascade,
  contributor_metric_id uuid
    references public.contributor_metrics(id) on delete set null,
  evidence_type text not null,
  reference_id text,
  title text not null,
  url text,
  file_path text,
  occurred_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analysis_evidence_type_valid
    check (
      evidence_type in (
        'commit',
        'pull_request',
        'issue',
        'file',
        'config',
        'release'
      )
    ),
  constraint analysis_evidence_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create unique index analysis_results_completed_hash_unique
  on public.analysis_results (
    repository_id,
    coalesce(target_github_login, ''),
    analyzer_version,
    result_hash
  )
  where status = 'completed' and result_hash is not null;

create index analysis_results_repository_latest_idx
  on public.analysis_results (repository_id, analyzed_at desc)
  where status = 'completed';

create index contributor_metrics_target_idx
  on public.contributor_metrics (analysis_result_id, is_target);

create index analysis_evidence_result_type_idx
  on public.analysis_evidence (analysis_result_id, evidence_type);

create unique index analysis_evidence_reference_unique
  on public.analysis_evidence (
    analysis_result_id,
    evidence_type,
    reference_id
  )
  where reference_id is not null;

create function public.set_ptop_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger repositories_set_updated_at
before update on public.repositories
for each row
execute function public.set_ptop_updated_at();

revoke all on function public.set_ptop_updated_at() from public;

alter table public.repositories enable row level security;
alter table public.analysis_results enable row level security;
alter table public.contributor_metrics enable row level security;
alter table public.analysis_evidence enable row level security;

comment on table public.repositories is
  'GitHub Repository identity and current metadata.';

comment on table public.analysis_results is
  'Versioned PtoP Repository analysis snapshots.';

comment on table public.contributor_metrics is
  'Contributor activity metrics for one analysis snapshot.';

comment on table public.analysis_evidence is
  'GitHub evidence supporting project and contributor analysis results.';

comment on column public.contributor_metrics.commit_activity_percent is
  'Commit-count activity share. It is not an absolute contribution score.';
