# LocalTwin Dev Harness

이 문서는 LocalTwin 제품 기능이 아니라 LocalTwin을 개발하는 과정에서 사용하는 개발 운영 하네스를 정의한다.

## 1. 목적

LocalTwin Dev Harness는 개발 작업을 다음 순서로 고정한다.

```text
작업 정의
-> 관련 문서 로드
-> 구현
-> 검증
-> 문서 갱신
-> self-check
-> 평가
-> 커밋
```

핵심 목표:

```text
작업 범위를 한 기능/한 버그/한 문서 단위로 유지한다.
구현 전에 spec과 acceptance criteria를 확인한다.
작업 후 검증과 문서 갱신을 남긴다.
반복 실패를 다음 guardrail로 바꾼다.
```

## 2. Harness 구성

| 구성 | 위치 | 역할 |
| --- | --- | --- |
| Task packet | `.harness/tasks/` | 작업 시작 전 범위와 검증 기준 정의 |
| Run report | `.harness/runs/` | 작업 완료 후 self-check와 검증 기록 |
| Templates | `.harness/templates/` | task/run 문서 템플릿 |
| Policy | `.harness/policies/` | harness 운영 규칙 |
| Check scripts | `scripts/` | 자동 검증 진입점 |
| Evaluation docs | `docs/evaluation/` | agent/human 평가 기준과 실패 로그 |

제품 백로그와 Task Packet은 역할이 다르다.

```text
docs/development/tasks.md
  무엇을 어떤 순서로 할지 관리하는 Epic/Task 백로그

.harness/tasks/<task-id>.md
  선택한 세부 Task 하나를 실제로 실행하기 위한 범위와 검증 계약
```

백로그에서 `Ready` Task를 고른 뒤 같은 ID로 Task Packet을 만들고, 완료 뒤 Run Report와 백로그 상태를 함께 갱신한다.

## 3. 작업 시작 규칙

새 기능, 버그 수정, 데이터 파이프라인, 문서 구조 변경을 시작하기 전에는 task packet을 만든다.

```text
.harness/tasks/<task-id>.md
```

task packet에는 최소한 다음이 있어야 한다.

```text
Goal
Scope
Related Documents
Acceptance Criteria
Verification Plan
Commit Plan
```

가능하면 Summary에 `Backlog ID`와 `Parent Epic`을 적어 [4주 개발 백로그](./tasks.md)까지 추적할 수 있게 한다.

## 4. 작업 중 규칙

작업 중에는 task packet의 scope를 기준으로 판단한다.

허용:

```text
관련 spec 수정
관련 test/smoke check 추가
관련 checklist 갱신
작업 범위 내 코드 구현
```

주의:

```text
관련 없는 UI 리팩터링
새 기능 끼워 넣기
검증 기준 완화
데이터 출처 변경
```

## 5. 작업 완료 규칙

작업 완료 전에는 다음을 확인한다.

```text
scripts/check.ps1 통과
task packet acceptance criteria 확인
필요한 문서 갱신
run report 작성
commit message why/verify 작성
```

## 6. Documentation Sync Gate

코드, 스크립트, HTML, 스타일 등 source-like 파일이 바뀌면 같은 커밋에 다음 중 하나를 포함한다.

```text
관련 docs 문서 갱신
README 링크 갱신
.harness task packet 또는 run report 기록
```

이 규칙은 `.githooks/pre-commit`에서 1차로 확인한다. 공개 문서 변경이 필요 없는 내부 수정이라도,
왜 문서 변경이 불필요한지 `.harness` 기록에 남긴다.

## 7. 실패 기록 규칙

다음 경우에는 `docs/evaluation/failure-log.md`에 기록한다.

```text
빌드 실패가 반복됨
문서 링크 누락
사용자 피드백으로 방향 수정
검증 기준이 부정확했음
Mermaid/화면/데이터 등 산출물 검증 누락
```

기록은 blame이 아니라 harness 개선을 위한 입력이다.

## 8. Harness 개선 규칙

반복 실패가 2회 이상 나오면 다음 중 하나를 추가한다.

```text
check script
template 항목
checklist 항목
evaluation rubric 항목
git hook guardrail
```

단, harness는 제품 scope를 자동으로 확장하지 않는다.
