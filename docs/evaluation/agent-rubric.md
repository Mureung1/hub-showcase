# LocalTwin Agent Evaluation Rubric

이 문서는 LocalTwin 개발 작업을 평가하기 위한 기준이다.

## 1. 평가 대상

```text
Codex 작업 결과
사람 개발자의 작업 결과
자동화 스크립트가 생성한 산출물
```

## 2. 기준

| 기준 | 통과 조건 |
| --- | --- |
| Scope | task packet의 범위를 벗어나지 않았다 |
| Correctness | acceptance criteria를 만족한다 |
| Verification | 적절한 test/build/smoke check를 수행했다 |
| Documentation | 필요한 README/spec/checklist/data 문서를 갱신했다 |
| Data discipline | raw field와 canonical schema를 혼동하지 않았다 |
| Safety | secret, 원본 영상, 개인정보 노출이 없다 |
| Git hygiene | 작은 커밋, why/verify, 관련 파일만 포함했다 |

## 3. 점수

각 기준은 0~2점으로 평가한다.

```text
0: 누락 또는 위반
1: 부분 충족
2: 충족
```

최소 통과:

```text
총점 11점 이상
Verification, Safety, Scope는 각각 2점
```

## 4. 평가 결과 형식

```text
Task:
Evaluator:
Date:
Score:
Decision: pass | needs_fix | fail

Findings:
- 

Required fixes:
- 

Notes:
- 
```

## 5. 완료 판정

기준 미달이면 구현 완료로 보지 않는다.

```text
needs_fix:
수정 후 재검증 필요

fail:
작업 범위 또는 안전 기준 위반으로 재작업 필요
```
