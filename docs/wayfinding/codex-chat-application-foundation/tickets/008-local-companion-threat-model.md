# 008 — Local companion의 위협과 보호 자산을 고정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Codex Chat application foundation의 완료 envelope를 확정한다](001-foundation-capability-envelope.md), [현재 Chat capability와 state ownership을 기준선으로 고정한다](002-current-chat-baseline.md)

## Question

macOS same-user local web app에서 malicious web origin, 다른 local process, stale·mismatched Browser bundle과 다른 Browser client가 account, workspace와 conversation mutation에 미치는 위협은 무엇이며 current loopback bind, Origin guard와 isolated child environment는 각각 무엇을 막고 무엇을 막지 못하는가?

## Resolution evidence

- Actor, protected asset, entrypoint, impact와 current control의 threat matrix
- Origin 없는 mutation, CSRF, port discovery, wrong-client·wrong-workspace와 stale contract scenario
- Codex provider auth와 Browser→local companion authorization의 분리
- Session token·cookie·capability의 채택 결정을 제외한 `assets/local-companion-threat-model.md`
- Product domain data와 cloud multi-user threat model의 명시적 제외
