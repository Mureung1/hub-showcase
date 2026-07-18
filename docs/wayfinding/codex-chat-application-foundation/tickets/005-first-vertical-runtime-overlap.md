# 005 — First-vertical runtime contract와 existing Codex surface의 overlap을 확인한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [첫 Assignment vertical의 runtime sufficiency envelope를 확정한다](004-first-assignment-runtime-envelope.md)

## Question

004가 required로 정한 observable outcome을 pinned App Server·official SDK·first-party surface와 current `CodexChatRuntime`·Server·Browser tracer가 각각 어디까지 이미 소유하는가? Exact native owner와 public seam을 먼저 확인하고 current adapter의 overlap·assumption delta 및 아직 증명되지 않은 residual candidate만 판정한다.

## Resolution evidence

- Exact pin의 App Server methods·primary tests, package-owned SDK public seam과 current bridge·Server·Browser code citation
- First vertical의 account readiness, explicit `cwd`, Skill·mention·`outputSchema`, one invocation, native identity, terminal·interrupt·failure settlement와 process lifecycle coverage matrix
- Current adapter responsibility별 `keep | replace | delete | probe-needed` 후보. Final disposition은 008이 소유한다.
- Latest official surface나 first-party host를 current pin과 구분한 upgrade·alternative evidence
- 각 required outcome의 `direct reuse | adapt | narrow port | candidate residual` 판정과 falsifying evidence
- Broad method inventory·general Chat donor survey·target architecture를 제외한 `assets/first-vertical-runtime-overlap.md`

## Answer

### 2026-07-19 후속 범위 정정

[Codex 실행 권한과 AY-PLE 제품 확인 경계 정정](../assets/codex-execution-permission-boundary.md)에 따라 SDK default `accept`는 native execution-permission disposition의 관찰 evidence로 유지하지만, fail-closed AY-PLE product invariant나 즉시 SDK extension·narrow port가 필요한 blocker로 해석하지 않는다. Current `deny_all + read_only`는 patch가 아니라 bridge override이며 008이 실제 제품 action과 native permission semantics에 맞춰 판정한다.

[First-vertical runtime overlap](../assets/first-vertical-runtime-overlap.md)에 004의 required outcome을 exact `rust-v0.144.4` App Server, package-owned official Python SDK, pinned TUI·`codex exec`와 current Runtime·Server·Browser tracer에 대조했다.

Account read, explicit `cwd`, `SkillInput`, `outputSchema`, native thread·turn identity, authoritative terminal과 interrupt는 기존 official seam을 직접 재사용할 수 있다. AY-PLE가 추가해야 하는 것은 turn 전 Account gate, validated Recipe arguments, product receipt correlation, final JSON·schema·source-reference validation과 accepted-loss의 product `unknown outcome` projection 같은 얇은 adaptation이다. 새 workflow runtime이나 general Chat architecture를 만들 근거는 확인되지 않았다.

Local `@file`도 다시 추적했다. Exact TUI는 `@` file search 결과를 path text로 치환하고, 사용자가 관찰한 Codex App은 file chip을 Markdown link로 표현한다. Structured `MentionInput`을 TXT attachment로 쓰는 verified contract는 없으므로 기존 `SourceSelection → mention` mapping은 direct-reuse 사실이 아니라 006의 path/link representative trace가 falsify할 가설로 낮췄다.

Current adapter에서는 exact provenance·controlled roots, native acceptance/terminal/interrupt, strict settlement와 bounded supervision이 `keep` 후보이고, text-only command·runtime-only readiness·Chat route projection은 `replace` 후보이며 process-global Chat lease와 Browser-disconnect coupling은 target first-vertical path의 `delete` 후보다. Patch stack·five-command bridge와 supervisor의 정확한 survivor 범위는 `probe-needed`이며 008만 final disposition을 소유한다.

Source 조사에서 high-level Python SDK의 low-level fallback이 synthetic command/file approval에 default `accept`를 반환하고 high-level constructor가 handler injection을 노출하지 않는다는 점을 확인했다. 이는 006 negative control의 관찰 대상이자 008 permission disposition의 입력이다. Desired native profile과 UX를 정하기 전에는 upstream fix나 narrow port를 요구하지 않는다. 두 TXT·Recipe·schema trace, accepted crash·fresh restart와 deterministic·exact-child·3회 live reproducibility는 당시 `probe-needed`였으며 006이 검증했다.
