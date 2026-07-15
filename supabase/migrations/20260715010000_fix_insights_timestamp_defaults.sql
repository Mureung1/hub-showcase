alter table public.insights
  alter column created_at set default now(),
  alter column updated_at set default now();

create or replace function public.set_insights_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
