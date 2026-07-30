# Approval Item: 제목

## Metadata

- ID:
- 프로젝트 ID:
- 상태: pending
- 생성일:
- 요청자:
- 대상 문서 경로: 단일 경로 | 아래 대상 작업 목록
- 기준 Git 커밋:
- 비교 대상: 전체 문서 | 섹션 | 신규 문서 제목/주제 | 대상 작업 목록 전체
- 변경 타입: create | update | delete | restructure
- 관련 workflow:

### Target Operations

`restructure`가 아니면 생략한다.

| 작업 | 대상 경로 | 비교 대상 | 작성 당시 SHA-256 | 적용 후 역할 |
|---|---|---|---|---|
| create \| update \| delete |  |  | 신규 문서는 `없음` |  |

### Asset Operations

검토용 에셋이 없으면 생략한다.

| 검토 경로 | 승인 후 canonical 경로 | 작성 당시 SHA-256 | 적용 결과 |
|---|---|---|---|
| `approvals/assets/` | `design/assets/` |  | 적용 전에는 비워 둠 |

### Dependency Operations

선행 승인이 없으면 생략한다. 다른 canonical owner의 기획 창작, 세계관 정사
또는 시스템 규칙 변경에 의존하는 Draft는 선행 항목 적용 후 원본 재확인과
재승인을 거친다.

| 선행 승인 항목 | 변경 역할 | 영향받는 대상·ID | 현재 상태 | 해소 조건 |
|---|---|---|---|---|
|  | game_overview \| world_setting \| scenario \| system \| content \| ui \| technical |  |  | `applied` 후 본 항목 재확인 |

## Proposal

변경안 요약.

## Review Notes

- 위험도:
- 충돌 가능성:
- 누락 정보:
- 작성 당시 원본 요약: 신규 문서라면 `없음`
- 원자적 적용: restructure이면 `예`. 일부 대상만 적용하지 않는다.

## Subagent Review

서브에이전트를 사용하지 않은 변경이면 생략한다. 작성·창작 에이전트의 자체
검수와 독립 검수를 구분한다. `blocking` 또는 `required_revision`이 남은
시나리오 산출물은 `pending`으로 저장하지 않는다.

- 작성·창작 에이전트: `scenario_designer | scenario_writer |
  design_creative_planner`
- 작업 Phase·범위:
- Specialist Task Packet 검증: `complete | blocked_missing_handoff`
- 프로젝트 창작 에이전트 규칙:
  `해당 없음 | <PCA-ID> · <version> · <SHA-256>`
- 프로젝트 창작 규칙 기준:
  `해당 없음 | active_current | archived_snapshot`
- 프로젝트 창작 규칙 경로:
  `해당 없음 | <active 또는 archive snapshot 경로>`
- 프로젝트 창작 규칙 검증:
  `complete | blocked_missing_creative_rule | blocked_creative_rule_mismatch |
  blocked_creative_rule_integrity`
- 현재 active 규칙 재검수:
  `요청 없음 | <PCA-ID> · <version> · <SHA-256> · <판정>`
- 전달한 사용자 사실·선택·금지사항:
- 전달한 권한:
- 명시적으로 부여하지 않은 권한:
- 독립 검수 에이전트:
  `scenario_reviewer | design_creative_reviewer | 해당 없음`
- 검수 판정: `pass | revision_required | blocked | main_review_passed`
- 검수한 원본:
- 최초 필수 결과와 조치:
- 해소 확인:
- 남은 선택적 권고:
- 메인 Codex 승인 경계 확인:

## Creative Completion Review

신규·수정·재구성 Draft에 누락이 없으면 생략한다. GAP 유형은
`creative_fillable | user_fact | dependency`를 사용한다. 창작 허가 전에는
`creative_fillable`도 Draft에서 `TBD`로 유지한다.

| GAP ID | 대상 문서·필드 | 유형 | 위험도 | 현재 처리 | 필요한 조치 |
|---|---|---|---|---|---|
| GAP-<document_slug>-001 |  |  | low \| medium \| high | `TBD` | 창작 허가 \| 사용자 답변 \| 선행 항목 |

### Creative Design Brief

`design_creative_planner`를 사용하지 않았으면 생략한다.

- 대상 역할과 문서 책임:
- 프로젝트 약속·설계 목표:
- 확정 제약과 근거:
- 사용자 허가 GAP:
- 위험·검증 관점:
- 영향받는 후속 canonical owner:

## Creative Proposal Log

사용자가 하나 이상의 `creative_fillable` GAP에 창작을 명시적으로 허가한
경우에만 작성한다. 저·중위험은 대안 2개, 고위험은 대안 3개를 유지한다.
상태는 `proposed | incorporated | declined` 중 하나를 사용한다.

| CP ID | 원본 GAP | 위험도 | 상태 | 추천안 | 선택 결과 |
|---|---|---|---|---|---|
| CP-<document_slug>-001 | GAP-<document_slug>-001 |  | proposed |  | 선택 전 |

### CP-<document_slug>-001

- 대상 문서·필드:
- 원본 공백:
- 대안 A:
- 대안 B:
- 대안 C: 고위험이 아니면 생략
- 추천안:
- 추천 이유:
- 프로젝트 근거:
- 플레이 영향:
- 제작 영향:
- 후속 문서 영향:
- 수치 상태: 해당 없으면 `해당 없음`, 수치 제안이면 `provisional`
- 검증 지표·재조정 조건:
- 선택안:
- 선택자·선택일:

## Scenario Improvement Review

대상에 `scenario` 작성·변경이 없으면 생략한다. 이 영역은 검토 권고이며
`Draft` 또는 승인 대상에 자동 포함되지 않는다. 개선점이 없으면
`추가 개선 권고 없음`으로 기록한다. 상태는 `proposed | incorporated |
declined` 중 하나를 사용하며, `incorporated` 내용만 갱신된 Draft에 실제로
포함할 수 있다.

| 상태 | 대상 범위 | 원안 요약 | 권고 구조 | 개선 이유·기대 경험 | 연속성·제작·후속 문서 영향 | 세계관·시스템 의존성 |
|---|---|---|---|---|---|---|
| proposed |  |  |  |  |  | 없음 \| 경로·역할 |

## Draft

승인 후 반영될 내용. `Creative Proposal Log`에서 `incorporated`된 내용만
`[^CP-<document_slug>-<number>]` 각주와 함께 포함한다. `proposed` 또는
`declined` 내용은 포함하지 않는다.

## Decision History

결정이 바뀔 때마다 아래 항목을 덮어쓰지 않고 추가한다.

### Decision Entry

- 결정:
- 결정자:
- 결정일:
- 이유:
- 결정 당시 Draft 요약:

## Reconfirmation

- 진입 사유:
- 감지일:
- 현재 원본 요약:
- 비교 결과:
- 후속 상태:
- 재확인 결정자:
- 재확인 결정일:
- 재확인 이유:

## Links

- 관련 결정 로그:
- 관련 버전 기록:
- 근거 파일:
- 상위/대체 승인 항목:
- 선행/의존 승인 항목:
