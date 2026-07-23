# 011 — D1c — Runtime download와 resume transport를 구현한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Exact descriptor가 지정한 HTTPS Runtime archive 한 개만 bounded하게 내려받고, strong validator가 증명하는 동일 representation에서만 partial download를 재개한다. Redirect, `200/206/416`, cancellation과 transient failure를 명시적으로 처리해 valid retained partial 또는 verified archive byte만 남기며 mirror·version fallback을 만들지 않는다.

## Spec Traceability

- User stories: 3, 4, 12
- Implementation contract: Runtime release — download/resume와 exact asset; Failure Behaviour; Parallel delivery contract — `D1`
- Testing decisions: `200/206/416`, redirect/content encoding, unavailable exact asset와 cancellation

## Slice-Specific Constraints

- Package-private `ArchiveTransport`와 scripted fake를 사용해 resolver policy와 HTTP mechanics를 분리한다. Browser/host에 URL, header나 transport response를 노출하지 않는다.
- Initial URL과 모든 redirect hop은 HTTPS이며 hop 수와 cycle을 bounded하게 검사한다. Origin이 바뀌는 redirect에는 authorization, cookie 등 secret-bearing header를 전달하지 않는다.
- `Accept-Encoding: identity`를 요구하고 non-identity content encoding을 거절한다.
- Fresh `200`은 partial을 truncate하고 처음부터 기록한다. `206`은 exact requested start, valid `Content-Range`, descriptor total bytes와 strong ETag/If-Range continuity가 모두 맞을 때만 append한다.
- Weak/absent validator에는 partial append가 없다. `416`은 local length/expected total과 representation을 bounded하게 reconcile할 수 있는 경우만 reuse하며 그 밖에는 한 번 fresh restart한다.
- Archive bytes와 SHA-256은 descriptor와 exact하게 일치해야 verified retained archive가 된다.
- Partial journal은 descriptor/archive identity, written bytes와 strong validator만 owner-only로 기록한다. Raw URL header, credential과 response body를 저장하지 않는다.
- Retry는 allowlisted transient network interruption에 한 번만 허용한다. `401/403`, `404/410`, integrity, policy와 deterministic HTTP failure는 stable distinct outcome이며 blind retry하지 않는다.
- Cancellation은 current request와 file handle을 bounded하게 닫고 only-valid partial만 보존한다. Unverifiable partial·journal은 실행 authority가 아니다.
- Extraction, generation publish, cache quarantine와 full `resolve()` orchestration은 012 책임이다.
- Lane은 fixed reviewed `handoffSha`에서 시작하고 sibling branch를 merge·cherry-pick하지 않는다. Shared manifest·lockfile·contract를 수정하지 않는다.
- Coordinator는 이 lane을 포함해 동시에 최대 3개 writer lane만 활성화한다.

## Acceptance Criteria

- [ ] Scripted fresh `200`이 exact bytes/hash archive를 만들고 unexpected encoding/length/hash를 verified로 승격하지 않는다.
- [ ] Strong ETag 기반 exact `206`만 append하며 validator, range start/total 또는 descriptor drift는 truncate/fail-closed policy를 따른다.
- [ ] `200` fallback, bounded valid/invalid `416`, weak/absent ETag와 interrupted stream matrix가 duplicate·stale byte 없이 끝난다.
- [ ] HTTPS downgrade, redirect cycle/hop overflow와 cross-origin secret header propagation이 0건이다.
- [ ] `401/403`, `404/410`, transient network와 integrity failure가 stable error로 구분되고 retry budget을 넘지 않는다.
- [ ] Cancellation/restart가 only-valid partial journal을 보존하고 file descriptor, request와 temporary writer가 남지 않는다.
- [ ] 다른 URL, mirror, cached older version과 moving release로 fallback하는 code path가 없다.

## Verification

- Targeted test or command: `packages/runtime-release` scripted `ArchiveTransport` matrix for redirects, `200/206/416`, validators, content encoding, retry, cancellation와 archive hash
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `git diff --check`
- Manual or live smoke: 없음. External GitHub network 대신 deterministic scripted transport를 사용한다.

## Blocked By

- [010-d1b-safe-runtime-archive-extraction.md](010-d1b-safe-runtime-archive-extraction.md) — D1b — Runtime archive를 안전하게 staging에 추출한다

## Starting Points

- `packages/runtime-release/src/contract.ts`
- D1a content-addressed archive/partial path와 stable error contract
- D1b verified archive/staging input contract
- `docs/wayfinding/public-npx-first-release/assets/runtime-release-delivery-research.md`
- Node 22 `fetch`, stream, crypto와 file-handle APIs의 existing repository usage

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `D1c` |
| owner | `D` — Runtime delivery |
| branch | `codex/public-preview-d1c-download-resume` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/d1c-download-resume` |
| handoffSha | Claim 시 coordinator가 010의 fixed reviewed SHA를 integration branch에 `--no-ff` merge하고 predecessor 및 integration runtime-release/root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·가짜 SHA를 쓰지 않는다. |
| writablePaths | `packages/runtime-release/src/**` 중 transport/download/partial-journal implementation·tests (`src/contract.ts`, package manifest와 lockfile 제외); scripted transport fixtures; `docs/tickets/2026-07-23-public-npx-first-release/011-d1c-runtime-download-resume-transport.md` |
| consumedContracts | D1a descriptor/archive/cache identity와 stable errors; D1b verified archive/staging contract |
| predecessorEvidence | 010 fixed reviewed SHA, safe TAR dependency gate와 malicious archive/verified-staging receipt |
| requiredChecks | Full scripted transport/resume/cancel matrix; runtime-release package test/typecheck/build; archive extraction regression; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | Independent HTTP/resume/security reviewer |
| handoffArtifact | Reviewed fixed D1c commit SHA, scripted transport trace roster와 verified archive/partial cleanup receipt |
