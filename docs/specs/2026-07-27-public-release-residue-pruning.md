# Public release lane 잔여 Runtime을 현재 제품 경계로 정리한다

## Agent triage

- State: completed
- Surface: local-spec
- Next actor: none

## Problem Statement

2026-07-23 public release lane에서 구현한 managed Browser OAuth와 pre-workspace Runtime lifecycle이 current personal product cutover 뒤에도 `@ay-ple/codex-chat-runtime`의 production contract, private bridge, exact SDK patch stack과 검증 matrix에 남아 있다. Current Server·Browser는 caller의 전역 `CODEX_HOME`에서 Account Readiness만 읽고 workspace-bound Runtime만 시작하므로, 이 잔여 구현은 실행 consumer 없이 maintained surface와 patch·bundle 재현 비용을 넓힌다.

동시에 `@ay-ple/semester-workspace`의 v3 admission·setup kernel도 current executable consumer가 없지만, 이는 제거한 public distribution lane만을 위한 구현으로 단정할 수 없다. ADR 0014가 app-owned normalized `SemesterWorkspace`와 후속 `ImportSource`의 채택된 목표를 계속 소유하기 때문이다. 두 범위를 모두 “consumer 없음”만으로 삭제하면 current account 경계는 흐려지고 adopted workspace target은 손상된다.

## Solution

Current product가 사용하는 전역 Codex account의 fresh Account Readiness와 workspace-bound product Runtime을 survivor contract로 유지하면서, managed Browser login·logout lifecycle과 `auth-only` Runtime role을 compatibility alias 없이 제거한다. 이와 함께 managed login만을 위해 추가한 exact SDK patch와 bundle·bridge·test surface를 함께 축소한다.

`@ay-ple/semester-workspace`의 v3 codec, admission, bundle·context guard와 durable setup kernel은 ADR 0014의 adopted target 기반으로 유지한다. 다만 current Server가 v2 compatibility decoder만 소비한다는 사실과 v3 kernel이 아직 제품 capability가 아니라는 경계는 계속 명시한다. 중단한 public npx·Landing·managed account 문서와 ticket은 historical evidence로만 보존하며 current executable graph나 후속 작업으로 되살리지 않는다.

## User Stories

1. As a personal AY-PLE user, I want AY-PLE to reuse my existing global Codex account without owning login or logout, so that AY-PLE does not create a second credential lifecycle.
2. As a personal AY-PLE user, I want the app to keep showing whether Codex is ready, so that I can understand why Chat or Assignment work is unavailable.
3. As a maintainer, I want the Runtime contract and exact bundle to contain only current product capabilities, so that obsolete account lifecycle code does not expand review and conformance cost.
4. As a maintainer, I want the adopted app-owned `SemesterWorkspace` kernel preserved independently from the abandoned public release host, so that the next `ImportSource` journey can build on the accepted workspace authority.
5. As a maintainer, I want historical public-release evidence to remain readable without being executable, so that past decisions are auditable without appearing supported.

## Current State and Constraints

### Current implementation

| 영역 | 현재 사실 |
| --- | --- |
| Account authority | Canonical dev·dogfood composition은 caller의 전역 `CODEX_HOME`, 또는 미설정 시 `~/.codex`를 사용한다. 별도 auth profile, credential copy와 Browser OAuth UI는 없다. |
| Account product behavior | `CodexChatService`는 workspace Runtime의 `readAccountReadiness()`를 호출하고 `/api/product/bootstrap`은 `ready | not_ready | unavailable`만 Browser-safe하게 투영한다. |
| Runtime factory | Current Server는 `createCodexChatRuntime({ runtimeRoot, workspace, environment })`만 호출하지만 package에는 `auth-only | workspace` role-aware overload와 `CodexManagedRuntime` account lifecycle이 함께 남아 있다. |
| Private bridge | `read_account` 외에 `start_browser_login`, `read_browser_login_attempt`, `cancel_browser_login`, `release_browser_login_attempt`, `logout` command와 matching Node·Python state machine이 남아 있다. |
| Exact SDK | Ordered patch `0009-managed-chatgpt-login`과 corresponding manifest·bundle evidence가 managed Browser login seam을 유지한다. Earlier router patches의 login route accounting은 official SDK의 general routing correction 일부다. |
| Workspace package | Current Server production code는 `decodeCurrentSemesterWorkspaceV2`만 사용하고 parity test는 package-owned v2 vectors를 사용한다. V3 admission·setup kernel은 current executable consumer가 없다. |
| Adopted workspace target | ADR 0014는 v3 single aggregate, `WorkspaceManifest` authority, app-owned admission과 후속 `ImportSource` 경계를 채택한 상태다. |

### Constraints

- ADR 0011의 official Python SDK direct reuse, exact pin, private bridge와 bounded process-tree cleanup은 유지한다.
- ADR 0012의 single maintained Runtime graph와 no-alias hard cutover 원칙을 따른다.
- ADR 0013의 current v2 original-byte preservation, read-only incompatibility와 explicit version migration 원칙을 바꾸지 않는다.
- ADR 0014의 app-owned normalized `SemesterWorkspace` target을 이 pruning의 부수 효과로 취소하거나 재설계하지 않는다.
- ADR 0017은 완료·역사 기록으로 보존하며 current account authority로 다시 활성화하지 않는다.
- Raw App Server account shape, credential, absolute path와 private correlation은 Browser product contract로 이동하지 않는다.
- Current `/api/product/*`, Chat Shell UI, workspace-local data format과 persisted bytes는 바꾸지 않는다.

## Implementation Contract

### Module Responsibilities and Seams

| Module | 구현 책임 | 유지하거나 제거할 seam |
| --- | --- | --- |
| `@ay-ple/codex-chat-runtime` production boundary | Verified workspace Runtime, Account Readiness, model catalog, product conversation, native context와 bounded close를 제공한다. | Workspace-only factory와 Runtime contract는 유지한다. `CodexAccountLifecycle`, `CodexRuntimeRole`, Browser login result types, `CodexManagedRuntime`의 account-lifecycle 의미와 `auth-only` factory input은 제거한다. |
| Node Runtime supervisor | Exact workspace를 persistent bridge와 native-context sidecar의 canonical `cwd`로 고정하고 controlled roots를 검증한다. | Role 분기와 auth-only empty-root validation을 제거한다. Fresh account read는 `readAccountReadiness()`의 private implementation detail로 유지한다. |
| Private Node↔Python bridge | Product Runtime이 실제로 호출하는 strict bounded command만 처리한다. | `read_account`는 유지한다. Browser login start/status/cancel/release와 logout command·frame·pending state·failure code를 제거하며 removed command는 strict unknown-command failure로 닫힌다. |
| Exact SDK patch·bundle owner | Current product blocker에 필요한 최소 ordered patch stack과 reproducible bundle을 소유한다. | Managed login만 추가한 `0009-managed-chatgpt-login`과 그 전용 regression·manifest expectation을 제거한다. Earlier shared router patches는 turn/global routing과 official source reproduction에 필요한 범위로 유지하며 이 작업에서 불필요한 upstream SDK 내부 API 삭제를 시도하지 않는다. |
| `CodexChatService`·Server product composition | Runtime Account Readiness와 product Turn lifecycle을 Browser-safe API에 조합한다. | `readAccountReadiness()` 호출과 `ready | not_ready | unavailable` projection을 그대로 유지한다. Login/logout endpoint나 compatibility route를 추가하지 않는다. |
| `@ay-ple/semester-workspace` | ADR 0014의 v3 codec·admission·bundle·context·setup primitive와 current v2 compatibility decoder를 소유한다. | Package와 v3 kernel을 유지한다. Current Server가 v2 decoder만 소비한다는 상태를 제품 capability로 승격하지 않는다. |
| Owning documents | Current topology, package behavior와 작업 완료 상태를 각각 구현 지도, package README와 Development Backlog에 반영한다. | Historical ADR 0016·0017, public-release spec·ticket과 evidence는 삭제하거나 current target으로 다시 쓰지 않는다. |

Production Runtime의 survivor interface는 역할 union이나 login lifecycle 없이 다음 capability 조합을 의미해야 한다.

- Native conversation·terminal·interrupt·close
- `readAccountReadiness()`
- `readModelCatalog()`
- Product thread·Turn·user-input answer/cancel
- Effective config·Skill observation

새 이름이 필요하면 account ownership을 암시하지 않는 workspace/product Runtime 이름을 사용하고, 제거한 `CodexManagedRuntime`을 compatibility type alias로 남기지 않는다. Exact 이름 선택은 ticket 구현에서 existing package vocabulary와 locality에 맞춰 정할 수 있지만 capability roster는 위 목록보다 넓어질 수 없다.

### Interfaces and Invariants

- Production Runtime은 exact absolute workspace root 하나를 요구하고 이를 persistent bridge process, native App Server와 native-context sidecar의 동일 canonical `cwd`로 사용한다.
- Runtime factory는 `auth-only` input, bootstrap `cwd`와 role-dependent mutation family를 허용하지 않는다.
- `readAccountReadiness()`는 fresh `account/read(refreshToken: true)` 결과만 authority로 사용한다. Credential file 존재, cached Browser state나 별도 boolean을 account proof로 사용하지 않는다.
- Fresh account가 ChatGPT이면 `ready`, signed-out 또는 unsupported이면 `not_ready(authentication_required)`로 투영한다. Account read·transport 실패는 safe Runtime error를 거쳐 product `unavailable`로 수렴하며 raw provider error를 노출하지 않는다.
- Account Readiness는 login, logout, credential mutation이나 Browser navigation을 시작하지 않는다.
- Removed login·logout command, type, export, deterministic fixture option과 test-only process wrapper는 tracked production·testing surface에 남지 않는다.
- Python SDK upstream snapshot에 official login support가 존재한다는 사실만으로 이를 제거하거나 제품 contract로 노출하지 않는다. AY-PLE-owned patch·bridge·Node surface만 current consumer에 맞게 축소한다.
- Ordered patch roster, patched-source manifest, production manifest와 materialized bundle은 같은 reduced stack과 exact digest를 가리켜야 한다. Old nine-patch bundle을 reduced source contract에 대한 valid artifact로 허용하지 않는다.
- `@ay-ple/semester-workspace`의 v3 public package seam을 current Server에 연결하거나 v2 workspace를 자동 v3로 adopt·migrate하지 않는다.
- Current v2 decoder와 parity vector는 original-byte-preserving compatibility boundary로 유지한다.
- Historical Markdown과 static evidence의 unchecked public-release acceptance criteria는 current backlog todo로 재해석하지 않는다.

### Data and State Flow

1. Canonical composition은 package-local verified Runtime, current active workspace와 controlled `HOME`·`CODEX_SQLITE_HOME`·temp를 준비하고 caller의 global `CODEX_HOME`을 전달한다.
2. Workspace-only Runtime은 canonical workspace `cwd`에서 Python bridge와 native App Server를 시작한다.
3. Product bootstrap 또는 operation admission이 Account Readiness를 요청하면 Node Runtime은 retained `read_account` bridge command 하나를 보낸다.
4. Python bridge는 official SDK의 fresh account read를 safe `signed_out | chatgpt | unsupported` 값으로 축소한다.
5. Node Runtime과 `CodexChatService`는 이를 Browser-safe readiness로 투영한다. 이 경로에는 login attempt, auth URL, logout과 credential mutation state가 없다.
6. Product Turn, model catalog, native context와 close는 기존 workspace-bound lifecycle을 계속 사용한다.
7. 후속 `ImportSource` 또는 app-owned workspace 전환이 시작될 때 v3 kernel은 별도 spec·ticket의 명시적인 composition을 통해서만 current executable consumer를 얻는다.

### Failure Behaviour

| 실패 | 요구 동작 |
| --- | --- |
| Global Codex account가 signed out·unsupported | Product readiness는 `not_ready(authentication_required)`이며 Chat·Assignment mutation을 닫고 existing workspace·Course·material read를 보존한다. In-app login을 제안하거나 자동 실행하지 않는다. |
| `account/read` 실패·timeout·malformed response | Safe Runtime failure로 수렴하고 Browser에는 `unavailable`만 표시한다. Credential, traceback과 raw protocol을 노출하지 않는다. |
| Removed private command 유입 | Unknown 또는 invalid private protocol로 fail closed하고 과거 lifecycle을 실행하지 않는다. |
| Reduced patch manifest와 local bundle 불일치 | Verification과 Runtime spawn이 mutation 없이 실패한다. Old bundle로 fallback하지 않는다. |
| Runtime shutdown 중 readiness read | Existing bounded close·pending settlement contract를 유지하고 process tree가 사라지기 전 close success를 만들지 않는다. |
| V3 workspace kernel에 current consumer가 없음 | 정상 상태다. 제거·자동 연결·capability claim을 하지 않으며 package 자체 검증만 유지한다. |

### Compatibility and Migration

이 변경은 internal Runtime contract의 hard cutover다. Current Server·Browser public API와 workspace persisted data에는 migration이 없다.

- Removed `auth-only` role, managed account type·method와 bridge command에 deprecation period, alias 또는 adapter를 제공하지 않는다.
- Current production Server caller는 이미 workspace-only overload를 사용하므로 public product behavior migration은 필요하지 않다.
- Current v2와 v3 workspace bytes를 읽거나 쓰지 않으며 schema version을 변경하지 않는다.
- Historical app-scoped credential과 incomplete public setup state를 탐색·이관·logout·삭제하지 않는다.
- Reduced patch stack을 채택할 때 tracked manifests와 ignored local production bundle은 documented materialization flow로 함께 갱신한다. Source contract와 bundle이 갈라진 상태에서는 Runtime을 시작하지 않는다.
- 롤백은 current product source와 matching verified bundle을 한 단위로 수행한다. Managed account lifecycle만 부분 복구하는 rollback은 지원하지 않는다.

## Implementation Decisions

| 결정 | 판정 | 근거 |
| --- | --- | --- |
| Fresh Account Readiness | Keep | Current Server·Browser가 실제 사용하며 personal product가 전역 Codex account 준비 상태를 설명하는 데 필요하다. |
| Managed Browser login·cancel·release·logout | Remove | Current executable consumer가 없고 ADR 0017은 historical 상태다. 유지하면 두 번째 credential lifecycle이 current architecture처럼 남는다. |
| `auth-only` Runtime role | Remove | Pre-workspace managed account transition과 함께 제거된 public-preview 전용 role이다. Current product는 workspace Runtime만 시작한다. |
| Exact SDK patch `0009-managed-chatgpt-login` | Remove | AY-PLE-owned managed login seam만을 위해 추가됐으며 survivor Account Readiness는 official account read만 필요로 한다. |
| Earlier bounded router의 login-route mechanics | Keep unless reduced independently by exact-source proof | Shared official SDK router patch의 일부이고 current pruning이 upstream snapshot 내부 capability를 재작성할 이유는 없다. Exact patch continuity와 turn/global regression을 우선한다. |
| `@ay-ple/semester-workspace` v3 kernel | Keep | ADR 0014의 adopted app-owned workspace와 다음 `ImportSource` capability의 기반이다. Public release host 제거와 workspace authority 결정은 별개다. |
| Public npx·Landing·managed account historical artifacts | Historical evidence only | Current executable graph와 backlog target은 아니지만 과거 판단과 구현 증거는 보존할 가치가 있다. |

## Testing Decisions

- Highest practical external seam은 current Chromium→Vite→Express→deterministic workspace Runtime의 Account Readiness projection과 readiness별 product mutation guard다. Existing Chat Shell E2E에서 `ready | not_ready | unavailable`과 workspace read preservation을 계속 검증한다.
- Runtime targeted tests는 workspace-only factory validation, fresh `read_account`, malformed·timeout·close settlement, product Turn·model catalog·native-context survivor와 removed command rejection을 검증한다.
- Python bridge unit·actual-child tests는 login attempt·logout case를 제거하고 account read, product command, strict protocol, bounded queue와 full process-group cleanup을 유지한다.
- Exact SDK gates는 eight-patch reduced stack의 deterministic derivation, official suite, provenance와 updated manifest를 검증한다. `0009` 전용 signature·behavior oracle이 남아 있으면 실패해야 한다.
- Production bundle gates는 reduced patch identity로 materialize·verify하고 post-run non-mutation을 재검증한다.
- Server focused tests는 `CodexChatService` Account Readiness, bootstrap safe projection, operation admission과 shutdown을 실행한다.
- V3 retain 판정은 `@ay-ple/semester-workspace`의 existing unit·filesystem suite와 Server v2 parity test로 증명한다. 이 spec은 v3 Browser E2E나 Server composition을 요구하지 않는다.
- Required PR-ready verification:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Runtime artifact가 준비된 구현 환경에서는 다음 exact gates도 통과해야 한다.
  - `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`
  - `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`
  - `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime`
- External credential을 쓰는 live-provider trace는 이 pruning의 mandatory gate가 아니다. Account Readiness와 product lifecycle은 deterministic actual-child와 exact local-provider seam에서 검증하며 credential이 필요한 동작을 새로 추가하지 않는다.

## Out of Scope

- In-app login, logout, reauthentication, account switching과 app-scoped credential storage
- OAuth, PKCE, device code, API key 또는 external token flow
- Current v2→v3 workspace migration, v3 Server·Browser composition과 first-run setup UI
- `ImportSource` 분석·mapping·review·material import 구현
- `@ay-ple/semester-workspace` v3 contract 재설계 또는 package 제거
- Official upstream SDK가 자체적으로 제공하는 unused login API의 vendored snapshot 삭제
- Earlier router patches의 login accounting을 별도 최적화하는 patch rewrite
- Public npx, Landing, Runtime release resolver와 production host 복구
- Historical ADR·spec·ticket·Wayfinder evidence 삭제
- Conversation persistence, multi-client isolation, native approval center와 mobile work

## Open Questions

None.

## Further Notes

이 spec의 완료는 Development Backlog의 public release lane 감사 항목 중 surface 분류와 Runtime managed account·v3 kernel `keep | remove` 판정을 닫는다. 완료 시 구현 지도와 Runtime 격리 문서는 current topology만 설명하고, Runtime·workspace package README는 각 package의 실제 survivor surface를 반영해야 한다. Backlog에서 그 감사 항목을 완료 처리한 뒤에야 다음 상위 todo인 `ImportSource` 여정을 시작한다.

## Completion

다섯 implementation ticket이 모두 완료됐다.

- [001 — Workspace-only Runtime survivor seam을 확정한다](../tickets/2026-07-27-public-release-residue-pruning/001-workspace-runtime-survivor-seam.md)
- [002 — Node Runtime에서 managed account lifecycle과 role을 제거한다](../tickets/2026-07-27-public-release-residue-pruning/002-node-runtime-managed-account-contraction.md)
- [003 — Python bridge의 managed account protocol을 제거한다](../tickets/2026-07-27-public-release-residue-pruning/003-python-bridge-account-protocol-contraction.md)
- [004 — Exact SDK patch stack과 production bundle을 8단계로 재고정한다](../tickets/2026-07-27-public-release-residue-pruning/004-eight-patch-runtime-bundle-baseline.md)
- [005 — Current topology와 workspace keep 판정을 반영하고 감사를 닫는다](../tickets/2026-07-27-public-release-residue-pruning/005-current-topology-audit-closeout.md)
