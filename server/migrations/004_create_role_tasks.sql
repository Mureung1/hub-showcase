-- 역할별 업무 체크리스트(ProgressChecklist) — docs/plan.md "에이전트가 역할별 구체적 업무 추천" 반영
-- Supabase 대시보드 SQL Editor에서 실행

create table role_tasks (
  id         uuid primary key default gen_random_uuid(),
  role_id    uuid not null references roles(id) on delete cascade,
  label      text not null,
  done       boolean not null default false,
  position   int,
  created_at timestamptz not null default now()
);

create index role_tasks_role_id_idx on role_tasks(role_id);
