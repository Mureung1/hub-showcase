-- 성향 조사(personality-role-suggest) 기능 — 참여자 응답에 MBTI 저장
-- Supabase 대시보드 SQL Editor에서 실행

alter table responses add column personality_type text;
