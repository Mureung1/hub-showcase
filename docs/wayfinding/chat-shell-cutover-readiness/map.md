# Codex Chat Shell cutover readiness

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

Codex Chat을 유일한 maintained product runtime으로 확정한 상태에서 Runtime Harness·Inspector와 legacy Host·adapter 경로의 exact deletion scope, Codex Chat에 남겨야 할 observable contract와 Module/test guardrail, external/on-disk preflight, approved recoverable local-state cleanup, verification과 code/data rollback gate를 implementation-ready deletion spec으로 넘길 수 있는 상태에 도달한다.

## Notes

- [Codex-native Chat Shell spec](../../specs/2026-07-16-codex-native-chat-shell.md)은 additive first tracer를 완료했으며 legacy cutover는 명시적으로 별도 checkpoint에 남겼다.
- 현재 topology와 gap은 [Runtime Harness 구현 지도](../../architecture/runtime-harness-implementation-map.md), 작업 순서는 [AY-PLE 개발 백로그](../../product/ay-ple-development-backlog.md), official SDK direct reuse 결정은 [ADR 0011](../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)이 소유한다. 판정은 문서만으로 내리지 않고 현재 코드와 테스트를 함께 확인한다.
- Codex Chat만 발전시킨다. Runtime Harness와 legacy Host는 deletion-default이며, 예외는 현재 사용자·대체 불가능한 job·명시적 owner와 maintenance obligation을 모두 증명해야 한다.
- Test 수, 코드 품질, 미래 engine·approval 가능성과 dormant rollback 가치는 예외 증거가 아니다. 필요한 invariant만 Codex Chat contract/test 언어로 다시 증명하고 과거 교훈은 Git history와 완료·역사 문서로 보존한다.
- External consumer, Inspector 실제 사용과 on-disk record 확인은 유지 판단이 아니라 삭제 preflight다. 사용자는 code cutover의 full gate가 green인 뒤 `.ay-ple`, `apps/server/.ay-ple`, `spikes/codex-runtime-ownership/runtime`을 local-only recoverable move로 정리하도록 승인했다. Current Chat `.artifacts`, `.gitignore`와 exact target 밖 external root는 유지하며 product history로 migration하지 않는다.
- Rollback은 legacy code 존치가 아니다. Code는 deletion 전 commit/release baseline과 Git revert·release rollback, ignored local state는 기록한 source→recovery mapping을 사용한다.
- Module 평가는 살아남는 Codex Chat `Interface`의 `Depth`, `Leverage`, `Locality`, `Seam`, observable conformance와 deletion residual을 사용한다. Legacy Module의 depth나 test coverage를 존치 가치로 재해석하지 않는다.
- Multi-client/resume, activity family, pending interaction, account/config와 두 번째 engine은 이번 deletion destination의 non-goal이며 별도 product effort다. 현재 process-global 1/1과 browser-memory transcript도 이번 삭제에서 재설계하지 않는 known limitation으로 기록한다.
- 004는 expected reference cleanup 뒤에도 002 contract가 회귀한다는 semantic blocker를 확인하지 않았다. 따라서 bounded remediation ticket을 만들지 않고 mixed Server/root/test composition cleanup은 014, default·actual gate 구분은 016으로 넘긴다.
- Wayfinder 단계에서는 production 기능을 구현하거나 legacy 코드를 제거하지 않는다. Prototype ticket은 throwaway evidence만 만들며 채택 구현은 후속 `/to-spec`과 `/to-tickets`가 소유한다.
- 한 세션에는 frontier ticket 하나만 claim하고 resolve한다. 사람의 제품·운영 결정을 요구하는 `grilling` ticket은 질문을 하나씩 확인한다.

## Decisions so far

- [현재 runtime capability와 ownership을 한 장에 고정한다](tickets/001-current-runtime-capability-ownership.md) — Harness는 repository의 Server·Inspector에 wired되어 있지만 current human use와 대체 불가능한 효용은 미증명이고, legacy Host는 production caller가 확인되지 않았으며, Chat의 내부 32/32 cardinality는 현재 Server에서 process-global 1/1로 축소된다.
- [Codex Chat-only와 legacy deletion-default를 확정한다](tickets/017-codex-chat-only-deletion-default.md) — Codex Chat만 maintained path로 발전시키며 두 legacy 경로는 삭제를 기본값으로 두고, 예외는 현재 사용자·대체 불가능한 job·명시적 owner를 모두 증명해야 한다.
- [Codex Chat-only cutover contract와 non-goal을 고정한다](tickets/002-extension-envelope.md) — Current Chat의 observable status·conversation·identity·terminal·failure·runtime cleanup을 보존하되 내부 구현은 동결하지 않고, root `npm run dev`는 fail-closed Server + Chat Shell로 전환하며 Inspector parity와 미래 product gap은 deletion scope에서 제외한다.
- [Codex Chat target fitness와 legacy deletion blocker를 감사한다](tickets/004-current-architecture-maintainability.md) — Survivor Module은 current contract에 적합하고 신규 remediation trigger는 없으며, mixed Server/root/test composition 한 cause cluster를 014의 atomic removal로 넘기고 default·actual gate 구분은 016에서 보존한다.
- [Legacy surface 삭제 범위와 예외를 증명한다](tickets/014-runtime-harness-role.md) — 네 legacy workspace의 659 tracked files와 Server/root/lock/docs/camp mixed cleanup을 exact manifest로 고정했고, executable 예외는 0개이며 external/on-disk 확인을 disposition 재토론이 아닌 preflight로 제한했다.
- [Legacy local state를 cutover에서 recoverable cleanup한다](tickets/018-legacy-local-state-cleanup.md) — `.ay-ple`, `apps/server/.ay-ple`과 ownership spike state를 full cutover gate green 뒤 local-only recoverable move로 정리하고, legacy auth/config의 maintained-state 제외·재로그인과 별도 data rollback을 승인했다.

## Shortest route to spec

`001 resolved → 017 resolved → 002 resolved → 004 resolved → 014 resolved → 018 resolved → 016 → /to-spec`

| Ticket | 분류 | 이 map에서 소유하는 결과 |
| --- | --- | --- |
| [Codex Chat-only cutover contract와 non-goal을 고정한다](tickets/002-extension-envelope.md) | 유지 | 삭제 뒤 보존할 current Chat contract, default developer entrypoint, known limitation과 별도 product effort 경계 |
| [Codex Chat target fitness와 legacy deletion blocker를 감사한다](tickets/004-current-architecture-maintainability.md) | 유지 | 살아남는 Module·Interface·fixture의 maintainability/conformance, deletion-direct build residual과 general debt의 분리 |
| [Legacy surface 삭제 범위와 예외를 증명한다](tickets/014-runtime-harness-role.md) | 유지 | Harness·Inspector·Host·legacy adapter를 아우르는 exact removal manifest와 exception proof |
| [Legacy local state를 cutover에서 recoverable cleanup한다](tickets/018-legacy-local-state-cleanup.md) | 유지 | 세 exact ignored root의 local-only recoverable cleanup, Chat artifact retention과 별도 data rollback 승인 |
| [Legacy deletion 실행 gate와 spec readiness를 승인한다](tickets/016-cutover-execution-gates.md) | 유지 | Slice별 verification·preflight·cleanup/restore·rollback gate와 `/to-spec` readiness 승인 |

## Not yet specified

없음. 004의 remediation trigger는 충족되지 않았고 새로 드러난 local-state disposition은 018에서 닫았다.

## Out of scope

Wayfinder에는 `merged`나 `conditional` state가 없으므로, 아래 ticket은 독립 질문으로는 `out-of-scope`로 닫는다. `병합`은 필요한 evidence를 active target ticket으로 옮겼다는 뜻이고, `조건부`는 trigger가 실제로 발생할 때 새 bounded ticket을 만든다는 뜻이다.

| Ticket | 분류 | 처리 또는 재진입 조건 |
| --- | --- | --- |
| [Conversation state ownership을 결정한다](tickets/003-conversation-state-ownership.md) | 병합 | 현재 1/1·transient state를 이번 삭제에서 재설계하지 않는 known limitation으로 기록하는 일은 002로 흡수하고 multi-client/resume target 설계는 별도 effort로 이동 |
| [Interface conformance와 fixture 독립성을 감사한다](tickets/005-interface-conformance-and-fixture-audit.md) | 병합 | Observable conformance, fixture independence와 falsifying trace를 004에 흡수 |
| [Product conversation seam을 세 가지로 설계한다](tickets/006-target-conversation-seam-alternatives.md) | 조건부 | 004 trigger는 미충족. 향후 Chat-only deletion에서 새 semantic regression evidence가 생길 때만 원인 하나의 별도 remediation effort로 재진입 |
| [두 client와 resume로 conversation ownership을 검증한다](tickets/007-conversation-resume-ownership-probe.md) | out-of-scope | 실제 multi-client/resume 제품 요구와 owner가 생길 때 Codex Chat-only effort로 재진입 |
| [한 activity family로 live/cold 확장성을 검증한다](tickets/008-activity-live-cold-normalization-probe.md) | out-of-scope | 실제 activity 제품 요구가 생길 때 별도 API/read-model effort로 재진입 |
| [Official SDK pending-interaction seam의 존재를 확인한다](tickets/009-sdk-pending-interaction-seam.md) | out-of-scope | 승인된 pending-interaction 요구가 official SDK public Seam에서 막힐 때만 재조사 |
| [Pending interaction의 architecture 전략을 결정한다](tickets/010-pending-interaction-strategy.md) | out-of-scope | 실제 제품 요구와 policy owner가 생길 때 별도 decision effort로 재진입 |
| [Official SDK patch stack의 유지 비용을 측정한다](tickets/011-upstream-patch-sustainability.md) | 병합 | Current patch owner·oracle은 004에 흡수하고 next-pin rebase는 후보 pin과 upgrade owner가 정해질 때 재진입 |
| [변경 위험별 verification gate를 결정한다](tickets/012-verification-gate-policy.md) | 병합 | 이번 deletion slice의 risk-based gate와 residual check를 016에 흡수 |
| [Primary product Seam을 승인한다](tickets/013-primary-product-seam-approval.md) | 병합 | Chat-only 승인은 017, 보존할 current contract는 002가 소유 |
| [Legacy Host asset의 disposition을 결정한다](tickets/015-legacy-host-assets.md) | 병합 | Host-only edge를 구분하되 disposition과 cleanup을 014 removal manifest에 흡수 |

- AY-PLE 학업 product adapter와 `ModelingRecipe → ModelingInvocation → ModelingRun` 수직 흐름 구현
- Multi-thread sidebar, conversation resume, activity family, 실제 approval UI와 account/config UX의 production 완성
- Raw App Server event를 1:1로 노출하는 generic event bus
- 016 승인과 code cutover 전 legacy package·endpoint·public export 제거 또는 approved local-state cleanup 실행, 그리고 이번 exact allowlist 밖 data cleanup이나 실제 Codex pin upgrade
- Mobile, packaged Desktop App distribution, signing과 notarization

## Resulting spec

아직 없다.
