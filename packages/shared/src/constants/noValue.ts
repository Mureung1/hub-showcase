/**
 * 값 부재 표현 예약어 (data-model 1.6).
 * `null` = 값이 오지 않음/미상, `NO_VALUE` = 의도적으로 없음/해당 없음.
 *
 * 에러코드·Enum·상태값 등 다른 어떤 값과도 겹치지 않는 예약어이며, web·api가
 * 이 상수 하나를 공유한다. 필드별 적용(어느 칸에 `null`·`NO_VALUE`가 오는지)은 각 Spec에서 정한다.
 * SPEC-DB-001: `agendas.selected_source_ref`에 적용 — 직접입력·제외·합의면 `NO_VALUE`(JSON 문자열로 저장).
 */
export const NO_VALUE = "NO_VALUE" as const;
export type NoValue = typeof NO_VALUE;
