# LocalTwin Meta-Evaluation

이 문서는 평가 시스템 자체가 좋은 작업과 나쁜 작업을 구분하는지 확인하기 위한 기준이다.

## 1. 목적

```text
평가 rubric이 너무 느슨하지 않은가?
평가 rubric이 너무 엄격해서 정상 작업을 막지 않는가?
반복 실패가 guardrail로 전환되는가?
```

## 2. Golden Case 후보

통과해야 하는 케이스:

```text
작은 기능 1개 구현
관련 spec/checklist 갱신
테스트 또는 smoke check 실행
why/verify 커밋 메시지 포함
```

실패해야 하는 케이스:

```text
README 링크 누락
source 변경 후 검증 없음
여러 기능을 한 커밋에 포함
raw field와 canonical field 혼동
secret 또는 원본 영상 노출
```

## 3. 자동화 후보

```text
scripts/evaluate_agent_output.py
scripts/evaluate_evaluator.py
```

P0에서는 문서로 기준만 둔다. P1에서 golden case fixture와 자동 검사를 추가한다.
