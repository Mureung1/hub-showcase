# 011 — D1c — Runtime download와 resume transport를 구현한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] Scripted fresh `200`이 exact bytes/hash archive를 만들고 unexpected encoding/length/hash를 verified로 승격하지 않는다.
- [x] Strong ETag 기반 exact `206`만 append하며 validator, range start/total 또는 descriptor drift는 truncate/fail-closed policy를 따른다.
- [x] `200` fallback, bounded valid/invalid `416`, weak/absent ETag와 interrupted stream matrix가 duplicate·stale byte 없이 끝난다.
- [x] HTTPS downgrade, redirect cycle/hop overflow와 cross-origin secret header propagation이 0건이다.
- [x] `401/403`, `404/410`, transient network와 integrity failure가 stable error로 구분되고 retry budget을 넘지 않는다.
- [x] Cancellation/restart가 only-valid partial journal을 보존하고 file descriptor, request와 temporary writer가 남지 않는다.
- [x] 다른 URL, mirror, cached older version과 moving release로 fallback하는 code path가 없다.

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
| handoffSha | `bfb57e71a87a064bc6f9081c876bb5084effe4b5` — coordinator가 reviewed D1b closeout을 integration branch에 `--no-ff` 반영하고 predecessor 및 integration runtime-release/root gates를 green으로 확인한 exact handoff |
| writablePaths | `packages/runtime-release/src/**` 중 transport/download/partial-journal implementation·tests (`src/contract.ts`, package manifest와 lockfile 제외); scripted transport fixtures; `docs/tickets/2026-07-23-public-npx-first-release/011-d1c-runtime-download-resume-transport.md` |
| consumedContracts | D1a descriptor/archive/cache identity와 stable errors; D1b verified archive/staging contract |
| predecessorEvidence | 010 fixed reviewed SHA, safe TAR dependency gate와 malicious archive/verified-staging receipt |
| requiredChecks | Full scripted transport/resume/cancel matrix; runtime-release package test/typecheck/build; archive extraction regression; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | Independent HTTP/resume/security reviewer |
| handoffArtifact | Reviewed fixed D1c commit SHA, scripted transport trace roster와 verified archive/partial cleanup receipt |

## Candidate Receipt — coordinator closeout

Coordinator가 exact code tip의 independent review와 package/root gate를 확인했다. 아래 closeout commit은 이 ticket receipt와 `RuntimeDirectoryCapability`의 authority 설명 comment만 갱신하며 reviewed implementation은 바꾸지 않는다.

| Evidence | Result |
| --- | --- |
| fixed handoff | `bfb57e71a87a064bc6f9081c876bb5084effe4b5` |
| claim commit | `0f74bbc98d0a618fa15a0f3347129ca5fc275a49` — `docs: claim runtime download resume transport` |
| candidate code commits | `d812d53320fa68893ba9edec4536be996baf782c` — exact archive download retention; `bef3ff608e2ec99e9103d3fc65d9dedf2c7b4c2a` — resume/redirect/transport hardening; `12c6fb83c7f3491c36988dd0fd36acc6f9068a65` — recovery race closure; `9823c121505a765e03810809dec7241152460585` — completed-partial cancellation reset; `08d116105f2be4ac2593302f65cc53f48dc45279` — full descriptor binding과 reversed `206` rejection; `af2bfe0a47de27cec97e1604a4ab3935f50f82af` — canonical descriptor journal digest assertion; `ef87178cdb79e1b354209b85a83179b97d5f5069` — atomic no-clobber archive hardlink publish; `788438e6c7ff1a0cfbed4aea26fcfe5b9d4de7d0` — zero-journal final-link-loss restart; `7f4d465fadaf47b6f0236bf79a612e4d95bdc256` — zero-reset I/O stable error normalization; `57cb79ffdabbed9030abe23483a334bb87423106` — pre-reset exact nlink-one identity revalidation |
| reviewed code tip | `57cb79ffdabbed9030abe23483a334bb87423106` |
| exact transport | Package-private `ArchiveTransport`는 HTTPS one-hop exchange만 수행하고 caller는 bounded redirect cycle/hop policy를 소유한다. Request는 `Accept-Encoding: identity`, `Range`, `If-Range`의 closed set만 사용하며 raw URL·header·credential·body를 journal이나 product contract에 노출하지 않는다. Cross-origin redirect도 이 archive header set만 재구성한다. |
| response and retry matrix | Fresh/range-ignored `200`, exact strong-validator `206`, bounded `416` reconcile, duplicate/invalid header, non-identity encoding, declared/streamed length, digest, `401/403`, `404/410`, `408/429/500/502/503/504`, request/body interruption을 scripted하게 고정했다. Allowlisted transient failure는 exact URL에서 한 번만 retry하며 exact asset 외 URL, mirror, older/moving release fallback은 없다. |
| partial authority | Journal은 full canonical descriptor digest, archive identity, written bytes와 strong ETag만 exact schema로 기록한다. Strong validator만 append authority이고 weak/absent validator 및 `writtenBytes: 0`은 append authority가 아니다. Final link가 사라진 owner-bound nlink-one zero/no-journal partial은 descriptor size bound와 final handle stat의 regular/nlink `1`/`0600`/owner/device/inode를 확인한 뒤 truncate+fsync하고 fresh request로 재개한다. Reset I/O failure는 `runtime_storage_unavailable`, alias/identity drift는 recovery/unsafe outcome으로 닫히며 network work는 0이다. |
| atomic retained archive | Verified partial은 retained archive directory capability가 destination direct leaf에 no-clobber hardlink하고 directory fsync와 full digest/path readback을 마친 뒤 snapshot이 된다. Durable retained form은 exact standalone nlink-one final 또는 canonical final과 `archive.part`가 같은 inode인 exact nlink-two pair뿐이다. Foreign alias, nlink `3+`, collision, source/root substitution과 final readback replacement은 기존 byte를 delete·overwrite하지 않고 fail closed한다. |
| cancellation and cleanup | Pre-abort는 network/partial mutation 0건이다. Mid-stream cancellation은 response와 handles를 닫고 strong-validator checkpoint 또는 zero fresh state만 남긴다. No-clobber commit이 시작된 뒤 cancellation은 link/fsync/readback 완료까지 defer되어 valid retained archive를 ambiguous cancellation residue로 만들지 않는다. |
| targeted matrix | `runtime-archive-download.test.ts` + `runtime-archive-transport.test.ts` → `87/87`. 여기에는 strong→weak success 뒤 final-link loss, injected truncate `EIO` stable projection, open/reset 사이 alias 생성, atomic collision/substitution/readback, cancellation, redirect, `200/206/416`, validator와 retry case가 포함된다. |
| package gates | `npm test -w @ay-ple/runtime-release` → `239/239`; `npm run typecheck -w @ay-ple/runtime-release` → green; `npm run build -w @ay-ple/runtime-release` → green. D1b extraction regression 전체를 포함한다. |
| repository gates | Exact reviewed code tip에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links` (`28` active, `2` historical), `git diff --check`가 모두 green이다. |
| frozen/diff boundary | `package.json`, `package-lock.json`, package manifest, `src/contract.ts`, `src/index.ts`, `runtime-archive-extraction.ts`, package README를 수정하지 않았다. Authorized source exception은 retained-cwd capability의 minimal no-clobber link primitive와 이 closeout의 authority comment 정밀화뿐이다. |
| independent review | Fixed-base Standards review는 P0–P2 `0`건, Spec review는 P0–P3 `0`건이다. Atomic publish, full descriptor binding, reversed `206`, zero-journal recovery, stable error projection과 pre-reset alias race correction을 exact code tip에서 재검증했다. |
| D1d cooperative lease handoff | D1c의 final pre-truncate stat 뒤 OS-level conditional truncate가 없는 irreducible race는 D1d cache lease를 cooperative mutation boundary로 요구한다. D1d는 invalid nlink-two pair를 final과 partial root 단위로 함께 quarantine/reconcile하고 valid final alias가 있는 partial을 truncate하지 않는다. Publish/quarantine, generation orchestration과 fresh complete-tree readback은 계속 D1d 책임이다. |
| deferred Retry-After | D1c는 transient status의 one-retry budget과 stable outcome만 고정한다. `Retry-After` 해석, bounded delay와 전체 startup deadline/clock 결합은 resolver deadline을 소유하는 D1d에서 구현한다. |
| owner documentation | `packages/runtime-release/README.md`의 download/resume 미구현 문구와 capability 설명은 integration 시 owner-first로 갱신해야 한다. 이 lane의 frozen package README 경계를 지켜 candidate branch에서는 수정하지 않았다. |
| closeout | Ticket state는 `completed`, acceptance checkbox는 모두 완료다. Integration branch 반영과 package README owner update는 coordinator의 다음 integration action이다. |

## Coordinator Integration Closeout

| Evidence | Result |
| --- | --- |
| integration merge | `d4bc34fb36358dfcab3bdd4c0c9ac91bc8866591` — reviewed D1c branch를 `codex/public-preview-integration`에 `--no-ff` 병합했다. |
| reviewed implementation | Code tip `57cb79ffdabbed9030abe23483a334bb87423106`, candidate closeout `89b34603e681a6476019110b08194cc85c0b2fca`를 그대로 반영했다. |
| integration gates | Merge 직후 clean 재실행한 root `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`가 green이다. 첫 `npm test`에서 D1c diff 밖 기존 Server cleanup-deadline test 한 건이 실패했고 100회 fresh-process 진단에서 2회 재현됐다. D1c가 Server source를 변경하지 않았고 과거 동일 stabilization precedent가 있음을 확인한 뒤 `2790d6fd47b05a964337693f92e1f51f436ad8ed`에서 해당 test-only deadline을 `5ms`에서 `250ms`로 조정했다. Exact pair와 Server suite가 green이다. |
| owner documentation | 이 integration closeout에서 `packages/runtime-release/README.md`를 실제 transport/download/resume, retained archive representation과 D1d 잔여 책임에 맞춰 owner-first로 갱신했다. |
| next handoff | D1d는 이 closeout commit을 exact `handoffSha`로 사용한다. Cooperative per-digest lease, invalid final·partial pair의 root-level quarantine, generation publish/readback, `Retry-After`와 overall startup deadline, spawn-boundary revalidation을 소유한다. |
