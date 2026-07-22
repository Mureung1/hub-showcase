# 병렬 delivery collision audit

작성일: 2026-07-22

상태: Ticket 002의 point-in-time research evidence

## 판정

현재 구조는 병렬 구현이 가능하지만, 기능 이름만으로 여러 writer를 바로 투입하면 수렴하지 않는다. 안전한 병렬 단위는 **고정된 Interface 뒤의 deep Module**이다. 이번 조사에서 사용할 수 있는 4개 동시 slot은 **coordinator 1명 + read-only investigator 최대 3명**으로 운영했다. 이는 현재 research capacity이지 구현 contract의 동시 writer 수 결정이 아니다. Shared surface는 coordinator 또는 지정된 단일 owner만 수정한다.

Wayfinder 단계에서는 map·ticket writer 한 명만 두고 나머지 agent는 read-only research·review를 수행한다. Resulting spec 뒤에는 같은 contract-spine SHA에서 갈라진 별도 attached worktree마다 writer 한 명을 둔다. Exact lane 수, file allowlist, merge order와 gate cadence는 주요 제품 seam이 결정된 뒤 [Ticket 014](../tickets/014-final-parallel-delivery-contracts.md)가 확정한다.

## 현재 module graph와 충돌 표면

| Surface | 확인된 현재 경계 | 병렬 작업 시 실패 방식 | 잠정 single owner |
| --- | --- | --- | --- |
| Browser-safe product contract | [`@ay-ple/product-contract`](../../../../packages/product-contract/README.md)은 Server producer와 Chat Shell consumer가 공유하는 유일한 product wire contract다. | Server와 Browser가 서로 다른 field roster·decoder 가정을 구현하거나 한 lane이 private Runtime shape를 public contract로 노출한다. | Contract-spine/integrator |
| Root workspace·lockfile | Root [`package.json`](../../../../package.json)의 `apps/*`, `packages/*`와 한 [`package-lock.json`](../../../../package-lock.json)이 모든 workspace manifest를 함께 소유한다. | CLI·Landing scaffold 또는 dependency 추가가 lockfile에서 충돌하고, 각 branch의 독립 `npm install` 결과가 다른 graph를 만든다. | Integrator |
| Build output | Root `build`는 네 workspace의 `dist/`를 한 번에 지운 뒤 contract → Runtime → Server → Shell 순서로 다시 만든다. Chat Shell build/typecheck도 같은 `node_modules/.tmp/*.tsbuildinfo`를 쓴다. | 같은 worktree의 root build와 workspace build/typecheck가 서로 output을 삭제·교체해 잘못된 green 또는 flaky failure를 만든다. | 해당 worktree의 gate runner 한 명 |
| Runtime source·generation | Runtime package는 tracked SDK snapshot, patch stack, 세 manifest와 ignored `.artifacts/`를 함께 관리한다. 정확한 mutation·verification 경계는 [Runtime README](../../../../packages/codex-chat-runtime/README.md)에 기록되어 있다. | `generate`, manifest-writing `materialize`, OAuth bridge 수정과 verifier가 동시에 실행되면 tracked drift 또는 partial package authority가 생긴다. | Runtime core owner |
| Production host seam | 재사용 가능한 application seam은 [`createServerApplication()`](../../../../apps/server/src/server.ts)이다. 현재 [`product-development.ts`](../../../../apps/server/src/product-development.ts)는 repository-relative Runtime과 Origin `4173`을, [`vite.config.ts`](../../../../apps/chat-shell/vite.config.ts)는 Server `3000` proxy를 가정한다. | npx host와 setup backend가 port·Origin·static serving·root 계산을 각각 소유해 lifecycle이 둘로 갈라진다. | Production composition owner; exact owner는 Ticket 006에서 결정 |
| Product UI shell | 현재 [`App.tsx`](../../../../apps/chat-shell/src/App.tsx)와 `App.css`가 workbench shell과 주요 pane 조합을 함께 소유한다. | onboarding, 일반 Chat, responsive typography를 서로 다른 writer가 같은 shell 파일에서 직접 조합한다. | Chat Shell composition owner; feature lane은 새 component seam 뒤에서 작업 |
| Cross-surface E2E | [`chat-shell-harness.ts`](../../../../apps/chat-shell/e2e/chat-shell-harness.ts)는 Runtime type, product contract, Server source와 workspace materializer를 직접 조합한다. | UI lane이 자신의 변경을 green으로 만들기 위해 Server·Runtime fixture까지 일방적으로 바꾸거나 반대편 contract failure를 가린다. | Integration/QA owner |
| Dev·dogfood process | [`product-development-bootstrap.mts`](../../../../scripts/product-development-bootstrap.mts)는 고정 `3000`/`4173` process composition을 시작한다. [`product-dogfood.mts`](../../../../scripts/product-dogfood.mts)는 fixture copy, persistent profile과 shell login 안내를 추가한다. | 한 머신에서 중복 dev/dogfood가 port를 다투고, 개발 fixture launcher가 public production launcher로 잘못 승격된다. | Local integration runner; dogfood script는 donor evidence만 제공 |
| Repository publication | Working branch·fork·upstream mapping은 [`AGENTS.md`](../../../../AGENTS.md)와 [issue tracker](../../../agents/issue-tracker.md)가 소유한다. Public `AY-PLE` repository authority는 아직 Ticket 005의 결정 전이다. | `hub`와 public repository를 동시에 편집하거나 `origin`·integration branch에 lane이 직접 write해 source authority가 갈라진다. | Public release owner; 결정 전 external write 금지 |

현재 dependency 방향은 다음과 같다.

```text
@ay-ple/chat-shell ──production──> @ay-ple/product-contract <──production── @ay-ple/server
                                                                             │
                                                                             v
                                                              @ay-ple/codex-chat-runtime

apps/chat-shell/e2e ──test-only──> Chat Shell + Server source + Runtime types + workspace materializer
```

따라서 `packages/product-contract/**`와 `apps/chat-shell/e2e/**`는 디렉터리 이름만 보고 각각 UI lane에 넘길 수 있는 표면이 아니다. 전자는 shared Interface, 후자는 integration composition이다.

## 초기 lane 후보

아래 경계는 구현 ticket을 쓰기 위한 후보이지 최종 file ownership표가 아니다. 현재와 같은 4-slot 환경에서 coordinator가 계속 active라면 동시에 실행할 수 있는 writer는 물리적으로 세 명 이하지만, 실제 writer 수와 선택·교대 순서는 Ticket 014가 dependency frontier와 merge cost를 기준으로 결정한다.

| Lane 후보 | 독립적으로 진행 가능한 범위 | 먼저 고정해야 하는 Interface | 금지되는 우회 |
| --- | --- | --- | --- |
| Contract spine·integration | Root workspace scaffold, shared contract fixture, shared release descriptor의 최소 commit과 lane 합류 검증 | 다른 lane이 소비할 exact public/private seam | 제품 feature를 coordinator가 대신 구현하거나 모든 shared change를 큰 선행 branch에 쌓지 않음 |
| Runtime core·OAuth adapter | Official SDK login capability 조사, private bridge·Node Runtime adapter와 deterministic fake | Runtime-private auth lifecycle Interface; exact method·state는 [Ticket 008](../tickets/008-browser-oauth-lifecycle.md) | token·native login identity를 Browser contract나 workspace에 노출하지 않음 |
| Distribution composition | 새 CLI/release tooling에서 synthetic archive fixture, preflight·download·cache·child lifecycle | Production host Interface와 launcher가 소비할 Runtime release descriptor; exact contract는 [Ticket 006](../tickets/006-npx-production-composition.md)·[Ticket 007](../tickets/007-runtime-release-delivery-integrity.md) | 기존 Runtime manifest를 임의 확장하거나 `product-dogfood.mts`를 production bin으로 이름만 바꾸지 않음 |
| Product backend·setup | Server-owned setup state, workspace admission·Review·recovery 구현 | Frozen Runtime-private auth seam과 Browser-safe setup contract; exact authority는 [Ticket 009](../tickets/009-semester-workspace-admission.md)–[Ticket 011](../tickets/011-bootstrap-and-setup-recovery.md) | Server-private path·receipt·credential을 product wire field로 직접 밀어 넣지 않음 |
| Product UI·onboarding | Frozen contract fixture에 대한 onboarding, `Semester Ready`, Chat/workbench component와 desktop visual system | Browser-safe setup/bootstrap contract와 deterministic scenario fixture | `App.tsx`/`App.css`를 여러 writer가 동시에 조합하거나 fixture-only state를 production truth로 하드코딩하지 않음 |
| Landing·public release | Provenance inventory, static prototype, trust·failure copy와 release staging allowlist | Exact public command, prerequisite, repository authority, Runtime size·integrity truth | 미결정 command/version/support claim을 landing에 사실처럼 고정하지 않음 |
| Integration·QA | Shared E2E harness, packed CLI smoke, clean-machine/live checkpoint와 cross-lane regression | 합류한 exact contract-spine SHA와 release candidate identity | Feature lane 소유 테스트를 대신 고치거나 실패를 fixture 변경으로 숨기지 않음 |

가장 중요한 분리는 `Runtime delivery`와 `Runtime core`를 같은 말로 취급하지 않는 것이다. Distribution lane은 frozen descriptor와 verifier 결과를 소비할 수 있지만 `packages/codex-chat-runtime/**`를 직접 수정하지 않는다. OAuth 때문에 Runtime-private surface를 변경하는 동안에는 Runtime core owner 한 명만 SDK snapshot·bridge·Node contract·manifest 영역에 write한다.

## Contract-spine 후보

세부 field와 commit 순서는 후속 ticket의 결정 대상이다. Ticket 002에서는 여러 lane이 반드시 같은 authority를 소비해야 하는 seam만 식별한다.

| Spine 후보 | 현재 donor seam | 필요한 이유 | 최종 결정 owner |
| --- | --- | --- | --- |
| Runtime-private auth Interface | 현재 [`CodexProductCapableRuntime`](../../../../packages/codex-chat-runtime/src/runtime-contract.ts)은 Account Readiness만 product caller에 제공하지만 vendored SDK의 [`_login.py`](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_login.py)는 login start·wait·cancel primitive를 가진다. | Runtime core와 Server setup이 native protocol을 중복 해석하지 않게 한다. | Ticket 008 |
| Browser-safe setup/bootstrap Interface | [`@ay-ple/product-contract`](../../../../packages/product-contract/README.md)의 strict type·decoder, Server projection과 Chat Shell decoder | Server producer, UI fixture와 Browser consumer가 같은 state machine을 사용하게 한다. | Tickets 008–011 |
| Runtime release descriptor | 현재 canonical complete-tree manifest와 [`production-bundle.ts`](../../../../packages/codex-chat-runtime/src/production-bundle.ts) verifier | npm launcher, GitHub Release asset와 local cache가 같은 version·integrity authority를 소비하게 한다. | Ticket 007 |
| Production host Interface | `createServerApplication()`의 listen·close seam과 relative `/api/product/*` Browser adapter | CLI가 static UI, Origin, selected port와 child shutdown을 한 composition으로 소유하게 한다. | Ticket 006 |
| Public release identity | 아직 미정인 source repository, npm package, Runtime asset와 landing command | Landing·README·package metadata·Release가 서로 다른 이름과 version을 게시하지 않게 한다. | Tickets 005, 007, 013, 015 |
| Cross-surface deterministic fixtures | Runtime deterministic fake, product contract decoder tests와 current E2E harness | UI·Server가 live OAuth 없이 같은 nominal·failure 상태를 개발하되 fixture를 production authority로 오인하지 않게 한다. | Ticket 014가 fixture owner를 확정 |

## 잠정 worktree·branch·review 규칙

1. Wayfinder가 끝나기 전에는 map·ticket writer를 한 명으로 유지한다. 병렬 agent는 evidence 수집과 fixed-revision review만 수행한다.
2. 구현은 independently mergeable ticket마다 별도 attached worktree와 unique `codex/<work>` working branch를 사용한다. 한 worktree·branch에는 writer 한 명만 둔다.
3. 모든 lane은 같은 reviewed contract-spine commit에서 시작하고 ticket에 expected writable path를 선언한다. 예상 밖 shared file이 dirty해지면 commit하지 않고 coordinator에게 contract delta를 요청한다.
4. Root `package.json`, `package-lock.json`, 새 workspace scaffold와 shared release descriptor는 integrator만 수정한다. Dependency가 필요한 lane은 먼저 lockfile delta를 요청한다.
5. Runtime source snapshot, `upstream/patches`, generated SDK, manifests와 `.artifacts` materialization은 Runtime core owner만 수정·실행한다. `generate`·manifest-writing `materialize`·actual verifier는 같은 worktree에서 직렬화한다.
6. Review는 fixed commit SHA 또는 clean detached review worktree에서 read-only로 한다. 수정은 원 writer가 새 commit으로 반영하고 새 SHA를 다시 제시한다.
7. Lane-local 검증은 각 worktree에서 실행한다. Root build·test·typecheck·lint, shared E2E와 packed smoke는 clean integration worktree에서 한 runner가 직렬로 실행한다.
8. Canonical `npm run dev` 또는 dogfood는 현재 고정 port 때문에 한 머신에서 한 instance만 실행한다. 병렬 test는 서로 다른 `appDataRoot`·Codex home·`workspaceRoot`, fresh temporary root와 ephemeral port를 사용하는 harness만 허용한다.
9. Working branch publication은 필요할 때 `fork`만 사용한다. `origin`, `N180_하성욱`, public repository, npm과 GitHub Release write는 각 owner와 authorization gate 전까지 금지한다. 완료 branch의 camp integration은 `/camp-pr` 경계를 따른다.
10. Exact branch naming, integration branch, merge queue와 cherry-pick/merge policy는 여기서 고정하지 않고 Ticket 014로 넘긴다.

## 잠정 verification cadence

| 시점 | 최소 gate | 실행 owner |
| --- | --- | --- |
| Lane commit | 변경 Module의 unit test·typecheck·lint/build 중 해당 gate | 각 lane writer |
| Shared contract 변경 | Contract decoder/test 뒤 Server producer·Browser consumer conformance | Contract-spine owner |
| Runtime mutation | Runtime README의 exact generation 또는 validation 순서와 post-run non-mutation verify | Runtime core owner |
| Lane 합류 | Root `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`를 같은 integration worktree에서 순차 실행 | Integrator |
| Release composition checkpoint | Provider-free packed CLI smoke, clean app data/cache/workspace roots와 signal cleanup | Integration/QA owner |
| Bounded release checkpoint | Isolated OAuth/live smoke와 credential 비노출 확인 | Integration/QA owner, explicit prerequisite 충족 시 |

이 표는 gate 종류만 정한다. 매 merge마다 실행할지, 묶음 checkpoint로 실행할지는 Ticket 014가 최종 구현 DAG와 함께 정한다.

## Stop-the-line 조건

다음 중 하나가 관측되면 해당 lane의 write·merge·publication을 즉시 멈춘다.

- 두 writer가 같은 worktree, branch, shared Interface, root lockfile, generated Runtime surface 또는 durable state authority를 동시에 수정한다.
- Server producer와 Browser consumer가 서로 다른 product contract 또는 Runtime-private auth contract를 가정한다.
- Runtime materialize 중 tracked package drift가 발생하거나 canonical manifest·complete-tree verifier가 불일치한다.
- 같은 worktree에서 root build와 workspace build/typecheck, 또는 Runtime generate/materialize/actual gate가 겹친다.
- Cross-surface E2E fixture가 한 lane의 실패를 숨기기 위해 authoritative contract보다 먼저 바뀐다.
- `packageRoot`, `appDataRoot`, `workspaceRoot`가 겹치거나 OAuth token·`auth.json`·absolute private path가 Browser, workspace, public log, manifest에 나타난다.
- 서로 다른 dev·test·live instance가 같은 writable `appDataRoot`, Codex home, dogfood profile 또는 `workspaceRoot`를 공유한다.
- SIGINT·browser close·failure 뒤 Server, Python, Codex child나 fixed port가 남는다.
- public launcher가 repository source, system Python 또는 source-tree `node_modules`에 의존한다.
- command, supported platform, artifact version/hash/size, license·NOTICE 또는 repository authority가 결정되기 전에 public surface가 이를 확정된 사실로 게시한다.
- Dirty integration worktree, 움직이는 review base, owner 없는 merge conflict 또는 기존 detached worktree를 소유권 확인 없이 재사용하는 상황이 생긴다.
- `origin`, camp integration branch, public repository, npm 또는 GitHub Release에 명시적 authorization 없이 write하려 한다.

## Ticket 014로 넘기는 결정

이 audit은 collision inventory와 안전한 잠정 운영 규칙만 확정한다. 다음은 의도적으로 결정하지 않는다.

- Exact lane 묶음과 동시 writer 수
- Directory·file 단위 exclusive owner와 shared fixture owner
- Contract-spine commit의 exact content·order
- Branch/worktree 이름, integration branch와 merge queue
- Merge마다 실행할 gate와 release checkpoint cadence
- Review owner, retry budget와 stop 이후 재개 절차

이 항목은 repository authority, CLI·Runtime, OAuth·setup, product UX·landing seam이 결정된 뒤 [최종 병렬 delivery contract와 integration protocol](../tickets/014-final-parallel-delivery-contracts.md)에서 잠근다.
