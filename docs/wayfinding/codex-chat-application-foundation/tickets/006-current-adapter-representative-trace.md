# 006 — Current integration adapter로 first-vertical representative trace를 검증한다

## Wayfinder ticket

- Type: prototype
- State: resolved
- Blocked by: [First-vertical runtime contract와 existing Codex surface의 overlap을 확인한다](005-first-vertical-runtime-overlap.md)

## Question

일반 Chat 기능을 추가하지 않고 frozen current adapter 또는 005가 확인한 가장 얇은 official seam으로 대표 Assignment 실행을 수행할 때, 004의 required runtime outcome과 failure settlement가 실제 trace에서 성립하는가? 실패한 exact invariant만 confirmed residual candidate로 남긴다.

## Resolution evidence

- 두 representative TXT, explicit test workspace와 bounded account/runtime fixture
- `SourceSelection + Recipe input → native execution → validated structured Assignment candidate`의 UI-less throwaway trace
- Opaque execution correlation을 `ModelingRun` receipt에 연결하되 product DB·StatePatch implementation을 만들지 않는 test harness
- 004가 required로 둔 terminal·interrupt·crash·retry 또는 unknown-outcome negative control
- Current adapter를 확장하지 않은 falsifying result, 충족한 outcome과 exact missing seam
- Production code로 승격하지 않는 `/prototype` evidence와 008이 판정할 `keep | replace | delete` 후보

## Answer

[Current adapter representative trace](../assets/current-adapter-representative-trace.md)에 evidence branch `prototype/first-vertical-runtime-trace`와 immutable prototype commit `fbc9efdd1e6f06fd5f3da60dac344ddd1704ee2c`의 결과를 기록했다.

Frozen current adapter는 exact bundle, explicit `cwd`, native acceptance·terminal·interrupt, process-loss settlement와 bounded cleanup을 충족했다. Official Python SDK direct seam도 versioned `SkillInput`, 선택한 두 TXT의 Markdown link·path text, strict `outputSchema`와 completed structured result를 결합했고, fresh isolated roots의 live-provider trace 3회가 모두 schema-valid selected-source-linked result, distinct opaque native correlation, authoritative terminal과 cleanup을 수동 복구 없이 통과했다.

Deterministic contract는 not-ready·invalid input의 native start `0`, receipt와 accepted turn의 1:1 correlation, interrupt acknowledgement의 nonterminal 성격, accepted crash의 `unknown`, 자동 retry `0`과 explicit retry의 새 receipt를 증명했다. Malformed JSON·schema·unselected path·quote mismatch는 native failure가 아닌 product validation failure로 분류됐다.

유일한 failed required invariant는 exact high-level SDK가 injected command/file approval에 default `accept`를 반환한 것이다. Effective `never + readOnly + networkAccess:false`와 write/network marker 비발생은 충족했지만 fail-closed requirement는 실패했으므로 최종 report는 유효한 `confirmed_residual`/exit `2`다. 006은 이를 수정하지 않았으며 008이 adopted SDK path 안의 가장 얇은 disposition과 current adapter의 `keep | replace | delete`를 결정한다.

Prototype source·fixtures는 evidence branch에만 남겼고 production code, 제품 DB, `StatePatch`, Browser와 3-pane UI는 변경하지 않았다. 전체 Browser product E2E는 resulting first-vertical spec 이후 별도 gate로 남는다.
