alter table public.reflection_drafts
  add column if not exists reflection_analysis jsonb;

comment on column public.reflection_drafts.reflection_analysis is
  'AI alignment result between the user reflection and Repository challenge candidates.';
