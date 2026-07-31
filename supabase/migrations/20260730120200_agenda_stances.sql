-- SPEC-AI-002 T-019.3 — agendas.stances 신설 (§13.2 8번)
--
-- §13.1이 AgendaSchema.stances 를 계약 신설로 명시했으나 §13.2 마이그레이션 목록에
-- 대응 컬럼이 빠져 있었다. T-019.1에서는 Mock 이 메모리에 들고 있어 드러나지 않았고,
-- 실제 저장이 필요해지는 T-019.3에서 표면화됐다.
--
-- 대체 수단이 없다: stances[].text(25자 압축)·quotes(원문 인용)는 Manager LLM 출력이라
-- source_refs(sourceAnswerId·sectionId)만으로 재구성할 수 없다(§10.5·§12.3).
--
-- RLS는 행 단위, GRANT는 테이블 단위라 컬럼 추가에 영향받지 않는다(T-016.1 선례).

alter table agendas
  add column stances jsonb not null default '[]'::jsonb;

-- §11-4: 근거 없는 stance 는 저장 전에 폐기되고, stance 가 0개가 된 쟁점은 통째로 폐기된다.
-- 따라서 판정을 마친 Agenda 는 항상 stance 를 하나 이상 갖는다.
-- draft 만 예외 — 단계 5의 일괄 INSERT 시점이라 단계 6이 아직 채우지 않은 상태다(§12.1).
alter table agendas add constraint agendas_stances_ck check (
  status = 'draft' or jsonb_array_length(stances) >= 1
);
