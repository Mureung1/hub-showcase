# Public publication inventory와 provenance gap audit

작성일: 2026-07-22

상태: Ticket 003의 point-in-time research evidence

감사 기준 revision: `022bd4e71f2f2f515864f4a77fafb96e35a3a00b`

## 판정

첫 public release 후보를 검토할 만큼의 exact inventory는 확보했다. 그러나 **현재 그대로 publish할 수 있다는 판정은 아니다.** 현재 저장소에는 public `npx` package가 없고, AY-PLE first-party root license도 없다. macOS arm64 Runtime은 canonical manifest와 materialized tree의 무결성 검증을 통과했지만, public archive 경계와 native payload의 component별 license·NOTICE evidence는 닫히지 않았다.

따라서 이 audit은 항목을 `candidate_include`, `human_review`, `default_exclude_candidate`, `regenerate_before_publish`, `missing_blocker`로만 분류한다. 실제 재배포 조건과 publication 허용 판정은 [Ticket 003a](../tickets/003a-third-party-redistribution-evidence.md), public source allowlist와 first-party license는 [Ticket 005](../tickets/005-public-repository-authority-and-license.md)가 소유한다. 전체 point-in-time 수치와 digest는 [machine-readable index](publication-inventory-index.json)에 있다.

## 감사 경계와 재현 authority

| Inventory | Exact authority | 이번 조사 결과 |
| --- | --- | --- |
| Tracked source | `git ls-tree -r 022bd4e71f2f2f515864f4a77fafb96e35a3a00b` | Gitlink 1개를 포함한 tracked entry 493개 |
| npm graph | Root [`package-lock.json`](../../../../package-lock.json), SHA-256 `0dcc6babc901be36251e9825a59568b1a9ec304c02a626210ba69886dd5d5086` | 외부 package record 139개; `npm ls --all --json` problem 없음 |
| OpenAI SDK source | [`unpatched.json`](../../../../packages/codex-chat-runtime/manifests/unpatched.json), [`patched-source.json`](../../../../packages/codex-chat-runtime/manifests/patched-source.json) | 각 88개 file, upstream commit과 여덟 patch의 ordered derivation 고정 |
| Production Runtime | [`production-runtime-darwin-arm64.json`](../../../../packages/codex-chat-runtime/manifests/production-runtime-darwin-arm64.json), SHA-256 `a12fa91bc247b377273f242526bb8eb8d843c2ec9a1d613b70434a479b6804b7` | bundle 2,539 files + 9 symlinks, 366,692,788 regular bytes, roster SHA-256 `4b72a60735d6b6d1489bab9fa937889f296ba2268c3fc0c433ba84ca10b36b7a` |
| Raster asset | Git tree의 11개 PNG/JPG | path·byte size·SHA-256·dimensions를 machine index에 고정 |

이 audit 뒤에 추가되는 Wayfinder 문서는 기준 revision의 public payload 후보가 아니라 조사 metadata다. 후속 clean snapshot 또는 release candidate는 새 fixed revision에서 inventory를 다시 생성해야 한다.

## Tracked source 분류

493개 entry는 겹치지 않는 14개 group으로 분류했다. 수치는 exact roster를 대체하지 않고 해당 revision의 검토 단위를 제공한다.

| Group | Entry | 잠정 분류 | 판단 이유 |
| --- | ---: | --- | --- |
| Vendored OpenAI SDK snapshot | 88 | `human_review` | Exact source·patch evidence는 있으나 재배포 판정 전 |
| Runtime upstream ledger | 12 | `candidate_include` | OpenAI `LICENSE`·`NOTICE`와 8개 patch |
| Runtime canonical manifests | 3 | `candidate_include` | source derivation·Runtime roster authority |
| First-party Runtime other | 53 | `candidate_include` | AY-PLE adapter·bridge·verifier·tests; root license 필요 |
| Product contract | 11 | `candidate_include` | Browser-safe product contract |
| Product apps | 66 | `candidate_include` | Chat Shell 27개, Server 39개 |
| Root scripts | 9 | `human_review` | dev·dogfood와 production 후보를 분리해야 함 |
| Brand assets | 3 | `human_review` | creator·input·rights provenance 부재 |
| Camp artifacts | 43 | `default_exclude_candidate` | public product runtime에 불필요한 demo evidence |
| Planning documents | 149 | `default_exclude_candidate` | 내부 ticket·Wayfinder·archive가 혼재 |
| Agent tooling | 46 | `default_exclude_candidate` | camp 운영과 외부 skill metadata; 제품 실행에 불필요 |
| `.github` | 2 | `default_exclude_candidate` | camp submission template와 broad auto-merge workflow |
| Reference submodule | 2 | `default_exclude_candidate` | Runtime snapshot과 중복되는 OpenAI Codex gitlink·설명 |
| Root other | 6 | `human_review` | public workspace metadata와 repository guidance 선별 필요 |

`candidate_include`도 publication 승인 상태가 아니다. 특히 [`AGENTS.md`](../../../../AGENTS.md), [camp용 workflow](../../../../.github/workflows/auto-merge.yml), internal planning artifact와 [`references/openai-codex`](../../../../references/README.md)를 현재 `hub`에서 그대로 공개 repository로 복사하는 선택은 하지 않았다. Exact allowlist와 canonical source 전환은 Ticket 005의 결정이다.

## npm 상태: dependency graph는 있으나 launcher는 없다

Root와 네 workspace의 [`package.json`](../../../../package.json), [`apps/chat-shell/package.json`](../../../../apps/chat-shell/package.json), [`apps/server/package.json`](../../../../apps/server/package.json), [`packages/codex-chat-runtime/package.json`](../../../../packages/codex-chat-runtime/package.json), [`packages/product-contract/package.json`](../../../../packages/product-contract/package.json)은 모두 `0.0.0`, `private: true`다. 다섯 manifest 어디에도 `bin`이 없고, public package에 필요한 `license`, `repository`, `engines`, `files`, `publishConfig` 등의 metadata도 없다. 즉 현재 `npx` 명령으로 publish·install할 launcher artifact는 존재하지 않는다.

Lockfile은 139개 외부 record의 package name·version과 license string을 모두 갖지만, 외부 tarball의 `resolved`와 `integrity`는 139개 모두 없다. License string 분포는 MIT 118, ISC 10, Apache-2.0 5, BSD-3-Clause 2, MPL-2.0 2, BSD-2-Clause 1, 0BSD 1이다. 이는 inventory metadata이며 license 의무 충족 판정이 아니다. 또한 Darwin-specific optional/dev record 6개가 포함되어 있으므로 현재 lockfile 전체를 platform-neutral release closure로 취급할 수 없다.

[Ticket 006](../tickets/006-npx-production-composition.md)은 public package identity·`bin`·pack allowlist와 production composition을 정하고, [Ticket 015](../tickets/015-publication-release-gates.md)은 `npm pack` contents·SBOM·provenance·publish gate를 정해야 한다.

## Runtime 상태: 실행 무결성은 green, 배포 evidence는 미완성

현재 ignored materialization에 대해 `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime`은 통과했고, `npm run test:provenance -w @ay-ple/codex-chat-runtime`은 17 tests를 통과했다. Canonical manifest와 local `manifest.json`은 byte-identical이며 두 clean materialization의 bundle roster가 같다. 이는 Runtime이 지금 실행 가능한지와 tree가 변조되지 않았는지를 강하게 증명한다. Repository verify gate는 `build-wheels/`, `bundle/`, `downloads/`, `manifest.json`, `wheels/`의 exact materialized root를 검사한다. 반면 Node production factory는 실행에 필요한 `manifest.json + bundle/`을 다시 검사한다. [`Runtime README`](../../../../packages/codex-chat-runtime/README.md)는 이 과정이 network·system Python·ambient `PATH` fallback 없이 동작하는 경계를 설명한다.

그러나 “검증된 Runtime”과 “공개 배포 가능한 Runtime archive”는 다른 상태다.

| Runtime 항목 | 현재 exact evidence | 남은 gap |
| --- | --- | --- |
| OpenAI source | Repository `openai/codex`, commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`, tag `rust-v0.144.4`; tracked [`LICENSE`](../../../../packages/codex-chat-runtime/upstream/LICENSE)·[`NOTICE`](../../../../packages/codex-chat-runtime/upstream/NOTICE) | Apache-2.0 조건을 실제 source/archive layout에 적용하는 판정은 003a |
| Patched SDK | 8-patch stack SHA-256 `ffc43da6e5e7a146016404db54968d37d849b778e5e9b04db680cac4124fc1c9`; wheel SHA-256 `9259319c79132ffa16e1ba46d3e20a88be3b5851501f8ab7812bfb42ce6427aa` | [`UPSTREAM.md`](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md)의 production 표는 아직 5 patches와 폐기된 wheel digest를 기록해 stale함 |
| Native Codex wheel | `openai-codex-cli-bin==0.144.4`, SHA-256 `05db505a9c7f020f58b70837a94e00d32a50086986c267bcc44ea97b573d4a05` | Wheel metadata는 Apache-2.0이나 wheel 내부 dedicated `LICENSE`·`NOTICE`가 없음 |
| Standalone Python | CPython `3.10.18`, build `20250818`, archive SHA-256 `f38f5fcbe39e657742e21a12c890f9f12d20d2c0eefaa2e6cd4a975f3f7f9dcd` | `LICENSE.txt`와 nested pip·setuptools license tree는 보존되지만 canonical component inventory로 열거되지 않음 |
| Python wheels | Exact 7-wheel roster와 SHA-256은 production manifest에 있음 | `annotated-types`에는 MIT classifier와 `License-File`이 있지만 `License`·`License-Expression` field가 없음. 전체 notice placement·obligation은 003a에서 확인해야 함 |
| Native embedded tools | Materialized `codex`, `codex-code-mode-host`, `rg`, `zsh`의 path·bytes·SHA-256을 machine index에 관찰값으로 기록 | `codex-code-mode-host`, `rg`, `zsh`의 component별 source/version/license/NOTICE가 production manifest에 없음 |
| Archive boundary | Repository verify gate의 full materialized root와 Node production factory의 `manifest.json + bundle/` input이 구분됨 | 무엇을 GitHub Release asset에 넣고 어떤 archive verifier를 쓸지는 Ticket 007 전까지 미정 |

Materialized root 전체는 약 504.6MB의 regular files이고, 그중 canonical `bundle/`은 약 366.7MB다. 나머지는 다운로드한 CPython archive, 7개 wheel, build-only `uv-build` wheel과 manifest다. 현재 repository verify command가 이 full root를 요구한다는 사실은 public archive도 반드시 full root여야 한다는 결정이 아니다. [Ticket 007](../tickets/007-runtime-release-delivery-integrity.md)이 exact archive roster·descriptor·archive verifier를 정하기 전에는 `.artifacts/` 전체 또는 `manifest.json + bundle/`만을 임의로 압축해 publish하면 안 된다.

## Asset, privacy와 repository history

Tracked raster asset 11개의 exact identity는 machine index에 있다. 세 brand asset은 합계 1,227,124 bytes지만 creator, 원본 input, generation method와 rights provenance가 저장되어 있지 않다. 따라서 삭제나 사용을 미리 결정하지 않고 Ticket 005의 human review로 보낸다. `artifacts/camp-demo/assets/semester-materials-folder.png`는 실제 학기 폴더 계층을 담으므로 공개하려면 public fixture로 재생성한다. 나머지 camp·PR·prototype screenshot도 첫 source/runtime release의 기본 포함 대상으로 보지 않는다.

Machine index에 기록한 private-key header, OpenAI·GitHub·AWS·Slack token shape regex를 audited revision의 tracked files와 reachable history 642 commits의 added/removed text diff line에 적용한 결과는 모두 0건이었다. 그러나 이는 전용 secret scanner가 아니며 unreachable object, binary, entropy, credential validity를 검사하지 않는다. `gitleaks`, `trufflehog`, `detect-secrets`, `git-secrets`와 repository-owned history scan gate는 현재 없다. 따라서 이 0건을 history 전체의 public mirror 근거로 사용할 수 없으며 Ticket 005·015가 dedicated scan과 lineage policy를 닫아야 한다.

별도의 privacy heuristic은 exact regex와 path roster를 machine index에 기록했다. Absolute `/Users/...` path는 3 files, camp 또는 private 학기 맥락 identifier는 9 files, email 형태는 vendored test·patch를 포함한 4 files에서 관찰됐다. 이 숫자는 유출 판정이 아니라 clean snapshot human review queue다.

실제 auth state `packages/codex-chat-runtime/.artifacts/prototype-first-vertical-auth/auth.json`은 [Runtime `.gitignore`](../../../../packages/codex-chat-runtime/.gitignore)에 의해 ignored 상태이며 내용은 읽지 않았다. `.artifacts/`는 약 1.3GB이고 verified Runtime도 그 아래에 있다. `.gitignore`는 accidental tracking 방어이지 packaging allowlist가 아니므로 public source export, npm pack과 Runtime archive는 모두 positive allowlist로 구성해야 한다.

## Publication blocker handoff

| Gap | Publication이 멈춰야 하는 이유 | Owner |
| --- | --- | --- |
| AY-PLE root license·copyright owner 부재 | First-party source를 어떤 조건으로 공개하는지 설명할 authority가 없음 | Ticket 005 |
| Third-party redistribution 판정 부재 | OpenAI source·patched SDK·CPython·wheels·native payload의 notice 의무와 배치가 미정 | Ticket 003a |
| Public npm artifact 부재 | Package identity, `bin`, `files`, engine, pack roster가 없음 | Tickets 006, 015 |
| Runtime archive contract 부재 | `bundle/`과 build input 중 무엇이 release payload인지 미정 | Ticket 007 |
| Native component provenance 누락 | `codex-code-mode-host`, `rg`, `zsh`를 component 단위로 검토할 canonical evidence가 없음 | Tickets 003a, 007 |
| Stale `UPSTREAM.md` | Human ledger가 canonical 8-patch manifest와 충돌 | Tickets 003a, 007 |
| Public clean snapshot 미정 | Camp identity, workflow, agent tooling, planning docs, gitlink와 asset을 그대로 노출할 수 있음 | Ticket 005 |
| Secret·privacy·SBOM gate 부재 | Current tree heuristic만으로 history·package·binary closure를 승인할 수 없음 | Ticket 015 |
| Ignored state packaging 위험 | Auth와 1.3GB build/cache state를 glob copy가 포함할 수 있음 | Tickets 006, 007, 015 |

이 목록은 새 backlog를 만드는 대신 기존 Wayfinder owner에 연결한다. 가장 가까운 다음 research는 Ticket 003a다. 여기서는 각 third-party component의 실제 license text·NOTICE·source-offer 또는 attribution 조건과 release layout을 확인하고, 증거 없는 component가 자동으로 fail closed하는 checklist를 작성해야 한다.
