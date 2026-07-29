# 003 — Agent work environment 구성 패턴을 비교한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: None

## Question

Codex, Hermes Agent와 OpenClaw 같은 local agent host는 모델이 사용할 shell·interpreter·library·document tool을 어떻게 준비하고, bundled dependency, host tool 재사용, dynamic install과 sandbox 사이의 trade-off를 어떤 방식으로 다루는가?

## Expected evidence

- 공식 문서·source만 사용한 비교
- minimal runtime, batteries-included environment, on-demand install과 tool wrapper 접근의 차이
- 모델이 익숙한 command/import name을 먼저 시도하는 behavior와 environment discoverability의 관계
- binary·Python·Node dependency의 pin, update, platform·license·security 부담
- AY-PLE에 직접 투영할 수 있는 패턴과 mature framework라서 현재 흡수하지 않을 복잡성
- 후속 user decision에 필요한 대안과 판단 질문
