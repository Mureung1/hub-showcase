# 003 — Account lifecycle과 native config authority의 official surface를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Codex Chat application foundation의 완료 envelope를 확정한다](001-foundation-capability-envelope.md), [현재 Chat capability와 state ownership을 기준선으로 고정한다](002-current-chat-baseline.md)

## Question

Pinned official Python SDK와 exact App Server에서 account 조회, ChatGPT browser login 시작·완료·취소, logout, account notification과 controlled `HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME`의 config source·precedence는 어떤 public Interface와 lifecycle을 제공하며 current bridge에는 무엇이 빠져 있는가?

## Resolution evidence

- Exact source signature, generated method·notification과 primary tests 인용
- Empty auth store, login pending·completed·cancelled·expired, logout과 restart sequence
- Host가 initialize와 conversation 전에 고정·검증해야 할 config input
- Ambient auth/config fallback 금지와 app-managed state 수명에 대한 capability matrix
- Device-code, API key, Bedrock와 구현 설계를 제외한 `assets/official-account-config-capabilities.md`
