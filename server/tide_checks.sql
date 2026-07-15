-- Supabase SQL Editor에서 실행할 tide_checks 테이블 생성 스크립트
create table if not exists tide_checks (
  id bigint generated always as identity primary key,
  valence int not null check (valence between 0 and 100),
  arousal int not null check (arousal between 0 and 100),
  created_at timestamptz not null default now()
);
