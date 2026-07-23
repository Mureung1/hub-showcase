alter table public.projects
  add column icon_key text not null default 'layers';

alter table public.projects
  add constraint projects_icon_key_check
  check (icon_key in ('layers', 'rocket', 'code', 'palette', 'megaphone', 'book'));

grant update (icon_key) on public.projects to authenticated;
