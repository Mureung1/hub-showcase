-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.
-- Never apply this migration to TimeBox project vimywtpiqsixlfiegpdd.
--
-- AI Agents remain valid historical assignees after deactivation, but they
-- cannot receive a newly created task or a reassignment.

create or replace function private.reject_disabled_ai_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.ai_agents agent
    where agent.member_id = new.assignee_id
      and agent.project_id = new.project_id
      and agent.enabled = false
  ) then
    raise exception 'TEAMFLOW_CONFLICT:AI_AGENT_DISABLED';
  end if;

  return new;
end;
$$;

revoke all on function private.reject_disabled_ai_task_assignee()
  from public, anon, authenticated;

drop trigger if exists tasks_reject_disabled_ai_assignee on public.tasks;

create trigger tasks_reject_disabled_ai_assignee
before insert or update of project_id, assignee_id on public.tasks
for each row
execute function private.reject_disabled_ai_task_assignee();
