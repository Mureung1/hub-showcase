# Public Landing product promise·install truth prototype 판정

## 범위와 evidence

이 문서는 [Ticket 013](../tickets/013-landing-install-truth.md)의 throwaway UI prototype에서 채택한 Public Landing 방향과 production acceptance만 기록한다. Prototype source·copy·CSS와 fixture release 값은 production 구현이 아니며 working branch로 merge하거나 그대로 port하지 않는다.

| 항목 | Evidence |
| --- | --- |
| Evidence branch | `prototype/public-landing-entry` |
| Immutable commit | `2790a7f1402469c0030dc2e9b5d1fd2e924ee7a9` — `prototype: compare public landing entrypoints` |
| 비교 route | `/spikes/public-landing/?variant=A\|B\|C&state=<default\|unsupported\|download\|integrity\|storage\|auth>` |
| 비교안 | A Semester story, B Command doorway, C Open field guide |
| Interaction gate | Exact command copy, query-backed variant·failure state 전환, Browser reload 후 state 유지 |
| Static gate | `node --check`, `git diff --check` 통과. Prototype page의 external stylesheet·brand image는 local asset만 사용 |
| Visual gate | 1440 × 900 desktop viewport에서 A·B·C first fold와 주요 section을 확인하고 세 variant × 다섯 failure state에서 horizontal overflow·잘린 action이 없음을 확인 |
| 기본 accessibility gate | Variant마다 한 개의 `h1`, duplicate `id` 없음, image `alt` 누락 없음, 이름 없는 button 없음 |
| Human verdict | 2026-07-23 사용자가 **C의 editorial field guide를 골격으로, B의 exact release card·execution path·trust adjacency를 결합**하는 방향을 채택 |

Prototype toolbar와 README는 `0.0.1-preview.1`, first-download·installed·free-space 수치와 public link destination이 **fixture**임을 명시했다. 이 값은 release 후보나 first public version 결정이 아니다.

## 비교 결과

| 안 | 강점 | 한계 | 판정 |
| --- | --- | --- | --- |
| A — Semester story | A guided setup에서 C compact status center로 이어지는 첫 학기 시작을 가장 친근하게 설명한다. | Setup mock이 Hero의 중심이 되어 Public Landing이 제품 homepage보다 onboarding 설명 페이지처럼 보일 수 있다. | 제품 경험 설명의 copy·A → C story는 참고하되 전체 골격으로 채택하지 않음 |
| B — Command doorway | Exact command, foreground Terminal, dynamic local Browser와 public release truth를 가장 강한 실행 entrypoint로 만든다. | 기술적 release page의 인상이 강해 `한 학기를 함께 관리하는 AY`라는 장기 제품 정체성이 약해질 수 있다. | Release card·execution path·trust adjacency를 채택 |
| C — Open field guide | AY brand, 한 학기 동반자라는 제품 비전, app-owned workspace와 current promise boundary를 독자적인 editorial hierarchy로 전달한다. | C prototype의 command 주변만으로는 current preview 범위와 release-generated truth가 충분히 인접하지 않다. | 전체 visual·information architecture 골격으로 채택하고 B의 release surface로 보완 |

## 채택한 composition

Public Landing은 다음 순서를 사용한다.

1. **C의 editorial Hero**
   - 한 개의 `h1`에서 `한 학기를 함께 관리하는 AY`를 첫 메시지로 전달한다.
   - First-party AY brand asset을 사용하되 mascot만으로 제품 의미를 대신하지 않는다.
   - Hero는 장기 제품 가치를 말하고 현재 없는 import·Course·학업 action을 shipped capability처럼 시연하지 않는다.
2. **B의 exact `PublicReleaseCard`**
   - Hero 바로 아래, 1440 × 900 first fold 안에 실제 version이 채워진 `npx ay-ple@<release-version>`과 copy action을 둔다.
   - `@latest`, bare package, `--yes`, global install과 literal placeholder를 public command에 쓰지 않는다.
   - npm project 밖 Terminal에서 실행, conditional npm install prompt, foreground Terminal 유지와 검증 뒤 dynamic local URL의 Chrome/Chromium이 열린다는 사실을 짧게 설명한다.
   - Apple Silicon Mac·Node/npm·Chrome/Chromium·network와 **Codex를 사용할 수 있는 기존 ChatGPT account**가 필요하며 API key·device code와 global `~/.codex` import는 지원하지 않는다고 표시한다.
   - `현재 preview: Codex 연결 → 새 SemesterWorkspace → 학기 공간 준비 완료 → same-version ready-relaunch`를 command와 인접하게 표시한다.
3. **C의 first-run field guide**
   - `Landing → exact npx → preflight·verified Runtime → ChatGPT browser OAuth → A guided setup → C compact status center`를 수동으로 읽는 실행 경로로 보여 준다.
   - Landing 자체에서 login, OAuth callback, workspace picker나 product mutation을 제공하지 않는다.
4. **Promise boundary**
   - `AVAILABLE`에는 exact npx, verified Runtime, Codex 연결, 새 `SemesterWorkspace`, Ready와 ready-relaunch만 둔다.
   - 자료 archive/import, Course 구성과 학업 action은 `COMING NEXT`로 분리한다. LMS·Calendar, cloud backend와 `.app`·`.dmg`는 제공 중인 것처럼 보이지 않는다.
5. **Compatibility·trust ledger**
   - 지원 환경, release-generated size, cache, network와 data boundary를 하나의 검증 가능한 surface에 둔다.
   - Docs·GitHub·release evidence·Privacy·Security·Apache-2.0·third-party notice로 연결한다.
6. **Bounded recovery와 footer**
   - Launcher failure family별 사람 언어와 안전한 다음 행동을 제공한다.
   - 첫 public release에는 rollback UI를 렌더하지 않는다.

[Remotion](https://www.remotion.dev/)에서 가져오는 것은 value proposition 다음의 실행 command와 Docs·repository·trust로 이어지는 public entrypoint 운영 방식뿐이다. Section layout, 색, animation과 개별 visual은 복제하지 않는다.

## Release-generated truth 경계

Landing source에 version·byte·size·compatibility·public link·rollback을 독립적으로 hard-code하지 않는다. 각 값의 기존 owner는 그대로 유지한다. [Public source·npm·Runtime publication gate를 확정한다](../tickets/015-publication-release-gates.md)의 publication gate는 이 owner input을 대조해 read-only Landing display artifact를 만들고 Landing과 public README가 이를 함께 소비하게 할 뿐, application·Runtime selection이나 repository·license의 새 authority가 되지 않는다.

| Display input | 기존 authority | 표시 원칙 | Publication 차단 조건 |
| --- | --- | --- | --- |
| Current application version·command | [npx production composition을 고른다](../tickets/006-npx-production-composition.md)의 package·command contract와 published exact application artifact | Immutable exact SemVer와 `npx ay-ple@<version>` | npm artifact와 command version이 다르거나 moving tag·placeholder가 남음 |
| First Runtime download | [Runtime release delivery·integrity·versioning을 정한다](../tickets/007-runtime-release-delivery-integrity.md)의 exact application descriptor | Exact Runtime archive bytes임을 label에 명시하고 outer npm traffic과 구분 | Final archive·descriptor readback evidence 없음 |
| Installed Runtime | [Runtime release delivery·integrity·versioning을 정한다](../tickets/007-runtime-release-delivery-integrity.md)의 canonical Runtime manifest | Recipient regular bytes로 표시하고 filesystem allocation과 구분 | Final legal/SBOM/provenance payload가 포함된 manifest 없음 |
| Conservative free-space bound | [Runtime release delivery·integrity·versioning을 정한다](../tickets/007-runtime-release-delivery-integrity.md)의 descriptor·manifest와 first-install release calculation | Retained archive, final generation, transaction staging과 filesystem overhead를 포함한 bound | Release tooling이 계산·검증한 bound 없음 |
| Cache display location | [ADR 0016](../../../adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md)과 [Runtime release delivery·integrity·versioning을 정한다](../tickets/007-runtime-release-delivery-integrity.md)의 `RuntimeResolver` cache contract | `~/Library/Application Support/AY-PLE/runtime-cache/v1`과 verified archive 보관 이유를 설명 | Runtime resolver의 canonical path와 다름 |
| Compatibility | [npx production composition을 고른다](../tickets/006-npx-production-composition.md)의 package-owned compatibility descriptor | Apple Silicon, macOS 13.5+, Node `>=22.12 <23`, npm 10.x와 release-pinned Chrome/Chromium minimum | Exact tested Browser minimum과 clean smoke 없음 |
| Public links | [ADR 0015](../../../adr/0015-bootstrap-public-repository-from-reviewed-clean-snapshot.md)의 public snapshot·license·trust authority | 실제 public Docs, repository, release, Privacy, Security, license·notice URL | Destination이 없거나 published source·release와 mapping되지 않음 |
| Rollback | [Runtime release delivery·integrity·versioning을 정한다](../tickets/007-runtime-release-delivery-integrity.md)의 whole-pair semantics와 [Public source·npm·Runtime publication gate를 확정한다](../tickets/015-publication-release-gates.md)의 release ledger | 실제 older application·Runtime pair가 `still-supported`일 때 exact older application command만 렌더 | 첫 release, withdrawn pair, asset/cache availability를 보장할 수 없음 |

Prototype의 `0.0.1-preview.1`, `148.3 MB`, `372.5 MB`, `1.1 GB`를 production default나 fallback으로 복사하지 않는다. Final value가 없으면 `릴리스 준비 중`인 public command를 게시하는 대신 Landing publication을 fail closed한다.

`~/Library/Application Support/AY-PLE` parent는 OAuth, setup, workspace registry와 다른 app-owned state도 포함하는 `appDataRoot`이지 disposable cache가 아니다. Landing은 Runtime cache를 exact `runtime-cache/v1` subtree로 표시하고 parent 전체 삭제를 recovery action으로 제안하지 않는다.

## Local-first와 OAuth copy

Landing은 `local-first`를 `offline`이나 외부 전송 없음으로 바꾸지 않는다.

| 경계 | Public copy의 의미 |
| --- | --- |
| Local | `SemesterWorkspace`, AY-PLE app state와 verified Runtime cache는 사용자의 Mac에 저장한다. |
| Install network | Outer `npx`에는 npm registry, first Runtime에는 GitHub Releases가 필요하다. Valid Runtime generation이 있으면 launcher 이후에는 재다운로드 없이 검증·재사용할 수 있지만 outer package resolution의 offline을 약속하지 않는다. |
| OAuth | Official Codex-managed ChatGPT Browser login을 사용한다. Credential byte는 AY-PLE product origin·API·Browser storage, workspace와 public log를 통과하지 않는다. |
| Provider | Codex 대화, Agent가 읽은 workspace content와 tool result는 OpenAI로 전송될 수 있다. |
| AY-PLE service | First preview에는 AY-PLE-owned analytics·telemetry·crash upload와 cloud backend가 없다. |

PublicReleaseCard와 compatibility surface는 Codex를 사용할 수 있는 기존 ChatGPT account가 필요하다고 안내한다. API key·device code와 global `~/.codex` import는 first preview에서 지원하지 않는다. `Codex 연결됨`은 fresh managed account read가 ChatGPT account를 확인했다는 뜻이며 별도 entitlement, model request 성공이나 서비스 가용성까지 검증했다고 확대하지 않는다.

OAuth tab에서 완료한 뒤 AY-PLE 탭으로 돌아와야 한다는 사실을 local setup UI가 설명하며 Landing은 callback success를 가로채거나 token을 다루지 않는다. Linked Privacy·trust surface는 normal hosted `Open Codex` success page와 함께, organization setup이 필요한 account에서는 pinned Codex가 token-bearing official local success URL로 fallback할 수 있다는 현재 제한도 기록한다. 따라서 AY-PLE product origin·API·Browser storage·workspace·public log에 credential byte가 흐르지 않는다고만 보장하고, token이 어떤 Browser address에도 절대 나타나지 않는다고 주장하지 않는다.

## Failure와 다음 행동

Error surface는 Hero를 경고 wall로 대체하지 않고 `PublicReleaseCard` 아래 또는 compatibility·recovery section에 나타난다. 모든 상태에서 current exact command와 Docs·release status로 돌아갈 수 있지만 같은 명령이 무조건 성공한다고 약속하지 않는다.

| Failure family | 학생용 의미 | 안전한 다음 행동 | 금지 |
| --- | --- | --- | --- |
| Unsupported Mac·Node/npm·Browser | `이번 preview에서 지원하지 않아 실행을 중단했어요` | 발견값·지원값과 upgrade guidance | 계속 실행할 수 있다는 암시, Safari·Intel·Node 24의 지원 추측 |
| npm install prompt 취소 | 설치를 승인하지 않아 application이 시작되지 않음 | 같은 exact command를 다시 실행하고 prompt를 직접 확인 | `--yes`를 public command에 추가, 취소를 Runtime failure로 오인 |
| Browser open failure | 검증한 Chrome/Chromium을 열지 못해 startup을 완료하지 않음 | 지원 Browser 위치를 확인하고 same exact command 재실행 | Fixed localhost URL 추측, orphan host를 성공 처리 |
| Download·network | `필요한 파일을 끝까지 받지 못했어요` | Network 확인 뒤 same exact command 재실행 | Endless retry, mirror·other version fallback |
| Integrity·unsafe archive | `Release 기록과 달라 실행하지 않았어요` | Release status와 새 supported exact release 확인 | 손상 byte 실행, automatic downgrade |
| Storage | `필요한 여유 공간이나 저장 권한을 확인해 주세요` | Release-generated bound와 cache location 확인 | Generic `rm -rf`, 다른 generation·사용자 data 삭제 |
| Unsafe·ambiguous cache | 소유권이나 transaction을 안전하게 증명하지 못해 중단 | Support recovery guide | App-data root 전체나 임의 cache reset, PID kill, age 기반 정리 |
| First-run OAuth cancel·attempt timeout | Workspace scaffold 전 `Codex 연결이 완료되지 않았어요` | Local AY-PLE에서 ChatGPT Browser login 다시 시작 | Workspace Ready 합성, 다른 auth 방식 fallback |
| Pending·Ready workspace의 reauth | `Codex를 다시 연결해 주세요`, workspace 보존 | ChatGPT reconnect 뒤 명시적으로 setup resume·Ready revalidation | Workspace discard, 연결만으로 Ready 합성 |
| Unsupported account mode | 이 preview는 현재 연결 방식을 지원하지 않으며 workspace 보존 | Explicit logout 뒤 ChatGPT reconnect·resume | API key·device-code fallback, credential 덮어쓰기 |
| Account read unavailable | `계정 상태를 확인하지 못했어요` | 다시 확인 | OpenAI outage·logout·token expiry 단정 |
| Release unavailable | Exact release를 새로 설치할 수 없음 | Current release status에서 supported exact version 확인 | `@latest`, silent fallback |

실제 still-supported 이전 pair가 생겼을 때에만 `npx ay-ple@<exact-older-version>`을 조건부로 표시한다. Rollback은 current launcher에 arbitrary Runtime을 주입하는 기능이 아니며 archive나 asset이 없는 withdrawn release를 실행 가능하다고 약속하지 않는다.

## Typography·interaction guardrail

1440–1920px desktop에서 제품 가치와 exact command가 첫 fold 안에 함께 보여야 한다. Mobile·small-screen 최적화는 이번 범위가 아니다.

- Hero는 약 64–96px의 명확한 product headline hierarchy를 사용한다.
- Public body는 16–18px, helper·status·recovery는 최소 13–14px를 기준으로 한다.
- 11–12px uppercase는 eyebrow·badge처럼 낮은 정보 밀도의 meta label에만 제한한다.
- Command는 monospace로 구분하되 검은 terminal/log window를 Landing의 기본 aesthetic으로 쓰지 않는다.
- Copy action은 command byte를 바꾸지 않고 성공을 `aria-live`로 알리며 Browser에서 자동 실행하거나 deep link를 시도하지 않는다.
- Public link는 실제 destination이 있을 때만 active하다. Prototype placeholder link를 production으로 옮기지 않는다.
- Public asset과 font는 ADR 0015의 export·license·provenance gate를 통과한다. Unreviewed remote font나 visual dependency를 Landing에 추가하지 않는다.
- 한 개의 `h1`, keyboard reachable action, meaningful image `alt`, no horizontal overflow와 reduced-motion을 production visual gate에 포함한다.

## Downstream acceptance

Resulting spec과 implementation은 다음 관찰로 이 결정을 증명한다.

1. 1440 × 900에서 `한 학기를 함께 관리하는 AY`, current preview scope와 exact command·copy action이 scroll 없이 보인다.
2. Landing과 public README는 각 owner를 대체하지 않는 같은 read-only publication display artifact를 소비하며 command, application version, Runtime size·cache·compatibility·public link가 published npm·GitHub·public snapshot과 exact하게 일치한다.
3. Student가 first fold만 보고도 `npm project 밖에서 실행하고 conditional install prompt를 직접 확인하며, Node/npm·network·Codex를 사용할 수 있는 ChatGPT account가 필요하고 Terminal을 유지한 채 local Browser에서 새 학기 공간 setup을 한다`고 설명할 수 있다.
4. Product demo와 `AVAILABLE`이 import·Course·Chat action을 current public capability로 암시하지 않는다.
5. Compatibility·trust에서 exact Runtime download, installed regular bytes, conservative free-space bound, retained archive와 local-first data flow를 구분한다.
6. Unsupported prerequisite, Browser open, download, integrity, storage/cache, first-run OAuth cancel·timeout, workspace-preserved reauth, unsupported account, account unavailable과 release unavailable이 서로 다른 copy·action으로 수렴하고 automatic downgrade·generic cache deletion·raw private diagnostic을 노출하지 않는다.
7. 첫 release에는 rollback surface가 없고 실제 still-supported 이전 whole pair가 생긴 release에서만 generated exact rollback command가 나타난다.
8. Docs·GitHub·Privacy·Security·license·notice link가 실제 published destination과 연결되고, Privacy가 organization setup의 token-bearing official local success URL 제한을 포함하지 않거나 destination이 누락되면 publication gate가 실패한다.
9. 1440–1920px에서 body·helper typography guardrail, one-`h1`, keyboard·copy feedback, asset provenance와 no-horizontal-overflow visual smoke를 통과한다.
