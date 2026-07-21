alter table public.analysis_results
  add column technical_challenges jsonb not null default '[]'::jsonb;

alter table public.analysis_results
  add constraint analysis_results_technical_challenges_array
  check (jsonb_typeof(technical_challenges) = 'array');
