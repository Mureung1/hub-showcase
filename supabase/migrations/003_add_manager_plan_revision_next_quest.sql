alter table public.manager_plan_revisions
  add column if not exists next_quest_json jsonb;

update public.manager_plan_revisions
set next_quest_json = coalesce(after_plan_json -> 'dailySeeds' -> 0, jsonb_build_object(
  'title', 'Legacy recovery quest',
  'type', 'time',
  'amount', 10,
  'unit', 'min',
  'difficulty', 'easy',
  'deadline', 'today 23:59',
  'rewardExp', 8,
  'linkedMilestoneId', 'legacy'
)) || jsonb_build_object('recoveryReason', 'legacy revision')
where next_quest_json is null;

alter table public.manager_plan_revisions
  alter column next_quest_json set not null;
