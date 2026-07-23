# `@ay-ple/runtime-release`

`@ay-ple/runtime-release`는 public application이 지정한 exact Runtime release를 검증하고 준비하는 Node-only Module의 workspace다.

## 현재 구현

| Source | 현재 책임 |
| --- | --- |
| `src/contract.ts` | Frozen `RuntimeReleaseDescriptor`, `RuntimeResolver`·`VerifiedRuntime` Interface와 S1 error family를 소유한다. Descriptor decoder는 exact launcher/Runtime identity에서 tag와 asset name을 결합하고 canonical `https://github.com/<owner>/<repo>` repository 및 같은 authority의 exact release URL만 허용한다. |
| `src/canonical-runtime-manifest.ts` | Canonical manifest의 exact shape, Runtime identity, launch path, complete roster evidence와 path graph를 strict decode한다. |
| `src/runtime-release-authority.ts` | Descriptor, application/target/contract, canonical manifest resource·bytes·digest·identity를 effect 전에 admission하고 caller-safe failure와 private diagnostic evidence를 분리한다. |
| `src/runtime-cache-authority.ts` | `appDataRoot/runtime-cache/v1` 아래 content-addressed archive, partial, generation, staging, quarantine, lease와 receipt identity를 계산한다. Cache root를 read-only로 검사하고 owner UID, exact `0700`, no-symlink ancestor, same-device `(dev, ino)` snapshot을 mutation authority 발급 전에 재검증한다. |

## 내부 경계

- Package root `src/index.ts`는 아직 `RuntimeReleaseScaffold`만 노출한다. D1a authority Module은 package entrypoint에서 re-export하지 않는 source-internal seam이다.
- Lease coordinator, quarantine plan과 generation verification receipt는 type·identity contract다. 실제 lease 획득, quarantine 이동과 receipt persistence는 이 package에 없다.
- `RuntimeResolver`는 frozen Interface이며 구현체가 없다. HTTP transport, download/resume journal, TAR parsing·extraction, cache directory/file mutation, generation repair와 `VerifiedRuntime` 반환은 구현되지 않았다.
- `tar-stream@3.2.0`과 `@types/tar-stream@3.1.4`는 exact pin되어 있지만 현재 source는 archive parsing에 사용하지 않는다.
- Stable caller failure는 S1 `runtime_*` allowlist만 사용한다. Raw URL, path, digest와 nested cause는 explicit `diagnosticEvidence()` 경계 밖으로 직렬화하지 않는다.

## 검증 명령

```bash
npm test -w @ay-ple/runtime-release
npm run typecheck -w @ay-ple/runtime-release
npm run build -w @ay-ple/runtime-release
```
