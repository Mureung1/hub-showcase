# 005 — macOS local web app의 workspace 선택 수단을 조사한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Codex Chat application foundation의 완료 envelope를 확정한다](001-foundation-capability-envelope.md), [현재 Chat capability와 state ownership을 기준선으로 고정한다](002-current-chat-baseline.md)

## Question

macOS-first local web app에서 사용자가 명시적으로 선택한 folder의 server-verifiable canonical path를 얻고 다시 여는 현실적인 수단은 무엇이며, explicit path, launch argument, companion-owned native picker와 Browser capability는 각각 어떤 권한·보안·재열기·packaging 전제를 갖는가?

## Resolution evidence

- Apple·Browser primary documentation과 current local entrypoint의 capability matrix
- 사용자 consent, path disclosure, bookmark·registry, missing·moved folder와 재선택 semantics
- Dev Server와 same-origin production local web app의 차이
- 학업 file indexing과 UI 구현을 제외한 `assets/local-web-workspace-selection-options.md`
- 후속 decision에서 실제로 선택할 수 있는 bounded alternatives
