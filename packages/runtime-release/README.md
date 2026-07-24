# `@ay-ple/runtime-release`

`@ay-ple/runtime-release`는 public application이 지정한 exact Runtime release를 검증하고 준비하는 Node-only Module의 workspace다.

## 현재 구현

| Source | 현재 책임 |
| --- | --- |
| `src/index.ts` | Production host가 소비하는 descriptor decoder, caller-safe authority error, resolver bundle factory와 필요한 contract type만 공개한다. Testing factory·dependency/fault hook, cache/transport/extraction/generation/assembler/admission 구현과 diagnostic evidence type은 package root에 없다. |
| `src/contract.ts` | Frozen `RuntimeReleaseDescriptor`, `RuntimeResolver`·`VerifiedRuntime` Interface와 S1 error family를 소유한다. Descriptor decoder는 exact launcher/Runtime identity에서 tag와 asset name을 결합하고 canonical `https://github.com/<owner>/<repo>` repository 및 같은 authority의 exact release URL만 허용한다. |
| `src/canonical-runtime-manifest.ts` | Canonical manifest의 exact shape, Runtime identity, launch path, complete roster evidence와 path graph를 strict decode한다. |
| `src/canonical-runtime-manifest-assembler.ts` | R2 build Adapter가 stream/hash한 immutable recipient file·symlink descriptor를 정렬·clone하고 payload/`bundle/` evidence와 하나의 canonical byte representation을 계산한 뒤 기존 decoder로 self-validation한다. Filesystem scan이나 verified capability를 소유하지 않는다. |
| `src/runtime-release-authority.ts` | Descriptor, application/target/contract, canonical manifest resource·bytes·digest·identity를 effect 전에 admission하고 caller-safe failure와 private diagnostic evidence를 분리한다. |
| `src/runtime-cache-authority.ts` | `appDataRoot/runtime-cache/v1` 아래 content-addressed archive, partial, generation, staging, quarantine, lease와 receipt identity를 계산한다. Cache root를 read-only로 검사하고 owner UID, exact `0700`, no-symlink ancestor, same-device `(dev, ino)` snapshot을 mutation authority 발급 전에 재검증한다. |
| `src/runtime-cache-bootstrap.ts` | Canonical owner-only `appDataRoot` 아래 stable cache namespace와 exact generation parent를 direct-leaf 단위로 생성·fsync·재검증하고, exclusive owned staging root를 발급한다. |
| `src/runtime-cache-lease.ts` | Archive digest별 cooperative lease를 no-clobber로 획득하고 same-owner caller만 bounded join시킨다. Durable lease readback, terminal `complete`/`fail` settlement와 unlink 전후 authority revalidation을 소유하며 ambiguous·different owner는 mutation 없이 닫는다. |
| `src/runtime-archive-transport.ts` | Package-private Node HTTPS one-hop exchange를 수행한다. `Accept-Encoding: identity`, `Range`, `If-Range`의 closed header set, connect deadline, response disposal과 allowlisted stream fault normalization을 소유하며 redirect·retry policy는 caller에 남긴다. |
| `src/runtime-archive-download.ts` | Exact descriptor archive 하나의 bounded redirect·retry, `200/206/416`, strong-validator resume journal, size/SHA-256 검증과 retained archive publication을 소유한다. Verified partial을 canonical archive direct leaf에 no-clobber hardlink하고 directory fsync와 full readback을 마친 뒤에만 retained archive evidence를 반환한다. |
| `src/runtime-archive-extraction.ts` | Descriptor-bound canonical archive를 전체 pre-scan한 뒤 materialization pass에서 다시 검증하며 owned empty staging의 `runtime/`에 추출한다. TAR path/type/mode·size bound, manifest/legal roster, complete-tree digest와 final pathname re-open/readback을 검증하고 관찰 시점의 `RuntimeStagingVerificationSnapshot`을 반환한다. Recipient mutation 뒤 non-cancellation failure는 staging residue를 보존한 `runtime_recovery_required`, cancellation은 worker를 회수하고 retryable owned residue를 남긴 `runtime_cancelled`로 닫는다. |
| `src/runtime-archive-directory-capability.ts` | Dedicated child의 kernel-held cwd를 directory capability로 유지한다. Exact `(dev, ino, uid, mode)` handshake와 direct-leaf create·open·hash·destination no-clobber link operation만 허용하고 link source identity도 고정해 ancestor replacement·symlink·hardlink·rename race에서 경계를 보존한다. |
| `src/runtime-retained-archive.ts` | Retained archive의 absent·verified·evidence-backed owned corruption만 분류한다. Exact nlink-one 또는 canonical nlink-two pair를 검증하고, owned invalid pair를 nonce-scoped quarantine로 이동하며 unknown alias·ownership·identity drift는 추측하지 않는다. |
| `src/runtime-generation.ts` | Published generation의 receipt와 complete tree를 함께 검증하고, owned corrupt generation만 quarantine한다. Verified staging을 content-addressed final path로 atomic publish한 뒤 independent strict readback을 통과한 `VerifiedRuntime`만 반환한다. |
| `src/runtime-resolution-control.ts` | Monotonic resolution deadline, bounded `Retry-After` wait와 allowlisted progress ordering을 소유한다. Caller cancellation과 deadline exhaustion을 구분하고 presentation callback failure를 Runtime authority에서 격리한다. |
| `src/runtime-resolver.ts` | Frozen admission부터 cache bootstrap, shared flight, lease, generation/archive reuse·repair, exact download, safe extraction, publish·settlement와 spawn-boundary 재검증까지 하나의 recoverable transaction으로 조율한다. |

## 내부 경계

- Package root의 runtime value는 `decodeRuntimeReleaseDescriptor`, `RuntimeReleaseAuthorityError`, `createRuntimeResolverBundle` 세 개뿐이다. `RuntimeReleaseDescriptor`, `RuntimeResolveProgress`, `RuntimeResolutionError`, `RuntimeResolutionErrorCode`, `RuntimeResolver`, `VerifiedRuntime`, `RuntimeResolverBundleInput`, `RuntimeSpawnBoundary`만 type surface로 제공한다. Production Host는 source deep import 없이 이 표면만 사용하고 testing·cache·transport·extraction·generation·assembler·admission 내부 seam은 package-private으로 유지한다.
- Canonical manifest assembler도 package root에서 re-export하지 않는 owner-private build seam이다. 입력은 payload bytes가 아니라 `{ path, type, mode, bytes, sha256 }` 또는 symlink target descriptor이므로 Runtime 크기에 비례한 bytes를 메모리에 보존하지 않는다. Detailed builder/source/download identity는 `input_provenance`가 가리키는 payload file 안에 있고, assembler는 그 file descriptor의 digest만 canonical manifest에 결합한다.
- Host는 admission·owner당 `createRuntimeResolverBundle()` 하나를 만들고 process lifetime 동안 재사용해야 한다. Shared flight registry와 exact-object `WeakMap` spawn authority는 bundle-local이며, cross-bundle same-owner lease join은 correctness evidence이지 다중 bundle을 권장하는 host contract가 아니다.
- Same-identity caller는 한 transaction을 공유하되 각 caller는 독립적으로 detach한다. 마지막 subscriber가 사라지면 transaction을 cancel·settle하고, late caller는 draining flight가 끝난 뒤 fresh transaction을 시작한다.
- Joined completion receipt는 wake hint일 뿐 Ready나 spawn authority가 아니다. Joiner와 cache hit은 exact generation receipt와 complete tree를 fresh inspect하고, 반환된 exact `VerifiedRuntime` object도 child spawn 직전에 다시 검증한다.
- Retained archive는 exact standalone nlink-one final 또는 canonical final과 `archive.part`가 같은 inode인 exact nlink-two pair다. Evidence-backed owned corruption만 cooperative per-digest lease 아래 quarantine하며 valid alias partial은 truncate하지 않는다.
- `RuntimeStagingVerificationSnapshot`은 extraction 시점 evidence일 뿐 durable execution authority가 아니다. Generation publish는 staging을 다시 검증하고 durable receipt, atomic rename과 independent strict readback을 완료한 뒤에만 authority를 발급한다.
- Transient HTTP status는 exact URL의 one-retry budget만 사용한다. Resolver가 bounded `Retry-After`, 전체 startup deadline과 monotonic progress를 소유한다.
- Owner가 lease `complete` 또는 `fail` 호출을 시작하면 그 intent가 terminal settlement를 claim한다. Port failure 뒤 반대 settlement나 같은 settlement를 다시 합성하지 않는다.
- `tar-stream@3.2.0`과 `@types/tar-stream@3.1.4`는 exact pin으로 canonical TAR parser에 사용한다. Archive acceptance는 raw header audit과 planned entry graph를 함께 통과해야 한다.
- Download와 extraction은 exact descriptor 외 URL, mirror, older/moving release fallback이나 자동 downgrade를 수행하지 않는다.
- Stable caller failure는 S1 `runtime_*` allowlist만 사용한다. Raw URL, path, digest와 nested cause는 explicit `diagnosticEvidence()` 경계 밖으로 직렬화하지 않는다.
- Current Node/Darwin 구현은 pathname `rename`·`unlink`와 verify→actual spawn을 pre-opened authority에 원자적으로 bind하지 못한다. Owner-only root, exact `(dev, ino, uid)` revalidation과 cooperative lease가 현재 경계이며, 동일 UID의 비협조 process race를 제거하려면 descriptor/dirfd/capability-bound rename·unlink·spawn native primitive가 필요하다.
- `runtime-resolver-fixture.test.ts`는 deterministic source-only fixture이며 compiled `dist/`에 포함하지 않는다.

## Resolver evidence

`RuntimeResolver.resolve()` scripted matrix는 `200/206/416`, HTTPS redirect와 downgrade, content encoding drift, access denial, unsafe archive, corrupt retained archive reacquisition, lease ambiguity, cancellation resume와 no-downgrade를 검증한다. Test-only resolver fixture도 canonical manifest를 assembler로 만들기 때문에 같은 bytes가 decoder admission, safe archive extraction, generation readback과 spawn-boundary reverify까지 흐른다. Real-filesystem cases는 valid cache reuse, retained archive offline repair, retained ancestor·same-name file replacement, manifest·legal·selected executable drift, final pathname rebind, publish/readback fault 뒤 fresh-owner offline recovery와 exact-object spawn authority를 검증한다. Synthetic fixture manifest는 3,093 bytes, SHA-256 `d2d09adeb6adc7d456b4418f30e68d285c87d7092abb864e27338541dd655421`로 고정한다. 상세 resolver candidate receipt는 [Ticket 012](../../docs/tickets/2026-07-23-public-npx-first-release/012-d1d-runtime-resolver-transaction-repair.md), assembler handoff는 [Ticket 018](../../docs/tickets/2026-07-23-public-npx-first-release/018-r2a-runtime-recipient-manifest.md)에 있다.

## 검증 명령

```bash
npm test -w @ay-ple/runtime-release
npm run typecheck -w @ay-ple/runtime-release
npm run build -w @ay-ple/runtime-release
npm run verify:package-root -w @ay-ple/runtime-release
```
