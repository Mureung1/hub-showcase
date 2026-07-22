# Third-party 재배포 evidence와 release notice gate

작성일: 2026-07-22

상태: Ticket 003a의 point-in-time research evidence

감사 기준 source revision: `022bd4e71f2f2f515864f4a77fafb96e35a3a00b`

> 이 문서는 법률 자문이 아니라 첫 public preview의 보수적인 engineering release gate다. License 해석이 불명확하거나 artifact evidence가 없으면 허용으로 추정하지 않고 publication을 중단한다.

이 ticket의 `resolved`는 known top-level obligation과 opaque dependency closure의 blocking contract를 확정했다는 뜻이다. Rust·vendored dependency의 exact closure가 이미 release-cleared됐다는 뜻이 아니며, canonical roster로 생성·검토되기 전까지 해당 component 전체가 `blocked`다.

## 판정

조사한 top-level license는 조건을 충족하는 재배포 경로를 제공한다. 그러나 현재 source·npm·Runtime 후보는 **public release cleared 상태가 아니다.** 실행 무결성이 검증된 Runtime이라는 사실은 third-party 재배포 의무를 충족했다는 뜻이 아니다.

현재 hard blocker는 다음 네 묶음이다.

| 표면 | 현재 blocker |
| --- | --- |
| Public source | Patched OpenAI SDK의 수정 파일 고지, `.agents/**`의 exact upstream revision·license, clean export allowlist가 닫히지 않았다. |
| npm tarball | 현재 Chat Shell build가 React 계열과 `lucide-react` 코드를 JS에 직접 묶지만 license marker·bundle-origin report·`THIRD_PARTY_NOTICES`가 없다. |
| Native Runtime | `openai-codex-cli-bin` wheel이 `codex`, `codex-code-mode-host`, `rg`, patched `zsh`만 담고 nested license·NOTICE를 담지 않는다. 두 Rust binary의 reachable dependency closure도 없다. |
| Python Runtime | 선택한 `python-build-standalone` stripped archive가 matching `PYTHON.json`과 native license tree를 제외하고, pip vendored dependency notice도 불완전하다. |

따라서 이 ticket의 결론은 “재배포 금지”가 아니라 **아래 material contract와 fail-closed gate를 구현하기 전에는 publish 금지**다. First-party AY-PLE license와 public lineage는 Ticket 005, npm artifact composition은 Ticket 006, Runtime archive의 실제 path·verifier는 Ticket 007, 자동 publication gate는 Ticket 015가 소유한다.

## 배포 표면을 섞지 않는다

License 의무는 manifest의 dependency 선언이 아니라 recipient에게 실제 전달되는 byte를 기준으로 적용한다.

| Distribution surface | Third-party byte의 예 | 필요한 evidence |
| --- | --- | --- |
| Public source snapshot | Vendored·patched OpenAI SDK source, patch, 복사된 skill·asset | Exact upstream revision, 원문 license·NOTICE, 수정 고지, positive export allowlist |
| npm package tarball | Prebuilt Chat Shell JS·CSS, Server output, launcher source | `npm pack` roster, bundler origin graph, bundled component license set, external dependency SBOM |
| Runtime release archive | Standalone Python, Python wheels, native executables | Archive component manifest, exact input·installed digest, license tree, NOTICE, SBOM, source-availability pointer |
| Declared npm dependency | npm이 별도 tarball로 설치하는 `express`, `dotenv` 등 | Registry identity·integrity와 runtime SBOM. AY-PLE tarball에 byte가 없으면 해당 package tarball의 license file을 중복 vendoring할 필요는 없다. |
| Build-only input | `uv-build`, Vite·TypeScript 등 | Final artifact에 byte가 들어가지 않았다는 origin evidence. 들어가면 `build_only`가 아니라 bundled component로 재분류한다. |

Public source, npm tarball, Runtime archive는 각각 독립적으로 pass해야 한다. 예를 들어 Runtime에 OpenAI `NOTICE`가 있다는 사실은 npm tarball에 포함된 React license를 대신하지 않는다. SBOM도 license text·attribution·source 제공 고지를 대신하지 않는다.

## OpenAI source·patched SDK evidence

OpenAI source authority는 `openai/codex@8c68d4c87dc54d38861f5114e920c3de2efa5876`, tag `rust-v0.144.4`다. Tracked [`LICENSE`](../../../../packages/codex-chat-runtime/upstream/LICENSE)의 SHA-256은 `d17f227e4df5da1600391338865ce0f3055211760a36688f816941d58232d8dc`, [`NOTICE`](../../../../packages/codex-chat-runtime/upstream/NOTICE)는 `9d71575ecfd9a843fc1677b0efb08053c6ba9fd686a0de1a6f5382fd3c220915`이며 [upstream LICENSE](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/LICENSE)·[NOTICE](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/NOTICE)와 일치한다.

[Apache-2.0 §4](https://www.apache.org/licenses/LICENSE-2.0.html)는 배포물에 license 사본, 기존 attribution 보존, upstream `NOTICE`가 있을 때 readable attribution copy, 수정 파일의 prominent change notice를 요구한다. §6은 trademark 사용권을 부여하지 않는다. 이를 현재 artifact에 적용한 결과는 다음과 같다.

| Component | Exact identity | 현재 evidence | Release 처리 |
| --- | --- | --- | --- |
| Patched SDK source | Base commit 위 patch stack SHA-256 `ffc43da6e5e7a146016404db54968d37d849b778e5e9b04db680cac4124fc1c9` | Baseline adaptation 8개 path와 ordered patch file 8개가 건드린 12개 unique path를 합치면 upstream file 18개에 영향을 준다. Patch ledger는 있으나 installed modified `.py` 10개에는 AY-PLE 변경 고지가 없다. | 원문 `LICENSE`·`NOTICE`를 보존하고, 실제 수정된 각 source file에 change notice를 넣어 machine check한다. `MODIFICATIONS.md`는 patch·file·digest를 연결하지만 per-file notice를 대체하지 않는다. |
| `openai-codex==0.0.0.dev0` | Wheel SHA-256 `9259319c79132ffa16e1ba46d3e20a88be3b5851501f8ab7812bfb42ce6427aa` | Wheel metadata는 Apache-2.0이나 wheel 내부 license file이 없다. | Outer source/npm/Runtime surface가 wheel path와 exact OpenAI license material을 machine roster로 연결해야 한다. |
| `openai-codex-cli-bin==0.144.4` | macOS arm64 wheel SHA-256 `05db505a9c7f020f58b70837a94e00d32a50086986c267bcc44ea97b573d4a05` | Wheel 9개 file에 executable·metadata만 있고 `LICENSE`, `NOTICE`, `COPYING`, SBOM은 없다. | Raw wheel을 단독 release하지 않는다. Final Runtime archive가 모든 nested component material을 제공하고 verifier가 presence·digest를 확인한다. |

Native wheel의 [PyPI project](https://pypi.org/project/openai-codex-cli-bin/0.144.4/) publication workflow revision과 native source revision은 다른 provenance 축이다. Publication workflow commit `4df8027a9703db1ae4be1ec0b37979d597e0f8e3`은 기존 `rust-v0.144.4` release wheel을 가져오므로, release roster에는 source commit `8c68d4c…`, builder·workflow revision·run과 attestation을 별도 필드로 기록한다.

Public product 문구에서 `Codex`는 upstream origin·OAuth prerequisite를 설명하는 범위인지 Ticket 005에서 human review한다. Apache license만으로 brand endorsement를 추정하지 않는다.

## Native executable evidence

### OpenAI Rust binaries

| Binary | Exact installed identity | License evidence | Missing blocker |
| --- | --- | --- | --- |
| `codex` | `codex-cli 0.144.4`, 260,406,464 bytes, SHA-256 `3302acbda5f53de1a71ebdb0c0f2aae0d47f9324aa9fb6b4e78a47014fd51c7d` | OpenAI-authored source는 Apache-2.0이고 current local `bundle/`에 exact OpenAI `LICENSE`·`NOTICE`가 있다. | 실제 target·feature로 reachable한 Rust 및 native dependency SBOM, component별 license·NOTICE가 없다. |
| `codex-code-mode-host` | Same source workspace version `0.144.4`, 46,374,288 bytes, SHA-256 `d0ace4fdb7f9d3872cb158c1493bdb3b2bfe4cb3c0d4c5dfaa3e0e2762574b21` | Crate는 workspace Apache-2.0을 상속한다. | Canonical manifest가 이 executable을 component로 열거하지 않고, binary version probe와 reachable dependency report가 없다. |

Upstream `cargo-deny` allowlist는 build policy이지 recipient-facing component report가 아니다. Required evidence는 pinned `Cargo.lock`, actual macOS arm64 target·features, embedded native resource를 기준으로 생성한 두 binary의 closure와 각 SBOM component에 연결된 exact license text·NOTICE다. Cargo metadata 밖의 statically linked C/C++ 또는 embedded binary도 별도로 reconcile한다. Unknown, custom, missing source revision, 검토되지 않은 copyleft expression이 하나라도 있으면 archive 생성이 실패해야 한다. Generator의 실제 package·pipeline 배치는 Runtime composition이 정해진 뒤 Tickets 007·015가 결정한다.

### ripgrep

Embedded `rg`는 [ripgrep 15.1.0](https://github.com/BurntSushi/ripgrep/releases/tag/15.1.0), commit `af60c2de9d85e7f3d81c78601669468cf02dabab`에서 왔다. Input archive SHA-256은 `378e973289176ca0c6054054ee7f631a065874a352bf43f0fa60ef079b6ba715`, installed binary SHA-256은 `4fdf1d8365af224bc70e3c1490d8461d859c37cc70e739a11e987af0215f3e94`다.

Upstream은 `MIT OR Unlicense`로 제공되고 원본 archive에는 [`COPYING`](https://github.com/BurntSushi/ripgrep/blob/15.1.0/COPYING), [`LICENSE-MIT`](https://github.com/BurntSushi/ripgrep/blob/15.1.0/LICENSE-MIT), [`UNLICENSE`](https://github.com/BurntSushi/ripgrep/blob/15.1.0/UNLICENSE)가 있다. OpenAI package builder는 binary만 wheel로 복사해 이 세 파일을 모두 떨어뜨린다.

Release roster는 선택한 expression을 `MIT`로 고정하고 copyright·permission text를 보존한다. 동시에 upstream의 dual-license 안내가 끊기지 않도록 세 원문을 모두 Runtime `licenses/ripgrep/` logical set에 보존한다. Source 제공 의무는 gate에 추가하지 않는다.

### Patched zsh

실제 embedded zsh provenance는 tracked static DotSlash manifest가 아니라 OpenAI release workflow가 내려받은 manifest다.

| Step | Exact evidence |
| --- | --- |
| OpenAI release input | `codex-zsh-v0.1.0` tag, commit `891f1f4c8584a082fc4658cabd48f1a8b01354e0` |
| zsh source | `77045ef899e53b9598bebc5a41db93a548a40ca6`, observed `5.9.0.3-test` |
| OpenAI patch | `zsh-exec-wrapper.patch`, SHA-256 `696b7d923b8071554d00e811afb9a08fcad4baada796f7314d12ecd72d06152c` |
| Input archive | `codex-zsh-aarch64-apple-darwin.tar.gz`, SHA-256 `c86a76218f34d263adc7c13e62988d44f7adbd7f4eb44b028ee47a1024637f8a` |
| Installed binary | 737,520 bytes, SHA-256 `b69893d9da08786211bac0862212e26a8a31af24eb77da21692671c58d388b8d` |

[OpenAI source note](https://github.com/openai/codex/blob/8c68d4c87dc54d38861f5114e920c3de2efa5876/codex-rs/shell-escalation/README.md)는 exact zsh source와 patch를 기록한다. [Exact zsh `LICENCE`](https://sourceforge.net/p/zsh/code/ci/77045ef899e53b9598bebc5a41db93a548a40ca6/tree/LICENCE?format=raw)의 SHA-256은 `d06fdf3ef9b1ec69d6b9e170b0a9516fbad3523261ff1668bde3bfea6e0ef5f5`이며 copyright와 disclaimer를 모든 copy에 포함하도록 요구한다. Release archive에는 `codex-zsh/bin/zsh` 하나만 있고 license는 없다.

Final Runtime은 exact `LICENCE`, source commit, patch digest와 modification record를 포함해야 한다. 현재 binary-only archive에는 `LICENCE`가 별도 조건을 언급하는 GPL shell function file이 관찰되지 않았지만, core-only build·archive roster를 release evidence로 고정한다. 이후 function·completion·resource가 추가되면 license를 다시 판정한다. Source 제공 의무는 현재 core-only zsh license에서 임의로 추가하지 않는다.

## Standalone Python과 Python wheel evidence

### Standalone Python

| Field | Exact evidence |
| --- | --- |
| Selected archive | `cpython-3.10.18+20250818-aarch64-apple-darwin-install_only_stripped.tar.gz` |
| Archive SHA-256 | `f38f5fcbe39e657742e21a12c890f9f12d20d2c0eefaa2e6cd4a975f3f7f9dcd` |
| Upstream release | [`python-build-standalone` 20250818](https://github.com/astral-sh/python-build-standalone/releases/tag/20250818), commit `6e9f3165c8a720cfc61232460ed5b62a583c3900` |
| CPython source | `v3.10.18`, commit `88663ef89ba3576df02cc818c653f91c7d5dd023` |
| Installed CPython license | `bundle/python/lib/python3.10/LICENSE.txt`, SHA-256 `3b2f81fe21d181c499c59a256c8e1968455d6689d269aa85373bfb6af41da3bf`, [upstream CPython license](https://github.com/python/cpython/blob/v3.10.18/LICENSE)와 byte-identical |
| Matching full artifact | `aarch64-apple-darwin-pgo+lto-full.tar.zst`, SHA-256 `118b40f74789c322dd05eda06cae84a7fe28bf27fd70b722b63500781d1952f3` |

Selected stripped archive에는 matching full artifact의 `python/PYTHON.json`과 `python/licenses/**` 19개 원문이 없다. Full artifact의 `PYTHON.json`은 target·build와 CPython 및 bzip2, expat, libffi, libedit, ncurses, liblzma, SQLite, libuuid, mpdecimal, OpenSSL, Tcl/Tk, zlib 등의 component license metadata를 제공한다. Repository-wide [`python-licenses.rst`](https://github.com/astral-sh/python-build-standalone/blob/6e9f3165c8a720cfc61232460ed5b62a583c3900/python-licenses.rst)는 broad upstream reference이며 exact macOS artifact closure를 대신하지 않는다.

Runtime archive를 만들 때 matching full artifact의 digest를 검증한 뒤 `PYTHON.json`과 exact `python/licenses/**`를 보존하거나 byte-equivalent notice set을 생성한다. 단, 같은 release·target·build 이름만으로 full artifact의 component set이 stripped bytes와 같다고 가정하지 않는다. Upstream build provenance, shared-file digest comparison 또는 reproducible build manifest로 두 variant의 component·license closure가 동일하다는 연결 evidence가 먼저 필요하다. Metadata가 `LICENSE.zlib-ng.txt`를 참조하지만 matching archive에 해당 file이 없고 macOS zlib가 system library로 표시되는 불일치는 human review 전까지 blocker다. AY-PLE이 stripped archive를 다시 포장했다는 사실과 source·artifact pointer를 provenance에 기록한다.

`python-build-standalone` build tooling의 [MPL-2.0 license](https://github.com/astral-sh/python-build-standalone/blob/6e9f3165c8a720cfc61232460ed5b62a583c3900/LICENSE)를 Runtime 전체의 단일 license로 잘못 표시하지 않는다. MPL-covered byte를 실제로 배포하는 경우 [Mozilla MPL FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)의 executable source-availability 조건에 따라 exact source 위치를 고지한다. Build tooling이 artifact에 들어가지 않았다면 `build_only` evidence로 분리한다.

### pip·setuptools

Standalone Python에는 pip `24.3.1`과 setuptools `80.9.0`이 설치된다.

| Component | Current evidence | Release gate |
| --- | --- | --- |
| pip `24.3.1` | pip 자체 MIT `LICENSE.txt`와 `AUTHORS.txt`는 보존되지만 [exact `vendor.txt`](https://github.com/pypa/pip/blob/24.3.1/src/pip/_vendor/vendor.txt)는 18개 vendored coordinate를 열거하고 wheel에는 그 전체의 개별 license set이 없다. MPL-2.0 `certifi` source도 포함된다. | Runtime에 유지하면 18개 exact vendor를 source revision·license text와 연결한다. Included MPL Source Code Form에는 MPL 적용 notice와 license를 보존하고, executable/minified form이 생길 때는 corresponding source 위치도 고지한다. 제거한다면 Runtime 동작·repair를 재검증하고 roster에서 byte가 없음을 증명한다. |
| setuptools `80.9.0` | 자체 MIT license, 16개 vendored dist의 license file 21개와 NOTICE 2개가 설치 tree에 있다. `autocommand 2.2.2`는 LGPLv3 metadata와 [LGPLv3 text](https://github.com/pypa/setuptools/blob/v80.9.0/setuptools/_vendor/autocommand-2.2.2.dist-info/LICENSE)를 가지지만, [LGPLv3](https://www.gnu.org/licenses/lgpl-3.0.html)가 함께 요구하는 GPLv3 text는 installed tree에서 관찰되지 않았다. | 기존 tree를 그대로 보존하는 것만으로 pass하지 않는다. Missing GPLv3 text를 보완하고 included source·modification·notice·relink 조건을 human review하거나, component를 제거하고 clean Runtime smoke를 다시 통과한다. |

### Production wheels

| Distribution | License evidence | Required action |
| --- | --- | --- |
| `annotated-types==0.7.0` | MIT classifier와 upstream과 같은 `LICENSE` | Wheel license 보존, notice index에 exact wheel digest 연결 |
| `pydantic==2.13.4` | MIT `LICENSE` | 동일 |
| `pydantic-core==2.46.4` | MIT `LICENSE`, CycloneDX SBOM 103 components | License와 SBOM을 보존하고 native closure를 combined roster에 reconcile |
| `typing-extensions==4.15.0` | PSF-2.0 `LICENSE` | Exact license 보존 |
| `typing-inspection==0.4.2` | MIT `LICENSE` | Exact license 보존 |
| `openai-codex==0.0.0.dev0` | Wheel 내부 license 없음 | Outer OpenAI `LICENSE`·`NOTICE`, modification provenance와 machine mapping 필수 |
| `openai-codex-cli-bin==0.144.4` | Apache metadata만 있고 nested material 없음 | Native gate가 모두 통과하기 전 blocker |
| `uv-build==0.11.19` | `MIT OR Apache-2.0`, 두 license와 CycloneDX SBOM 242 components | Build-only archive input에서 제외하거나, 공개 archive에 포함한다면 license·SBOM 전체 보존 |

Raw wheel 안에 license가 있다는 사실만으로 끝내지 않는다. Final archive가 wheel을 unpack·prune하므로 installed artifact path, source wheel digest, retained license path·digest를 machine roster에서 연결한다.

## npm source와 browser bundle evidence

현재 production npm external closure는 72 records이며 MIT 65, ISC 5, BSD-2-Clause 1, BSD-3-Clause 1이다. Local installed 72개 모두 top-level `LICENSE` 계열 file이 있다. Direct runtime package는 `dotenv@17.4.2`, `express@5.2.1`, `lucide-react@1.24.0`, `react@19.2.7`, `react-dom@19.2.7`이고 browser bundle에는 `scheduler@0.27.0`도 들어간다.

Current local Chat Shell JS는 265,377 bytes이고 React `19.2.7`·`lucide-react` code marker가 관찰되지만 `@license`, copyright, MIT·ISC marker가 없다. Server output은 `express`와 `dotenv`를 external import로 남긴다. 이 관찰은 release authority가 아니라 artifact-level gate가 필요한 증거다.

[npm package 규칙](https://docs.npmjs.com/files/package.json/)에서 declared dependency는 install 시 별도 package로 받고, bundled dependency 또는 prebuilt JS는 AY-PLE tarball이 직접 byte를 전달한다. 따라서 Ticket 006·015는 다음을 구현해야 한다.

- `npm pack --json`의 exact file allowlist·tarball digest를 보존한다.
- Chat Shell bundler metafile 또는 동등한 origin graph로 모든 generated JS/CSS byte를 source package에 연결한다.
- Bundled set에 대해 exact upstream license text를 npm tarball의 `licenses/`와 `THIRD_PARTY_NOTICES`에 포함한다.
- External runtime dependency도 source URL, registry tarball `dist.integrity`, license expression을 SBOM에 기록하되 byte가 없는 package의 license를 bundled로 오분류하지 않는다.
- Dev dependency가 helper·polyfill·asset을 삽입하면 `build_only`에서 `bundled_js`로 승격한다.
- 현재 root lock의 139 external records 모두 `resolved`·`integrity`가 없으므로 lock hash만을 registry provenance authority로 쓰지 않는다.

`npm sbom`은 component graph seed로 사용할 수 있지만 minified frontend origin을 스스로 완전하게 복원하지 못한다. [npm SBOM 문서](https://docs.npmjs.com/cli/commands/npm-sbom/)와 bundler origin evidence를 함께 사용한다.

## License family별 gate policy

이 표는 artifact gate의 최소 정책이며 개별 license 원문을 대체하지 않는다.

| Family | Release policy |
| --- | --- |
| Apache-2.0 | License 사본, 기존 attribution·NOTICE, modified-file notice를 보존한다. Product naming·endorsement는 별도 human review다. |
| MIT·ISC | Exact copyright·permission text를 직접 포함한 copy와 함께 보존한다. |
| BSD-2-Clause·BSD-3-Clause | Source 또는 binary documentation/material에 copyright·조건·disclaimer를 보존하고 BSD-3의 non-endorsement 조건을 따른다. |
| PSF·CNRI·TCL·OpenSSL·zlib·zsh custom | Exact upstream text와 source identity를 보존하고 modification·attribution 조건을 component별로 검사한다. |
| Dual/multi-license | Release가 의존하는 branch를 machine roster에 고정하고 그 branch의 조건을 충족한다. Upstream choice 안내 file이 다른 text를 참조하면 referenced originals도 함께 보존한다. |
| MPL·LGPL·GPL·custom source condition | Exact artifact와 Source Code Form·Executable Form 중 어느 형태에 실제 포함되는지 먼저 증명한다. Source form notice, executable의 corresponding source 위치, modification·relink 등 해당 조건을 구분해 human review하며, review가 없으면 fail한다. |
| Public domain·0BSD·system library | Notice 의무가 적거나 없어도 component·version·artifact path를 SBOM에서 삭제하지 않는다. System-library 예외는 target evidence로 명시한다. |
| Unknown·missing·`NOASSERTION` | 자동 허용하지 않는다. Component를 artifact에서 제거하거나 owner가 evidence를 보완할 때까지 publication을 차단한다. |

## Logical release material contract

정확한 physical path는 각 artifact owner ticket이 정하되, 다음 logical material은 동일한 이름과 digest로 서로 연결되어야 한다.

### Public source root

```text
LICENSE                         # AY-PLE first-party license; Ticket 005 owner
NOTICE                          # AY-PLE notice + required upstream attribution blocks
THIRD_PARTY_NOTICES.md          # generated human-readable component index
third_party/licenses/<component>/<original license files>
third_party/openai-codex/MODIFICATIONS.md
sbom.spdx.json                  # source/vendored/bundled/build-only scope 구분
provenance/source-export.json   # source revision + positive allowlist + file digests
```

Vendored patched SDK를 포함한다면 OpenAI `LICENSE`·`NOTICE`와 per-file modification notice가 모두 필요하다. `references/openai-codex` gitlink는 recursive export에서만 source byte를 재배포하므로 Ticket 005가 기본 제외 또는 explicit external reference 중 하나를 고정한다. `.agents/**`는 exact Matt skill revision과 license copy가 없으므로 기본 제외하고, 포함하려면 별도 provenance를 복구한다.

### npm tarball

```text
LICENSE
NOTICE                          # 실제 tarball에 Apache NOTICE 대상 byte가 있을 때
THIRD_PARTY_NOTICES.md
licenses/<bundled-component>/<original license files>
sbom.spdx.json                  # bundled_js와 declared_runtime 분리
provenance/npm-pack.json        # npm pack roster, integrity, bundler origin graph digest
```

Thin launcher가 Runtime을 download만 한다면 Runtime의 모든 license tree를 npm tarball에 중복할 필요는 없다. 반대로 SDK·native binary·Python byte가 tarball에 들어가는 순간 Runtime component set도 npm surface에서 다시 pass해야 한다.

### Runtime archive

```text
manifest.json
bundle/...
NOTICE
THIRD_PARTY_NOTICES.md
licenses/
  openai-codex/{LICENSE,NOTICE,MODIFICATIONS.md}
  rust-native/<component>/<original license and NOTICE files>
  ripgrep/{COPYING,LICENSE-MIT,UNLICENSE}
  zsh/LICENCE
  python-runtime/<matching full-artifact license tree>
  python-wheels/<distribution>/<retained license and NOTICE files>
sbom.spdx.json
provenance/
  components.json
  python/PYTHON.json
  inputs.json
```

현재 verifier가 허용하지 않는 top-level file을 임의로 추가하라는 뜻은 아니다. Ticket 007이 archive descriptor·manifest schema·complete-tree verifier를 위 logical set에 맞게 바꾸고, 최종 extracted archive 자체를 검증해야 한다.

## Machine roster authority

`THIRD_PARTY_NOTICES`, `licenses/`, SBOM과 provenance에 별도 수작업 목록을 유지하지 않는다. Release마다 하나의 canonical component roster에서 생성하고 다음 필드를 요구한다.

| Field | Meaning |
| --- | --- |
| `componentId`, `name`, `version`, `purl` | Stable identity |
| `scope` | `vendored_source`, `bundled_js`, `declared_runtime`, `embedded_binary`, `python_runtime`, `build_only`, `system_library` |
| `sourceRepository`, `sourceRevision`, `sourceTag` | Source provenance |
| `inputUrl`, `inputDigest`, `registryIntegrity` | Download·registry identity |
| `builderId`, `buildWorkflowRevision`, `buildRun`, `attestationUri` | Source에서 published artifact까지의 build·publication provenance |
| `artifactPaths[]`, `artifactDigests[]` | Recipient가 실제 받는 byte |
| `licenseExpression`, `chosenLicenseBranch` | Declared·reviewed license decision |
| `licenseFiles[]`, `noticeFiles[]` | Exact retained path·SHA-256 |
| `modified`, `modificationEvidence` | Modified-file notice·patch ledger mapping |
| `sourceAvailability` | Required source URL·revision·availability proof 또는 `not_required` 근거 |
| `reviewState`, `reviewedBy`, `reviewedAt` | `cleared`, `excluded`, `blocked`, `human_review` |

Artifact-specific SBOM component set, bundled origin graph, `THIRD_PARTY_NOTICES` index와 license directory의 set equality를 검사한다. `declared_runtime`처럼 tarball에 byte가 없는 component는 license-copy equality가 아니라 registry artifact·SBOM mapping을 검사한다.

## Fail-closed publication checklist

| Gate ID | Blocking assertion |
| --- | --- |
| `REDIST-01-CLOSURE` | Source export, npm pack, Runtime archive 각각에서 모든 third-party byte가 canonical roster component로 역추적된다. |
| `REDIST-02-IDENTITY` | 모든 component가 exact version·source revision·input digest·artifact digest와 필요한 builder·workflow·attestation evidence를 가진다. Missing registry integrity도 실패다. |
| `REDIST-03-LICENSE` | 모든 bundled·vendored·embedded component의 exact license file과 digest가 archive에 있고 roster와 일치한다. |
| `REDIST-04-NOTICE` | Apache NOTICE·BSD/custom attribution 및 required NOTICE가 readable form으로 포함된다. |
| `REDIST-05-MODIFIED` | Apache 등 수정 고지를 요구하는 실제 source file이 per-file notice와 patch provenance를 가진다. |
| `REDIST-06-SOURCE` | MPL·LGPL·GPL·custom source 조건이 있는 component는 exact corresponding source 위치와 필요한 고지를 가진다. Human approval 없이는 실패다. |
| `REDIST-07-NATIVE` | `codex`, `codex-code-mode-host`, `rg`, zsh와 standalone Python native closure가 SBOM·license set에 모두 연결된다. |
| `REDIST-08-BUNDLE` | Bundler origin graph의 모든 input이 `bundled_js` roster와 일치하고 unaccounted helper·asset이 없다. |
| `REDIST-09-SURFACE` | Notice와 license set이 실제 source/npm/Runtime payload별로 계산된다. 다른 artifact의 notice를 pass evidence로 재사용하지 않는다. |
| `REDIST-10-EXCLUSION` | `human_review`, `blocked`, unknown license, stale provenance component는 artifact positive allowlist에서 제외된다. |
| `REDIST-11-RECONCILE` | SBOM, `THIRD_PARTY_NOTICES`, license tree, component roster, artifact paths 간 expected set equality가 통과한다. |
| `REDIST-12-REPRODUCE` | Clean build에서 같은 release input으로 gate material을 재생성하고 final tarball/archive digest에 묶는다. |

어느 단계든 roster에 없는 file을 발견하거나 required license 원문을 찾지 못하면 warning으로 publish를 계속하지 않는다. Artifact를 제거하거나 evidence를 보완하고 새 release candidate를 만든다.

## 현재 blocker와 owner handoff

| Blocker | Close condition | Owner ticket |
| --- | --- | --- |
| AY-PLE first-party license·copyright owner, `.agents`·gitlink·brand·clean snapshot | Public source allowlist와 root legal material 확정 | Ticket 005 |
| OpenAI modified-file notice | Actual modified source files의 notice와 patch ledger machine check | Tickets 005, 015 |
| Browser bundle notice 부재 | Final package bundler origin graph와 generated notice/license set | Tickets 006, 015 |
| npm registry integrity 부재 | Exact package identity·lock/install·SBOM provenance | Tickets 006, 015 |
| Rust/native dependency closure 부재 | 두 binary의 target-specific SBOM·license·NOTICE | Tickets 007, 015 |
| `rg`·zsh license 누락 및 zsh dynamic release provenance | Runtime manifest·archive license set·verifier 반영 | Ticket 007 |
| Standalone Python `PYTHON.json`·license tree 누락 | Matching full artifact evidence와 stripped archive license set reconcile | Ticket 007 |
| pip vendor notice, setuptools LGPL/GPL text·source/relink review | 제거 후 Runtime 재검증 또는 완전한 vendor license/source mapping | Tickets 007, 015 |
| Wheel license·SBOM과 installed file mapping 부재 | Canonical component roster와 archive set-equality verifier | Tickets 007, 015 |

이 조사로 Ticket 005와 Ticket 007이 설계에 사용할 blocking contract는 고정됐다. 이는 opaque closure가 cleared됐다는 뜻이 아니다. Publication은 위 evidence가 canonical roster에 실제 생성되고 각 owner ticket과 resulting implementation에서 검증될 때까지 계속 fail-closed다.
