# LocalTwin Failure Log

반복 가능한 실패, 사용자 피드백으로 수정된 방향, 검증 누락을 기록한다.

목적:

```text
실패를 개인 blame으로 남기지 않는다.
반복되는 문제를 harness guardrail로 바꾼다.
다음 개발자가 같은 실수를 피하게 한다.
```

## Template

```text
Date:
Task:
Issue:
Cause:
Fix:
Harness update:
Follow-up:
```

## Entries

### 2026-07-08

```text
Task:
LocalTwin docs portal UI

Issue:
문서 사이트가 제안서형 랜딩 페이지처럼 보이고, 디자인 참고 링크가 너무 크게 노출됐다.

Cause:
문서 홈의 목적을 "각 문서로 들어가는 위키 홈"보다 "제안서/브리프" 중심으로 잡았다.

Fix:
문서 그룹 카드와 폴더 트리 중심의 홈으로 재구성하고, 디자인 참고는 footer details로 축소했다.

Harness update:
UI/문서 홈 변경 작업은 screenshot 검증과 사용자 목적 문장 확인을 task packet에 포함한다.

Follow-up:
문서 홈 task packet 템플릿에 "page role"과 "primary reader action" 항목 추가를 검토한다.
```
