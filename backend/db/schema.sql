-- 역기획소(respec) — 2주차 수직슬라이스용 스키마
-- 과제 요구: "Supabase 한 테이블에 저장·조회". → documents 단일 테이블,
-- sections/comments는 정규화 대신 JSONB 컬럼으로 둔다(3주차 코멘트 때 정규화 재검토).
-- 필드는 frontend/src/data/documents.js(= 기획서 §5)와 대응시켜 "데이터 출처 교체"로 연동되게 한다.
-- Supabase 대시보드 SQL Editor에 붙여넣어 실행한다.

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  -- 로그인(1주차 P0)은 이번 슬라이스에 미포함 → author_id는 당분간 null 허용(익명 placeholder).
  author_id     uuid,
  author_name   text,                              -- mock의 author 표시용
  type          text not null default '역기획',     -- 역기획 | 순기획
  template_id   text,                              -- system | content | ux | free
  status        text not null default 'draft'
                  check (status in ('draft', 'published')),
  title         text,
  game_tag      text,
  job_tag       text,
  system_tag    text,
  challenge_id  text,
  feedback_wanted boolean not null default false,
  likes         integer not null default 0,
  bookmarks     integer not null default 0,
  sections      jsonb   not null default '[]'::jsonb,  -- [{ id, heading, content, guide_key? }]
  comments      jsonb   not null default '[]'::jsonb,  -- 3주차용 자리. [{ section_id, author_id, is_ai, content }]
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  -- 발행하려면 game_tag + job_tag가 반드시 있어야 한다(기획서 §3.1). DB 레벨 가드.
  constraint publish_requires_tags check (
    status <> 'published'
    or (game_tag is not null and job_tag is not null)
  )
);

-- 아카이브 목록 정렬/필터에 쓰는 최소 인덱스.
create index if not exists documents_status_published_at_idx
  on public.documents (status, published_at desc);
create index if not exists documents_game_tag_idx
  on public.documents (game_tag);

-- updated_at 자동 갱신 트리거(선택). API에서 직접 set 해도 되지만 안전망으로 둔다.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 로그인/회원 도입(3주차): Supabase Auth 연동
-- Auth 자체는 auth.users가 담당하고, 앱 전용 필드는 profiles에 둔다.
-- ─────────────────────────────────────────────────────────────

-- 사용자 프로필 — auth.users와 1:1.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nickname     text,
  is_beginner  boolean not null default false,   -- 가입 시 "게임 기획이 처음이신가요?" 응답
  onboarded_at timestamptz,                       -- 튜토리얼 완료 시각(선택)
  created_at   timestamptz not null default now()
);

-- 비회원 문서 수정용 비밀번호(해시). 회원 문서는 null, 비회원 문서는 author_id null + 이 값 설정.
alter table public.documents
  add column if not exists edit_password_hash text;

-- 회원 문서 목록(MyPage) 조회용 인덱스.
create index if not exists documents_author_id_idx
  on public.documents (author_id);

-- AI 자동 피드백 일일 호출 제한 카운트용(기획서 §3.4).
create table if not exists public.ai_feedback_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  document_id uuid,
  called_at   timestamptz not null default now()
);

create index if not exists ai_feedback_logs_user_called_idx
  on public.ai_feedback_logs (user_id, called_at desc);

-- AI가 미리 작성해둔 예시 역기획서 표시용. 생성 스크립트만 true 로 넣는다(API 쓰기 경로는 건드리지 않음).
alter table public.documents
  add column if not exists is_example boolean not null default false;

create index if not exists documents_is_example_idx
  on public.documents (is_example);

-- 좋아요/북마크 — 유저당 문서당 1회(중복 방지). documents.likes/bookmarks 는 표시용 캐시 카운트.
create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('like', 'bookmark')),
  created_at  timestamptz not null default now(),
  unique (document_id, user_id, type)
);

create index if not exists reactions_document_type_idx
  on public.reactions (document_id, type);

-- 문서 분류(둘러보기 필터용 고정 어휘). systemTag 는 "스타포스 강화"처럼 구체적인 이름이라
-- 문서 수만큼 값이 늘어난다 → 필터는 category 라는 통제 어휘로 건다.
-- 값 목록은 frontend/src/data/gameSystems.js 의 categories.
-- (장르는 게임의 성질이라 game_tag 로부터 계산한다 — 컬럼을 두지 않는다.)
alter table public.documents
  add column if not exists category text;

create index if not exists documents_category_idx
  on public.documents (category);

-- ─────────────────────────────────────────────────────────────
-- RLS — anon 키는 프론트 번들에 그대로 실려 공개된다.
-- 모든 데이터 접근은 backend(service_role, RLS 우회)를 통해서만 이뤄지므로,
-- 정책을 하나도 두지 않고 RLS만 켜서 anon/authenticated 의 직접 접근을 전부 막는다.
-- (켜지 않으면 anon 키만으로 PostgREST에서 테이블 전체를 읽고 쓸 수 있다.)
-- ─────────────────────────────────────────────────────────────
alter table public.documents        enable row level security;
alter table public.profiles         enable row level security;
alter table public.ai_feedback_logs enable row level security;
alter table public.reactions        enable row level security;
