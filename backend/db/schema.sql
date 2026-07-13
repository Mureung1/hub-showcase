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
