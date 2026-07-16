-- Briefy 초기 스키마: 7개 고정 엔티티
-- schedules, tasks, routines, routine_logs, meals, memos, reminders
-- 모든 테이블은 raw_input(원문 보존), created_at을 갖는다 (CLAUDE.md 원칙).
-- 이 파일이 테이블 생성의 유일한 경로다 — 대시보드에서 수동 생성 금지.

create extension if not exists pgcrypto;

-- ===== 핵심 엔티티 =====

create table schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  start_time time not null,
  end_time time,
  raw_input text not null,
  created_at timestamptz not null default now()
);

create index idx_schedules_date on schedules (date);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  deadline date not null,
  completed boolean not null default false,
  raw_input text not null,
  created_at timestamptz not null default now()
);

create index idx_tasks_deadline on tasks (deadline);

create table routines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  start_time time,
  end_time time,
  -- 자유 문자열: "daily" / "2split" / "weekly:mon,wed,fri" 등. 값 집합이 아직 확정되지 않아 CHECK 제약 없음.
  repeat_rule text not null,
  raw_input text not null,
  created_at timestamptz not null default now()
);

create table meals (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  breakfast text,
  lunch text,
  dinner text,
  raw_input text not null,
  created_at timestamptz not null default now()
);

create index idx_meals_date on meals (date);

create table memos (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  raw_input text not null,
  created_at timestamptz not null default now()
);

-- ===== 보조 엔티티 =====

create table routine_logs (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines (id) on delete cascade,
  date date not null,
  completed boolean not null default false,
  raw_input text not null,
  created_at timestamptz not null default now(),
  -- 하루 중복 완료 로그 방지 — briefingService의 "오늘 상체 완료 → 다음엔 하체" 계산을 단순하게 유지.
  unique (routine_id, date)
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('schedule', 'task')),
  -- target_id는 target_type에 따라 schedules 또는 tasks를 가리키는 다형성 참조라
  -- 단일 FK 제약을 걸 수 없다. 참조 무결성은 애플리케이션 레이어(itemsService)에서 보장한다.
  target_id uuid not null,
  remind_at timestamptz not null,
  raw_input text not null,
  created_at timestamptz not null default now()
);

create index idx_reminders_remind_at on reminders (remind_at);
create index idx_reminders_target on reminders (target_type, target_id);

-- ===== 방어적 조치 =====
-- 서버는 SERVICE_ROLE_KEY로만 접근하므로 RLS는 우회되어 현재 동작에 영향 없음.
-- anon 키가 실수로 노출되는 상황에 대비한 방어적 조치로 RLS만 켜고 정책은 만들지 않는다.

alter table schedules enable row level security;
alter table tasks enable row level security;
alter table routines enable row level security;
alter table routine_logs enable row level security;
alter table meals enable row level security;
alter table memos enable row level security;
alter table reminders enable row level security;
