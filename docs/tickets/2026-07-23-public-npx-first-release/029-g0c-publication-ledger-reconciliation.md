# 029 — G0c — Publication ledger reconciliation을 구현한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

`release-intent`, detached authorization, prebinding receipt, one-time application binding ledger, append-only publication receipt와 derived projection의 codec·state transition·reconciliation engine을 만든다. GitHub/npm/Pages fake adapter로 ambiguous result, immutable identity, GAT retirement와 retry/incident matrix를 끝까지 검증하지만 실제 external write는 한 번도 수행하지 않는다.

## Spec Traceability

- User stories: 15, 17, 18
- Implementation contract: Release generator/publication runner와 candidate identity authority
- Implementation decisions: `Public source, license와 publication`의 Publication S0–S10, durability/self-reference artifact table, natural reconciliation identity와 credential retirement barrier
- Testing decisions: publication scripted tests, authorization mismatch zero-write, ambiguity/retry/incident matrix

## Slice-Specific Constraints

- `release-intent.json`, `publication-authorization.json`, `prebinding-publication-receipts.jsonl`, `application-binding-ledger.json`, `publication-receipts.jsonl`, `publication-projection.json`의 서로 다른 authority를 codec과 transition guard로 보존한다.
- Application binding ledger는 S8 전에 한 번 freeze하며 자신을 실을 future application release ID나 Pages ID를 포함하지 않는다. S8/S9 receipt가 ledger digest를 참조하고 ledger byte를 다시 쓰지 않는다.
- External operation 모델은 항상 `read-before-write → one write → authoritative readback`이다. Ambiguous 결과는 Git/npm/GitHub/Pages natural identity로 reconcile한 뒤에만 resume한다.
- Detached authorization은 exact intent digest, targets와 operation scope를 match해야 한다. Missing, expired, mismatched 또는 over-broad authorization은 write adapter 호출 전에 실패한다.
- 모든 injected npm GAT branch는 unconditional retirement barrier로 합류한다. Exact credential deletion 뒤 authenticated identity probe가 명시적으로 거절되기 전에는 retry, incident closure나 Publication S7로 진행하지 않는다.
- S7 guard는 `S5 green ∧ all injected GAT retired`로 고정한다.
- Fixture/fake adapter만 사용하며 network 또는 실제 gh/npm/Pages mutation을 막는 process-level deny oracle을 둔다. 이 티켓은 publication operator가 아니다.
- 028이 integration에 merge된 fixed `handoffSha`에서 시작하고 sibling merge/cherry-pick을 하지 않는다. Shared manifests/lockfiles/contracts는 C-owned serial delta다.
- 전체 active lane writer 최대 3명, worktree writer 1명, fixed-SHA 독립 review를 지킨다.

## Acceptance Criteria

- [ ] 여섯 publication artifact codec이 missing/extra/unknown/private field와 digest mismatch를 strict하게 거절한다.
- [ ] Publication S0–S10 transition이 predecessor evidence와 guard를 강제하고 stage skip, reorder와 false current projection을 허용하지 않는다.
- [ ] Detached authorization mismatch·부재·scope 초과에서 external adapter write count가 0이다.
- [ ] GitHub source/release, npm package/credential, Pages deployment의 success/failure/timeout/ambiguous matrix가 natural identity reconciliation 후 deterministic하게 resume 또는 incident로 수렴한다.
- [ ] One-write invariant와 authoritative readback이 provider별로 검증되고 receipt를 잃은 ambiguous write를 추측해 재실행하지 않는다.
- [ ] Prebinding receipt와 frozen application ledger의 self-reference 경계가 지켜지고 S8/S9 append-only receipt만 ledger digest를 참조한다.
- [ ] GAT 주입 뒤 모든 branch에서 retirement와 authenticated rejection probe가 실행되며 S7 guard를 우회할 수 없다.
- [ ] Derived projection을 삭제하고 immutable/append-only artifacts에서 재생성하면 같은 current/blocked/incident state가 나온다.
- [ ] Scripted suite 동안 실제 network/external writes가 0이다.

## Verification

- Targeted: codec/digest-chain, transition graph, authorization scope와 zero-write guard tests
- Scripted adapters: GitHub/npm/Pages success, failure, timeout, ambiguous/retry/incident, immutable collision과 readback mismatch matrix
- Credential: every injected GAT branch retirement, post-delete denial probe와 S7 guard tests
- Replay: journal에서 projection 재생성과 byte/digest stability를 검증한다.
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`

## Blocked By

- [028-g0b-deterministic-rc-package-assembler.md](028-g0b-deterministic-rc-package-assembler.md) — G0b — Deterministic RC package assembler를 만든다

## Starting Points

- Parent spec `Public source, license와 publication`
- `docs/wayfinding/public-npx-first-release/assets/publication-release-gates-research.md`
- `docs/wayfinding/public-npx-first-release/assets/clean-machine-smoke-protocol-research.md`
- 028이 제공하는 candidate sidecars와 release display artifact
- Target owner paths `scripts/public-release/**`, `distribution/public-root/**`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `G0c` / owner `G` |
| owner | Release-state lane writer 1명 |
| branch/worktree | `codex/public-preview-g0c-publication-ledger` / `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/g0c-publication-ledger` |
| handoffSha | 028 fixed review SHA가 integration에 merge되고 gates가 green인 뒤 coordinator가 기록한 immutable full SHA. 이 문서의 예시 digest/SHA는 handoff가 아니다. |
| writablePaths | `scripts/public-release/**`; `distribution/public-root/**`; `docs/tickets/2026-07-23-public-npx-first-release/029-g0c-publication-ledger-reconciliation.md` |
| consumedContracts | G0b candidate sidecars; Publication S0–S10 graph; authorization/ledger/receipt artifact contracts; provider natural identity and GAT retirement rules |
| predecessorEvidence | 028 merge receipt, tarball/Runtime/bundle/release-display digests, latest C-owned `contractTipSha` |
| requiredChecks | Codec/transition/reconciliation/fake-adapter suites, zero-network/write oracle, credential retirement matrix, root four, docs links, `git diff --check` |
| reviewOwner | G0c author가 아닌 독립 release-state/security reviewer |
| handoffArtifact | `g0c-publication-ledger-handoff.json`: fixed review SHA, commands/tool versions, scripted transition coverage, write-count 0와 journal replay digest |
| delivery topology | Sibling merge/cherry-pick 금지; coordinator-only `--no-ff`; active lane writer 최대 3명; shared delta는 C 소유 |
| external writes | 0. Fake adapters와 local scripted artifacts만 허용한다. |
