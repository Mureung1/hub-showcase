# 033 — I2a — Live evidence conformance harness를 고정한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Exact G1 candidate를 대상으로 prepublication live smoke를 기록할 repository-only, secret-free evidence/conformance harness를 만든다. Production launch attestation과 exact match하는 Runtime에서 hostile ancestor/user context 배제를 검사하고, post-Ready에는 ephemeral `thread/start` 하나의 `instructionSources`만 읽은 뒤 Turn·rollout 없이 닫아 built-in instructions/Skills 경계를 증명한다.

## Spec Traceability

- User stories: 4–14, 16, 17
- Implementation contract: controlled roots, Runtime/account transition, package-owned workspace bundle/native-context guard
- Implementation decisions: `Parallel delivery contract`의 `I0 + I1 → I2`
- Testing decisions: `prepublication_live(I2)` evidence class와 `UI, live와 public acceptance`의 launch attestation, instruction-source exact-match, privacy evidence rules

## Slice-Specific Constraints

- Harness는 repository-only I-owned source이며 public snapshot/application `.tgz`/workspace bundle에 포함되지 않는다. Production code에 live-test hook을 추가하지 않는다.
- 026 I0 trace schema와 032 I1 G1-candidate binding을 재사용해 모든 evidence를 exact `candidateDigest`에 묶는다.
- Production launch attestation의 source SHA, application/tarball, Runtime descriptor/archive/manifest, workspace bundle digest와 actual roots/role을 secret-free normalized form으로 기록한다.
- Post-Ready conformance는 production launch attestation과 exact match하는 Runtime process에서 ephemeral `thread/start` 하나의 `instructionSources`만 읽고 Turn, rollout, tool call, workspace mutation 없이 close한다.
- Hostile repository ancestor `AGENTS.md`/Git config와 user-global instructions/Skills canary가 production instructionSources/config/skills에 섞이면 fail closed한다.
- Token, OAuth URL/user code/login ID, account email, raw provider error, absolute credential path, auth bytes/hash와 user content는 owner-only evidence에도 저장하지 않는다.
- Absolute workspace/app-data paths는 제품 proof에 필요한 경우 stable redacted role로만 기록하며 raw path를 public artifact에 남기지 않는다.
- 이 티켓은 recorder/schema/conformance logic을 검증할 뿐 actual managed OAuth나 live green을 주장하지 않는다. Synthetic fixture는 반드시 synthetic로 표시한다.
- 026과 032 fixed reviewed SHA가 integration에 merge된 coordinator-recorded `handoffSha`에서 시작한다. Sibling merge/cherry-pick 금지, shared delta는 C-owned serial path다.
- 전체 lane writer 최대 3명, worktree writer 1명, fixed-SHA independent review를 지킨다. External publication/provider write는 0이다.

## Acceptance Criteria

- [ ] Secret-free evidence schema가 candidateDigest, environment class, launch attestation, stage result와 cleanup receipt를 strict decode한다.
- [ ] Missing/extra/private fields, mismatched candidate/launch attestation과 synthetic/live confusion을 fail closed한다.
- [ ] Harness가 G1 exact `.tgz`와 Runtime/bundle identity를 I1/G1 receipt에서 읽고 moving source나 global state로 대체하지 않는다.
- [ ] Hostile ancestor/user canary fixture에서 only package-owned declared instructionSources/config/Skills exact set을 관찰한다.
- [ ] Post-Ready probe가 ephemeral `thread/start`의 `instructionSources`만 읽고 Turn·rollout·tool call·workspace mutation 없이 bounded close한다.
- [ ] Privacy redaction tests가 forbidden secret/account/path/provider payload를 evidence와 logs에서 0건으로 만든다.
- [ ] Harness 자체와 fixtures/recorder가 G0 public snapshot과 G1 packed file roster에서 제외된다.
- [ ] Actual live 실행 전 prerequisite checker가 supported lane, clean/reverted user or VM, network, fresh account/root와 retained candidate를 명시적으로 요구한다.
- [ ] Synthetic test 결과는 I2 live green이나 publication evidence로 승격될 수 없다.

## Verification

- Targeted: evidence codec, candidate/attestation exact-match, privacy redaction와 synthetic/live classification tests
- Conformance: fake Runtime에서 ephemeral thread-start-only/no-Turn/no-mutation/bounded-close oracle
- Hostile context: ancestor/user canary inclusion·exclusion matrix와 declared-source exact set
- Packaging: public snapshot/tarball forbidden-roster scan
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`

## Blocked By

- [026-i0-deterministic-setup-ready-integration.md](026-i0-deterministic-setup-ready-integration.md) — I0 — Deterministic Setup→Ready integration을 닫는다
- [032-i1-packed-signed-out-bootstrap.md](032-i1-packed-signed-out-bootstrap.md) — I1 — Packed signed-out bootstrap을 black-box로 검증한다

## Starting Points

- 026 I0 deterministic evidence schema와 cross-surface fixtures
- 032 I1 G1 candidate binding과 packed black-box harness
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `apps/chat-shell/playwright.config.ts`
- `packages/codex-chat-runtime/src/testing-process-tree.ts`
- `packages/codex-chat-runtime/manifests/**`
- Parent spec `UI, live와 public acceptance`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `I2a` / owner `I` |
| owner | Integration/live-evidence lane writer 1명 |
| branch/worktree | `codex/public-preview-i2a-live-harness` / `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/i2a-live-harness` |
| handoffSha | 026과 032 reviewed SHA가 integration에 merge되고 gates가 green인 뒤 coordinator가 기록한 immutable full SHA. Ticket author는 fake SHA를 넣지 않는다. |
| writablePaths | `apps/chat-shell/e2e/**`; `docs/tickets/2026-07-23-public-npx-first-release/033-i2a-live-evidence-conformance-harness.md` |
| consumedContracts | I0 deterministic trace/evidence schema; I1/G1 candidate receipt; Runtime instructionSources/account lifecycle; workspace native-context guard |
| predecessorEvidence | 026 deterministic setup matrix receipt, 032 packed black-box receipt, G1 retained candidateDigest, latest `contractTipSha` |
| requiredChecks | Evidence/attestation/redaction suites, hostile-context and no-Turn probe, forbidden-roster scan, root four, docs links, `git diff --check` |
| reviewOwner | I2a author가 아닌 독립 QA/privacy/native-context reviewer |
| handoffArtifact | `i2a-live-harness-handoff.json`: review SHA, schema version/digest, commands/tool versions, redaction and conformance fixture coverage |
| delivery topology | Sibling merge/cherry-pick 금지; coordinator-only `--no-ff`; active lane writer 최대 3명; shared delta는 C 소유 |
| external writes | 0. Repository-only synthetic/conformance verification만 수행한다. |
