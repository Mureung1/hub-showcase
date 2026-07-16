alter table public.waiting_entries
add column version integer not null default 1;

alter table public.waiting_entries
add constraint waiting_entries_version_check check (version > 0);

comment on column public.waiting_entries.version is
  'Optimistic locking version incremented by each state or order mutation.';
