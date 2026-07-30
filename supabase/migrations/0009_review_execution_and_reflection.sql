-- 0009: 복기 노트 구성 개편 (계획 → 실행 품질 축 확장 + 성찰 질문 신설)
-- 근거: 트레이딩 복기 모범 사례(process-over-outcome)와 거울 프레임 정합.
--   1) reviews.timing('진입 타이밍')을 execution('실행 품질')으로 재정의 —
--      진입/청산이 계획 규칙을 따랐는지(통제 가능한 행동)까지 포함하도록 축을 넓힌다.
--      컬럼명만 변경, 데이터는 유지.
--   2) reflection_prompt 신설 — 사용자가 스스로 돌아보게 하는 '성찰 질문' 한 줄.
--      거울 프레임 유지: 미래 매매 지시가 아니라 질문형만. 선택 입력(null 허용).

alter table reviews rename column timing to execution;
-- 'timing'(진입 타이밍) → 'execution'(실행 품질). 데이터 유지.

alter table reviews add column if not exists reflection_prompt text;
-- 성찰 질문 한 줄. 질문형만(지시 금지). 근거 부족 시 null.

-- 기존 RLS 정책(auth.uid() = user_id, 0001_schema.sql)은 컬럼 rename/추가에 영향받지 않음.
