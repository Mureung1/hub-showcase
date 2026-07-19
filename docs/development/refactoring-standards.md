# LocalTwin 리팩터링 및 코드 구조 기준

문서 상태: canonical
적용 범위: `product/apps/web/src`, `product/apps/api/src`, `product/scripts`, 관련 test·config
Parent Issue: [GitHub #63](https://github.com/HyunKN/hub/issues/63)

## 1. 목적

LocalTwin 리팩터링의 목적은 코드 줄 수를 줄이는 것이 아니다. 현재 동작을 보존하면서 입력, 처리,
저장, API 응답과 UI 표시의 책임을 분리하고 이후 변경이 한 영역에만 영향을 주게 만드는 것이다.

```text
React UI
-> feature hook / service
-> FastAPI router
-> domain service
-> repository
-> Supabase PostgreSQL
```

## 2. 증거 기반 판단 원칙

다음 중 하나를 실제 코드와 test로 확인했을 때 리팩터링 대상으로 분류한다.

1. 하나의 함수가 서로 다른 변경 이유를 두 개 이상 가진다.
2. UI, network, domain 계산, DB I/O와 response 조립이 한 함수에 섞여 있다.
3. 같은 제품 규칙이나 ID mapping이 production module 두 곳 이상에 반복된다.
4. API 실패, 미수집과 빈 결과를 fixture 또는 임의 숫자로 숨긴다.
5. 내부 상태 조합 때문에 독립적인 unit test가 불가능하다.
6. feature가 다른 feature의 내부 구현을 직접 import한다.

함수 길이는 점검 신호이지 자동 결론이 아니다. Web 함수 200줄, Python 함수 80줄을 넘으면 책임을
검토한다. 하나의 알고리즘 또는 외부 renderer 생명주기로 응집되어 있고 독립 test가 가능하면 근거를
allowlist에 기록하고 유지할 수 있다.

## 3. 데이터와 설정의 위치

| 값 | authoritative source |
| --- | --- |
| 실제 점포·좌표·통계·분석 결과 | Supabase PostgreSQL과 FastAPI |
| 지원 상권·업종·반경 | API domain catalog |
| 사용 가능한 분석 분기 | DB를 조회한 period API |
| 배포별 API·Docs URL과 feature flag | environment settings |
| 수집 기간·dataset version | CLI argument 또는 versioned manifest |
| Demo·Test 입력 | 명시적인 fixture 전용 경로 |
| 점수 공식·수학 상수·보안 제한 | 이름과 근거가 있는 domain/security constant |

Production API 실패 시 Demo 값을 자동으로 사용하지 않는다. 값이 없으면 `null`, `empty`,
`unavailable` 또는 `error`로 표현한다.

## 4. 계층별 책임

### Web

- `App`: route와 page 조립만 담당한다.
- feature hook: 서로 함께 바뀌는 state와 side effect를 관리한다.
- service: HTTP contract와 오류 변환을 담당한다.
- component: 전달받은 state를 표시하고 사용자 event를 위로 전달한다.
- fixture: production runtime module에서 import하지 않는다.

### API

- app factory: middleware, exception handler와 router만 조립한다.
- router: request validation, dependency와 HTTP response를 담당한다.
- domain service: DB와 HTTP를 모르는 순수 계산과 정책을 담당한다.
- repository: SQLAlchemy query와 persistence만 담당한다.
- presenter/response builder: domain 결과를 API schema로 변환한다.

### Data와 Scene

Importer는 `read -> validate -> normalize -> persist -> verify/report` 단계로 나눈다. Scene job은
`upload validation -> job transition -> worker execution -> privacy approval -> asset exposure` 단계를
섞지 않는다.

## 5. 변경 규칙

1. 기능 변경과 구조 변경을 같은 commit에 섞지 않는다.
2. 기존 동작에 test가 없으면 characterization test를 먼저 추가한다.
3. 한 Task는 1~2일 안에 검증 가능한 범위로 나눈다.
4. 새 abstraction은 두 곳 이상의 실제 중복 또는 독립 test 필요성이 있을 때만 만든다.
5. `utils`, `helpers`, 거대한 shared module로 책임을 숨기지 않는다.
6. 사용자 소유 변경, secret, 생성 artifact와 외부 dependency를 수정하지 않는다.
7. API path·schema·URL 호환성을 바꾸려면 별도 기능·migration Task를 만든다.

## 6. 자동 강제 방식

`scripts/check_code_structure.py`와 Web AST 검사는 다음을 확인한다.

- 새로 추가된 과대 함수와 기존 budget 증가
- production runtime의 test/demo fixture import
- 고정 분석 분기와 지원 상권 ID의 신규 중복
- 허용되지 않은 계층 간 import
- 리팩터링 완료 후 삭제해야 할 임시 allowlist

기존 위반은 `.harness/policies/code-structure-budget.json`에 파일·symbol·현재 크기와 이유를 기록한다.
새 위반은 허용하지 않고 기존 budget은 증가할 수 없다. 함수가 기준 아래로 내려가면 allowlist 항목을
삭제한다. 이것을 ratchet 방식이라고 한다.

## 7. Task 완료 기준

- 대상 동작의 before/after test가 있다.
- 관련 unit·integration test가 통과한다.
- FE typecheck·lint·production build와 API Ruff·pytest가 통과한다.
- `scripts/check.ps1`이 통과한다.
- 사용자 흐름을 바꾼 경우 browser/API smoke 결과를 Run Report에 남긴다.
- 관련 architecture, backlog, Task Packet과 Issue 상태가 실제 코드와 일치한다.

## 8. 적용 순서

1. ARCH-004: 기준선과 자동 구조 검사
2. ARCH-003: runtime hardcoding·config·fixture 경계
3. WEB-018: App orchestration과 state 분리
4. WEB-019: 분석 UI component 분리
5. API-004: router·dependency 분리
6. API-005: query·domain 계산·response 조립 분리
7. DATA-013: importer·spatial pipeline 단계 분리
8. SCENE-008: Scene UI·polling·server pipeline 분리
9. TEST-001: 전체 회귀와 공개 release smoke
