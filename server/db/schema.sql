-- ============================================================
-- 팀플, 이지! — 데이터베이스 스키마 (13개 테이블)
-- 사용법: 이 파일 전체를 Supabase 대시보드 → SQL Editor에 붙여넣고 Run.
--         (create table if not exists 이므로 재실행해도 안전)
-- 원칙: 프로젝트 삭제 시 관련 데이터 전부 연쇄 삭제(hard delete),
--       설문(surveys)은 서버만 읽는 비공개 데이터.
-- ============================================================

create extension if not exists pgcrypto;

-- 1. 계정
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,          -- 로그인 아이디 (중복확인 대상)
  password_hash text not null,                 -- bcrypt 해시 (원문 비밀번호는 절대 저장하지 않음)
  name          text not null,
  email         text,                          -- 선택 입력
  created_at    timestamptz not null default now()
);

-- 2. 프로젝트 (심장부 — 상태 머신 + 초대 토큰)
create table if not exists projects (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid not null references users(id) on delete cascade,
  title              text not null,
  topic              text not null check (char_length(topic) <= 200),
  type_hint          text,                     -- 과제 유형 힌트 카드 (선택)
  attachment_path    text,                     -- 위저드 첨부(Storage attachments 버킷 경로)
  deadline           date not null,
  headcount          int  not null check (headcount between 2 and 8),  -- 생성 시 3~8은 서버가 검증, 설문 미달 하향 시 2까지 허용
  status             text not null default 'planning'
                     check (status in ('planning','recruiting','assigned','active','completed')),
  invite_token       text unique,              -- "이대로 확정" 시 발급되는 초대 링크 토큰
  regen_count        int  not null default 0 check (regen_count between 0 and 3),
  revealed_at        timestamptz,              -- 배정 결과 공개 시각 (10분 역할 교환의 기준)
  swap_used          boolean not null default false,  -- 역할 교환 1회 사용 여부
  assignment_summary text,                     -- 역할 배정 에이전트의 팀 단위 설명
  created_at         timestamptz not null default now()
);

-- 3. 프로젝트 참여자 (users ↔ projects 연결)
create table if not exists project_members (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  nickname   text not null,
  is_main    boolean not null default false,   -- [메인] 지정 — 개인별 설정
  sort_order int  not null default 0,          -- 관리 탭 정렬 순서 — 개인별 설정
  joined_at  timestamptz not null default now(),
  unique (project_id, user_id),
  unique (project_id, nickname)                -- 닉네임은 프로젝트 안에서만 중복 불가
);

-- 4. 기피 날짜 (하루당 1행)
create table if not exists avoid_dates (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  date       date not null,
  unique (project_id, date)
);

-- 5. 역할 정의 (플래닝 에이전트가 생성)
create table if not exists roles (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  name           text not null,
  description    text,
  min_count      int  not null default 1,
  max_count      int  not null default 1,
  is_leader_role boolean not null default false,  -- '조장' 역할 표시 (프로젝트당 1개 강제는 서버 검증)
  sort_order     int  not null default 0,
  check (min_count >= 0 and max_count >= min_count)
);

-- 6. 마일스톤
create table if not exists milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  description text,
  due_date    date,
  sort_order  int not null default 0
);

-- 7. 태스크 (계획 시점엔 역할에, 배정 후엔 사람에 연결)
create table if not exists tasks (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects(id) on delete cascade,
  milestone_id       uuid references milestones(id) on delete cascade,
  role_id            uuid references roles(id) on delete set null,           -- 역할이 사라져도 태스크는 유지
  assignee_member_id uuid references project_members(id) on delete set null, -- 담당자가 나가도 태스크는 유지(미배정 상태로)
  title              text not null,
  description        text,
  status             text not null default 'todo' check (status in ('todo','doing','done')),
  due_date           date,
  sort_order         int not null default 0
);

-- 8. 성향 설문 (비공개 — 서버만 읽음, 팀원에게 절대 노출 금지)
create table if not exists surveys (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  member_id    uuid not null references project_members(id) on delete cascade,
  answers      jsonb not null,                 -- 선호 순위·기피 역할·경험·리더 의향
  submitted_at timestamptz not null default now(),
  unique (project_id, member_id)               -- 1인 1응답 → 제출 현황은 행 개수로 계산
);

-- 9. 역할 배정 결과
create table if not exists assignments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  member_id  uuid not null references project_members(id) on delete cascade,
  role_id    uuid not null references roles(id) on delete cascade,
  unique (project_id, member_id)               -- 한 사람은 하나의 역할
);

-- 10. 업로드 (파일 또는 링크 + 100자 코멘트)
create table if not exists uploads (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id    uuid not null references tasks(id) on delete cascade,
  member_id  uuid not null references project_members(id) on delete cascade,
  kind       text not null check (kind in ('file','link')),
  file_path  text,                             -- kind='file': Storage uploads 버킷 경로
  file_name  text,                             -- 원본 파일명 (다운로드 시 표시)
  link_url   text,                             -- kind='link': URL
  comment    text check (comment is null or char_length(comment) <= 100),
  created_at timestamptz not null default now(),
  check (                                      -- 종류에 맞는 값이 반드시 있어야 함
    (kind = 'file' and file_path is not null) or
    (kind = 'link' and link_url  is not null)
  )
);

-- 11. 활동 로그 (최근 활동 피드 + 참여 잔디의 원천 데이터)
create table if not exists activity_log (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  member_id  uuid references project_members(id) on delete set null,  -- 탈퇴해도 팀 기록은 보존
  type       text not null,                    -- join / upload / task_status / reveal / swap / survey_close ...
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 12. 인앱 알림 (수신자 개인별, 읽음 여부 관리)
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- 13. 진행률 스냅샷 ("전주 대비 +12%" 계산용, 프로젝트당 날짜별 1행)
create table if not exists progress_snapshots (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  snapshot_date date not null,
  progress      numeric(5,2) not null,         -- 0.00 ~ 100.00 (%)
  payload       jsonb not null default '{}'::jsonb,  -- 마일스톤별 세부 진행률 등
  created_at    timestamptz not null default now(),
  unique (project_id, snapshot_date)
);

-- ============================================================
-- 인덱스 — 자주 쓰는 조회 경로 최적화
-- (unique 제약은 자동으로 인덱스가 생기므로 여기선 나머지만)
-- ============================================================

create index if not exists idx_projects_creator        on projects(creator_id);
create index if not exists idx_project_members_user    on project_members(user_id);          -- "내 프로젝트 목록"
create index if not exists idx_tasks_project_status    on tasks(project_id, status);         -- 진행률 계산
create index if not exists idx_tasks_assignee          on tasks(assignee_member_id);         -- "내 태스크"
create index if not exists idx_uploads_task            on uploads(task_id);
create index if not exists idx_activity_project_date   on activity_log(project_id, created_at desc);  -- 최근 활동·잔디
create index if not exists idx_notifications_user_read on notifications(user_id, is_read);   -- 안 읽은 알림 배지

-- ============================================================
-- RLS (Row Level Security) — 전 테이블 활성화, 정책은 만들지 않음
-- 정책 없이 켜면 "기본 전부 거부"가 되어 Publishable(브라우저) 키로는
-- 아무 테이블도 읽고 쓸 수 없다. 우리 Express가 쓰는 Secret key(서비스 롤)는
-- RLS를 우회하므로 서버 동작에는 영향이 없다. (모든 접근은 Express 경유 원칙)
-- ============================================================

alter table users              enable row level security;
alter table projects           enable row level security;
alter table project_members    enable row level security;
alter table avoid_dates        enable row level security;
alter table roles              enable row level security;
alter table milestones         enable row level security;
alter table tasks              enable row level security;
alter table surveys            enable row level security;
alter table assignments        enable row level security;
alter table uploads            enable row level security;
alter table activity_log       enable row level security;
alter table notifications      enable row level security;
alter table progress_snapshots enable row level security;
