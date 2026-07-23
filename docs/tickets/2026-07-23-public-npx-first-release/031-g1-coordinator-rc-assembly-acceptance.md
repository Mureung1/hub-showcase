# 031 — G1 — Fixed-SHA RC assembly를 coordinator가 수락한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Coordinator가 G0d까지 merge된 clean integration full SHA를 freeze하고 별도 detached worktree에서 reviewed G0 command를 그대로 실행한다. 생성된 public snapshot, application `.tgz`, Runtime/application/workspace sidecars와 release intent를 독립 reviewer가 검증한 뒤 하나의 `candidateDigest`로 묶인 retained RC와 `LOCAL_RC_ACCEPTED` receipt를 남긴다.

## Spec Traceability

- User stories: 15–18
- Implementation decisions: `Parallel delivery contract`의 coordinator-only `G1`, `G0 → G1 → I1`
- Implementation decisions: `Public source, license와 publication`의 Publication S0 `LOCAL_RC_ACCEPTED`, immutable candidate intent와 publication artifact boundary
- Testing decisions: five evidence classes의 shared `candidateDigest` minimum binding과 G1 reference RC

## Slice-Specific Constraints

- G1은 feature writer ticket이 아니다. G0 source를 수정하거나 새 generator, workaround, hand-edited release file을 만들지 않는다.
- 030이 fixed review를 통과해 integration에 merge되고 root gates가 green인 exact full SHA를 candidate input으로 freeze한다.
- Coordinator는 integration checkout이 아니라 `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/g1-rc-<short-sha>` detached clean worktree에서 030의 exact documented command/tool versions를 실행한다.
- G0가 source patch, ambient state, current worktree 또는 undeclared input을 요구하면 acceptance하지 않고 030 또는 새 corrective ticket으로 돌려보낸다.
- `candidateDigest`는 최소한 source SHA, npm name/exact version/integrity/tarball SHA-256, Runtime release/tag/asset/archive SHA-256/canonical manifest digest와 workspace bundle descriptor/complete-tree digest를 bind한다.
- Retained RC는 I1, I2와 P1이 같은 byte를 소비할 수 있도록 owner-only local/private artifact root에 보존한다. 재생성한 “동등한” artifact로 바꿔치기하지 않는다.
- Reviewer는 source SHA, exact commands/tool versions, artifact paths/digests와 G0 validation receipt를 검증한다. Fixed input/review SHA가 바뀌면 G1 acceptance는 무효다.
- Production source writable path는 없다. Own ticket closeout과 ignored owner-only evidence만 쓸 수 있다.
- Sibling merge/cherry-pick은 금지되고 G1에서 merge할 feature branch도 없다. 전체 active lane writer 최대 3명과 C-owned shared-delta rule은 유지한다.
- GitHub/npm/Pages/public repository external write와 provider call은 0이다.

## Acceptance Criteria

- [ ] Coordinator가 030 merge 뒤 green integration full SHA를 기록하고 detached clean worktree를 만든다.
- [ ] 030의 reviewed G0 command를 source 수정, dependency drift 또는 undocumented manual step 없이 실행한다.
- [ ] G0a–G0d required checks, two-export/two-pack identity, legal/provenance equality와 tracked-source nonmutation이 fixed input SHA에서 green이다.
- [ ] Retained public snapshot, `.tgz`, Runtime/application sidecars, release display, release intent와 validation receipt의 absolute owner-only paths와 digests를 기록한다.
- [ ] Candidate intent의 minimum binding tuple이 완전하고 모든 retained artifact가 같은 `candidateDigest`를 참조한다.
- [ ] Independent reviewer가 exact input SHA, generated outputs, commands/tool versions와 receipt chain을 fixed review SHA에서 승인한다.
- [ ] Publication S0 `LOCAL_RC_ACCEPTED`만 기록하고 detached publication authorization이나 S1 이후 상태를 합성하지 않는다.
- [ ] Source tree와 integration branch에 production change가 없고 external write count가 0이다.
- [ ] RC artifact는 032–035가 완료되거나 명시적 폐기 결정이 있기 전까지 유지된다.

## Verification

- Cleanliness: detached worktree HEAD/full SHA, porcelain clean 상태와 source before/after tree identity를 기록한다.
- Generator: 030의 exact command, tool versions와 all integrated validation output을 보존한다.
- Artifact review: tarball/resources, Runtime/workspace descriptors, legal/SBOM/provenance와 release-intent digest chain을 독립 검증한다.
- Repository baseline: fixed input SHA에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`; docs 변경분에는 `npm run check:docs-links`, `git diff --check`
- External-write guard: GitHub/npm/Pages/public repo mutation 0을 receipt에 기록한다.

## Blocked By

- [030-g0d-integrated-rc-generator-validation.md](030-g0d-integrated-rc-generator-validation.md) — G0d — Integrated RC generator를 검증한다

## Starting Points

- 030의 fixed reviewed G0 command와 handoff artifact
- G0a clean snapshot manifest
- G0b application `.tgz`, Runtime/application/workspace sidecars와 release display
- G0c release-intent/ledger codecs와 scripted zero-write evidence
- `docs/wayfinding/public-npx-first-release/assets/publication-release-gates-research.md`
- Owner-only generated roots `distribution/releases/**`, `distribution/staging/**` — tracked production source로 취급하지 않는다.

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `G1` coordinator checkpoint |
| owner | Integration coordinator; G0 author와 independent reviewer를 겸하지 않는다. |
| branch/worktree | Feature branch 없음. Coordinator는 `codex/public-preview-integration`의 fixed clean SHA를 freeze하고 `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/g1-rc-<short-sha>` detached worktree에서 실행한다. |
| handoffSha | 030 reviewed SHA가 merge되고 root gates가 green인 integration full SHA를 실행 시점에 coordinator가 기록한다. 문서에서 가짜 SHA를 선기입하지 않는다. |
| writablePaths | Production path 없음; own closeout `docs/tickets/2026-07-23-public-npx-first-release/031-g1-coordinator-rc-assembly-acceptance.md`; owner-only ignored `distribution/releases/**`, `distribution/staging/**` evidence only |
| consumedContracts | 030 reviewed G0 command; fixed source/export/pack/publication artifact contracts; shared candidateDigest tuple |
| predecessorEvidence | 030 merge/review receipt, G0 integrated validation output, latest C-owned contract/integration tip |
| requiredChecks | Exact G0 command, two-export/two-pack and legal/provenance checks, tracked-source nonmutation, root four, receipt/digest review, external-write count 0 |
| reviewOwner | Coordinator와 G0 author가 아닌 독립 release/provenance reviewer |
| handoffArtifact | `g1-local-rc-accepted.json`: input full SHA, review SHA, commands/tool versions, retained artifact paths/digests, candidateDigest와 `LOCAL_RC_ACCEPTED` receipt |
| delivery topology | Sibling merge/cherry-pick 없음; fixed integration SHA execution; active lane writer 최대 3명; shared/source correction은 C 또는 owning predecessor lane으로 반환 |
| external writes | 0. G1은 local/private RC acceptance다. |
