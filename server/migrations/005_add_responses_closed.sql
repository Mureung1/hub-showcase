-- 참여자 응답 마감 플래그 — "전원 응답" 판단 기준(작업지시 2026-07-29 vote-confirm-and-fallback §1)
-- 호스트가 명시적으로 마감을 누른 시점을 기준으로 삼는다(응답자 수 자동 판정 대신).
-- Supabase 대시보드 SQL Editor에서 실행

alter table letters add column responses_closed boolean not null default false;
