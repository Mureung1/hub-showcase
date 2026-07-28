-- decisions.memo: 판단 근거 한 줄 메모(선택). 최초 저장은 POST /api/decisions,
-- 수정은 PATCH /api/decisions/:id로 memo 필드만 갱신한다(중복 row 생성 방지).
alter table public.decisions
  add column if not exists memo text;
