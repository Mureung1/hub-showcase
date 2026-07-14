# Runbook 인덱스

다른 개발자가 그대로 수행할 반복 진단·복구 절차는 [템플릿](../templates/runbook.md)으로
작성한다. 명령의 영향 범위, 중단 조건, 검증과 rollback을 반드시 포함한다.

- [RUN-0001 Naver Local Live 검증과 자격증명 교체](RUN-0001-naver-local-live-and-credential-rotation.md)
- [RUN-0002 Elice LLM Local Live 검증과 Token 교체](RUN-0002-elice-llm-local-live-and-token-rotation.md)

RUN-0001은 실제 Naver canary가 두 `INVALID_RESPONSE`로 실패해 `draft`다. RUN-0002는
Elice 자동 타깃 검증은 통과했지만 실제 canary와 교체 훈련을 완료하지 않아 `draft`다.
문서가 존재한다는 사실을 Live 검증 완료와 혼동하지 않는다.
