# 012 — D1d — RuntimeResolver transaction과 repair를 완성한다

## Agent triage

- State: in-progress
- Surface: local-ticket
- Next actor: /root/d1d_resolver_repair

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

- [ ] Valid descriptor+generation resolve는 network 0회로 complete-tree reverify된 exact `runtimeRoot`를 반환한다.
- [ ] Same-identity concurrent resolve는 하나의 lease/transaction에 join하고 different/ambiguous owner는 mutation 없이 stable conflict/recovery로 끝난다.
- [ ] Corrupt generation+valid retained archive는 quarantine→fresh extract→atomic publish→readback으로 repair되고 network 0회다.
- [ ] Missing/corrupt archive는 exact asset download 뒤 safe extraction을 거치며 unavailable/access-denied/unsafe/integrity failure에 다른 Runtime을 실행하지 않는다.
- [ ] Scripted `200/206/416`, redirect/encoding drift, corrupt cache/archive, cancellation, synthetic prior no-auto-downgrade와 repair matrix가 stable event/error sequence로 고정된다.
- [ ] Publish/readback fault와 process restart에서 old valid generation 또는 evidence-backed recovery state만 관찰되고 half-published generation이 verified가 되지 않는다.
- [ ] Spawn-boundary adapter가 complete-tree drift를 child spawn 전에 거절한다.
- [ ] D1 completion artifact가 downstream H1/I evidence에 exact descriptor, verified generation identity와 scripted resolver receipt를 제공한다.

## Verification

- Targeted test or command: `packages/runtime-release` full scripted resolver integration matrix, cache lease/concurrency, retained archive repair, publish fault와 spawn-boundary reverify tests
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `git diff --check`
- Manual or live smoke: Repository 밖 isolated appDataRoot에서 pre-seeded valid/corrupt cache를 resolve한다. Public GitHub asset이나 live provider는 호출하지 않는다.

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
