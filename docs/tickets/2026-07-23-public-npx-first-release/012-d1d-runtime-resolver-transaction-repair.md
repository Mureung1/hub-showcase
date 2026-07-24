# 012 — D1d — RuntimeResolver transaction과 repair를 완성한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

`RuntimeResolver.resolve()`가 exact descriptor 검증부터 cache lease, valid generation reuse, retained archive repair, bounded download, safe staging extraction, immutable generation publish와 spawn-boundary 재검증까지 하나의 recoverable transaction으로 수행한다. Corrupt/ambiguous cache와 cancellation은 evidence에 따라 fail closed하고 어떤 older Runtime이나 repository-local fallback도 조용히 실행하지 않는다.

## Spec Traceability

- User stories: 3, 4, 9, 12, 17
- Implementation contract: Module Responsibilities and Seams — `packages/runtime-release`; Runtime release; Failure Behaviour; Data and State Flow — First run/Ready relaunch; Parallel delivery contract — `D1`
- Testing decisions: `resolver_scripted` evidence class와 exact candidate identity

## Slice-Specific Constraints

- Public Interface는 S1 frozen `RuntimeResolver.resolve({ appDataRoot, signal, report })` 하나이며 descriptor와 canonical manifest를 network 전에 immutable process snapshot으로 검증한다.
- Content-addressed lease는 same identity caller를 bounded join하고 different identity와 ambiguous owner를 추측하지 않는다.
- 매 resolve와 spawn handoff 직전에 final generation complete tree를 canonical verifier로 다시 확인한다. Receipt, directory existence와 prior success만으로 reuse하지 않는다.
- Owned corrupt generation은 evidence-bound quarantine 뒤에만 교체한다. Ambiguous/unowned/symlink residue는 `runtime_recovery_required`이며 broad appData cleanup을 하지 않는다.
- Valid retained archive는 network 없이 new staging extraction·verification으로 corrupt/missing generation을 repair할 수 있다. Invalid retained archive는 transport policy에 따라 exact same asset만 reacquire한다.
- Generation은 owned staging에서 완전히 검증한 뒤 content-addressed final path로 atomic publish하고 strict readback한다. Final generation을 in-place 수정하지 않는다.
- Cancellation은 download, extraction과 publish 경계에서 old valid generation 또는 retryable owned residue만 남긴다. Cancel 뒤 success progress/receipt를 합성하지 않는다.
- Progress와 error는 S1 stable allowlist만 내보내며 URL, path, PID, HTTP body, digest와 nested cause를 public callback에 노출하지 않는다.
- Current exact asset unavailable, corrupt cache, synthetic prior generation이 있어도 older version, mirror, repository bundle, system Python/tar로 fallback하지 않는다.
- Host process·Browser UI와 public release publication은 구현하지 않는다. Host에는 verified immutable `runtimeRoot`와 spawn-boundary verifier adapter만 넘긴다.
- Lane은 fixed reviewed `handoffSha`에서 시작하고 sibling branch를 merge·cherry-pick하지 않는다. Shared manifest·lockfile·contract 변경은 C-only다.
- Coordinator는 이 lane을 포함해 동시에 최대 3개 writer lane만 활성화한다.

## Acceptance Criteria

- [x] Valid descriptor+generation resolve는 network 0회로 complete-tree reverify된 exact `runtimeRoot`를 반환한다.
- [x] Same-identity concurrent resolve는 하나의 lease/transaction에 join하고 different/ambiguous owner는 mutation 없이 stable conflict/recovery로 끝난다.
- [x] Corrupt generation+valid retained archive는 quarantine→fresh extract→atomic publish→readback으로 repair되고 network 0회다.
- [x] Missing/corrupt archive는 exact asset download 뒤 safe extraction을 거치며 unavailable/access-denied/unsafe/integrity failure에 다른 Runtime을 실행하지 않는다.
- [x] Scripted `200/206/416`, redirect/encoding drift, corrupt cache/archive, cancellation, synthetic prior no-auto-downgrade와 repair matrix가 stable event/error sequence로 고정된다.
- [x] Publish/readback fault와 process restart에서 old valid generation 또는 evidence-backed recovery state만 관찰되고 half-published generation이 verified가 되지 않는다.
- [x] Spawn-boundary adapter가 complete-tree drift를 child spawn 전에 거절한다.
- [x] D1 completion artifact가 downstream H1/I evidence에 exact descriptor, verified generation identity와 scripted resolver evidence index를 제공한다.

## Result

`RuntimeResolver.resolve()`는 frozen admission 뒤 owner-only cache를 bootstrap하고, content-addressed lease 아래 cache reuse 또는 exact repair transaction을 수행한다. Transaction은 retained archive inspection·quarantine, bounded exact download, exclusive staging, safe extraction, no-clobber generation publish, lease settlement와 fresh complete-tree readback을 한 경계에서 조율한다. 반환한 exact `VerifiedRuntime` object만 bundle-local spawn authority를 가지며 child spawn 직전에 generation과 complete tree를 다시 검증한다.

| Invariant | 구현 결과 |
| --- | --- |
| Host composition | Host는 admission·owner당 `createRuntimeResolverBundle()` 하나를 만들고 process lifetime 동안 재사용해야 한다. Shared flight registry와 `VerifiedRuntime`의 `WeakMap` spawn authority는 bundle-local이다. Cross-bundle same-owner lease join은 correctness evidence이며 여러 bundle을 만드는 host contract가 아니다. |
| Caller와 transaction cancellation | Caller는 shared transaction에서 독립적으로 detach한다. 마지막 subscriber가 사라지면 flight가 draining으로 전환되고 transaction을 취소하며, late caller는 settlement 뒤 fresh transaction을 시작한다. |
| Lease settlement | Owner가 `complete` 또는 `fail` 호출을 시작하는 순간 해당 intent가 terminal settlement를 claim한다. Port 호출이 reject하더라도 반대 settlement나 같은 settlement를 다시 호출하지 않는다. |
| Joined completion | Joined completion receipt는 owner transaction 종료를 알리는 wake hint일 뿐 generation reuse, Ready 또는 spawn authority가 아니다. Joiner는 completion 뒤 exact generation complete tree를 fresh inspect한다. |
| Repair와 publish | Evidence-backed owned corruption만 nonce-scoped quarantine한다. Valid retained archive는 offline repair에 사용하고 invalid archive는 exact asset만 reacquire한다. Generation은 verified staging에서 atomic rename한 뒤 independent strict readback을 통과해야 한다. |
| Progress와 failure | `checking_cache`부터 `ready`까지 monotonic allowlist만 보고하며 reporter failure를 격리한다. Failure는 S1 stable `runtime_*` code로 닫고 URL, path, digest와 nested cause를 public callback에 노출하지 않는다. |
| Fallback | `404/410`, `401/403`, unsafe archive, integrity drift와 cancellation에서 older Runtime, mirror, repository bundle, system Python/tar를 실행하지 않는다. Synthetic prior generation은 untouched 상태로 남는다. |
| Source-internal seam | Production factory와 injected-effect testing factory는 frozen package entrypoint 밖 source-internal seam이다. Test factory와 deterministic fixture는 product contract가 아니며 compiled `dist/`에 포함되지 않는다. |

현재 Node/Darwin surface는 bare pathname `rename`/`unlink`와 verify→actual spawn을 pre-opened authority에 원자적으로 bind하지 못한다. 이번 구현은 owner-only root, exact `(dev, ino, uid)` revalidation과 cooperative per-digest lease를 경계로 사용한다. 동일 UID의 비협조 process race를 제거하는 조건은 descriptor/dirfd/capability-bound rename·unlink·spawn native primitive의 도입이며, 이번 release에는 이를 위해 새 native dependency를 추가하지 않았다.

## Verification

| Gate | Exact result |
| --- | --- |
| Focused resolver matrix | `runtime-resolver-faults.test.ts` 22 tests green, new real-filesystem restart cases 3/3 green |
| Runtime release package | Exact code/test candidate `27c3dd72c`: 352/352 tests green in 81.006s; typecheck·build green |
| Fixture build boundary | Root build 뒤 `dist/runtime-resolver-fixture.test.{js,d.ts}` 모두 absent |
| Root test | `npm test` exit 0; 모든 workspace와 camp demo green |
| Root static gates | `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell` exit 0 |
| Documentation and diff | `npm run check:docs-links` active 28/historical 2 green; `git diff --check` green |
| External scope | Repository 밖 owner-only isolated appDataRoot와 deterministic scripted transport만 사용했다. Public GitHub asset과 live provider는 호출하지 않았다. |

앞서 다른 process와 package full suite가 겹쳤을 때 extraction worker의 2초 bounded wait가 한 차례 timeout됐으나, exact candidate의 단독 package full suite와 root sequential suite에서는 재현되지 않았다.

## Blocked By

- [011-d1c-runtime-download-resume-transport.md](011-d1c-runtime-download-resume-transport.md) — D1c — Runtime download와 resume transport를 구현한다

## Starting Points

- `packages/runtime-release/src/contract.ts`
- D1a descriptor/cache/lease/error implementation
- D1b safe archive extraction과 complete-tree verifier
- D1c `ArchiveTransport`와 partial journal
- `packages/codex-chat-runtime/src/production-bundle.ts`
- `packages/codex-chat-runtime/src/runtime.ts` — verified root consumer and spawn-boundary donor
- `docs/wayfinding/public-npx-first-release/assets/runtime-release-delivery-research.md`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `D1d` / `D1` completion |
| owner | `D` — Runtime delivery |
| branch | `codex/public-preview-d1d-resolver-repair` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/d1d-resolver-repair` |
| handoffSha | `20f0f8e5a6a3d06eb6906b8904bdd6ccc2f47f32` — coordinator가 011의 fixed reviewed SHA를 integration branch에 `--no-ff` merge하고 predecessor 및 integration runtime-release/root gates를 green으로 확인한 exact integration HEAD |
| writablePaths | `packages/runtime-release/src/**` 중 resolver transaction/lease/repair/progress implementation·tests (`src/contract.ts`, package manifest와 lockfile 제외); resolver integration fixtures; `docs/tickets/2026-07-23-public-npx-first-release/012-d1d-runtime-resolver-transaction-repair.md` |
| consumedContracts | S1 frozen resolver/progress/error contract; D1a descriptor/cache/lease; D1b safe staging verifier; D1c transport/partial archive |
| predecessorEvidence | 011 fixed reviewed SHA, scripted transport/resume/cancellation receipt와 prior archive-security evidence |
| requiredChecks | Full resolver scripted matrix; cache lease/repair/publish/spawn reverify tests; runtime-release package test/typecheck/build; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | Independent Runtime transaction/security reviewer와 downstream H/I consumer reviewer |
| handoffArtifact | Reviewed fixed D1d commit SHA, D1 completion descriptor/generation contract, scripted resolver evidence index와 spawn-boundary verification receipt |

## Candidate Receipt — coordinator closeout

| Evidence | Receipt |
| --- | --- |
| Fixed handoff | `20f0f8e5a6a3d06eb6906b8904bdd6ccc2f47f32` |
| Claim | `9e622bfebfb97bb703b99e2764d225697401b7ba` |
| D1 support implementation | `22d4abd8b352141790edec46f5d9315f7dff96ac`부터 `8ffab2f2ba03c1f28a0dd02f196484e03e0f1635`까지 generation verifier, lease, publish, retained/generation quarantine, cache bootstrap, staging, deadline/progress와 cancellation hardening을 단계별 commit으로 보존했다. |
| Resolver production tip | `2cc15dda717c5bce4e0dc93503452ebf7dcf2e65` — `b2d9d8222b21d0820ca3210b6f9ccf546ab5bbdd` transaction 구현 뒤 flight context corrective를 적용한 independently reviewed production tip |
| Resolver evidence tip | `27c3dd72ce13eb7713b49b10254b8b9ae1eb6b20` — `d3f0998b349179aec34146873c6b8cc4bd03e8e9` recovery matrix와 terminal failure corrective를 포함한 exact code/test candidate |
| Descriptor·generation handoff | Frozen descriptor/canonical manifest admission, exact release identity, filesystem-bound generation verification receipt와 immutable `VerifiedRuntime`/spawn-boundary verifier가 H1/I의 consumed evidence다. |
| Scripted evidence index | `runtime-resolver.test.ts`: first install/cache hit, shared flight, real lease ambiguity, retained repair, publish-readback restart, last-caller cancel→`206` resume, exact `404` no-downgrade, spawn drift. `runtime-resolver-faults.test.ts`: admission snapshot, settlement, cancellation ordering, owner/namespace conflict, `206/416`, HTTPS redirect/downgrade, encoding, access denied, unsafe archive와 corrupt archive reacquisition. |
| Independent review | Architecture/race review는 production `2cc15dda7`과 test-only `d3f0998b3`에서 PASS했다. Spec review는 final evidence `27c3dd72c`에서 blocker 0 PASS했다. Flow/security corrective review도 terminal settlement, caller detach, post-commit readback과 owner snapshot을 fail-closed로 확인했다. |
| Frozen boundaries | `src/contract.ts`, `src/index.ts`, package manifest, lockfile와 Codex SDK source/patch stack 변경 0건 |
| Integration owner follow-up | `packages/runtime-release/README.md`의 D1d 이전 current-state 문구를 integration merge 뒤 package owner가 현재 resolver·lease·repair·publish truth, 위 invariants, cooperative-owner limitation/removal condition과 evidence index로 갱신한다. 이 lane은 ticket의 original writablePaths 밖 README를 수정하지 않았다. |
| Closeout | Parent Spec은 다른 release tickets가 남아 있으므로 상태를 변경하지 않는다. Coordinator는 reviewed candidate를 integration branch에 merge하고 README owner update와 downstream H1/I consumption을 이어간다. |
