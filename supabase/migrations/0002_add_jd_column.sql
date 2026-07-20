-- 0002_add_jd_column.sql
-- 공고 내용(JD) 컬럼 추가. 나중에 AI 갭 분석의 입력으로 쓸 텍스트.
-- 선택 값이라 nullable(not null 안 붙임).
-- 적용: 2026-07-20 (Supabase SQL Editor에서 수동 실행)

alter table interests add column jd text;
