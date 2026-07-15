# Codex executable·source·generated protocol provenance

## 판정

`@openai/codex@0.144.0`의 실행 artifact와 검토할 Rust source는 추정으로 연결할 필요가 없다. npm registry가 제공하는 SLSA provenance attestation이 umbrella package와 여섯 platform package를 모두 OpenAI repository의 `refs/tags/rust-v0.144.0`과 exact commit `767822446c7a594caa19609ca435281a9ec67e0d`에 직접 연결한다. 현재 tag ref는 annotated tag object `e0a9ff6938d85db1a7b11a693b6aa2bc31fe5a55`이고, 이 object가 같은 commit으로 peel된다.

이 attestation은 artifact digest와 source·workflow identity를 검증 가능하게 묶지만, native binary를 독립적으로 reproducible build해 byte-for-byte 재현했다는 증거나 source가 안전하다는 보증은 아니다. npm provenance는 Sigstore certificate와 public transparency ledger를 사용한다는 범위에서 신뢰하며, architecture review는 여전히 pinned source·tests와 live binary를 직접 대조해야 한다. ([npm provenance](https://docs.npmjs.com/generating-provenance-statements/), [npm signature verification](https://docs.npmjs.com/cli/v11/commands/npm-audit/))

장기 provenance는 아래 네 pin을 하나로 뭉개지 않고 서로 대조해야 한다.

| Pin | 소유하는 사실 | 현재 값 |
| --- | --- | --- |
| npm dependency·lock | 실제 설치할 launcher/platform tarball과 integrity | `@openai/codex@0.144.0` |
| Registry attestation | npm artifact를 만든 source ref·commit | `rust-v0.144.0` → `767822446c7a594caa19609ca435281a9ec67e0d` |
| Git submodule gitlink | 사람이 검색·diff할 dev-only source checkout | 권고 경로 `references/openai-codex`, exact commit `767822…` |
| Generated protocol digest | 그 binary와 현재 AY-PLE generator가 만든 committed input | 601 files, `a1f91671494d73c1dde5c781359e9a66be0f0f5b22b168fc2270ce45d1730a3a` |

Submodule은 runtime dependency나 schema generator가 아니다. 일반 `npm test`, `npm run typecheck`, `npm run build`는 committed generated protocol과 npm-installed executable만 사용하고, Rust checkout은 source research와 Codex pin upgrade gate에서만 초기화한다.

## Evidence authority

| 질문 | Authority | 쓰지 말아야 할 대체 근거 |
| --- | --- | --- |
| 어떤 executable bytes를 설치하는가 | `packages/runtime-codex/package.json`, `package-lock.json`, npm registry tarball integrity | Global `PATH`의 `codex`, submodule에서 임의로 local build한 binary |
| npm artifact가 어떤 source에서 만들어졌는가 | npm SLSA attestation의 `resolvedDependencies[].digest.gitCommit` | Semver 문자열이 같다는 추정, GitHub release 제목만의 비교 |
| 공개 protocol shape는 무엇인가 | Pinned binary가 만든 committed TypeScript/JSON Schema | Rust private type이나 current `main` source |
| Pinned version의 구현·test fact는 무엇인가 | Exact commit의 Rust source·tests | Moving tag URL, current `main`, 기억이나 downstream reimplementation |
| Scheduler·stdio interleaving이 실제 binary에서 어떻게 관찰되는가 | Package-owned binary live probe | Source task 구조만으로 관찰 결과를 단정하는 것 |
| AY-PLE가 무엇을 채택하는가 | AY-PLE ADR/spec/use-case decision | Upstream TUI/exec의 UI policy를 자동으로 제품 policy로 승격하는 것 |

공식 App Server 문서는 CLI가 생성하는 TypeScript와 JSON Schema가 **실행한 Codex version에 specific**하다고 명시한다. 따라서 committed generated artifact가 public shape의 versioned baseline이고, Rust source는 그 shape가 규정하지 않는 version-specific implementation fact를 조사하는 보조 authority다. ([Codex App Server — Message schema](https://developers.openai.com/codex/app-server/#message-schema))

## 확인한 current facts

### Executable package와 lock

- Runtime package는 exact dependency `@openai/codex: 0.144.0`을 사용한다. Range가 아니다. (`packages/runtime-codex/package.json:38-41`)
- Lock은 umbrella tarball URL과 integrity를 고정하고, 여섯 OS/CPU alias를 모두 `0.144.0-<platform>` version과 각 integrity로 고정한다. (`package-lock.json:573-694`)
- 현재 package-owned launcher는 `codex-cli 0.144.0`을 출력했다. Generator도 binary version을 package pin과 비교한 뒤 method inventory를 만든다. (`packages/runtime-codex/scripts/render-codex-app-server-methods.ts:322-343`, `packages/runtime-codex/scripts/render-codex-app-server-methods.ts:358-383`)

Umbrella package 자체는 reusable TypeScript App Server client library가 아니다. Registry metadata의 `fileCount`는 3이고 package는 `bin/codex.js`를 binary entry로 노출한다. Upstream packaging script도 root package에는 launcher를 넣고 actual native payload는 platform packages의 `vendor/`에 넣는다. Launcher가 OS/CPU에 맞는 alias를 resolve해 native executable을 spawn한다. ([npm package metadata](https://registry.npmjs.org/@openai/codex/0.144.0), [launcher at exact commit](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-cli/bin/codex.js#L16-L110), [package builder at exact commit](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-cli/scripts/build_npm_package.py#L21-L80), [staging logic](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-cli/scripts/build_npm_package.py#L229-L324))

따라서 root tarball integrity만 검증해서는 실제 executable provenance가 완결되지 않는다. Current lock의 platform artifacts와 확인한 attested commit은 다음과 같다.

| Lock entry | Version | Integrity | Attested commit |
| --- | --- | --- | --- |
| `@openai/codex` | `0.144.0` | `sha512-QFh6f+v5QUx/Vg0HjIl9HB94p7aDLBDkZjc4IXX5RXUcXHPVCZNb6Hl2R49Og/fqW7orgZkeDcgWfRANUa1WoQ==` | `767822446c7a594caa19609ca435281a9ec67e0d` |
| `@openai/codex-linux-x64` | `0.144.0-linux-x64` | `sha512-GmKtQeX+cO9lN7mQD1FEVcXYEMLMgMByHwZdvlluH0bj/+c2ind3hwbRtE3eECFDekNhEiB80Ez0FfbkyFQqoA==` | same |
| `@openai/codex-linux-arm64` | `0.144.0-linux-arm64` | `sha512-k++xhZrn9P3laO00Q92APG6mdOFDD66nUBo+8ExCa1NXi2pjLEMLC4+UNJTUUtUT1PEflOZ5pDKxPXgzaiFFFg==` | same |
| `@openai/codex-darwin-x64` | `0.144.0-darwin-x64` | `sha512-4p2jxRbN+Khg5UQzpkzT9upFj+qkEF/abmdvrtflkkWmVKP6Nt+yi8ospdqv9PDqvQ9SotPvX7iXaFaeUTrtmA==` | same |
| `@openai/codex-darwin-arm64` | `0.144.0-darwin-arm64` | `sha512-rqFAJdOa2I0VRgepVsSZeLxs96+Y+LXTjccOOvH6894FyaFAYPZ/o+6hgpB1iGHxxdoY/DsGa8jrJC8Leqn9Kg==` | same |
| `@openai/codex-win32-x64` | `0.144.0-win32-x64` | `sha512-QiholLCYqNeYvNM77HOmPtrOFrY0rQc/N9nXt+sQGXO3rEGmcWjpLzujY4Oegl3CLRHoieWqlep3EqEvFBjoIA==` | same |
| `@openai/codex-win32-arm64` | `0.144.0-win32-arm64` | `sha512-e2yGSgwdzrT1SoJMoOzWD58WBEsIaAMZpEchuV2VGkE2T955SG7dn7EyVQTQcy7/rdpE8aEDktZ/1eQQfjkdtQ==` | same |

### Artifact → attestation → tag → commit chain

Root attestation의 subject SHA-512는 lock integrity를 hex로 decode한 값 `40587a7febf9414c7f560d078c897d1c1f78a7b6832c10e46637382175f945751c5c73d509935be87976478f4e83f7ea5bba2b81991e0dc8167d100d51ad56a1`과 같다. SLSA predicate는 다음을 직접 기록한다.

- workflow ref: `refs/tags/rust-v0.144.0`
- repository: `https://github.com/openai/codex`
- workflow path: `.github/workflows/rust-release.yml`
- resolved `gitCommit`: `767822446c7a594caa19609ca435281a9ec67e0d`
- invocation: `https://github.com/openai/codex/actions/runs/29031683761/attempts/1`

같은 검사를 여섯 platform version에도 수행했고 subject digest는 각각 lock integrity와 일치하며 모두 같은 ref·commit을 가리켰다. ([root npm attestation](https://registry.npmjs.org/-/npm/v1/attestations/@openai%2fcodex@0.144.0), [darwin-arm64 attestation 예시](https://registry.npmjs.org/-/npm/v1/attestations/@openai%2fcodex@0.144.0-darwin-arm64))

Git remote도 current ref를 다음과 같이 보여 준다.

```text
e0a9ff6938d85db1a7b11a693b6aa2bc31fe5a55  refs/tags/rust-v0.144.0
767822446c7a594caa19609ca435281a9ec67e0d  refs/tags/rust-v0.144.0^{}
```

Tag object는 `Release 0.144.0` annotated tag이고, exact commit의 Rust workspace version도 `0.144.0`이다. Tag와 commit은 GitHub verification 기준 unsigned이므로 tag signature를 authority로 삼지 않는다. Release workflow는 tag name과 workspace `Cargo.toml` version 일치를 먼저 검사하고, 그 release에서 platform packages를 root launcher보다 먼저 publish한다. ([GitHub release](https://github.com/openai/codex/releases/tag/rust-v0.144.0), [tag API](https://api.github.com/repos/openai/codex/git/tags/e0a9ff6938d85db1a7b11a693b6aa2bc31fe5a55), [exact commit](https://github.com/openai/codex/commit/767822446c7a594caa19609ca435281a9ec67e0d), [workspace version](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/Cargo.toml#L132-L139), [release tag check](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/.github/workflows/rust-release.yml#L25-L53), [npm publication order](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/.github/workflows/rust-release.yml#L1366-L1422))

### Generated protocol digest

AY-PLE generator는 package-owned binary로 stable `generate-ts`와 `generate-json-schema`를 실행하고, 선택한 response schema를 합치며 NodeNext용 `.js` import rewrite를 적용한다. 즉 committed tree는 pure upstream dump가 아니라 **pinned binary output + tracked AY-PLE transformation**이다. (`packages/runtime-codex/scripts/generate-codex-app-server-types.ts:19-73`)

Current committed generated directory의 601개 regular file은 모두 tracked이고 아래 canonical file-manifest digest가 나온다.

```bash
GEN=packages/runtime-codex/src/internal/codex-app-server-protocol/generated
(
  cd "$GEN"
  find . -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256
) | shasum -a 256
```

```text
a1f91671494d73c1dde5c781359e9a66be0f0f5b22b168fc2270ce45d1730a3a  -
```

`sha256-file-manifest-v1`은 regular file만 허용하고, `./`를 붙인 POSIX relative path를 UTF-8 byte order로 정렬한 뒤 각 file에 대해 `<lowercase file SHA-256><두 칸><path>\n`을 만들고 그 전체 UTF-8 manifest를 다시 SHA-256으로 계산한다. 구현 verifier는 위 shell 결과와 같아야 하며 symlink, 중복 path, newline을 포함한 path는 거부한다.

별도 temporary copy에서 `npm run generate:codex-types -w @ay-ple/runtime-codex`와 같은 generator를 다시 실행했으며 directory diff는 0, file count와 digest는 동일했다. 이 digest는 experimental temporary generation을 포함하지 않는다. `generate:codex-methods`는 `--experimental` output을 temporary directory에서 읽고 generated method inventory만 commit하므로, pin upgrade에서는 stable tree digest와 inventory diff를 둘 다 검토해야 한다. (`packages/runtime-codex/scripts/render-codex-app-server-methods.ts:300-346`, `packages/runtime-codex/scripts/render-codex-app-server-methods.ts:386-413`)

Digest는 drift detector이지 schema 의미의 유일한 oracle이 아니다. Pinned upstream의 raw JSON bundle은 두 번 생성했을 때 object definition 순서만 달라질 수 있었고, upstream fixture도 JSON object key와 의미상 unordered collection을 canonicalize해 비교한다. 따라서 upgrade gate는 tracked AY-PLE transformation 결과를 격리된 directory에서 두 번 재생성해 비교하고, 순서만 다른 raw JSON을 곧바로 protocol drift로 판정하지 않는다. 재생성 결과 자체가 불안정하면 JSON semantic canonicalization을 먼저 정의해야 한다. ([upstream schema fixture comparison](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/schema_fixtures.rs#L124-L207))

현재 generator에는 upgrade gate로 사용하기 전에 고쳐야 할 gap도 있다. `generate-codex-app-server-types.ts`는 resolved binary version·manifest provenance를 검사하기 전에 committed `generated/` directory를 삭제한다. `generate:codex-methods`의 version check는 stable generation이 끝난 뒤에야 실행된다. 따라서 새 verifier/generator orchestration은 package pin, lock, resolved package-owned binary와 `codex --version`을 **output 삭제 전에** fail-closed preflight하고, fresh temporary output이 검증된 뒤에만 tracked output을 교체해야 한다. (`packages/runtime-codex/scripts/generate-codex-app-server-types.ts:19-31`, `packages/runtime-codex/scripts/render-codex-app-server-methods.ts:322-333`)

### Source checkout과 reviewed path ledger

Ticket 003 조사 fixed point에는 tracked `.gitmodules`나 submodule gitlink가 없었고 exact source를 temporary checkout에서 확인했다. 이후 user-approved fork-first checkpoint에서 `references/openai-codex`와 `references/ai-sdk-provider-codex-cli`를 각각 exact official commit과 community fork baseline commit에 dev-only gitlink로 추가했다. Official `openai/codex` source에는 실제 Rust `app-server-client` crate가 있고 TUI/exec가 공유하는 in-process facade라고 스스로 설명하지만, 이 Rust crate는 npm launcher가 export하는 TypeScript library가 아니다. Community gitlink는 implementation donor provenance이며 이 문서가 소유하는 official npm/source attestation authority를 대신하지 않는다. ([client README](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/README.md#L1-L67), [client crate](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L1-L172))

Ticket 003에서 실제로 열어 provenance와 path role을 확인한 upstream file은 다음과 같다. Claim을 인용할 때는 tag URL이 아니라 이 commit과 exact path/line을 사용해야 한다.

| Path | 이번에 확인한 범위 | 후속 owner |
| --- | --- | --- |
| `.github/workflows/rust-release.yml` | tag/version gate, build·npm packaging/publication | Pin upgrade gate |
| `codex-cli/package.json` | root npm package가 launcher만 포함하는 source manifest | Pin upgrade gate |
| `codex-cli/bin/codex.js` | platform alias resolution과 native executable spawn | Executable provenance |
| `codex-cli/scripts/build_npm_package.py` | platform matrix, root/platform package staging | Executable provenance |
| `codex-rs/Cargo.toml` | workspace version과 client/protocol/test-client membership | Pin upgrade gate |
| `codex-rs/cli/src/main.rs` | `generate-ts`·`generate-json-schema` entrypoint와 `--experimental` | Schema provenance |
| `codex-rs/app-server-client/README.md` | first-party client crate의 declared purpose와 boundary | Ticket 005 |
| `codex-rs/app-server-client/src/lib.rs` | bounded event facade, typed request/error surface의 source location | Ticket 005 |
| `codex-rs/app-server-test-client/src/lib.rs` | response wait 중 notification FIFO 보관 path | Tickets 004·005 |

다음 path들은 Tickets 004–006의 **seed roster**다. 존재를 exact commit에서 확인했지만, Ticket 003은 이들의 lifecycle/architecture 의미를 완료 판정하지 않는다. 각 후속 evidence asset이 실제로 읽은 path와 line range를 provenance manifest에 추가해야 한다.

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/{thread,turn,item}.rs`
- `codex-rs/app-server/src/{message_processor,outgoing_message,transport}.rs`
- `codex-rs/app-server/src/request_processors/{initialize_processor,thread_processor,thread_lifecycle,turn_processor}.rs`
- `codex-rs/app-server/src/request_processors/thread_processor_tests.rs`
- `codex-rs/app-server/tests/common/test_app_server.rs`
- `codex-rs/app-server/tests/suite/v2/{initialize,thread_start,thread_list,thread_read,thread_resume,turn_start,turn_interrupt}.rs`
- `codex-rs/core/src/{codex_thread,thread_manager}.rs`
- `codex-rs/core/src/tasks/regular.rs`
- `codex-rs/tui/src/{app,chatwidget,thread_transcript}.rs`
- `codex-rs/exec/src/{lib,event_processor,event_processor_with_jsonl_output}.rs`

## 권고 layout과 ownership

```text
references/
└── openai-codex/                       # optional dev-only git submodule
packages/runtime-codex/
├── package.json                        # executable version selector
├── codex-upstream-provenance.json      # cross-link manifest
├── provenance/openai-codex-0.144.0/    # signed registry attestation snapshots
├── scripts/
│   └── verify-codex-provenance.ts      # structural/source/upgrade modes
└── src/internal/codex-app-server-protocol/generated/
                                         # committed generated contract
docs/wayfinding/codex-native-client-redesign/assets/
└── 00x-*.md                            # claim-level interpretation and exact citations
```

| Owner | 책임 | 책임지지 않는 것 |
| --- | --- | --- |
| `packages/runtime-codex/package.json` | Runtime executable의 exact semver 선택 | Source commit을 semver로 추정 |
| `package-lock.json` | Root/platform tarball URLs와 integrity | Architecture interpretation |
| `.gitmodules` + submodule gitlink | Source repository 위치와 exact source commit | Runtime/build dependency |
| `codex-upstream-provenance.json` | Package/attestation/tag/commit/gitlink/generated digest의 cross-check 값과 evidence index | 독립적인 두 번째 version selector |
| Committed `generated/` | Pinned public protocol input | Private Rust behavior나 product policy |
| Wayfinder research assets | Reviewed source path·line, fact/inference/product deviation 구분 | Executable 설치와 generated artifact 생성 |

권고 manifest의 최소 shape는 다음과 같다. `package.json`이 version 선택의 owner이고 manifest는 그 값을 mirror하여 drift를 fail시키며, platform integrity의 install authority는 lock이다.

```json
{
  "schemaVersion": 1,
  "npm": {
    "name": "@openai/codex",
    "version": "0.144.0",
    "rootIntegrity": "sha512-QFh6f+v5QUx/Vg0HjIl9HB94p7aDLBDkZjc4IXX5RXUcXHPVCZNb6Hl2R49Og/fqW7orgZkeDcgWfRANUa1WoQ==",
    "artifactRoster": [
      "@openai/codex",
      "@openai/codex-linux-x64",
      "@openai/codex-linux-arm64",
      "@openai/codex-darwin-x64",
      "@openai/codex-darwin-arm64",
      "@openai/codex-win32-x64",
      "@openai/codex-win32-arm64"
    ]
  },
  "source": {
    "repository": "https://github.com/openai/codex.git",
    "releaseRef": "refs/tags/rust-v0.144.0",
    "refObjectType": "tag",
    "refObject": "e0a9ff6938d85db1a7b11a693b6aa2bc31fe5a55",
    "commit": "767822446c7a594caa19609ca435281a9ec67e0d",
    "tree": "444a05890bb4f4327dc53f44ad348cfd6431ecc8",
    "submodulePath": "references/openai-codex"
  },
  "generatedProtocol": {
    "path": "packages/runtime-codex/src/internal/codex-app-server-protocol/generated",
    "algorithm": "sha256-file-manifest-v1",
    "fileCount": 601,
    "digest": "a1f91671494d73c1dde5c781359e9a66be0f0f5b22b168fc2270ce45d1730a3a"
  },
  "attestationSnapshots": {
    "directory": "packages/runtime-codex/provenance/openai-codex-0.144.0",
    "indexAlgorithm": "sha256-file-manifest-v1",
    "indexDigest": "<snapshot을 추가할 때 계산>"
  },
  "evidence": [
    {
      "scope": "provenance",
      "asset": "docs/wayfinding/codex-native-client-redesign/assets/003-upstream-source-provenance.md",
      "sourcePaths": [
        ".github/workflows/rust-release.yml",
        "codex-cli/bin/codex.js",
        "codex-cli/scripts/build_npm_package.py",
        "codex-rs/cli/src/main.rs"
      ]
    }
  ]
}
```

`references/openai-codex`는 root npm workspaces, TypeScript `include`/path alias, package exports와 ordinary test/build scripts 어디에도 넣지 않는다. CI의 일반 checkout도 submodule을 initialize하지 않는다. Exact commit GitHub URL은 uninitialized clone에서도 읽을 수 있고, local source 검색이나 old/new source diff가 필요한 작업만 submodule을 initialize한다.

Registry의 root·여섯 platform SLSA bundle은 약 105 KB이므로 version별 evidence directory에 원문 snapshot을 함께 보존하고 manifest가 각 snapshot digest를 가리키게 한다. Snapshot은 npm tarball mirror가 아니며, online upgrade 때 registry·transparency evidence를 다시 검증하는 절차를 대체하지 않는다. 다만 registry endpoint 장애나 metadata 변화가 생겨도 당시 artifact→commit 판단 근거를 repository history에서 재검토할 수 있게 한다.

Default structural check는 snapshot bytes·lock·manifest가 처음 검토한 상태에서 drift하지 않았다는 것만 증명한다. Snapshot signature의 authenticity나 현재 trust root까지 offline에서 새로 증명하는 provenance pass가 아니다. Offline cryptographic verification과 trust-root lifecycle이 실제 요구가 되면 Ticket 013에서 별도 oracle로 설계하며, 이름만 `offline verifier`로 붙여 과장하지 않는다.

## 재현 가능한 pin·verification workflow

### Initial submodule pin

`branch = ...`를 `.gitmodules`에 넣지 않는다. Moving branch/tag가 아니라 superproject gitlink가 exact commit을 소유해야 한다.

```ini
[submodule "openai-codex"]
	path = references/openai-codex
	url = https://github.com/openai/codex.git
	update = checkout
	fetchRecurseSubmodules = false
```

`shallow`과 `ignore`도 두지 않는다. Release 사이 source diff를 보존하고 dirty/mismatched checkout을 숨기지 않기 위해서다. Ordinary clone은 submodule을 초기화하지 않으며, source 작업자가 명시적으로 init한다. `git submodule update --remote`는 사용하지 않는다.

```bash
git submodule add --name openai-codex \
  https://github.com/openai/codex.git references/openai-codex
git -C references/openai-codex fetch origin \
  refs/tags/rust-v0.144.0:refs/tags/rust-v0.144.0
test "$(git -C references/openai-codex rev-parse \
  'refs/tags/rust-v0.144.0^{commit}')" = \
  '767822446c7a594caa19609ca435281a9ec67e0d'
git -C references/openai-codex checkout --detach \
  767822446c7a594caa19609ca435281a9ec67e0d
git add .gitmodules references/openai-codex
```

Fresh clone에서 source work가 필요할 때만 실행한다.

```bash
git submodule update --init -- references/openai-codex
git -C references/openai-codex rev-parse HEAD
```

Gitlink는 submodule이 uninitialized여도 검사할 수 있다.

```bash
git ls-files --stage references/openai-codex
# mode 160000, object 767822446c7a594caa19609ca435281a9ec67e0d 이어야 한다.
```

### Registry authenticity verification과 remote ref 확인

Installed dependency closure에는 먼저 npm의 공식 verifier를 사용한다. npm 문서는 `npm audit signatures`가 registry signature와 provenance attestation을 검사하고 invalid 또는 missing evidence에 non-zero로 실패한다고 명시한다. ([Viewing package provenance](https://docs.npmjs.com/viewing-package-provenance/), [npm provenance verification](https://docs.npmjs.com/generating-provenance-statements/#verifying-provenance-attestations))

```bash
npm audit signatures --workspace @ay-ple/runtime-codex
```

한 host의 installed closure에는 그 OS/CPU의 optional package만 포함될 수 있으므로 이 명령 하나를 일곱 package release gate로 간주하지 않는다. Upgrade verifier는 manifest의 exact roster인 root launcher와 여섯 platform package를 각각 열거하며, 각 registry endpoint의 provenance·publish bundle에 아래 순서를 적용한다.

1. npm CLI와 같은 maintained Sigstore verifier로 DSSE signature, Fulcio certificate chain·issuer·SAN identity·valid signing time, certificate transparency와 Rekor inclusion, registry publish attestation을 검증한다.
2. `tlogThreshold >= 1`, `ctLogThreshold >= 1`, issuer `https://token.actions.githubusercontent.com`, anchored SAN `https://github.com/openai/codex/.github/workflows/rust-release.yml@refs/tags/rust-v0.144.0`을 요구한다.
3. **Cryptographic verification을 통과한 signed payload만** package name/version·subject SHA-512, repository·workflow·ref·commit·run policy와 비교한다.
4. Current `0.144.0`의 exactly seven-package roster 중 하나라도 missing/invalid이거나 서로 다른 source identity를 가리키면 fail closed한다. Future root package의 platform roster가 달라지면 자동 수용하지 않고 manifest change와 platform support review를 먼저 요구한다.

npm은 내부적으로 Sigstore signature, Fulcio chain과 Rekor evidence를 검증한 뒤 installed package identity·digest를 attestation subject와 비교한다. Full-roster verifier의 exact package/API pin과 trust-root update policy는 Ticket 013이 정하되, official `sigstore` JavaScript verifier처럼 identity·CT·tlog threshold를 명시할 수 있는 구현을 사용한다. Raw JSON parser를 자체 cryptographic verifier로 만들지 않는다. ([npm provenance verification design](https://github.com/npm/provenance#verifying-attestations-with-npm-audit-signatures), [official Sigstore JavaScript verifier](https://www.npmjs.com/package/sigstore))

아래 command는 **서명이 검증된 뒤 signed claim을 사람이 관찰하는 보조 수단**일 뿐 pass/fail verification이 아니다.

```bash
npm view @openai/codex@0.144.0 --json \
  version dist repository bin engines files optionalDependencies

git ls-remote --tags https://github.com/openai/codex.git \
  'refs/tags/rust-v0.144.0' \
  'refs/tags/rust-v0.144.0^{}'

curl -fsSL \
  'https://registry.npmjs.org/-/npm/v1/attestations/@openai%2fcodex@0.144.0' \
  | jq -r '.attestations[]
    | select(.predicateType == "https://slsa.dev/provenance/v1")
    | .bundle.dsseEnvelope.payload' \
  | base64 --decode \
  | jq '{subject,
      workflow: .predicate.buildDefinition.externalParameters.workflow,
      resolvedDependencies: .predicate.buildDefinition.resolvedDependencies,
      invocationId: .predicate.runDetails.metadata.invocationId}'
```

Root 및 target platform의 verified attestation subject SHA-512를 lock의 `sha512-` base64와 decode하여 비교하고, workflow ref와 resolved commit도 manifest와 비교한다. `npm view` version과 `codex --version`, 또는 unverified decoded payload만 맞는 것은 충분하지 않다.

### Generated artifact reproducibility

목표 clean-tree check는 Rust checkout 없이 실행된다. 다만 현재 generator에는 위에서 확인한 pre-delete gap이 있으므로, provenance preflight를 구현하기 전에는 clean `git archive` 기반 temporary copy에서만 아래 generation을 실행해 tracked tree와 비교한다. Working tree에서 직접 실행하는 형태를 upgrade gate로 문서화하지 않는다.

```bash
npm ci
node_modules/.bin/codex --version
# package pin·lock·binary version을 먼저 검사한 isolated copy에서 실행
npm run generate:codex-methods -w @ay-ple/runtime-codex
git diff --exit-code -- \
  packages/runtime-codex/src/internal/codex-app-server-protocol/generated \
  docs/architecture/codex-app-server-method-inventory.md
```

Preflight와 temporary-output 교체가 구현된 뒤에는 fresh output을 두 번 생성해 서로 같은지 확인하고, reviewed diff를 stage한 뒤 같은 command를 다시 실행해 unstaged diff가 0인지 확인한다. 그 다음 canonical digest와 manifest 값을 갱신한다. Generator를 submodule Cargo build로 대체하지 않는다.

### Upgrade gate

1. Target `@openai/codex` exact version의 root와 모든 platform registry metadata/attestation을 가져온다. Target roster가 current manifest의 seven-package roster와 다르면 자동 진행하지 않고 added/removed platform을 먼저 review해 proposed manifest roster를 확정한다.
2. 각 package의 registry signature, SLSA provenance와 publish attestation authenticity·certificate identity·CT/Rekor evidence를 공식 npm/Sigstore verifier로 먼저 검증한다. 그 다음에만 root와 platform artifact가 같은 release ref·exact commit을 가리키는지, 각 subject digest가 target lock integrity와 같은지 확인한다. Attestation이 없거나 invalid이거나 서로 다른 commit이면 중단한다.
3. Remote tag object와 peeled commit을 기록한다. Manifest의 old/new exact commit으로 source diff하며 moving tag name만으로 checkout하지 않는다.
4. `package.json` exact pin과 lock을 갱신하고, tracked output을 지우기 전에 package-owned binary path·`codex --version`·manifest preflight를 통과시킨다.
5. Submodule gitlink를 **attested commit**으로 이동한다.
6. Stable generated tree와 stable/experimental method inventory를 재생성하고 전체 diff를 검토한다. Generated digest·file count를 갱신한다.
7. Manifest에 기록된 reviewed path가 삭제·이동·변경되었는지 확인하고, 영향을 받은 method/architecture evidence asset을 다시 조사한다. Line number만 기계적으로 옮기지 않는다.
8. Pinned source/schema/live evidence gate와 repository Standards/Spec review가 통과한 뒤에만 pin upgrade를 merge한다. Exact oracle matrix는 Wayfinder Ticket 013이 결정한다.

## Failure cases와 fail-closed 동작

| Failure | 의미 | 필요한 동작 |
| --- | --- | --- |
| Uninitialized submodule (`git submodule status` prefix `-`) | Source checkout만 없음 | Ordinary npm test/build는 계속 가능해야 한다. Source/upgrade verifier만 `git submodule update --init -- references/openai-codex` 안내와 함께 실패한다. |
| Submodule HEAD 앞의 `+` | Working tree가 superproject gitlink와 다름 | Source evidence를 만들지 않고 exact gitlink commit으로 checkout한다. |
| Shallow submodule | Current commit은 있어도 old/new tag object·history diff가 없을 수 있음 | Ordinary work에는 허용한다. Upgrade audit에서는 필요한 old/new tag와 commits를 fetch하고 history가 없으면 unshallow한다. `git describe` 결과를 provenance로 사용하지 않는다. |
| Remote tag movement | 현재 tag object/peeled commit이 manifest 또는 immutable npm attestation과 다름 | Fail closed. Existing gitlink와 commit URL은 유지하고 원인을 조사한다. 새 remote tag target으로 자동 이동하지 않는다. |
| Lightweight tag로 release 방식 변경 | `ref^{}` second line이나 annotated tag object가 없을 수 있음 | Ref object type과 exact ref SHA를 manifest에 명시하고 attested commit을 최종 source identity로 사용한다. Current `0.144.0`을 모든 version의 형태로 일반화하지 않는다. |
| Root npm tarball만 검증 | Launcher integrity만 확인하고 actual native binary tarball은 미검증 | Target platform lock entry와 attestation을 함께 검증한다. |
| Optional platform package 누락 | `bin/codex.js`가 executable을 찾지 못함 | Submodule build로 silently 대체하지 않는다. `npm ci`/platform support 문제로 실패시키고 package install을 고친다. |
| Unsupported OS/CPU | Upstream launcher mapping에 target이 없음 | Product support decision으로 처리한다. Source checkout 존재를 runtime fallback으로 사용하지 않는다. |
| Registry attestation 누락·malformed | Artifact→source mapping을 증명할 수 없음 | Semver/tag 이름으로 추정하지 않고 upgrade를 중단한다. 별도 reviewed exception decision 없이는 진행하지 않는다. |
| DSSE signature, certificate issuer/SAN/time, CT 또는 Rekor proof invalid | Decoded claim이 self-consistent해도 authentic provenance가 아님 | Payload를 policy input으로 사용하지 않고 fail closed한다. Raw `curl`/decode 결과나 stored snapshot digest로 우회하지 않는다. |
| Accepted artifact roster 일부만 검증 | Current host package만 authentic하고 다른 distributed binary는 미검증일 수 있음 | Current pin은 root와 여섯 platform package가 모두 통과해야 한다. Upgrade에서 roster가 바뀌면 added/removed platform을 review한 뒤 accepted roster 전체를 검증한다. |
| Schema digest mismatch, generated diff 있음 | Binary, local generator/roster 또는 committed output 중 하나가 달라짐 | Generator와 source pin을 대조하고 diff를 review한다. Digest만 덮어써서 통과시키지 않는다. |
| Experimental surface drift | Current stable-tree digest에는 temporary `--experimental` output이 없음 | `generate:codex-methods` inventory diff와 decision overlay를 별도 필수 review한다. |
| npm artifact가 registry에서 사라짐 | Source submodule은 binary availability를 보장하지 않음 | 현재 목표에는 artifact mirror를 추가하지 않는다. Offline/escrow 요구가 생기면 별도 supply-chain decision으로 다룬다. |
| Upstream source repository가 사라짐 | Gitlink는 commit identity만 pin하며 object availability를 보존하지 않음 | Existing evidence는 유지하되 source review/upgrade gate를 실패시킨다. 별도 mirror·source escrow는 현재 결정에 포함하지 않으며 필요해지면 supply-chain decision으로 추가한다. |

## 최종 권고

1. `references/openai-codex`를 dev-only submodule로 추가하고 gitlink를 `767822446c7a594caa19609ca435281a9ec67e0d`에 둔다. 일반 Node workflow는 이 directory를 전혀 참조하지 않는다.
2. `packages/runtime-codex/codex-upstream-provenance.json`을 추가해 package pin, root integrity, tag object, attested commit, submodule path, generated-tree digest와 evidence path index를 cross-link하고, root·여섯 platform attestation bundle snapshot을 version별 evidence로 보존한다.
3. Default structural check와 explicit source/upgrade verifier를 분리한다. Default check는 package/lock/committed digest drift만 보며 submodule initialization이나 network를 요구하지 않고, provenance authenticity를 통과했다고 주장하지 않는다.
4. Architecture research는 exact commit GitHub URL과 local submodule relative path를 함께 남긴다. Manifest는 path index를, 각 evidence asset은 의미·line range·fact/inference 구분을 소유한다.
5. Upgrade는 npm version bump가 아니라 일곱 package의 cryptographic registry/Sigstore verification·artifact integrity·SLSA commit·remote ref·gitlink·pre-delete binary preflight·schema regeneration·source path review가 한 transaction으로 통과할 때만 완료한다.

이 방식이면 npm artifact가 실제 실행 계약을, generated schema가 public protocol shape를, exact Rust checkout이 implementation reference를 각각 소유한다. Submodule을 runtime dependency로 만들지 않으면서도 향후 Ticket 004–006과 pin upgrade가 같은 immutable source baseline을 재현할 수 있다.
