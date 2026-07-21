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

선행 승인이 없으면 생략한다. 세계관 정사·시스템 규칙 변경에 의존하는
일반 시나리오나 인게임 스크립트는 선행 항목 적용 후 원본 재확인과 재승인을
거친다.

| 선행 승인 항목 | 변경 역할 | 영향받는 대상·ID | 현재 상태 | 해소 조건 |
|---|---|---|---|---|
|  | world_setting \| system |  |  | `applied` 후 본 항목 재확인 |

## Proposal

변경안 요약.

## Review Notes

- 위험도:
- 충돌 가능성:
- 누락 정보:
- 작성 당시 원본 요약: 신규 문서라면 `없음`
- 원자적 적용: restructure이면 `예`. 일부 대상만 적용하지 않는다.

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

승인 후 반영될 내용.

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
