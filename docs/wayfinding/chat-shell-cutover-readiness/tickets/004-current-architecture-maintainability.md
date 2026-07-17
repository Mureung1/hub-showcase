# 004 — Codex Chat target fitness와 legacy deletion blocker를 감사한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Codex Chat-only cutover contract와 non-goal을 고정한다](002-extension-envelope.md)

## Question

002에서 승인한 contract를 Codex Chat 경로가 유지할 수 있는지, 살아남을 Module·Interface·Seam과 fixture가 어떤 유지보수 위험을 가지며, legacy dependency 중 무엇이 clean deletion을 실제로 막는가?

## Resolution evidence

- Codex Chat production import direction, package export, Server/browser state ownership과 legacy workspace dependency를 함께 보여 주는 deletion-oriented graph
- `CodexChatRuntime`, Server lease, browser reducer와 process supervisor의 Interface depth·locality, impossible state, 중복 settlement, raw leakage와 shotgun surgery 판정
- Production runtime, `DeterministicCodexChatRuntime`, Server fixture, Chat Shell E2E와 actual-child가 각각 생성·독립 관찰·보장하지 않는 사실을 구분한 observable conformance matrix
- Happy path 편중, fixture hardcoding, opaque identity·late/duplicate event·wrong-owner·active-close 등 falsifying trace와 first-tracer/fixture-shaped identifier·함수명 감사
- 현재 exact bundle·ordered patch stack의 owner, source path와 regression oracle만 기록하고 다음 pin rebase 비용 조사는 제외한 maintenance baseline
- Legacy 제거로 발생하는 002 contract regression 또는 Chat-only build·start·test failure와, 삭제와 무관한 일반 maintainability debt를 분리한 결과
- Broad future abstraction을 미리 만들지 않고, 앞선 deletion-caused failure가 구체적으로 증명될 때만 원인 하나의 remediation ticket을 추가하는 판정
