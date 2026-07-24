-- Cover the composite foreign keys reported by the Supabase performance advisor.
create index if not exists ai_runs_project_agent_idx
  on public.ai_runs (project_id, ai_member_id);

create index if not exists ai_runs_project_task_idx
  on public.ai_runs (project_id, task_id)
  where task_id is not null;

create index if not exists ai_runs_project_note_idx
  on public.ai_runs (project_id, applied_note_id)
  where applied_note_id is not null;
