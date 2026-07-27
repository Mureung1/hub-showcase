-- ICU Supabase(Postgres) 스키마 — ERDCloud import용
-- erdcloud.com > Import > SQL 로 이 파일을 그대로 불러오면 ERD가 생성됩니다.
--
-- SECTION A: 기존 4개 테이블 (backend/shared/sqliteDatabase.mjs 스키마를 Postgres로 이전)
-- SECTION B: 프로젝트 관점에서 새로 제안하는 테이블 (선택, 아래 주석 참고)

-- ============================================================
-- SECTION A. 기존 테이블 (SQLite -> Postgres 그대로 이전)
-- ============================================================

-- 미션(학습 단위)별 진행 상태. 프론트 Learning Workspace가 조회/갱신.
CREATE TABLE learning_progress (
  mission_id TEXT PRIMARY KEY,
  run_state TEXT NOT NULL DEFAULT 'idle',              -- 'idle' | 'failed' | 'passed'
  run_attempt_count INTEGER NOT NULL DEFAULT 0,
  active_step_offset INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  activity_log JSONB NOT NULL DEFAULT '[]',            -- SQLite에서는 TEXT였던 JSON을 JSONB로
  last_test_result JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 오답노트. Git Lab 실패나 수동 등록에서 생성됨.
CREATE TABLE mistake_notes (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,                                -- 'git-lab' | 'manual' 등
  lesson_id TEXT NOT NULL,
  lesson_title TEXT NOT NULL,
  command TEXT NOT NULL,
  reason TEXT NOT NULL,
  correction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE INDEX idx_mistake_notes_duplicate
  ON mistake_notes (status, source, lesson_id, command, reason);

CREATE UNIQUE INDEX uq_mistake_notes_open_duplicate
  ON mistake_notes (source, lesson_id, command, reason)
  WHERE status = 'open';

-- Git Lab 시뮬레이터에서 실행한 명령 시도 기록.
CREATE TABLE git_lab_attempts (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  command TEXT NOT NULL,
  result TEXT NOT NULL,                                -- 'passed' | 'failed'
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_git_lab_attempts_created_at
  ON git_lab_attempts (created_at DESC);

-- AI가 생성한 커리큘럼 플랜. Today Hub / Workspace가 조회.
CREATE TABLE generated_curriculums (
  id TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  plan JSONB NOT NULL,                                 -- SQLite에서는 TEXT였던 JSON을 JSONB로
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_curriculums_updated_at
  ON generated_curriculums (updated_at DESC);

-- ============================================================
-- SECTION B. 신규 제안 테이블 (선택 — 지금은 프론트 localStorage에만 존재)
-- ============================================================

-- 학습 프로필. 지금은 src/features/profile/model/profileTypes.ts 기준으로
-- 브라우저 localStorage에만 저장되고 서버/DB에는 없음. Supabase로 옮기면서
-- 같이 서버화하면 기기 간 이어보기가 가능해짐 (이번 주 범위 밖일 수 있음 —
-- "누구의" 프로필인지 식별할 방법이 지금 프로젝트엔 없어서 owner_id는 우선
-- nullable로 두고, 실제 로그인/기기 식별 방식이 정해지면 NOT NULL + FK로 강화)
CREATE TABLE learner_profiles (
  id TEXT PRIMARY KEY,
  owner_id TEXT,                                       -- 추후 auth.users(id) 또는 device id로 채움
  display_name TEXT NOT NULL,
  learning_goal TEXT NOT NULL,
  preferred_tracks TEXT[] NOT NULL DEFAULT '{}',
  daily_study_minutes INTEGER NOT NULL,
  level TEXT NOT NULL,                                 -- 'beginner' | 'basic' | 'interview'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- (선택) git_lab_attempts와 그로 인해 생성된 mistake_notes 사이의 관계가
-- 지금은 API 호출 시점에만 맺어지고 DB에는 저장되지 않음. 명시적으로 추적하려면:
-- ALTER TABLE git_lab_attempts ADD COLUMN mistake_note_id TEXT REFERENCES mistake_notes(id);
