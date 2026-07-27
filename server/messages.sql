-- Supabase SQL Editor에서 실행할 messages 테이블 생성 스크립트.
-- 이번 주 핵심 흐름(실제 채팅)의 최소 버전 — episode 분리/잠김 로직은
-- 아직 없고, 메시지를 시간순으로 저장·조회하는 것까지만 다룬다.
create table if not exists messages (
  id bigint generated always as identity primary key,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  created_at timestamptz not null default now()
);
