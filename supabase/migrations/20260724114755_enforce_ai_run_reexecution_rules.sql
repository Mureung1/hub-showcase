-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.
-- Never apply this migration to TimeBox project vimywtpiqsixlfiegpdd.
--
-- An AI result that was applied to a shared note is immutable history: the
-- same agent/task pair must not start another run. Rejected and failed runs
-- deliberately remain retryable.

create index if not exists ai_runs_applied_task_agent_idx
  on public.ai_runs (ai_member_id, task_id)
  where status = 'applied' and task_id is not null;

create or replace function private.reject_invalid_ai_run_reexecution()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.task_id is null
    or new.status not in ('running', 'pending_review', 'failed') then
    return new;
  end if;

  if exists (
    select 1
    from public.ai_runs run
    where run.ai_member_id = new.ai_member_id
      and run.task_id = new.task_id
      and run.status = 'applied'
      and (tg_op = 'INSERT' or run.id <> new.id)
  ) then
    raise exception 'TEAMFLOW_CONFLICT:AI_RUN_APPLIED';
  end if;

  if exists (
    select 1
    from public.ai_runs run
    where run.ai_member_id = new.ai_member_id
      and run.task_id = new.task_id
      and run.status in ('running', 'pending_review')
      and (tg_op = 'INSERT' or run.id <> new.id)
  ) then
    raise exception 'TEAMFLOW_CONFLICT:AI_RUN_PENDING';
  end if;

  return new;
end;
$$;

revoke all on function private.reject_invalid_ai_run_reexecution()
  from public, anon, authenticated;

drop trigger if exists ai_runs_reject_invalid_reexecution on public.ai_runs;

create trigger ai_runs_reject_invalid_reexecution
before insert or update of ai_member_id, task_id, status on public.ai_runs
for each row
execute function private.reject_invalid_ai_run_reexecution();
