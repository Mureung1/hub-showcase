alter table public.daily_queues
  add column next_ticket_number integer not null default 1,
  add constraint daily_queues_next_ticket_number_check
    check (next_ticket_number > 0);

comment on column public.daily_queues.next_ticket_number is
  'Next family ticket number for this clinic business date; allocated while locking the daily queue row.';
