-- SPEC-AI-002 T-019.1 (B-2) — Manager Agenda 컬럼 추가·CHECK 개정
-- 앞 마이그레이션(B-1)에서 만든 enum 값을 여기서 처음 사용한다(트랜잭션 분리 규칙).
-- 값 원본: docs/data-model.md 3.5·4장 / @decision-log/shared agenda.ts·enums.ts.

-- ---------------------------------------------------------------------
-- agendas: Manager 판정·표시용 컬럼 (§7.5·§8.4·결정 9)
-- ---------------------------------------------------------------------
alter table agendas
  add column kind agenda_kind,
  add column disagreement_type agenda_disagreement_type,
  add column revised_type agenda_disagreement_type,
  add column confidence numeric(3, 2),
  add column display_order smallint not null default 0;

-- questions: Manager 실행 메타 한 칸 (관측·재현용). response_meta 와 동일 패턴.
-- 기존 조회 Repository는 Zod object 의 strip 동작으로 새 컬럼을 무시한다(회귀 확인 대상).
alter table questions
  add column manager_meta jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------
-- selected_source_ref CHECK 개정 (§9.2·§9.3 결정 1)
-- 기존 제약은 auto_consensus 에 '"NO_VALUE"' 를 요구했다. 개정 후:
--   · 자동 통과(auto_consensus·auto_single_source)·사용자 채택 → 실제 참조(NO_VALUE 아님)
--   · 직접 입력·제외 → '"NO_VALUE"'
-- 부수 효과: '"NO_VALUE"' 는 사용자 행동에서만 발생하는 값이 된다(Manager 는 만들지 않는다).
-- 신규 값(auto_single_source)을 else 분기에 맡기지 않고 명시적으로 참조 분기에 넣는다.
-- ---------------------------------------------------------------------
alter table agendas drop constraint agendas_selected_source_ref_ck;

alter table agendas add constraint agendas_selected_source_ref_ck check (
  case
    when status in ('draft', 'conflicted', 'recheck_requested', 'reanswered')
      then selected_source_ref is null
    when resolution_reason in (
      'auto_consensus', 'auto_single_source',
      'user_accepted', 'user_accepted_after_recheck'
    )
      then (selected_source_ref is not null and selected_source_ref <> '"NO_VALUE"'::jsonb)
    when resolution_reason in (
      'user_composed', 'user_composed_after_recheck',
      'user_rejected', 'user_rejected_after_recheck'
    )
      then selected_source_ref = '"NO_VALUE"'::jsonb
    else true
  end
);
