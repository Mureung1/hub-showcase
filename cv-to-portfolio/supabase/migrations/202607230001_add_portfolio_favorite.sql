alter table public.portfolios
  add column if not exists is_favorite boolean not null default false;

grant update on table public.portfolios to service_role;
