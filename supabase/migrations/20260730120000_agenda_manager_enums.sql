-- SPEC-AI-002 T-019.1 (B-1) — Manager Agenda 계약용 Enum 확장·신설
-- 값 원본: docs/data-model.md 4장 / @decision-log/shared enums.ts 와 정확히 일치.
--
-- ⚠️ 파일을 둘로 나눈 이유: ALTER TYPE ... ADD VALUE 로 추가한 enum 값은 같은
-- 트랜잭션 안에서 사용할 수 없다. 값 사용(컬럼·CHECK)은 다음 마이그레이션(B-2)에서 한다.

-- 단일 소스 Agenda 자동 통과 사유 (§3.4·§9.2). 다중 AI 합의(auto_consensus)와 구분한다.
alter type agenda_resolution_reason add value if not exists 'auto_single_source';

-- Agenda 분류 (§8.4·§9). consensus / conflict / single_source.
create type agenda_kind as enum ('consensus', 'conflict', 'single_source');

-- 충돌 5유형 분류 (§8.4). disagreement_type·revised_type 컬럼이 함께 쓴다.
create type agenda_disagreement_type as enum (
  'paraphrasing',
  'detail_expansion',
  'detail_volume',
  'detail_content',
  'main_answer'
);
