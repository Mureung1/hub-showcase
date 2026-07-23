-- docs/design/phase2-design.md §2 (Option A: 정규화 테이블) 기준
-- Supabase 대시보드 SQL Editor에서 실행

create table roles (
  id          uuid primary key default gen_random_uuid(),
  letter_id   uuid not null references letters(id) on delete cascade,
  name        text not null,
  reason      text,
  assignee_id uuid references participants(id) on delete set null,
  source     text default 'manual' check (source in ('ai', 'manual')),   -- 'ai' | 'manual'
  done        boolean not null default false,
  position    int,
  created_at  timestamptz not null default now()
);

create index roles_letter_id_idx on roles(letter_id);
