# 034 — I2b — Prepublication live OAuth→Ready smoke를 실행한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

G1 exact candidate를 clean supported Apple Silicon Mac user 또는 reverted VM에서 실제 실행해 Codex-managed Browser OAuth, pinned Codex, Guided Setup, `Semester Ready`, same-version relaunch와 process cleanup을 증명한다. Hostile context, Gatekeeper/quarantine, OAuth cancel/reconnect, callback interference와 representative primary `SIGKILL`까지 I2a secret-free recorder로 남겨 `prepublication_live(I2)` evidence를 완성한다.

## Spec Traceability

- User stories: 2–14, 17
- Implementation contract: supported release lane, managed account lifecycle, app-owned workspace, production host/root와 failure behaviour
- Implementation decisions: `Parallel delivery contract`의 I2 completion과 `I2 → P1`
- Testing decisions: `prepublication_live(I2)`, `UI, live와 public acceptance`의 actual OAuth, quarantine, hostile context, Ready/relaunch와 cleanup

## Slice-Specific Constraints

- 이 티켓은 actual-run checkpoint이며 production source나 harness를 고치지 않는다. Defect가 보이면 증거를 보존하고 owning predecessor/new corrective ticket으로 돌아가며 같은 run을 green으로 재해석하지 않는다.
- Exact G1 retained `.tgz`, Runtime archive/cache, workspace bundle과 I2a reviewed harness만 사용한다. Rebuilt package, local source checkout, global Codex 설치/auth 또는 moving version으로 대체하지 않는다.
- Clean supported Apple Silicon Mac/OS user 또는 reverted VM, default Gatekeeper, repository 밖 cwd와 fresh npm/app/auth/cache/workspace roots를 요구한다. Environment `HOME` override만으로 clean machine을 합성하지 않는다.
- 실제 Codex-managed Browser login을 사용한다. OAuth tab close/cancel, hosted-success 후 AY-PLE tab 복귀, callback port interference와 reconnect를 검증하고 success를 URL이나 stale state로 추측하지 않는다.
- Hostile ancestor/user Git/config/instruction/Skill canary를 두고 package-owned declared sources만 Runtime에 들어가는지 I2a post-Ready probe로 확인한다.
- Default quarantine/Gatekeeper 상태를 기록하고 manual security override로 green을 만들지 않는다.
- Normal close와 signal/representative primary `SIGKILL` 뒤 listener, lock, Node/Python/native descendants와 partial workspace/setup envelope를 검사한다.
- Missing clean machine/account entitlement/network 또는 interactive user availability는 `blocked` evidence다. Deterministic fixture, existing global session이나 inferred source로 fake-green하지 않는다.
- Token, OAuth URL/user code/login ID, email, raw provider error, credential path/auth bytes/hash와 user content를 저장하지 않는다.
- 033 reviewed SHA가 integration에 merge된 `handoffSha`에서 actual-run branch를 만든다. Sibling merge/cherry-pick 금지, fixed candidate/review rule과 max 3 lane writers를 유지한다.
- Publication external writes는 0이다. 실제 OAuth/provider traffic은 이 smoke의 제한된 interactive test traffic일 뿐 GitHub/npm/Pages/publication authority를 부여하지 않는다.

## Acceptance Criteria

- [ ] Supported clean Mac/user or reverted VM prerequisite와 G1 candidate/I2a harness exact identity가 run 시작 전에 검증된다.
- [ ] Quarantined exact application package가 default Gatekeeper lane에서 manual bypass 없이 시작된다.
- [ ] Fresh signed-out account read→official Browser OAuth→fresh connected read가 성공하고 stale/global credential 사용이 0이다.
- [ ] OAuth cancel/tab close, hosted-success tab return, callback port interference와 reconnect가 false connected state나 orphan process 없이 수렴한다.
- [ ] Guided Setup에서 final approval 전 mutation 0, approval 뒤 exclusive v3 scaffold와 honest `Semester Ready`가 확인된다.
- [ ] Actual pinned Codex와 workspace Runtime transition이 verified identity에서 실행되고 auth-only Runtime이 bounded하게 retire된다.
- [ ] I2a exact-match post-Ready probe에서 hostile ancestor/user canary 0, package-owned instructionSources/Skills exact set, Turn·rollout·mutation 0이다.
- [ ] Same-version relaunch가 Ready workspace를 다시 열고 expired/disconnected account 시 workspace 보존과 reconnect 안내를 유지한다.
- [ ] Normal close와 representative `SIGKILL` recovery 뒤 orphan listener/process/lock, duplicate workspace와 partial durable state가 0이다.
- [ ] Secret-free evidence가 exact G1 candidateDigest를 참조하고 prerequisite 부족·unknown·manual override를 green으로 기록하지 않는다.

## Verification

- Preflight: machine/OS/arch/Node/npm/Chrome, clean user/VM, network/account entitlement, fresh roots와 candidate/harness digests
- Live journey: signed-out read, OAuth cancel/reconnect/success, setup approval, Ready, post-Ready probe와 same-version relaunch
- Security/context: default quarantine/Gatekeeper, callback interference, hostile ancestor/user canary와 evidence redaction scan
- Lifecycle: normal close, relevant signals와 representative primary `SIGKILL` recovery/process-tree/lock scan
- Repository baseline: fixed handoff SHA의 root four checks와 I2a harness checks를 run receipt에 연결한다. Source는 수정하지 않는다.

## Blocked By

- [033-i2a-live-evidence-conformance-harness.md](033-i2a-live-evidence-conformance-harness.md) — I2a — Live evidence conformance harness를 고정한다

## Starting Points

- 031 G1 retained exact candidate와 `LOCAL_RC_ACCEPTED` receipt
- 033 I2a reviewed harness, evidence schema와 prerequisite checker
- `docs/wayfinding/public-npx-first-release/assets/clean-machine-smoke-protocol-research.md`
- `packages/codex-chat-runtime/manifests/**`
- Predecessor-created public `ay-ple` bin, managed Browser OAuth and setup/Ready UI

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `I2b` / owner `I`; 이 checkpoint가 I2 completion이다. |
| owner | Live QA operator 1명; production/harness author와 independent reviewer를 겸하지 않는다. |
| branch/worktree | `codex/public-preview-i2b-live-smoke` / `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/i2b-live-smoke` |
| handoffSha | 033 reviewed SHA가 integration에 merge되고 baseline gates가 green인 coordinator-recorded immutable full SHA. Actual candidateDigest와 함께 run 전에 freeze하며 추측하지 않는다. |
| writablePaths | Production source 없음; own closeout `docs/tickets/2026-07-23-public-npx-first-release/034-i2b-prepublication-live-oauth-ready-smoke.md`; owner-only ignored live evidence only |
| consumedContracts | G1 exact candidate; I2a harness/schema; managed OAuth/account transition; v3 setup/Ready; public host/process lifecycle |
| predecessorEvidence | 033 fixed review/merge receipt, G1 retained artifact receipt, I0 deterministic and I1 packed evidence, clean-machine prerequisite receipt |
| requiredChecks | Actual live OAuth→Ready/relaunch, quarantine/hostile-context/privacy, callback/cancel, normal+SIGKILL cleanup, fixed root baseline checks |
| reviewOwner | Operator와 implementation authors가 아닌 independent release/live-evidence reviewer |
| handoffArtifact | `i2b-prepublication-live.json`: candidateDigest, redacted environment/launch attestation, stage outcomes, cleanup digests와 blocked/green disposition. Secrets는 포함하지 않는다. |
| delivery topology | Sibling merge/cherry-pick 금지; coordinator-only integration of ticket closeout; active lane writer 최대 3명; defect fix는 owning lane/C serial delta로 반환 |
| external writes | Publication writes 0. OAuth/provider는 actual smoke에 필요한 bounded interaction만 허용하며 publication authorization으로 간주하지 않는다. |
