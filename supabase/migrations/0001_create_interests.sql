-- 0001_create_interests.sql
-- 관심 공고(interests) 테이블 생성. 프로젝트 최초 스키마.
-- 적용: 2026-07-20 (Supabase SQL Editor에서 수동 실행)

create table interests (
  id         bigint generated always as identity primary key,
  company    text not null,
  role       text not null,
  created_at timestamptz default now()
);
