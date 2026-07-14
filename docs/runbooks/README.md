# Runbook 인덱스

다른 개발자가 그대로 수행할 반복 진단·복구 절차는 [템플릿](../templates/runbook.md)으로
작성한다. 명령의 영향 범위, 중단 조건, 검증과 rollback을 반드시 포함한다.

- [RUN-0001 Naver Local Live 검증과 자격증명 교체](RUN-0001-naver-local-live-and-credential-rotation.md)
- [RUN-0002 Elice LLM Local Live 검증과 Token 교체](RUN-0002-elice-llm-local-live-and-token-rotation.md)

RUN-0001과 RUN-0002는 2026-07-14 검토된 SHA에서 실제 Naver Local·Blog와 Elice
Chat·Embedding 정상 경로를 각각 통과해 `verified`다. 이 상태는 약관·데이터 정책,
제품 runtime이나 cloud 배포 완료를 뜻하지 않는다.
