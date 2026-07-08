# LocalTwin Dev Harness

이 폴더는 LocalTwin 제품 기능이 아니라 LocalTwin을 개발하기 위한 작업 운영 하네스다.

목적:

```text
작업 시작 전 범위 고정
관련 spec과 데이터 문서 확인
검증 기준 명시
작업 후 self-check와 평가 기록 보존
반복 실패를 다음 guardrail로 전환
```

기본 흐름:

```text
1. .harness/tasks/<task-id>.md 작성
2. 관련 spec/data/development 문서 확인
3. 구현 및 테스트
4. scripts/check.ps1 실행
5. .harness/runs/<date>-<task-id>.md 작성
6. docs/evaluation/failure-log.md 필요 시 갱신
7. 작은 단위로 커밋
```

디렉터리:

| 경로 | 역할 |
| --- | --- |
| `.harness/templates/` | task packet, run report 템플릿 |
| `.harness/tasks/` | 진행 예정 또는 진행 중인 작업 단위 |
| `.harness/runs/` | 완료 작업의 self-check와 검증 결과 |
| `.harness/policies/` | harness 운영 정책 |
| `.harness/evaluations/` | 작업별 평가 입력/결과 보조 파일 |

주의:

```text
이 하네스는 제품 scope를 자동으로 확장하지 않는다.
spec/test/docs/checklist의 연결을 강제하기 위한 개발 운영 시스템이다.
```
