alter table public.waiting_entries
  add column arrived_patient_count integer not null default 0,
  add column called_patient_count integer not null default 0;

update public.waiting_entries
set arrived_patient_count = patient_count
where status in ('onsite_waiting', 'called');

update public.waiting_entries
set called_patient_count = patient_count
where status = 'called';

alter table public.waiting_entries
  add constraint waiting_entries_arrived_patient_count_check
    check (arrived_patient_count between 0 and patient_count),
  add constraint waiting_entries_called_patient_count_check
    check (called_patient_count between 0 and patient_count);
