# `@ay-ple/runtime-release`

`@ay-ple/runtime-release`는 public application이 지정한 exact Runtime release를 검증하고 준비하는 Node-only Module의 workspace다.

## 현재 구현

| Source | 현재 책임 |
| --- | --- |
| `src/contract.ts` | Frozen `RuntimeReleaseDescriptor`, `RuntimeResolver`·`VerifiedRuntime` Interface와 S1 error family를 소유한다. Descriptor decoder는 exact launcher/Runtime identity에서 tag와 asset name을 결합하고 canonical `https://github.com/<owner>/<repo>` repository 및 같은 authority의 exact release URL만 허용한다. |
| `src/canonical-runtime-manifest.ts` | Canonical manifest의 exact shape, Runtime identity, launch path, complete roster evidence와 path graph를 strict decode한다. |
| `src/runtime-release-authority.ts` | Descriptor, application/target/contract, canonical manifest resource·bytes·digest·identity를 effect 전에 admission하고 caller-safe failure와 private diagnostic evidence를 분리한다. |
| `src/runtime-cache-authority.ts` | `appDataRoot/runtime-cache/v1` 아래 content-addressed archive, partial, generation, staging, quarantine, lease와 receipt identity를 계산한다. Cache root를 read-only로 검사하고 owner UID, exact `0700`, no-symlink ancestor, same-device `(dev, ino)` snapshot을 mutation authority 발급 전에 재검증한다. |
| `src/runtime-archive-transport.ts` | Package-private Node HTTPS one-hop exchange를 수행한다. `Accept-Encoding: identity`, `Range`, `If-Range`의 closed header set, connect deadline, response disposal과 allowlisted stream fault normalization을 소유하며 redirect·retry policy는 caller에 남긴다. |
| `src/runtime-archive-download.ts` | Exact descriptor archive 하나의 bounded redirect·retry, `200/206/416`, strong-validator resume journal, size/SHA-256 검증과 retained archive publication을 소유한다. Verified partial을 canonical archive direct leaf에 no-clobber hardlink하고 directory fsync와 full readback을 마친 뒤에만 retained archive evidence를 반환한다. |
| `src/runtime-archive-extraction.ts` | Descriptor-bound canonical archive를 전체 pre-scan한 뒤 materialization pass에서 다시 검증하며 owned empty staging의 `runtime/`에 추출한다. TAR path/type/mode·size bound, manifest/legal roster, complete-tree digest와 final pathname re-open/readback을 검증하고 관찰 시점의 `RuntimeStagingVerificationSnapshot`을 반환한다. Recipient mutation 뒤 실패하면 pathname을 삭제하지 않고 complete staging residue를 보존한 `runtime_recovery_required`로 닫는다. |
| `src/runtime-archive-directory-capability.ts` | Dedicated child의 kernel-held cwd를 directory capability로 유지한다. Exact `(dev, ino, uid, mode)` handshake와 direct-leaf create·open·hash·destination no-clobber link operation만 허용하고 link source identity도 고정해 ancestor replacement·symlink·hardlink·rename race에서 경계를 보존한다. |

## 내부 경계

- Package root `src/index.ts`는 아직 `RuntimeReleaseScaffold`만 노출한다. D1 authority, transport/download와 archive extraction Module은 package entrypoint에서 re-export하지 않는 source-internal seam이다.
- Lease coordinator, quarantine plan과 generation verification receipt는 type·identity contract다. 실제 lease 획득, quarantine 이동과 receipt persistence는 이 package에 없다.
- `RuntimeResolver`는 frozen Interface이며 구현체가 없다. HTTP transport와 download/resume은 구현됐고 cache lease, quarantine, generation publish·repair, full resolver orchestration과 `VerifiedRuntime` 반환은 D1d에 남아 있다.
- Retained archive는 exact standalone nlink-one final 또는 canonical final과 `archive.part`가 같은 inode인 exact nlink-two pair다. D1d는 cooperative per-digest lease 아래 invalid pair의 final·partial root를 함께 quarantine하고 valid alias partial을 truncate하지 않아야 한다.
- `RuntimeStagingVerificationSnapshot`의 `stagingRoot`·`runtimeRoot`와 identity는 durable execution authority가 아니라 extraction 시점 evidence다. D1d가 cache lease 아래 publish·quarantine와 strict complete-tree readback을 수행하고 Runtime spawn 직전 다시 검증해야 한다.
- Transient HTTP status는 현재 exact URL의 one-retry budget만 사용한다. `Retry-After`, bounded delay와 전체 startup deadline/clock은 D1d resolver가 소유한다.
- `tar-stream@3.2.0`과 `@types/tar-stream@3.1.4`는 exact pin으로 canonical TAR parser에 사용한다. Archive acceptance는 raw header audit과 planned entry graph를 함께 통과해야 한다.
- Download와 extraction은 exact descriptor 외 URL, mirror, older/moving release fallback이나 자동 downgrade를 수행하지 않는다.
- Stable caller failure는 S1 `runtime_*` allowlist만 사용한다. Raw URL, path, digest와 nested cause는 explicit `diagnosticEvidence()` 경계 밖으로 직렬화하지 않는다.

## 검증 명령

```bash
npm test -w @ay-ple/runtime-release
npm run typecheck -w @ay-ple/runtime-release
npm run build -w @ay-ple/runtime-release
```
