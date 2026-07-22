# Runtime release delivery·integrity·versioning 공식 근거 조사

- 조사일: 2026-07-22
- 분류: Wayfinder Ticket 007을 위한 기술 근거
- 대상: macOS arm64 first public preview의 `npx ay-ple@<release-version>` 실행 후 Runtime delivery
- 관련 ticket: [Ticket 003a](../tickets/003a-third-party-redistribution-evidence.md), [Ticket 005](../tickets/005-public-repository-authority-and-license.md), [Ticket 006](../tickets/006-npx-production-composition.md), [Ticket 007](../tickets/007-runtime-release-delivery-integrity.md)

이 문서는 조사 evidence이다. 아래의 **공식 사실**, **현재 코드 사실**, **설계 추론**을 구분한다. 설계 추론은 Ticket 007이 채택해야 규범적 결정이 되며, 이 문서 하나로 채택 상태가 되지는 않는다.

## 조사 결론

최소이면서 fail-closed인 구성은 다음과 같다.

```text
exact npm package
└─ embedded RuntimeReleaseDescriptor
   ├─ exact GitHub Release tag·asset URL
   ├─ archive byte size·SHA-256
   └─ canonical inner manifest byte digest
          │
          ▼
immutable GitHub Release asset (.tar.gz)
├─ manifest.json
├─ bundle/**
├─ NOTICE·THIRD_PARTY_NOTICES.md·licenses/**
└─ sbom.spdx.json·provenance/**
          │
          ▼
appDataRoot의 content-addressed cache
└─ outer archive 검증 → safe staging extract → complete-tree 검증 → atomic publish
```

- 실행 시점 권한은 exact npm package에 포함된 `RuntimeReleaseDescriptor`가 가진다. Remote tag, `latest`, GitHub API의 현재 값을 호환성 권한으로 사용하지 않는다.
- GitHub Release는 immutable distribution·publication evidence를 소유한다. Runtime 설치 중 GitHub API가 가진 digest를 새 권한으로 받지 않고, publication gate에서 npm descriptor와 교차 검증한다.
- Archive 안의 canonical manifest는 압축 해제된 complete tree의 identity·provenance를 소유한다. npm package가 가진 canonical manifest와 byte-for-byte로 같아야 한다.
- Cache receipt, ETag, `Content-Length`, 추출 완료 marker는 최적화·복구 evidence일 뿐 무결성 권한이 아니다. 최종 권한은 outer SHA-256·size와 inner complete-tree verifier에 남는다.
- `RuntimeResolver` Module의 product Interface는 `resolveRuntime(...)` 하나면 충분하다. Download resume, retry, redirect, cache repair, safe extraction, atomic publish와 version compatibility는 모두 Implementation 안으로 숨긴다.

## 1. 공식 사실

### 1.1 GitHub Releases

| 공식 사실 | Ticket 007에서의 의미 |
| --- | --- |
| GitHub Release asset REST 표현은 `name`, `size`, `digest` 등을 제공하고 공식 예시의 digest는 `sha256:<hex>` 형태다. [GitHub REST: release assets](https://docs.github.com/en/rest/releases/assets) | Publication gate가 로컬 archive와 GitHub이 보고한 asset size·SHA-256을 교차 검증할 수 있다. |
| Public resource의 release asset은 인증 없이 받을 수 있다. Binary REST endpoint는 `Accept: application/octet-stream`에 `200` 직접 stream 또는 `302` redirect 둘 다를 반환할 수 있으므로 client가 둘 다 처리해야 한다. [GitHub REST: get a release asset](https://docs.github.com/en/rest/releases/assets#get-a-release-asset) | Launcher는 GitHub CLI·token을 prerequisite로 두지 않아도 되지만, redirect를 명시적으로 다뤄야 한다. |
| Current Releases REST 표현에는 release의 `immutable` 값과 asset의 `size`·`digest`가 포함된다. [GitHub REST: releases](https://docs.github.com/en/rest/releases/releases) | Final publication gate는 exact tag가 published·non-draft·immutable인지 확인할 수 있다. Runtime launcher가 매번 이 API를 호출해야 한다는 뜻은 아니다. |
| Immutable release를 publish하면 연결 tag를 이동하거나, release가 존재하는 동안 tag를 삭제하거나, asset을 변경·삭제할 수 없다. GitHub는 release tag, commit SHA, asset을 연결하는 release attestation도 자동 생성한다. [GitHub Docs: immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases) | Draft에 asset을 모두 올린 뒤 한 번 publish하고, 그 다음 npm을 publish하는 순서가 적합하다. |
| Immutable release를 삭제하면 tag도 삭제할 수 있지만 같은 tag name을 다시 사용할 수는 없다. [GitHub Docs: immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases) | Yank된 exact release를 다른 bytes로 교체하는 fallback은 불가하다. 좋은 제약이며, launcher도 다른 Runtime을 자동 선택하면 안 된다. |
| GitHub은 immutable release와 local artifact의 일치를 `gh release verify`·`gh release verify-asset`로 검증하는 절차를 제공한다. 이 명령은 GitHub CLI를 요구한다. [GitHub Docs: verifying release integrity](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/verify-release-integrity) | GitHub CLI는 publisher/Ticket 015 gate에서는 쓸 수 있지만 consumer Runtime dependency로 두지 않는다. |

Immutable release 설정은 **설정 후의 future release에만** 적용된다. 따라서 first public release를 만들기 전 repository에서 활성화했는지 검증해야 한다. [GitHub Docs: preventing release changes](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes)

### 1.2 HTTP download·resume·retry

| 공식 사실 | Ticket 007에서의 의미 |
| --- | --- |
| HTTP Range는 optional feature다. Server는 `Range`를 무시하고 일반 `200` response를 보낼 수 있고, 지원하는 만족 가능 range에는 `206`, 만족 불가능 range에는 `416`을 보낼 수 있다. `Accept-Ranges`도 미래 요청의 `206`을 보장하지 않는다. [RFC 9110 §§14.2–14.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-14.2) | Interrupted resume는 best-effort로 설계하고 `200`이 오면 partial을 잘라 처음부터 다시 쓴다. Resume 미지원을 설치 실패로 바꾸지 않는다. |
| `If-Range`는 보관한 partial과 현재 representation이 같을 때만 range를 받고, 달라졌으면 전체 representation을 받는 조건이다. Entity-tag를 쓸 때는 weak tag가 아닌 strong comparison이 필요하다. [RFC 9110 §13.1.5](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.5) | Partial receipt은 stable request URL, expected digest·size와 strong ETag을 함께 가진 경우에만 append resume에 재사용한다. Validator가 없거나 바뀌면 full restart한다. |
| GET은 safe method이고 safe method는 idempotent다. Idempotent request는 response를 읽기 전 communication failure가 난 경우 자동 반복할 수 있지만, 실패한 automatic retry를 무한히 반복해서는 안 된다. [RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2) | Invocation당 automatic retry를 원본 시도 후 1회로 제한하고, 이후에는 retryable error를 보여준다. 다음 invocation은 검증된 partial에서 이어서 받을 수 있다. |
| `Retry-After`는 follow-up request 전에 기다릴 시간을 HTTP-date 또는 초 단위로 전달한다. [RFC 9110 §10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3) `429 Too Many Requests`도 `Retry-After`를 포함할 수 있다. [RFC 6585 §4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) | `408`, `429`, `500`, `502`, `503`, `504`와 transport interruption만 bounded retry 후보로 두고, `Retry-After`를 전체 startup deadline 안에서만 존중한다. |
| Redirect를 따라갈 때 user agent는 target URI를 바꾸고 `Host`, `Authorization`, `Cookie` 같은 origin/resource-specific header를 제거하는 것이 권고된다. Redirect cycle도 감지해야 한다. [RFC 9110 §15.4](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.4) | Public asset에는 처음부터 credential을 보내지 않고, HTTPS만 허용하며, redirect를 bounded하고 매 hop에서 request header를 새로 구성한다. |

GitHub가 release asset endpoint에 byte range, stable ETag 또는 signed redirect URL의 수명을 보장한다는 공식 계약은 확인하지 못했다. 따라서 이 세 값은 integrity authority가 아니며 재시작 최적화에만 쓴다.

### 1.3 Node.js 22 구현 표면

| 공식 사실 | Ticket 007에서의 의미 |
| --- | --- |
| Node 22 `https.get()`은 `https.request()`와 같은 option을 받는 GET client를 제공한다. [Node.js 22 HTTPS](https://nodejs.org/download/release/latest-v22.x/docs/api/https.html#httpsgeturl-options-callback) | Public package 안의 Node host가 별도 `curl`·GitHub CLI 없이 download transport를 소유할 수 있다. Redirect policy는 client Implementation이 명시적으로 구현해야 한다. |
| `http.request()`는 `AbortSignal`을 받아 ongoing request를 abort할 수 있다. 반면 `timeout` option 자체는 request를 abort하지 않고 `timeout` event만 발생시킨다. [Node.js 22 HTTP request](https://nodejs.org/download/release/latest-v22.x/docs/api/http.html#httprequesturl-options-callback) | Deadline은 `AbortController` 타이머로 직접 취소하고 stream/file handle cleanup에 합류시켜야 한다. `timeout`만 설정하고 대기하면 안 된다. |
| Promise `stream.pipeline()`은 source–transform–destination의 backpressure·error cleanup을 묶고, option의 `AbortSignal`이 abort되면 underlying pipeline을 `AbortError`로 destroy한다. [Node.js 22 streams](https://nodejs.org/download/release/latest-v22.x/docs/api/stream.html#streampipelinesource-transforms-destination-options) | Response stream → byte bound/hash observer → partial file을 하나의 cancellable pipeline으로 조립할 수 있다. |
| `crypto.createHash('sha256')`는 file stream의 SHA-256을 계산할 수 있는 `Hash`를 제공한다. [Node.js 22 Crypto](https://nodejs.org/download/release/latest-v22.x/docs/api/crypto.html#cryptocreatehashalgorithm-options) | Outer archive와 descriptor/manifest digest를 system utility 없이 검증할 수 있다. Resume 후에는 suffix만이 아니라 완성된 file 전체를 다시 hash한다. |
| `FileHandle.sync()`는 open file descriptor의 data를 storage device로 flush하도록 요청한다. `fsPromises.rename()`은 old path를 new path로 rename한다. [Node.js 22 FileHandle.sync](https://nodejs.org/download/release/latest-v22.x/docs/api/fs.html#filehandlesync), [Node.js 22 rename](https://nodejs.org/download/release/latest-v22.x/docs/api/fs.html#fspromisesrenameoldpath-newpath) | Complete partial·receipt을 flush한 뒤 같은 filesystem 안의 content-addressed final path로 rename하는 publish 순서를 구현할 수 있다. Cross-filesystem rename에 의존하지 않는다. |
| Node docs는 `fs.access()`로 먼저 검사하고 `open()`하는 패턴이 race를 만든다고 경고하며, exclusive `x` flag는 path가 존재하면 실패한다. [Node.js 22 FS race guidance](https://nodejs.org/download/release/latest-v22.x/docs/api/fs.html#fsaccesspath-mode-callback), [Node.js 22 file flags](https://nodejs.org/download/release/latest-v22.x/docs/api/fs.html#file-system-flags) | Download receipt·lock은 check-then-create가 아니라 exclusive create/rename으로 경쟁한다. |
| `fsPromises.mkdtemp()`는 unique temporary directory를 만들고, `fsPromises.statfs()`와 `StatFs.bavail`은 비특권 user가 사용 가능한 filesystem block을 제공한다. [Node.js 22 mkdtemp](https://nodejs.org/download/release/latest-v22.x/docs/api/fs.html#fspromisesmkdtempprefix-options), [Node.js 22 statfs](https://nodejs.org/download/release/latest-v22.x/docs/api/fs.html#fspromisesstatfspath-options) | Staging directory를 final cache와 같은 parent/filesystem에 만들고, download·extract·old generation을 동시에 담을 수 있는지 먼저 검사할 수 있다. |
| Node 22 `zlib.Gunzip`은 gzip stream을 풀고 truncated input·trailing garbage를 error로 보고한다. [Node.js 22 zlib](https://nodejs.org/download/release/latest-v22.x/docs/api/zlib.html#class-zlibgunzip) | Gzip decoding은 built-in stream으로 할 수 있지만 Node core에 public TAR extractor Interface는 없다. TAR member 정책은 exact·locked runtime dependency 또는 repository-owned parser가 소유해야 한다. 보안성 큰 archive parser를 즉석으로 작성하는 것보다 exact dependency를 pack/SBOM gate에 포함하는 편을 권고한다. |

## 2. 현재 코드 사실

### 2.1 현재 candidate의 identity와 크기

Canonical source는 [production Runtime manifest](../../../../packages/codex-chat-runtime/manifests/production-runtime-darwin-arm64.json)다.

| 항목 | 현재 값 |
| --- | --- |
| Manifest | schema `1`, kind `codex_chat_runtime_bundle` |
| Target | `Darwin` / `arm64` / `darwin-arm64` |
| Native Runtime | `codex-cli 0.144.4` |
| Standalone Python | CPython `3.10.18`, build `20250818` |
| OpenAI source | commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`, tag `rust-v0.144.4` |
| Behavioral patch stack | `ffc43da6e5e7a146016404db54968d37d849b778e5e9b04db680cac4124fc1c9` |
| Complete bundle | regular file `2,539`개, symlink `9`개, regular bytes `366,692,788`, roster SHA-256 `4b72a60735d6b6d1489bab9fa937889f296ba2268c3fc0c433ba84ca10b36b7a` |
| Current ignored materialization | 현 clone에서 약 `487 MiB` on-disk. `bundle/`뿐 아니라 build wheel, input download, production wheel을 함께 보관하므로 release payload 크기로 사용하면 안 된다. |

`Runtime version`, Python version, patch stack은 서로 다른 identity다. AY-PLE application/npm version도 이들과 다른 release identity로 두어야 한다. Native `0.144.4`를 AY-PLE `0.1.0`으로 재라벨링하지 않는다.

### 2.2 현재 verifier가 이미 해결한 것

[Node complete-tree verifier](../../../../packages/codex-chat-runtime/src/production-bundle.ts)는 다음을 이미 하나의 깊은 검증 표면에 두고 있다.

- `runtimeRoot`를 absolute, non-symlink directory로 제한한다.
- Package의 canonical manifest와 materialized `manifest.json`의 bytes가 완전히 같은지 비교한다.
- Manifest schema·kind·target, source commit/tag, Python/Runtime version, ordered patch stack을 exact constant와 비교한다.
- `bundle/` 전체의 regular file bytes·mode·SHA-256과 symlink target을 canonical order로 roster hash한다.
- Bundle 밖으로 나가거나 dangling인 symlink, special entry, path escape, selected executable의 symlink/non-executable mode를 거절한다.
- 검증을 통과한 뒤에만 absolute Python·bridge·site-packages·native executable path를 반환한다.

[Verifier tests](../../../../packages/codex-chat-runtime/src/production-bundle.unit.test.ts)는 manifest byte drift, identity·patch order drift, file bytes·mode·extra entry·symlink target drift, root/selected path symlink과 manifest path escape를 거절한다. [Runtime package root](../../../../packages/codex-chat-runtime/src/index.ts)의 `verifyCodexChatRuntimeBundle()`는 path를 노출하지 않고 `sourceCommit`·`runtimeVersion`만 상위 composition에 제공하며, `createCodexChatRuntime()`은 spawn 직전에 complete verifier를 다시 실행한다.

즉 Ticket 007은 이 verifier를 대체하지 않고 **검증될 directory를 안전하게 얻어내는 앞단**을 추가해야 한다.

### 2.3 현재 materializer에서 재사용할 donor

[Python production materializer](../../../../packages/codex-chat-runtime/scripts/production_bundle.py)는 publisher/build-time donor로 다음을 이미 증명했다.

- reviewed input을 exact byte size·SHA-256으로 검증한 뒤 temporary file에 받고 replace한다.
- TAR member의 absolute/`..` path, unsafe symlink·hardlink target, special member를 거절한다.
- 독립된 두 clean materialization의 manifest/tree roster가 같아야 publish한다.
- Same-filesystem staging·previous backup·`os.replace()`로 bundle/manifest publish 실패에 rollback한다.
- Verify-only path는 network, build, repair를 하지 않고 missing·extra·rename·truncate·digest drift를 fail closed한다.

그러나 이 script는 repository의 source/build input에서 Runtime을 **만드는** Python 도구이다. Public Node launcher에 tracking하거나 consumer machine에서 실행할 production installer가 아니다. 현재 downloader도 full restart만 하며 HTTP range receipt을 소유하지 않는다.

### 2.4 아직 없는 것

- Public release archive와 deterministic archive generation gate
- npm package에 내장할 outer `RuntimeReleaseDescriptor`
- GitHub Release asset downloader, redirect/retry/range resume
- `appDataRoot` 아래 content-addressed archive/install cache
- Safe TAR extraction을 위한 shipped Node implementation/dependency
- Corrupt cache quarantine·repair·offline reuse·yank·rollback policy
- CLI/npm/GitHub Release/inner manifest를 하나로 연결하는 publication evidence

## 3. 설계 추론: 권한 분리

### 3.1 논리 artifact 계약

| Artifact | 권한 | 포함할 핵심 값 | 권한이 아닌 것 |
| --- | --- | --- | --- |
| npm `ay-ple@<exact>` | 해당 launcher가 실행할 수 있는 Runtime release를 exact 하나로 pin | Package/application version, embedded canonical Runtime manifest, `RuntimeReleaseDescriptor` | Moving `latest`, remote compatibility negotiation |
| `RuntimeReleaseDescriptor` | Outer transport·compatibility의 runtime authority | Schema, target, exact GitHub tag/asset URL, archive bytes/SHA-256/format, unpacked bounds, inner manifest bytes/SHA-256, expected Runtime/source/patch/tree identity | Cache location, ETag, retry count, live network state |
| Immutable GitHub Release | Exact bytes의 public storage와 source/tag/asset publication evidence | Exact tag, public commit, asset name/size/digest, release attestation | Launcher가 임의로 선택할 `latest Runtime` |
| Archive `manifest.json` | Extracted complete tree identity·provenance | Current canonical production manifest bytes | Outer archive digest. 자기 자신의 digest를 안에 넣을 수 없다. |
| `bundle/**` | 실제 executable Runtime closure | Standalone Python, patched SDK/bridge, native Runtime | Build wheel, source checkout, download cache |
| Archive legal/provenance material | 재배포 closure와 artifact-to-source mapping | `NOTICE`, `THIRD_PARTY_NOTICES.md`, top-level `licenses/**`, SPDX SBOM, component/input provenance | Executable Runtime path, compatibility negotiation |
| Local receipt/completion marker | Crash recovery·resume·diagnostic evidence | Descriptor digest, partial bytes, strong validator, installation nonce/phase | Integrity authority. Marker만 보고 Runtime을 실행하면 안 된다. |

`RuntimeReleaseDescriptor` 권고 shape은 다음과 같다. Exact field naming은 구현 ticket이 고정할 수 있지만 이 정보 그룹은 줄이면 안 된다.

```ts
interface RuntimeReleaseDescriptorV1 {
  readonly schemaVersion: 1
  readonly launcher: {
    readonly packageName: 'ay-ple'
    readonly version: string
  }
  readonly target: 'darwin-arm64'
  readonly release: {
    readonly runtimeReleaseVersion: string
    readonly repository: string
    readonly applicationReleaseTag: string
    readonly runtimeAssetReleaseTag: string
    readonly assetName: string
    readonly assetUrl: string
    readonly immutableRequired: true
  }
  readonly archive: {
    readonly format: 'tar+gzip'
    readonly bytes: number
    readonly sha256: string
    readonly entryCount: number
    readonly regularFileBytes: number
  }
  readonly manifest: {
    readonly bytes: number
    readonly sha256: string
    readonly schemaVersion: 2
    readonly runtimeVersion: string
    readonly sourceCommit: string
    readonly patchStackSha256: string
    readonly bundleRosterSha256: string
    readonly releaseRosterSha256: string
  }
}
```

Resulting public commit에 포함될 source descriptor가 자기 commit SHA를 담는 self-reference는 만들지 않는다. Fixed `hub` source SHA·export manifest digest·resulting public commit과 npm/Runtime artifact의 mapping은 Ticket 015의 외부 release ledger가 소유한다. Immutable GitHub Release의 tag·commit attestation은 그 mapping의 publication evidence다.

이 descriptor는 application→Runtime binding이므로 GitHub byte-copy sidecar는 해당 application release evidence에 둘 수 있다. Descriptor가 pin한 Runtime asset release는 같은 release 또는 더 이른 immutable release일 수 있다. 따라서 새 application version이 같은 Runtime bytes를 재사용할 때 기존 Runtime release를 수정할 필요가 없고, 새 application release의 sidecar와 외부 ledger만 새 binding을 기록한다.

`release.repository`·`runtimeAssetReleaseTag`·`assetName`·`assetUrl`은 서로 일관되는지 package build 시 검증하고 descriptor sidecar는 `applicationReleaseTag`에 둔다. Launcher는 user input·environment variable로 URL, digest, Runtime version을 override하지 않는다. Test fixture만 package-private dependency adapter를 사용한다.

#### Version authority

| Version | 소유자 | 계약 |
| --- | --- | --- |
| Application/CLI version | Exact npm package `ay-ple@<version>` | Public command·UI·host version이며 descriptor 하나를 내장한다. Runtime compatibility를 실행 시 range로 계산하지 않는다. |
| Runtime release version | Immutable GitHub Runtime release·descriptor | Distribution generation ID다. App release 두 개가 exact 같은 descriptor를 내장하면 같은 verified Runtime generation을 재사용할 수 있다. 새 bytes에는 반드시 새 version/tag가 필요하다. |
| Native Runtime version | Inner manifest의 `runtime.version` | Upstream Codex identity(`0.144.4`)다. AY-PLE app/Runtime release version으로 재라벨링하지 않는다. |
| Manifest schema version | Canonical manifest parser | Field·roster 해석 규칙이다. Package-private bundle-only schema `1`에 top-level release roster를 조용히 추가하지 않고, first public distribution은 schema `2`로 올리고 exact parser·migration 없이 다른 schema를 거절하는 것을 권고한다. |
| Archive SHA-256 | Descriptor·publication evidence | Version label이 아닌 exact byte identity다. Cache key와 final transport integrity authority다. |

Runtime release tag와 asset name은 예를 들어 `runtime-v<runtime-release-version>`, `ay-ple-runtime-<runtime-release-version>-darwin-arm64.tar.gz`처럼 application release와 구분한다. Exact naming은 public repository가 생긴 뒤 Ticket 015가 검증하되, runtime resolver는 descriptor의 exact tuple만 소비한다.

### 3.2 Archive contract

Release archive의 positive roster는 Ticket 003a가 고정한 logical material set을 다음과 같이 실체화한다.

```text
manifest.json
bundle/
  bridge/**
  python/**
  site-packages/**
NOTICE
THIRD_PARTY_NOTICES.md
licenses/**
sbom.spdx.json
provenance/
  components.json
  python/PYTHON.json
  inputs.json
```

- `build-wheels/`, `downloads/`, `wheels/`, source checkout은 reproduction evidence/build input이며 consumer runtime closure가 아니므로 제외한다.
- Archive가 제공하는 `manifest.json`은 npm package의 canonical manifest와 byte-for-byte 같아야 한다.
- Current schema 1 manifest와 Node verifier는 `bundle/` roster만 complete-tree authority로 본다. Ticket 003a의 top-level legal·SBOM·provenance set을 archive 계약에 넣으면 manifest schema와 resolver verifier를 확장해 top-level release roster의 exact path·bytes·digest까지 함께 소유해야 한다. Outer archive hash만 맞았다고 extracted legal evidence의 후속 손상을 무시하지 않는다.
- Current bundle의 symlink `9`개를 보존하되 absolute target, `..`, bundle 밖의 lexical/resolved target을 금지한다. Hardlink, device, FIFO, socket은 필요 없으며 거절한다.
- Duplicate/non-normalized path, NUL, absolute path, `.`/`..`, path component·entry count·file size·total expanded bytes bound 초과를 write 전에 거절한다.
- Extractor는 directory·regular file을 staging에 쓴 뒤 검증된 symlink를 생성한다. Archive의 owner/group/xattr을 신뢰하지 않고 owner-only parent 안에 reviewed `0644`/`0755` mode만 복원한다.
- Decompression이 끝난 것만으로 완료를 판정하지 않는다. Exact outer bytes/SHA-256 → archive member policy → manifest bytes → complete tree roster → selected executable mode/path 순서를 모두 통과해야 한다.
- `licenses/**`의 exact closure는 Ticket 003a의 `REDIST-*` gate와 Ticket 015의 SBOM·notice evidence가 통과하기 전에 release-ready가 아니다. Current two-file OpenAI license tree를 complete redistribution closure로 오인하지 않는다.

### 3.3 Content-addressed local layout

Exact 실제 path는 구현이 소유하지만 논리 layout은 다음과 같다.

```text
<appDataRoot>/runtime/
├─ downloads/
│  ├─ <archive-sha256>.part
│  └─ <archive-sha256>.receipt.json
├─ archives/
│  └─ <archive-sha256>.tar.gz
├─ installations/
│  └─ <archive-sha256>/
│     ├─ manifest.json
│     ├─ bundle/**
│     ├─ NOTICE·THIRD_PARTY_NOTICES.md·licenses/**
│     └─ sbom.spdx.json·provenance/**
├─ staging/
└─ quarantine/
```

- Final archive/install path를 archive digest로 key하면 mutable `current` pointer가 필요 없다. Resolver가 exact path를 반환하고 Runtime process의 수명 동안 그 generation을 바꾸지 않는다.
- Partial, staging, quarantine는 final이 아니므로 Runtime factory에 절대 노출하지 않는다.
- Final이 존재해도 complete verifier를 통과하기 전에 cache hit로 판정하지 않는다. Invalid final은 random nonce를 포함한 quarantine path로 compare-and-rename한 후 같은 digest를 다시 설치한다.
- Resolver 자체가 digest 단위 exclusive install coordination을 숨긴다. Same-process call은 shared promise에 join하고 transaction receipt는 Ticket 006 instance nonce·PID/process-start identity와 transaction nonce를 기록한다. Global instance owner 부재와 matching token을 증명할 수 있을 때만 stale state를 compare-and-rename하며 arbitrary PID를 kill하지 않는다. Ticket 006의 process single-instance가 있더라도 crash recovery·test·support invocation이 cache를 손상시키지 않게 한다.
- First preview에서 automatic cache GC로 prior verified generation을 삭제하지 않는 편이 rollback semantics가 명확하다. 용량 정책이 필요해지면 resolver와 분리된 explicit maintenance work로 다룬다.

## 4. 설계 추론: resolution 순서와 실패 계약

### 4.1 정상 순서

1. Package-owned descriptor의 exact schema, launcher version, target, URL, byte/digest format을 검증한다. 실패는 publisher defect이며 network에 접속하지 않는다.
2. Explicit `appDataRoot`를 canonicalize하고 Ticket 006의 owner-only·non-symlink root 계약을 다시 확인한다. Digest-specific coordination을 획득한다.
3. Final installation이 있으면 embedded manifest byte equality와 complete-tree verifier를 돌린다. Green이면 network 없이 즉시 반환한다.
4. Final이 invalid하면 quarantine하고, outer archive cache가 exact size/SHA-256를 통과하는지 본다. Green archive가 있으면 network 없이 repair한다.
5. Valid archive가 없으면 partial receipt를 검증한다. Exact descriptor·partial size·strong validator와 맞지 않으면 partial을 quarantine/delete하고 zero에서 시작한다.
6. HTTPS GET을 시작한다. Resume이면 stable descriptor URL에 `Range: bytes=<N>-`·`If-Range: <strong-etag>`를 보낸다. `206`은 exact `Content-Range` start/total을 검증한 뒤 append하고, `200`은 file을 truncate하고 full body로 다시 쓴다. `416`은 local bytes가 expected total인 경우 full hash를 시도하고, 그 외에는 한 번 full restart한다.
7. 매 response의 content encoding, declared length/range, streamed byte upper bound를 검증한다. Full file의 exact bytes·SHA-256을 다시 계산한다. Green일 때만 flush 후 content-addressed archive path로 rename한다.
8. Same-filesystem unique staging directory에 safe extract한다. Archive member bound, inner manifest byte equality, executable `bundle/` complete-tree roster, top-level legal·SBOM·provenance release roster와 selected executable를 검증한다.
9. Verified staging을 final content-addressed directory로 rename한다. Final이 경쟁으로 먼저 생겼다면 그 final을 검증한 뒤 staging을 제거한다.
10. Final을 complete verifier로 다시 읽어 absolute `runtimeRoot`와 path-free identity를 반환한다. Caller가 Runtime을 spawn할 때 현재 factory가 한 번 더 검증한다.

Progress report는 `checking_cache → downloading → verifying_archive → installing → verifying_runtime → ready` 순서의 observational event다. Cache hit은 중간 phase를 건너뛸 수 있다. Progress callback의 exception은 resolution을 실패시키지 않고, event에 URL, local path, credential을 넣지 않는다.

### 4.2 Download 상태 판정

| 관찰 | 행동 |
| --- | --- |
| Valid final installation | Offline complete-tree verify 후 reuse. Remote release 존재 여부를 묻지 않음 |
| Corrupt final + valid cached archive | Final quarantine, offline re-extract·verify·publish |
| Corrupt final + no valid archive + network available | Quarantine 후 exact asset repair |
| No final + valid archive | Offline install |
| No final/archive + safe partial | Best-effort range resume. Range를 무시하면 full restart |
| No final/archive + offline | `network_unavailable`, no system Python·PATH·other Runtime fallback |
| Outer size/digest mismatch | Partial/archive quarantine, automatic retry 최대 1회. 반복 mismatch는 non-retryable `integrity_failed` |
| Inner manifest/tree mismatch | Staging quarantine/delete, non-retryable `integrity_failed`. 같은 invocation에서 다른 asset 선택 금지 |
| `404`/`410` without valid cache | `release_unavailable`. Moving tag·newer·older Runtime으로 fallback 금지 |
| Cancel during download | Request/pipeline abort. Strong validator가 있는 bounded partial+receipt만 보존 |
| Cancel during extraction/verification | Staging을 final로 publish하지 않고 cleanup. 기존 valid final/archive는 보존 |
| Disk full/permission failure | Existing valid generation을 유지하고 `storage_failed`. Half-published final 금지 |

### 4.3 Version, yank, rollback

| 상황 | Fail-closed contract |
| --- | --- |
| Compatible first install | Exact npm package의 descriptor가 가리키는 exact release asset 하나만 다운로드 |
| Launcher–Runtime incompatibility | Descriptor의 launcher version/target/manifest identity가 package와 다르거나 extracted manifest가 다르면 network 전에 거절. Remote API로 compatibility 재해석 금지 |
| New application release | 새 npm exact version은 새 descriptor/digest를 가질 수 있다. Running process의 resolved tree를 in-place upgrade하지 않음 |
| Yank before first download | Exact asset가 없으면 `release_unavailable`. Publisher가 같은 tag/bytes를 바꿔 복구하지 않고 새 application version을 publish |
| Yank after verified cache | Remote check 없이 exact verified cache를 계속 사용. 이것이 promised offline rerun을 보존함 |
| Security revocation | First preview resolver에 ambient online revocation list를 두지 않음. Cached exact bytes를 강제 중지하려면 offline promise와 충돌하므로 새 launcher version·release note·user action이 필요 |
| Explicit rollback | `npx ay-ple@<prior-application-version>`이 그 version에 내장된 prior descriptor를 사용. Current launcher의 `--runtime-version` override나 silent downgrade는 금지 |
| Offline rollback | Prior generation/archive가 캐시에 남아 있을 때만 가능. 없으면 exact prior immutable asset을 받을 network가 필요 |

Application/npm version, Runtime release version, native `runtime.version`, manifest schema는 다른 축이다. 단 first release에서는 모두 exact descriptor로 연결되므로 user가 이 축들을 조합하는 option은 없다.

## 5. Design It Twice — 최소 Interface lane

### 5.1 문제 공간

Caller인 Ticket 006 production host가 알아야 할 것은 owner-only `appDataRoot`, cancellation, progress, 그리고 검증된 `runtimeRoot`뿐이다. URL·version mapping·archive hash·range·cache layout·quarantine·TAR·GitHub response를 caller에 노출하면 Module을 삭제했을 때의 복잡성이 그대로 caller에 남는 shallow Interface가 된다.

### 5.2 권고 product Interface: entry point 1개

```ts
export type RuntimeResolutionPhase =
  | 'checking_cache'
  | 'downloading'
  | 'verifying_archive'
  | 'installing'
  | 'verifying_runtime'
  | 'ready'

export interface RuntimeResolutionProgress {
  readonly phase: RuntimeResolutionPhase
  readonly receivedBytes?: number
  readonly totalBytes?: number
}

export interface ResolvedRuntime {
  readonly runtimeRoot: string
  readonly identity: {
    readonly applicationVersion: string
    readonly runtimeReleaseVersion: string
    readonly target: 'darwin-arm64'
    readonly archiveSha256: string
    readonly runtimeVersion: string
    readonly sourceCommit: string
    readonly patchStackSha256: string
  }
}

export async function resolveRuntime(input: Readonly<{
  appDataRoot: string
  signal: AbortSignal
  report: (progress: RuntimeResolutionProgress) => void
}>): Promise<ResolvedRuntime>
```

Public Interface는 descriptor, URL, cache policy, retry option, `forceRepair`, `allowOffline`, requested Runtime version을 받지 않는다. 이 값들은 exact package의 정책이지 product host의 선택이 아니다. `signal`과 `report`를 필수로 두면 unbounded/background resolution을 방지하고 terminal UX가 progress를 표시할 수 있다. Report callback의 exception은 Implementation이 격리한다.

### 5.3 사용 예

```ts
const resolved = await resolveRuntime({
  appDataRoot,
  signal: startupAbort.signal,
  report: (progress) => terminal.renderRuntimeProgress(progress),
})

const runtime = await createCodexChatRuntime({
  runtimeRoot: resolved.runtimeRoot,
  workspace,
  environment,
})
```

Caller는 `runtimeRoot`를 직접 조립하거나 archive/cache를 repair하지 않는다. `ResolvedRuntime` identity는 diagnostics·instance receipt·release evidence에 쓸 수 있지만 executable path들은 현재 Runtime factory의 verifier 뒤에 남겨 둔다.

### 5.4 Interface invariant·ordering·error mode

| 종류 | 계약 |
| --- | --- |
| Input invariant | `appDataRoot`는 absolute·canonical·owner-only non-symlink directory여야 한다. Resolver가 다시 검증한다. |
| Version invariant | Package-owned descriptor의 Runtime 하나만 resolve한다. Caller override·moving tag·system fallback은 없다. |
| Integrity invariant | Promise가 fulfill될 때 returned root는 outer archive digest/size, embedded manifest equality, complete-tree verifier를 통과한 final content-addressed directory다. |
| Mutation invariant | Partial/staging/quarantine은 final이 아니며 spawn에 전달되지 않는다. Existing valid generation은 repair/install 실패로 덮어쓰지 않는다. |
| Network ordering | Valid final → valid archive → partial/network 순서로 본다. Offline cache hit에는 GitHub request가 0개여야 한다. |
| Cancellation | Abort는 bounded cleanup 후 `cancelled`로 reject한다. Published final이나 existing valid cache를 삭제하지 않는다. |
| Performance | First resolution/download은 archive 크기와 tree 크기에 선형이다. Cache hit도 현 security baseline에서 complete-tree hashing 비용을 지불한다. |

Stable error code 권고안은 다음과 같다.

| Code | Retryable | 의미·다음 행동 |
| --- | --- | --- |
| `cancelled` | yes | User/supervisor cancellation. Partial은 safe receipt가 있을 때만 보존 |
| `network_unavailable` | yes | Valid offline cache가 없고 transport/deadline이 실패. 연결 후 같은 exact command 재시도 |
| `release_unavailable` | no | Exact asset `404`/`410`. 다른 Runtime fallback 없음 |
| `access_denied` | conditional | Public asset의 `401`/`403`. Rate-limit evidence가 명시적일 때만 bounded wait/retryable |
| `integrity_failed` | no | Outer digest/size, inner manifest/tree, archive member policy 불일치. 재시도로 승격하지 않음 |
| `incompatible_release` | no | Descriptor/launcher/target/manifest identity가 맞지 않음. Publisher defect 또는 tampered package |
| `storage_failed` | conditional | Permission, unsafe root, disk capacity, fsync/rename/cleanup 실패. Existing valid generation은 보존 |
| `coordination_failed` | conditional | Digest install owner가 live/ambiguous. Arbitrary PID kill 없이 fail closed |

Error의 public message에 URL query, app data path, low-level stack, response body를 넣지 않는다. Structured error는 `code`, `retryable`, bounded user remediation을 주고 raw cause는 private diagnostics에만 둔다.

### 5.5 Implementation이 seam 뒤에 숨길 것

- Embedded descriptor parsing·exact compatibility
- Secure root·digest-level coordination·crash receipt
- HTTPS request, redirect, timeout/abort, status classification, bounded retry
- Range/If-Range receipt와 `200` restart/`206` append/`416` recovery
- Streaming byte bound, progress, full-file size/SHA-256
- Disk capacity gate, partial fsync, same-filesystem rename
- TAR/gzip member validation·safe staging extraction
- Canonical manifest byte equality·complete-tree verifier
- Corrupt final quarantine, offline archive repair, atomic final publish
- Yank·rollback·generation coexistence policy

이 Module을 삭제하면 위 복잡성이 production host, tests, support command에 반복되므로 depth가 크다. Caller의 leverage는 entry point 하나로 cache hit, download, repair, offline install을 모두 얻는 것이다.

### 5.6 Dependency 분류와 Adapter

| Dependency | 분류 | Seam/Adapter 전략 |
| --- | --- | --- |
| GitHub Release asset HTTPS | True external | Internal `ReleaseAssetSource` port를 두고 production HTTPS adapter와 scripted local HTTP/test adapter 두 개로 검증한다. Product Interface에 port를 노출하지 않는다. |
| Local filesystem | Local-substitutable | Real Node filesystem을 쓰고 test는 fresh temp directory·fault-injection wrapper를 사용한다. External Interface에 거대한 FS port를 만들지 않는다. |
| SHA-256·manifest validation | In-process | Module 안 pure function으로 두고 direct test한다. |
| TAR/gzip extraction | In-process + exact runtime dependency | Parser/extractor를 internal seam으로 두고 malicious archive fixture로 검증한다. Exact dependency의 version/license/SBOM은 Ticket 015 pack gate에 넣는다. |
| Time/random | In-process | Retry/deadline/nonce test에만 private clock/random adapter를 주입한다. Production Interface에 추가하지 않는다. |

External product Interface에는 하나의 production adapter만 노출하지 않는다. Test adapter와 fault injection은 package-private factory/internal seam으로 둔다. Interface가 test surface이며, consumer test는 `resolveRuntime()`의 observable file/result/error만 검증한다.

### 5.7 Trade-off

- **높은 depth·locality:** GitHub/HTTP/archive/cache 정책이 한 Module에 모이고 caller는 정책 option을 학습하지 않는다.
- **의도적으로 낮은 유연성:** Caller가 arbitrary Runtime version·mirror·URL을 선택할 수 없다. First preview에서는 이것이 supply-chain·compatibility 안전성을 높인다.
- **Cache-hit 비용:** Complete-tree verifier는 `366,692,788` regular bytes와 `2,548` file/symlink record를 매 startup에 읽는다. 현재 spawn 직전 재검증과 함께 두 번이 될 수 있다. 최적화는 actual timing evidence 후 verifier의 소유권을 하나로 합치는 방향으로 하되, marker만 신뢰하는 fast path로 바꾸지 않는다.
- **Disk 사용량:** Content-addressed generation을 지우지 않으면 rollback은 명확하지만 약 367 MB regular tree가 release별로 늘어난다. First preview의 resolver와 GC를 분리하고 사용자가 보는 storage management는 후속으로 두는 편이 안전하다.

## 6. 구현·publication blocking evidence

### 6.1 Resolver Interface gate

- Valid final이 있는 offline invocation에 network adapter 호출 `0`회
- Valid archive만 있는 offline invocation에 safe re-extract·complete verify·publish
- `200`, direct `200`, `302`·multi-hop redirect, cyclic redirect, HTTPS→HTTP redirect 거절
- Mid-stream EOF 후 strong ETag `206` resume, Range ignore `200` full restart, wrong `Content-Range`, `416`
- Declared/streamed oversize, truncated, wrong SHA-256, repeated mismatch, content encoding drift
- `408`·`429`·`5xx`·`Retry-After`, bounded one retry, cancellation/deadline
- TAR absolute/parent/duplicate path, symlink escape, hardlink/special entry, decompression bomb bound
- Inner manifest mismatch, missing/extra executable tree, legal·SBOM·provenance release roster drift, executable mode drift
- Download/extract/verify/rename 각 phase의 process kill 후 valid final 보존·safe relaunch
- Corrupt final quarantine 후 valid archive repair, archive도 corrupt인 경우 exact network repair
- Concurrent same-digest resolver는 download/publish를 하나로 합류하고 각 caller에 같은 verified final을 return
- Unsupported target/incompatible descriptor/yanked asset에 system Python·PATH·moving release fallback `0`회

### 6.2 Publisher/Ticket 015 cross-artifact gate

1. Fixed public source SHA에서 Runtime archive를 두 번 생성해 byte-identical name·size·SHA-256·inner manifest를 얻는다.
2. Ticket 003a의 `REDIST-01`–`REDIST-12`, notice/license tree, SBOM·provenance가 완료된 archive만 draft GitHub Release에 upload한다.
3. GitHub REST가 보고한 asset name·size·`sha256:` digest를 local archive와 비교한다.
4. Exact descriptor와 canonical manifest를 포함한 npm tarball을 만들고 pack roster·SBOM·source mapping을 검증한다.
5. Draft를 publish해 immutable release와 attestation을 만들고 exact tag·public commit·asset을 `gh release verify`·`verify-asset` 또는 동등한 evidence로 검증한다.
6. 그런 뒤에만 descriptor가 가리키는 exact npm version을 publish한다. npm publish가 실패하면 GitHub asset은 orphaned non-installable release로 기록하고 새 bytes로 같은 version을 재사용하지 않는다.
7. Clean Mac smoke는 public `npx --yes ay-ple@<exact>` → GitHub asset → verified cache → Runtime spawn·cleanup과 두 번째 offline Runtime cache reuse를 증명한다.

## 7. Ticket 007이 결정하되 재조사하지 말아야 할 것

- Ticket 006이 고정한 npm package/bin/public command, one foreground host, listener·Browser·single-instance lifecycle
- Ticket 005의 reviewed clean source snapshot, public source SHA mapping, repository trust/license authority
- Ticket 003a의 exact third-party redistribution/notice gate
- Ticket 008의 OAuth·Runtime lazy-start cwd 상태 머신
- Ticket 015의 실제 publication ordering·registry/release proof automation

Ticket 007이 고정할 것은 이 문서의 outer descriptor, immutable asset, safe content-addressed resolver, offline/yank/rollback semantics·deep Module Interface다. Archive parser의 exact npm dependency 제품·version은 현재 primary source로 결정할 수 없으므로 implementation/pack gate에서 reviewed exact closure로 선택해야 한다.
