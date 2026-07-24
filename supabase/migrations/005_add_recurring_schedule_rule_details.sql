alter table public.recurring_schedule_rules
  add column if not exists position text,
  add column if not exists memo text;
