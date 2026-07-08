# P0 Harness Policy

P0 harness는 LocalTwin 개발 시작 전에 반드시 갖춰야 하는 최소 운영 규칙이다.

## Required Before Work

작업 시작 전:

```text
.harness/tasks/<task-id>.md 파일이 있어야 한다.
task packet에는 Goal, Scope, Related Documents, Acceptance Criteria, Verification Plan이 있어야 한다.
```

## Required Before Commit

커밋 전:

```text
작업과 관련된 spec/checklist/data 문서를 확인한다.
scripts/check.ps1을 실행한다.
검증 결과를 commit message의 verify 섹션 또는 run report에 남긴다.
```

## Required After Work

작업 후:

```text
.harness/runs/<date>-<task-id>.md에 self-check를 남긴다.
반복 가능한 실패나 사용자 수정 피드백은 docs/evaluation/failure-log.md에 남긴다.
```

## Allowed Harness Improvements

허용:

```text
검증 스크립트 추가
템플릿 개선
평가 기준 보강
반복 실패에 대한 guardrail 추가
```

금지:

```text
제품 scope 임의 확장
데이터 출처 임의 변경
테스트 기준 완화
사용자 승인 없는 대규모 workflow 변경
```
