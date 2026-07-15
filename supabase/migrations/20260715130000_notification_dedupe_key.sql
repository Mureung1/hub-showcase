alter table public.notification_logs
  add column dedupe_key varchar(100);

update public.notification_logs
set dedupe_key = 'legacy:' || id::text
where dedupe_key is null;

alter table public.notification_logs
  alter column dedupe_key set not null;

create unique index notification_logs_waiting_dedupe_key_idx
  on public.notification_logs (waiting_entry_id, dedupe_key);
