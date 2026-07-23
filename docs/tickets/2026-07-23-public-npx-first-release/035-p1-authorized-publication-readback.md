# 035 — P1 — 승인된 public publication과 readback을 수행한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

I2가 승인한 exact G1 candidate에 대해 사용자가 별도로 승인한 target과 operation scope만 기존 G0 publication runner로 실행한다. Publication S0–S10을 `read-before-write → one write → authoritative readback`과 append-only journal로 진행하고, exact public npm/Runtime/application/Pages identity, credential retirement와 clean-Mac public smoke를 확인한 뒤에만 `CURRENT_PUBLIC_PREVIEW`를 만든다.

## Spec Traceability

- User stories: 1, 2, 4, 15, 17, 18
- Implementation contract: Release generator/publication runner, public package/Landing release truth와 common candidate identity
- Implementation decisions: `Parallel delivery contract`의 detached-approval `P1`
- Implementation decisions: `Public source, license와 publication`의 Publication S0–S10, authorization binding, reconciliation, GAT retirement와 Pages-last policy
- Testing decisions: `exact_public(Publication S7)` evidence class와 public acceptance

## Slice-Specific Constraints

- 이 ticket의 생성, `ready-for-agent` 상태, claim, `/implement` 호출이나 이전 대화의 일반적 “진행”은 publication authorization이 아니다.
- 실행 직전에 사용자가 exact `candidate intent digest`, GitHub source/release repository, npm `name@version`/tag, Pages target와 허용 operation scope를 detached하게 승인해야 한다. Authorization artifact는 owner-only이며 candidate와 exact match해야 한다.
- Fresh authorization 전에는 read-only preflight/reconciliation만 허용한다. Mismatch, missing target ownership, immutable release setting, tag protection, package availability/ownership 또는 credential condition은 external write 전에 block한다.
- Production source를 수정하거나 candidate를 재생성하지 않는다. Existing reviewed G0 runner와 G1 retained artifacts만 사용한다. Source/tool defect는 publication을 중지하고 upstream corrective ticket으로 반환한다.
- 각 provider operation은 `read-before-write → one write → authoritative readback`이다. Timeout/ambiguous result는 natural identity로 reconcile하고 journal에서 resume하며 동일 immutable identity에 두 번째 write를 추측해 실행하지 않는다.
- Publication S0→S10 순서를 지키고 predecessor receipt 없는 stage skip을 금지한다. Public source verify 후 application draft, Runtime, npm, credential retirement, exact public smoke, application release, Pages 순서를 바꾸지 않는다.
- Npm publish는 protected public-source workflow가 G1 reference tarball과 byte-for-byte 같은 CI tarball을 재생성할 때만 short-lived least-privilege GAT로 `--access public --tag preview --provenance`를 실행한다.
- GAT 주입 후 success/failure/ambiguous 모든 branch는 unconditional retirement로 합류한다. Token delete 뒤 exact credential의 authenticated probe가 거절되기 전에는 S7 또는 retry로 진행하지 않는다.
- S7은 actual public exact npm version과 immutable Runtime을 clean supported Mac/user 또는 reverted VM, default Gatekeeper, repository 밖 cwd와 fresh roots에서 README/release-card exact command로 실행한다.
- Application binding ledger는 S8 전에 한 번 freeze하고 future application release/Pages ID를 넣지 않는다. S8/S9 append-only receipt만 ledger digest를 참조한다.
- Pages는 S9에서 마지막으로 열고 `release/current.json`이 exact application version/tag/release URL과 frozen ledger digest를 제공할 때만 S10 current projection을 만든다.
- Feature branch는 없고 candidate disposable worktree에서 operator checkpoint로 실행한다. Sibling merge/cherry-pick, candidate patch와 broad cleanup은 금지한다.

## Acceptance Criteria

- [ ] 034의 green prepublication live receipt와 G1 retained candidate가 exact candidateDigest로 일치한다.
- [ ] Fresh detached authorization이 intent digest, target과 allowed operation scope를 exact bind하고 owner-only로 보관된다.
- [ ] Preflight가 source repo, release immutability/tag protection, npm name/version ownership/availability, Pages target와 credential readiness를 authoritative read로 확인한다.
- [ ] Publication S2–S6가 순서대로 one-write/readback receipt를 남기고 ambiguous operation은 natural identity reconciliation으로만 resume한다.
- [ ] Public CI가 G1 reference와 byte-for-byte 같은 tarball을 만들고 npm exact version/integrity/tarball readback이 candidate와 일치한다.
- [ ] 모든 injected GAT가 삭제되고 exact credential authenticated probe가 거절된 뒤에만 S7이 열린다.
- [ ] S7 clean-Mac first run이 public release card/README의 exact `npx ay-ple@<exact-version>`으로 `Semester Ready`에 도달하고 automation-only `--yes` relaunch와 cleanup까지 통과한다.
- [ ] Frozen application binding ledger, S8 application immutable release와 S9 Pages deployment receipt가 self-reference 없이 같은 candidate를 bind한다.
- [ ] `release/current.json`, Landing display, Docs/GitHub/Privacy/Security/license links와 npm/Runtime/application URLs가 authoritative public readback과 일치한다.
- [ ] S10은 모든 이전 receipt와 exact identity가 green일 때만 생성되며 partial/unknown/manual override는 blocked 또는 incident로 남는다.
- [ ] Publication source/candidate byte는 수정되지 않고 secrets, token, OAuth/account private data가 evidence에 0건이다.

## Verification

- Authorization/preflight: candidate-intent digest, target/scope, ownership/availability, immutable settings와 protected workflow identity readback
- Publication: existing G0 runner의 S0–S10 receipts, provider별 one-write/readback와 ambiguity reconciliation journal
- Npm credential: GAT injection/retirement/post-delete denial probe와 S7 guard
- Exact public smoke: clean supported Mac/VM에서 human-approved exact `npx`, Ready, `--yes` relaunch, Gatekeeper와 cleanup
- Final readback: Git commit/tree, GitHub release IDs/tags/assets/digests, npm version/integrity/tarball, application release, Pages deployment/sentinel와 Landing truth
- Source nonmutation: fixed candidate worktree와 retained G1 artifacts의 before/after identity

## Blocked By

- [034-i2b-prepublication-live-oauth-ready-smoke.md](034-i2b-prepublication-live-oauth-ready-smoke.md) — I2b — Prepublication live OAuth→Ready smoke를 실행한다
- Detached 사용자 publication authorization — 034 green 뒤 exact candidate intent digest, targets와 allowed operation scope를 새로 승인해야 한다. 이 티켓 자체는 승인이 아니다.

## Starting Points

- 031 G1 retained exact RC와 `LOCAL_RC_ACCEPTED` receipt
- 034 green `prepublication_live(I2)` evidence
- 029 publication ledger/reconciliation engine
- 030 reviewed G0 publication runner
- `docs/wayfinding/public-npx-first-release/assets/publication-release-gates-research.md`
- `docs/wayfinding/public-npx-first-release/assets/clean-machine-smoke-protocol-research.md`
- Public source workflow/release display resources generated from the fixed candidate

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `P1` operator checkpoint |
| owner | Fresh detached authorization scope를 집행하는 release operator 1명 |
| branch/worktree | Source feature branch 없음. Fixed candidate disposable worktree `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/p1-publication-<short-sha>`에서 existing runner만 실행한다. |
| handoffSha | 034 green closeout가 integration에 기록된 immutable full SHA와 G1 candidateDigest를 authorization 직전에 freeze한다. Ticket author가 미리 SHA를 만들지 않는다. |
| writablePaths | Production source 없음; own closeout `docs/tickets/2026-07-23-public-npx-first-release/035-p1-authorized-publication-readback.md`; owner-only ignored authorization/receipt/evidence only |
| consumedContracts | G1 fixed candidate/release intent; G0 publication runner/state machine; I2 live evidence; provider natural identities; Landing/current projection schema |
| predecessorEvidence | 034 green fixed review receipt, G1 RC acceptance, fresh detached authorization, read-only target/credential preflight |
| requiredChecks | Authorization exact match, Publication S0–S10 runner/receipts, GAT retirement, S7 exact public clean-Mac smoke, final GitHub/npm/application/Pages/Landing readbacks, source nonmutation |
| reviewOwner | Operator가 아닌 independent release/provenance reviewer; 사용자는 authorization authority이며 technical review를 대체하지 않는다. |
| handoffArtifact | Owner-only `publication-authorization.json`, `prebinding-publication-receipts.jsonl`, frozen `application-binding-ledger.json`, append-only `publication-receipts.jsonl`, derived `publication-projection.json`과 final S10 receipt |
| delivery topology | Sibling merge/cherry-pick와 source patch 금지; fixed candidate only; active lane writer 최대 3명; defect는 owning lane/C serial corrective로 반환 |
| external writes | Detached authorization 전 0. 승인 뒤 authorization scope 안에서 provider별 exactly one write와 authoritative readback만 허용한다. |
