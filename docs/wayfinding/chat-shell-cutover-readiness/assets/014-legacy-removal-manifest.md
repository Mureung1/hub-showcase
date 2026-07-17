# 014 — Codex Chat-only legacy removal manifest와 예외 감사

- 상태: 완료·역사 조사 snapshot; exact 실행 범위는 [Codex Chat-only runtime cutover spec](../../../specs/2026-07-17-codex-chat-only-cutover.md)이 supersede한다.
- 조사 기준: 2026-07-17의 tracked repository, 현재 문서와 read-only local metadata
- 결정 기준: [017의 Codex Chat-only·legacy deletion-default](../tickets/017-codex-chat-only-deletion-default.md#L21-L29)
- 보존 계약: [002의 behavior-preserving deletion contract](../tickets/002-extension-envelope.md#L22-L43)
- 선행 감사: [004의 survivor fitness와 mixed-composition residual](004-chat-target-fitness-audit.md#L8-L24)
- 산출물 성격: 삭제 구현이 아니라 016과 implementation spec에 넘길 폐쇄형 manifest

> `/to-spec` live-tree 재검증에서 이 snapshot이 놓친 executable `spikes/codex-runtime-ownership/**`와 네 deleted workspace 아래 ignored `dist`·`node_modules`·`test-results` residue가 발견됐다. 최종 contract는 tracked spike 전체를 DELETE하고, `.ay-ple` 두 곳을 포함한 일곱 exact residue root를 23-event one-shot journal로 제거하며, current survivor `dist`를 clean build한다. 아래의 “세 root”, `runtime` subdirectory-only, symlink 합계 6, pre-cutover code rollback 설명은 당시 조사 기록이지 실행 authority가 아니다.

## 결론

삭제 예외의 폐쇄 목록은 **비어 있다**. Runtime Harness·Inspector, `runtime-core`, `runtime-fake`, legacy `runtime-codex`의 Adapter·RawClient·status·capability와 `HeadlessCodexClientHost`·layout·transport, `@openai/codex@0.144.0` 및 generated protocol은 모두 삭제 대상이다. 현재 Server·root scripts·Chat fixture가 이들을 참조하므로 package만 먼저 지우지 않고 하나의 mixed-composition deletion slice에서 reference와 manifest를 함께 제거해야 한다([mixed residual](004-chat-target-fitness-audit.md#L174-L185)).

Static camp demo는 legacy runtime의 실행 consumer가 아니라 발표 artifact로 남긴다. Inspector workspace가 우연히 소유한 serve/export/test/typecheck tooling만 root와 `artifacts/camp-demo`로 옮기고, Runtime Harness·Inspector 화면은 완료된 Week 1의 정적 역사 증거로 명시한다. Ignored legacy records와 homes는 내용 열람 없이 metadata-only preflight로 조사하며 Chat history 또는 product state로 migration하지 않는다([002 non-migration boundary](../tickets/002-extension-envelope.md#L61-L71)). 이후 사용자는 [018](../tickets/018-legacy-local-state-cleanup.md)에서 recoverable 보존을 기각하고 full cutover gate green 뒤 세 exact legacy root와 auth/config를 영구 삭제하도록 명시적으로 승인했다.

## Disposition 언어

| 분류 | 의미 | 이번 실행의 규칙 |
| --- | --- | --- |
| **DELETE** | Maintained source, executable surface, generated artifact 또는 dependency를 tracked tree에서 제거 | 같은 slice에서 모든 production/test/script reference를 제거한다. Git history가 과거 구현을 보존한다. |
| **REPLACE** | 현재 필요한 job은 남지만 legacy owner나 현재형 설명을 survivor owner로 바꿈 | 새 범용 abstraction을 만들지 않고 Codex Chat 또는 artifact-local owner로 이동한다. |
| **RETAIN-HISTORY** | Point-in-time 의사결정·구현·발표 증거 | 실행 dependency나 현재 architecture source로 해석하지 않는다. 본문을 새 현재형으로 다시 쓰지 않는다. |
| **PREFLIGHT-ONLY** | 삭제 전 외부 consumer·실사용·예상 밖 또는 exact allowlist 밖 ignored data를 read-only로 확인 | 발견 사실은 coordination 입력일 뿐 자동 유지·삭제·migration 결론이 아니다. |
| **PERMANENT-DELETE** | 사용자가 승인한 exact ignored legacy root를 full cutover gate green 뒤 영구 삭제 | Symlink를 따라가지 않고 literal exact root만 삭제한다. Current Chat artifact와 `.gitignore`는 제외하며 data rollback은 없다. |

## 1. Tracked code와 package removal manifest

### 1.1 전체 workspace 삭제

아래 네 경로는 일부 파일을 골라 남기지 않고 **workspace 전체를 DELETE**한다. 세 package와 Inspector는 모두 repository-private workspace이며, 현재 public/published compatibility를 약속하는 manifest가 아니다([Inspector manifest](../../../../apps/inspector/package.json#L1-L5), [`runtime-core` manifest](../../../../packages/runtime-core/package.json#L1-L8), [`runtime-fake` manifest](../../../../packages/runtime-fake/package.json#L1-L8), [`runtime-codex` manifest](../../../../packages/runtime-codex/package.json#L1-L8)).

2026-07-17 read-only `git ls-files` baseline은 `apps/inspector` 18개, `packages/runtime-core` 8개, `packages/runtime-fake` 3개, `packages/runtime-codex` 630개로 **합계 659 tracked files**다. `runtime-codex` 630개 중 generated protocol directory가 601개다([generated path owner](../../../../packages/runtime-codex/README.md#L7-L23)). 016은 이 수치를 구현 전 scope baseline으로 기록하되, 완료 판정은 file count 감소가 아니라 네 root의 tracked file이 0개인지로 한다.

| Exact target | 포함하는 surface | 판정과 근거 |
| --- | --- | --- |
| `apps/inspector/**` | React UI, CSS/assets, Vite config, Inspector Playwright harness/spec, workspace README와 package/tsconfig | **DELETE.** UI는 `/api/runtime/*`, Runtime Core type과 legacy capability만 소비한다([Inspector package edges](../../../../apps/inspector/package.json#L6-L23), [Inspector API edges](../../../../apps/inspector/src/App.tsx#L137-L174)). Camp tooling은 아래 3절에서 먼저 분리한다. |
| `packages/runtime-core/**` | `AgentRuntimeKernel`, Adapter contract, `RuntimeRunLog`, persistence seam, run ID와 tests/testing helper | **DELETE.** Package Interface와 scripts가 Harness lifecycle만 소유한다([package exports/scripts](../../../../packages/runtime-core/package.json#L8-L23), [kernel contract](../../../../packages/runtime-core/src/index.ts#L19-L228)). |
| `packages/runtime-fake/**` | `FakeRuntimeAdapter`와 package config | **DELETE.** 이 Adapter는 `runtime-core`에만 의존하는 Harness double이다([manifest dependency](../../../../packages/runtime-fake/package.json#L15-L20), [implementation](../../../../packages/runtime-fake/src/index.ts#L1-L67)). |
| `packages/runtime-codex/**` | 아래 Adapter/RawClient/Host/transport/generated/scripts/tests와 package README | **DELETE.** Package가 legacy `runtime-core`, npm Codex `0.144.0`, Ajv closure를 함께 소유한다([manifest](../../../../packages/runtime-codex/package.json#L25-L42)). |

`packages/runtime-codex/**`의 삭제 범위는 다음 항목을 모두 포함한다. 이 목록은 “package 전체” 판정을 좁히지 않고, 놓치기 쉬운 자산을 명시한다.

| Legacy surface | Exact deletion scope | 근거 |
| --- | --- | --- |
| Harness Adapter | `src/adapter.ts`, Adapter tests와 testing fake App Server | Server·Inspector에 연결된 경로는 `CodexRuntimeAdapter → CodexRawClient`다([current wiring statement](../../../../packages/runtime-codex/README.md#L3-L5)). |
| Raw client·smoke | `src/raw-client.ts`, `src/smoke.ts`, tests, binary/home/status helpers | RawClient는 cwd와 repository-local legacy homes를 계산하고 별도 smoke를 제공한다([Harness behavior](../../../../packages/runtime-codex/README.md#L89-L102), [default homes](../../../../packages/runtime-codex/src/raw-client.ts#L868-L917)). |
| Status·capability | `src/status.ts`, `src/capability-slots.ts`, tests와 public exports | Package root가 Adapter와 함께 status/capability를 export한다([exports](../../../../packages/runtime-codex/src/index.ts#L1-L15)). |
| Legacy Host | `src/headless-codex-client-host.ts`, test fake와 Host tests | Host는 layout·transport를 소비하지만 현재 lifecycle/initialize까지만 구현했고 thread·turn 제품 Interface는 아니다([Host dependencies](../../../../packages/runtime-codex/src/headless-codex-client-host.ts#L1-L18), [implemented boundary](../../../../packages/runtime-codex/README.md#L73-L87)). |
| Product layout | `src/product-runtime-layout.ts`와 tests | Package/binary pin, 세 root와 runtime-home pair를 검증하는 legacy Host seam이다([layout input/result](../../../../packages/runtime-codex/src/product-runtime-layout.ts#L15-L47), [preparation](../../../../packages/runtime-codex/src/product-runtime-layout.ts#L65-L115)). |
| Bidirectional transport | `src/stdio-transport.ts`, generated response contract와 tests | Ajv와 pinned generated schemas를 직접 읽는 Host lower transport다([imports and schema ownership](../../../../packages/runtime-codex/src/stdio-transport.ts#L1-L13), [transport contract](../../../../packages/runtime-codex/src/stdio-transport.ts#L15-L80)). |
| Generated protocol | `src/internal/codex-app-server-protocol/**`, 특히 `generated/**`와 schema JSON | Generation root와 contract는 legacy `0.144.0` package가 소유한다([pin and generated path](../../../../packages/runtime-codex/README.md#L7-L23)). |
| Generator·decision overlay | `scripts/**`, `codex-method-decisions.json` | Renderer와 sparse decision overlay는 삭제되는 schema와 generated inventory에 종속된다([inventory ownership](../../../../packages/runtime-codex/README.md#L25-L39)). |
| Package config/docs | `package.json`, tsconfig, README와 모든 package-local tests/fixtures | Build/generation/smoke/test 명령과 dependency closure 전체가 legacy package에 묶여 있다([scripts/dependencies](../../../../packages/runtime-codex/package.json#L25-L42)). |

### 1.2 Server의 mixed legacy cluster

`apps/server` 자체는 RETAIN하지만, 아래 파일은 **DELETE**한다.

| Exact file set | 삭제 이유 |
| --- | --- |
| [`src/codex-parity.ts`](../../../../apps/server/src/codex-parity.ts#L1-L20), [`src/codex-parity.test.ts`](../../../../apps/server/src/codex-parity.test.ts#L1-L18) | Legacy HTTP/SSE Adapter parity command와 test다. |
| [`src/runtime-run-json-store.ts`](../../../../apps/server/src/runtime-run-json-store.ts#L1-L21), [`src/runtime-run-json-store.test.ts`](../../../../apps/server/src/runtime-run-json-store.test.ts#L1-L20) | Runtime Diagnostic History concrete store와 test다. |
| [`src/server.test.ts`](../../../../apps/server/src/server.test.ts#L1-L28), [`src/server-startup.test.ts`](../../../../apps/server/src/server-startup.test.ts#L1-L20) | `/api/runtime/*`, persistence startup/recovery, Fake/Codex Adapter와 legacy health를 검증하는 suite다. |
| [`src/testing/checkpoint-failing-persistence.ts`](../../../../apps/server/src/testing/checkpoint-failing-persistence.ts#L1-L12), [`src/testing/persistence-fault-server.ts`](../../../../apps/server/src/testing/persistence-fault-server.ts#L1-L15) | 삭제되는 persistence failure fixture다. |

아래 survivor 파일은 **REPLACE/EDIT**한다.

| File | Exact rewrite |
| --- | --- |
| [`src/server.ts`](../../../../apps/server/src/server.ts#L1-L31) | Legacy imports, `CreateLegacyServerAppOptions`, `createServerApp()`, kernel/Fake/Codex/store construction, `/api/health`, `/api/runtime/*`, SSE와 history/fake/env helper를 제거한다([legacy options/factory](../../../../apps/server/src/server.ts#L38-L70), [mixed construction](../../../../apps/server/src/server.ts#L112-L152), [legacy routes](../../../../apps/server/src/server.ts#L154-L325), [legacy helpers](../../../../apps/server/src/server.ts#L357-L445)). `ServerApplication` listener ownership, Chat composition, close ordering과 CLI startup은 유지한다([application lifecycle](../../../../apps/server/src/server.ts#L72-L110), [Chat shutdown](../../../../apps/server/src/server.ts#L330-L355), [startup](../../../../apps/server/src/server.ts#L447-L482)). |
| [`src/testing/test-server.ts`](../../../../apps/server/src/testing/test-server.ts#L1-L36) | Temporary history directory와 cleanup을 제거하고 Chat-only `createServerApplication()` listener helper로 축소한다. |
| [`src/codex-chat-status.test.ts`](../../../../apps/server/src/codex-chat-status.test.ts#L48-L105) | Express-only legacy compatibility factory test를 삭제한다. Partial/missing config test는 `/api/health` assertion과 “legacy routes” naming만 제거하고 closed Chat status assertion을 유지한다([remaining config cases](../../../../apps/server/src/codex-chat-status.test.ts#L109-L169)). |
| [`apps/chat-shell/e2e/chat-shell-harness.ts`](../../../../apps/chat-shell/e2e/chat-shell-harness.ts#L96-L151) | 세 `runtimeHistoryDirectory` option과 그것만을 위한 temporary root lifecycle을 제거한다. Actual browser+Server+deterministic Chat runtime composition은 유지한다. |

Server manifest에서는 `verify:codex-parity`, `@ay-ple/runtime-core`, `@ay-ple/runtime-fake`, `@ay-ple/runtime-codex`, `cors`, `@types/cors`를 **DELETE**한다([current scripts/dependencies](../../../../apps/server/package.json#L7-L29)). Chat router가 현재 `cors()`보다 먼저 mount되고 Chat 자체가 loopback/Origin guard를 소유하므로 legacy route가 사라진 뒤 generic CORS middleware를 남길 job이 없다([mount order](../../../../apps/server/src/server.ts#L148-L152), [Chat mutation guard contract](../../../../apps/server/src/codex-chat-http.ts#L359-L377)). `@ay-ple/codex-chat-runtime`, `dotenv`, `express`, Chat actual script와 Server build/test/typecheck/start는 RETAIN한다([Server manifest](../../../../apps/server/package.json#L7-L29)).

### 1.3 Root scripts, workspace graph와 lockfile

Root wildcard workspace 선언은 유지할 수 있지만, 삭제된 디렉터리가 workspace/lock entry로 남아서는 안 된다. 현재 root commands는 Inspector와 세 legacy package를 직접 호출하고 camp demo를 live Harness와 결합한다([root scripts](../../../../package.json#L5-L17)). 다음처럼 **REPLACE**한다.

| Surface | Target state |
| --- | --- |
| `dev` | `@ay-ple/server` + `@ay-ple/chat-shell`을 시작하고 `CODEX_CHAT_ORIGIN=http://127.0.0.1:4173`을 Server에 전달하는 유일한 canonical Chat entrypoint. |
| `dev:chat-shell` | 중복 alias를 **DELETE**. README와 package docs는 `npm run dev` 하나만 안내한다. |
| `demo` | live Server/Inspector 없이 artifact-only `serve:camp-demo`를 호출하는 convenience command로 **REPLACE**. |
| `serve:camp-demo`, `export:camp-demo`, `test:camp-demo`, `test:camp-demo:e2e` | Inspector workspace에서 root/artifact owner로 이동한다. |
| `test` | `codex-chat-runtime`, Server, Chat Shell unit/default suite와 camp unit을 호출한다. Legacy package/Inspector suite를 호출하지 않는다. |
| `test:e2e` | Chat Shell Playwright와 artifact-local camp Playwright를 호출한다. Inspector browser suite를 호출하지 않는다. |
| `test:dev-entrypoint` | Canonical root `npm run dev`를 bounded하게 두 번 spawn해 origin-only `invalid_configuration`과 fresh six-root `configured` status, Shell readiness, expected Server+Chat Shell process tree와 bounded reap을 검증한다. |
| `check:docs-links` | Active Markdown의 repository-relative link를 검증하고 deleted current owner로 향하는 link를 거부한다. Completed history allowlist의 과거 link 판정은 016 residual과 분리한다. |
| `build` | `codex-chat-runtime`, Server, Chat Shell만 build한다. |
| `typecheck` | 세 survivor workspace와 artifact-local camp tsconfig를 검사한다. |
| lint | Root에 별도 aggregate script를 추가하지 않는다면 기존 문서의 Chat Shell lint만 유지하고 Inspector lint 명령을 제거한다. |

Camp tooling 이전 때문에 root devDependencies는 기존 `playwright`에 `vite`, `tsx`, `typescript`, `@types/node`를 명시적으로 더한다. 현재 이 의존성과 camp `.mts`/E2E typecheck를 Inspector가 우연히 소유하므로 workspace 삭제 전에 owner를 옮겨야 한다([Inspector tooling dependencies](../../../../apps/inspector/package.json#L25-L34), [current camp typecheck include](../../../../apps/inspector/tsconfig.node.json#L24-L30)).

`package-lock.json`은 manifest edit 뒤 `npm install`로 **재생성**한다. Hand-edit하지 않는다. 완료된 lock에는 다음이 없어야 한다.

- `apps/inspector`, `packages/runtime-core`, `packages/runtime-fake`, `packages/runtime-codex` workspace/link entry와 Server의 legacy dependency edges([current lock workspace edges](../../../../package-lock.json#L39-L103)).
- `@openai/codex@0.144.0`과 여섯 platform optional package closure([current npm Codex closure](../../../../package-lock.json#L603-L621)).
- 삭제되는 `runtime-codex`의 `ajv`, Server의 `cors`와 `@types/cors` direct closure([current package lock edges](../../../../package-lock.json#L3496-L3544), [Server lock edges](../../../../package-lock.json#L60-L78)).

Ignored `dist/`와 workspace-local `node_modules/`는 tracked deletion 뒤 물리 디렉터리를 남길 수 있다. Source completion oracle은 `test ! -e`가 아니라 `git ls-files`·manifest·lock·import 검사를 사용한다. 필요하면 implementation이 **정확한 삭제 workspace 아래의 regenerable output만** 별도로 정리할 수 있지만, 이를 아래 `.ay-ple`/auth/history data cleanup과 섞지 않는다([root ignore rules](../../../../.gitignore#L1-L8)).

## 2. Test와 invariant replacement manifest

Legacy test를 이름·fixture·상태 모델 단위로 1:1 이관하지 않는다. 002가 고정한 observable invariant를 가장 낮은 survivor layer에서 검증하고, 같은 invariant의 current Chat evidence가 있으면 legacy test는 함께 삭제한다([private fixture/non-contract boundary](../tickets/002-extension-envelope.md#L38-L43)).

| Legacy evidence/job | Codex Chat-only disposition | Replacement evidence |
| --- | --- | --- |
| `FakeRuntimeAdapter`의 deterministic stream | **DELETE, 1:1 migration 없음.** `DeterministicCodexChatRuntime`은 native Chat Interface의 testing seam으로 이미 존재한다. | Adapter가 input/script scope, live handle과 single-consumer를 검증한다([testing adapter](../../../../packages/codex-chat-runtime/src/testing.ts#L42-L129), [iterator](../../../../packages/codex-chat-runtime/src/testing.ts#L195-L216)). Browser/Server conformance와 native conformance는 별도 oracle이다([fixture matrix](004-chat-target-fitness-audit.md#L106-L116)). |
| Harness failure·cancel·SSE tests | **DELETE.** `RuntimeRunEvent`, cancel endpoint와 SSE wording을 Chat model로 번역하지 않는다. | Chat runtime/Server/browser가 safe failure, authoritative terminal, interrupt acknowledgement, disconnect/backpressure를 target vocabulary로 검증한다([falsifying traces](004-chat-target-fitness-audit.md#L135-L148)). |
| Runtime Diagnostic History persistence/restart/retention | **DELETE, product history replacement 없음.** 이 data는 Codex conversation이나 `ModelingRun`이 아니다. | Browser-memory transcript와 native persisted conversation이라는 현재 limitation을 그대로 보존하고 persistence/resume는 non-goal로 둔다([known limitation](../tickets/002-extension-envelope.md#L45-L50)). ADR 0004도 Codex history와 진단 history를 다른 의미로 판정했다([rejected reuse](../../../adr/0004-split-runtime-history-semantics-from-workspace-storage.md#L27-L38)). |
| Legacy status·capability slots·`/api/health` | **DELETE.** Health endpoint를 Chat alias로 만들지 않는다. | Closed Chat status, exact bundle evidence, fixed policy metadata와 safe UI disclosure가 current diagnostic surface다([status contract](../tickets/002-extension-envelope.md#L28-L36), [diagnostic decision](../tickets/002-extension-envelope.md#L53-L59)). |
| Legacy path/binary/home validation | **DELETE.** Old function names와 error taxonomy를 이관하지 않는다. | Chat six roots, full bundle verifier, writable/executable/non-symlink/distinct checks와 no ambient fallback을 보존한다([configuration invariant](../tickets/002-extension-envelope.md#L30-L32), [production verifier](../../../../packages/codex-chat-runtime/README.md#L50-L65), [runtime factory](../../../../packages/codex-chat-runtime/README.md#L96-L106)). |
| Raw request ID·bidirectional transport tests | **DELETE.** Raw App Server envelope와 `RequestId`를 제품 contract로 승격하지 않는다. | Official SDK와 private Node↔Python correlation이 native identity/FIFO/safe projection을 제공하며 `bridgeRequestId`는 browser로 나오지 않는다([bridge boundary](../../../../packages/codex-chat-runtime/README.md#L67-L90)). |
| Host lifecycle/subscription tests | **DELETE.** `generation`, Host snapshot과 subscription vocabulary를 Chat lifecycle에 복사하지 않는다. | `CodexChatRuntime`의 bounded process supervisor, terminal promise, close와 Server lifecycle을 target contract로 검증한다([runtime Interface](../../../../packages/codex-chat-runtime/README.md#L96-L106), [survivor seam fitness](004-chat-target-fitness-audit.md#L81-L91)). |
| Legacy actual-child/parity/smoke | **DELETE.** Old binary pin과 HTTP Harness green을 rollback gate로 쓰지 않는다. | Node actual-child, exact local-provider와 Server actual shutdown은 current production path를 직접 검증한다([verified gate separation](004-chat-target-fitness-audit.md#L118-L133)). |

구체 test 정책은 다음과 같다.

1. Test 이름은 `RuntimeRun`, Harness Adapter, legacy endpoint나 canned legacy ID가 아니라 002 invariant를 말한다.
2. Fixture 고정값은 fault injection input일 수 있지만 native identity·ordering의 oracle로 사용하지 않는다. Deterministic, actual-child, exact local-provider, Server, browser evidence가 보장하는 층을 구분한다([fixture limitations](004-chat-target-fitness-audit.md#L106-L116)).
3. 삭제 과정에서 current Chat contract regression이 새로 드러날 때만 그 invariant에 대한 최소 survivor test를 추가한다. Legacy file/test count를 맞추기 위한 migration은 금지한다.
4. 004가 기록한 impossible state, interrupt attempt/ack conflation과 fixture 한계는 general debt이며 legacy retention 또는 이번 deletion의 신규 abstraction trigger가 아니다([debt separation](004-chat-target-fitness-audit.md#L187-L197)).

## 3. Static camp-demo와 live runtime을 분리한다

`artifacts/camp-demo/**`는 **RETAIN**한다. 이 모듈은 스스로 현재 제품·아키텍처 정본이 아니며, `product-flow`도 실제 파일/Agent/persistence가 없는 결정적 발표 prototype이라고 명시한다([artifact boundary](../../../../artifacts/camp-demo/README.md#L1-L5)). Week 1의 Inspector screenshot은 과거 실행 기반의 정적 evidence로 유효하다([Week 1 static evidence](../../../../artifacts/camp-demo/index.html#L160-L183)). 이것은 Inspector executable 또는 legacy package의 삭제 예외가 아니다.

삭제 전에 다음 tooling을 **REPLACE/RELOCATE**한다.

| Current owner | Target owner와 action |
| --- | --- |
| [`apps/inspector/e2e/vite-test-server.ts`](../../../../apps/inspector/e2e/vite-test-server.ts#L1-L90) | `artifacts/camp-demo/e2e/`의 artifact-local helper로 이동하고 camp spec import를 같은 디렉터리로 바꾼다([current cross-workspace import](../../../../artifacts/camp-demo/e2e/camp-demo.spec.mts#L3-L8)). |
| [`apps/inspector/playwright.config.ts`](../../../../apps/inspector/playwright.config.ts#L1-L28) | Inspector case를 버리고 camp-only `artifacts/camp-demo/playwright.config.mts`로 대체한다. |
| Inspector의 camp scripts | Root의 `serve:camp-demo`, `export:camp-demo`, `test:camp-demo`, `test:camp-demo:e2e`로 옮긴다([current script ownership](../../../../apps/inspector/package.json#L6-L16)). |
| Inspector `tsconfig.node.json`의 camp include | `artifacts/camp-demo/tsconfig.json`을 만들고 root `typecheck`가 호출한다([current coverage](../../../../apps/inspector/tsconfig.node.json#L24-L30)). |
| Vite/tsx/TypeScript/Node types | Root devDependencies로 옮긴다. PDF exporter가 Playwright와 Vite를 직접 사용한다([exporter imports](../../../../artifacts/camp-demo/export-pdf.mts#L4-L9)). |

Artifact copy는 현재형 의존만 갱신한다.

- README의 `npm run demo`는 deck/product-flow만 시작한다고 설명하고 Runtime Inspector·Companion Server 주소, live Harness record와 delay 설명을 제거한다([current live coupling](../../../../artifacts/camp-demo/README.md#L7-L28)).
- `index.html` A1과 Week 1은 “완료된 1주차 정적 증거”로 유지하되 삭제된 implementation map을 current source로 링크하지 않는다([current appendix copy](../../../../artifacts/camp-demo/index.html#L235-L256)). A3의 “현재 동작하는 두 실행 경로”는 Chat-only current path와 역사적 Harness evidence로 바꾼다([stale dual-path copy](../../../../artifacts/camp-demo/index.html#L316-L356)).
- `speaker-notes.md`는 Product flow만 live라는 운영을 그대로 유지하고([presentation boundary](../../../../artifacts/camp-demo/speaker-notes.md#L1-L21)), Harness를 과거의 검증 질문·고정 evidence로 말하도록 시제를 고친다([Week 1 narration](../../../../artifacts/camp-demo/speaker-notes.md#L134-L151)).
- 정적 screenshot, deck, product-flow, export/unit/E2E tests는 유지한다. Screenshot 파일명에 `runtime-inspector`가 남는 것은 live dependency가 아니다.

## 4. Documentation removal and propagation manifest

문서 변경은 `정본 → 기술 설명 → 소비 문서 → index` 순서로 전파한다([documentation propagation rule](../../../README.md#L166-L177)). Wayfinder artifact는 완료 이후 current architecture 정본이 아니므로, cutover 결정은 active ADR과 survivor-only implementation map으로 옮긴다([document ownership](../../../README.md#L127-L145)).

### 4.1 DELETE와 새 current owner

| Current document | Disposition | Target state |
| --- | --- | --- |
| [`docs/architecture/runtime-harness-implementation-map.md`](../../../architecture/runtime-harness-implementation-map.md#L1-L19) | **RENAME + REWRITE** | `docs/architecture/codex-chat-implementation-map.md`라는 survivor-only current topology owner로 바꾼다. Old mixed-map 사본을 `docs/archive/`에 중복 생성하지 않는다. Git history와 완료 문서가 과거 topology를 보존한다. |
| [`docs/architecture/codex-app-server-method-inventory.md`](../../../architecture/codex-app-server-method-inventory.md#L1-L18) | **DELETE** | Generator, decision overlay, schema와 pin이 모두 삭제되므로 archive/regenerate하지 않는다. 미래 capability는 current exact official SDK/source를 use-case별로 다시 조사한다. |
| 새 ADR | **ADD** | `docs/adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md`를 만들어 Codex Chat-only, deletion-default, empty executable exception, approved exact local-state permanent deletion, no-migration, code-only rollback과 재로그인 결정을 장기 정본으로 둔다. |

### 4.2 Active documents to REPLACE/EDIT

| Document group | Required cleanup |
| --- | --- |
| Root [`README.md`](../../../../README.md#L13-L48), [`AGENTS.md`](../../../../AGENTS.md#L3-L18), [`docs/README.md`](../../../README.md#L74-L118) | Chat-only topology/commands/workspaces로 갱신하고 Inspector lint, legacy smoke, deleted map/inventory/package links를 제거한다. Root와 docs index에 새 ADR와 `codex-chat-implementation-map.md`를 등록하고 ADR 0004를 history로 이동한다. |
| `AGENTS.md` runtime/client conventions | 삭제된 Harness/Host/inventory를 사전 읽기 대상으로 요구하지 않고 Chat ADR, survivor map, runtime/Server/Shell README와 tests만 current guide로 둔다([current stale conventions](../../../../AGENTS.md#L40-L62)). Raw protocol non-leak와 secret non-git 규칙은 유지한다. |
| [`docs/architecture/codex-runtime-isolation.md`](../../../architecture/codex-runtime-isolation.md#L16-L40) | “현재 Runtime Harness” 열과 legacy current root를 제거하고 current Chat six-root/bundle/process boundary 중심으로 다시 쓴다. Old data no-migration 원칙과 018의 approved exact cleanup을 구분하고 deleted map/package links를 survivor owner로 바꾼다([current closing links](../../../architecture/codex-runtime-isolation.md#L121-L123)). |
| [`docs/architecture/codex-native-product-composition.md`](../../../architecture/codex-native-product-composition.md#L63-L67) | Legacy RawClient 비교와 deleted map/package link를 제거하고 current `CodexChatRuntime`의 아직 미구현인 product mapping만 설명한다. |
| ADR 0005·0006·0007 | Codex-first/root ownership/product mapping 결정은 RETAIN하되 “Harness를 계속 유지”하는 현재형만 삭제한다([ADR 0005 stale retention](../../../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md#L9-L28), [ADR 0006 no-migration boundary](../../../adr/0006-separate-package-app-data-and-semester-workspace-roots.md#L17-L26), [ADR 0007 historical RuntimeRun lesson](../../../adr/0007-use-native-codex-composition-for-product-actions.md#L28-L35)). |
| ADR 0009 | macOS-first 결정은 RETAIN하되 삭제되는 generated `Windows*` type/method inventory 보존 문구를 Git history·historical evidence로 바꾼다([current statement](../../../adr/0009-use-a-macos-first-local-web-app-product-path.md#L9-L15)). |
| ADR 0011 | Official SDK 결정은 RETAIN하고 cutover-pending 문구를 Chat-only cutover 완료/새 ADR pointer로 바꾼다([legacy checkpoint text](../../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md#L15-L23), [current outcome text](../../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md#L64-L68)). |
| [`docs/product/ay-ple-development-backlog.md`](../../../product/ay-ple-development-backlog.md#L35-L68) | Legacy foundation은 완료·역사 요약으로 압축하고 deleted inventory/Inspector reuse/cutover-pending task를 제거한다. 미래 raw method hint는 current exact official source에서 재검증할 case-driven intent로만 남긴다([later capability area](../../../product/ay-ple-development-backlog.md#L123-L124)). |
| [`docs/product/ay-ple-overview.md`](../../../product/ay-ple-overview.md#L133-L143) | Runtime Harness를 current implementation으로 설명하지 않고 역사적 Week 1 evidence로 바꾸며 Codex Chat을 유일한 current runtime 기반으로 설명한다. |
| [`docs/product/ay-ple-product-brief.md`](../../../product/ay-ple-product-brief.md#L140-L150) | `Runtime Diagnostic History`를 current source of truth row에서 제거하고 safe Chat status/failure는 제품 감사 기록이 아니라고 명시한다. 보안 절의 current raw history retention 가정도 제거하되 raw protocol을 product record로 복사하지 않는 원칙은 유지한다([current security text](../../../product/ay-ple-product-brief.md#L182-L190)). |
| [`apps/server/README.md`](../../../../apps/server/README.md#L1-L32) | History/persistence/Harness/health sections를 제거하고 Chat-only companion, `npm run dev`, six roots, routes, lifecycle와 actual gate만 남긴다. |
| [`apps/chat-shell/README.md`](../../../../apps/chat-shell/README.md#L19-L27) | 실행 명령을 `npm run dev`로 바꾸고 legacy cutover를 후속 범위에서 제거한다([current follow-up text](../../../../apps/chat-shell/README.md#L44-L46)). |
| [`packages/codex-chat-runtime/README.md`](../../../../packages/codex-chat-runtime/README.md#L1-L5) | “legacy 경로가 그대로 분리/보존”이라는 current 문구를 제거한다. 과거 Harness-managed auth를 쓴 manual live T0는 시점이 명확한 evidence로만 유지하고 active fallback으로 해석하지 않는다([manual evidence](../../../../packages/codex-chat-runtime/README.md#L144-L146)). |
| [`references/README.md`](../../../../references/README.md#L15-L17) | Cutover 전 `0.144.0` 유지 문구를 제거한다. `references/openai-codex`가 exact `0.144.4` source oracle이며 production dependency가 아니라는 현재 역할은 유지한다([reference role](../../../../references/README.md#L1-L9)). |

### 4.3 RETAIN-HISTORY

다음은 executable legacy exception이 아니라 point-in-time evidence로 남긴다.

| Retained evidence | Policy |
| --- | --- |
| ADR 0003 | 이미 완료·역사 기록이다. Runtime Harness를 만들었던 당시 판단과 완료 기준을 그대로 보존한다([classification and lesson](../../../adr/0003-build-runtime-harness-before-product-layer.md#L1-L16)). |
| ADR 0008 | 이미 ADR 0011이 대체한 완료·역사 기록이며 Host Interface를 compatibility contract로 쓰지 않는다고 명시한다([classification](../../../adr/0008-separate-headless-codex-client-host-from-product-ui.md#L1-L18)). |
| ADR 0004 | 본문은 당시 Harness-only persistence 결정을 보존하되 분류를 `완료·역사 기록`으로 바꾸고 current implementation link를 새 cutover ADR/역사 pointer로 교체한다([current Harness-only scope](../../../adr/0004-split-runtime-history-semantics-from-workspace-storage.md#L1-L9)). |
| 완료 specs와 tickets | 2026-07-09 Foundation, 2026-07-10 Hardening, 2026-07-16 Chat Shell spec 및 implementation tickets를 삭제·재작성하지 않는다. Docs index가 이미 이들을 완료·역사로 구분한다([completed spec index](../../../README.md#L106-L117)). |
| Archived backlog, completed spike docs, current Wayfinder | 당시 우선순위·조사·cutover reasoning을 보존한다. 새 current topology source로 인용하지 않는다([document status model](../../../README.md#L59-L70)). |
| Technical reference spikes | 저수준 사실은 유지한다. Deleted path/pin을 현재 dependency로 오해할 수 있는 문서에만 짧은 cutover banner와 survivor map pointer를 추가하고 point-in-time 본문은 다시 쓰지 않는다([technical-reference classification](../../../README.md#L97-L105)). |
| Static camp screenshot/deck | 발표용 역사 증거로 유지한다. Current runtime dependency가 아니다([artifact maintenance boundary](../../../../artifacts/camp-demo/README.md#L97-L107)). |

`CONTEXT.md`의 “Avoid”나 역사 문서·Wayfinder·upstream source 안에 legacy 식별자가 남는 것은 허용된다. 따라서 repository 전체 zero-grep은 잘못된 oracle이다. Active current docs의 링크/시제와 production dependency를 별도로 검사한다.

## 5. 삭제 예외 closed list

예외가 되려면 **(1) 식별 가능한 현재 사용자/consumer, (2) Codex Chat으로 대체 불가능한 현재 job, (3) 명시적 owner와 maintenance obligation**을 모두 충족해야 한다([decision rule](../tickets/017-codex-chat-only-deletion-default.md#L23-L28)). 이번 조사에서 세 조건을 모두 만족한 executable legacy surface는 없다.

| Candidate | 현재 사용자/consumer | 대체 불가능한 현재 job | Owner·maintenance | 판정 |
| --- | --- | --- | --- | --- |
| Inspector + Harness + Runtime Core/Fake/history | Repository 안에는 서로를 호출하는 Inspector↔Server/Harness graph가 있지만 현재 인간 사용자나 독립 제품 consumer는 증명되지 않았다. | Safe Chat status/native identity/failure와 conformance gates가 current diagnostic job을 담당한다. Raw run history는 Chat conversation을 관찰하지 못한다([diagnostic surface decision](../tickets/002-extension-envelope.md#L53-L59)). | 지속 owner/SLO/release obligation이 없다. | **DELETE; 예외 아님.** |
| `CodexRuntimeAdapter`·RawClient·status·capability·`0.144.0` schema | Legacy Server/Inspector만 소비한다. | Current Chat exact bundle/path/status/transport를 대체하지 못한다. | Legacy pin/generator를 유지할 owner가 없다. | **DELETE; 예외 아님.** |
| `HeadlessCodexClientHost`·layout·transport | Production caller가 없고 package export/self-test만 있다([repository caller statement](../../../../packages/runtime-codex/README.md#L3-L5)). | Thread/turn도 없는 initialize lifecycle이며 approval의 현재 지름길이 아니다([implemented limit](../../../../packages/runtime-codex/README.md#L73-L87)). | 명시적 current owner가 없다. | **DELETE; 예외 아님.** |
| Camp demo | 발표 사용자/job은 현재다. | Static product flow/deck job은 필요하다. | `artifacts/camp-demo`가 owner다. | **Legacy runtime 예외가 아님.** Static artifact만 RETAIN하고 tooling을 이동한다. |
| `references/openai-codex` | Chat runtime maintainers가 source review에 사용한다. | Exact official source oracle이다. | `codex-chat-runtime` provenance가 유지한다. | **Legacy runtime 예외가 아님.** `0.144.4` survivor asset이다([source oracle boundary](../../../../packages/codex-chat-runtime/README.md#L7-L23)). |

코드 품질, test 수, “나중에 approval/두 번째 engine에 쓸 수 있음”, dormant rollback 가치는 세 조건을 충족하지 않는다. 미래 capability가 실제 제품 요구가 되면 current `CodexChatRuntime` Seam에서 다시 설계한다([future-abstraction decision](../tickets/017-codex-chat-only-deletion-default.md#L24-L28)).

외부 consumer가 preflight에서 발견되어도 자동 예외가 아니다. 016 실행을 잠시 막고 consumer를 offboard/coordinate한다. 장기 존치를 요청하려면 식별된 consumer가 위 세 조건과 maintenance owner를 새 evidence로 모두 제출해야 한다.

## 6. Read-only preflight, approved cleanup과 data boundary

### 6.1 2026-07-17 local snapshot

아래는 file **내용을 열지 않고** directory 존재 여부, file count, allocated size와 logical byte 합계만 관찰한 point-in-time metadata다. Root `.ay-ple`은 Git ignore 대상이고([ignore rule](../../../../.gitignore#L1-L7)), Harness 기본 history path는 Server code가 계산한다([default path](../../../../apps/server/src/server.ts#L366-L372)). 이 snapshot은 다른 machine, 다른 clone, environment override와 외부 consumer의 부재를 증명하지 않는다.

| Path | Read-only observation | Disposition |
| --- | --- | --- |
| `.ay-ple` | 존재, 5,546 files, 148,520 KiB allocated, 136,966,725 logical bytes. Top-level은 `runtime-harness` 20 files와 `runtime-codex` 5,526 files뿐이고 `.ay-ple/camp-demo`는 없음. | **PERMANENT-DELETE.** Harness history와 Codex home/SQLite auth·native state를 영구 삭제하고 추후 재로그인하기로 승인했다([legacy home role](../../../../packages/runtime-codex/README.md#L114-L129)). |
| `apps/server/.ay-ple` | 존재, 2 files, 52 KiB allocated, 49,325 logical bytes | **PERMANENT-DELETE.** 과거 cwd-local Harness history다. |
| `spikes/codex-runtime-ownership/runtime` | 존재, 89 files, 3,916 KiB allocated, 2,735,716 logical bytes | **PERMANENT-DELETE.** 완료된 spike의 ignored auth/runtime state다([spike ignore](../../../../spikes/codex-runtime-ownership/.gitignore#L1-L2), [sensitive-data rule](../../../../spikes/codex-runtime-ownership/README.md#L38-L42)). |
| `packages/codex-chat-runtime/.artifacts` | 존재, 5,556 files, 1,378,220 KiB allocated, 1,370,643,223 logical bytes | **RETAIN.** Current exact SDK/cache/production bundle이며 legacy cleanup allowlist 밖이다([bundle owner](../../../../packages/codex-chat-runtime/README.md#L44-L65)). |

Codex Chat은 `.ay-ple`을 default나 fallback으로 사용하지 않고 여섯 `CODEX_CHAT_*` absolute path를 모두 명시적으로 요구한다([config keys](../../../../apps/server/src/codex-chat-config.ts#L14-L21), [environment resolution](../../../../apps/server/src/codex-chat-config.ts#L109-L165)). Audit 시점의 shell에는 이 path가 없고 repository `.env`와 실행 중인 project Server·Chat Shell도 없다. 다만 manual live T0는 `.ay-ple/runtime-codex/codex-home` auth/config를 한 번 명시적으로 재사용했으므로 사용자는 그 로그인 state를 maintained state에서 제외하고 필요하면 새 Chat root에서 재로그인하기로 결정했다([manual T0](../../../../packages/codex-chat-runtime/README.md#L144-L146)).

세 cleanup root 자체는 symlink가 아닌 ordinary directory이며 canonical overlap이 없다. Root `.ay-ple`과 ownership spike의 두 legacy `codex-home` 아래에는 descendant symlink가 각각 3개, 합계 6개 있다. Permanent deletion은 모든 descendant symlink를 non-follow inventory하고 link target을 따라가지 않은 채 link object와 containing literal root를 영구 삭제해야 한다. 이 snapshot은 external shell/launcher override의 부재를 증명하지 않으며 exact allowlist 밖 root를 자동 포함하지 않는다.

### 6.2 Preflight completion criteria

| Check | Completion evidence | 발견 시 행동 |
| --- | --- | --- |
| Repository 밖 consumer | Maintainer가 known sibling repos, CI/deploy scripts, local launchers와 documented integrations에서 deleted package names, `/api/runtime/*`, Inspector URL, legacy env names를 검색하고 owner에게 확인한다. Bounded local sibling scan은 보조 evidence일 뿐 전역 부재 증명은 아니다. | Consumer owner, 호출 surface와 offboarding date를 기록하고 016을 block. 자동 keep 금지. |
| 실제 Inspector 사용 | 현재 process/port snapshot뿐 아니라 최근 사용하는 사람, 정기 workflow, CI/demo command와 담당자를 직접 확인한다. 이 조사 시점 process list에는 Inspector/Vite 5173 실행이 보이지 않았지만 이는 과거·다른 환경 사용을 부정하지 않는다. | 실제 job을 Chat/status/test 또는 static artifact로 전환한다. 세 조건을 모두 만족하는 장기 예외가 아니면 삭제. |
| Approved on-disk roots | `.ay-ple`, `apps/server/.ay-ple`, `spikes/codex-runtime-ownership/runtime`의 `lstat`, canonical parent, tracked-file 0과 metadata를 다시 기록한다. Project process·open handle이 없고 active Chat runtime/state path와 target이 양방향으로 disjoint이며 `.ay-ple`에 예상 밖 top-level child가 없는지 확인한다. Workspace가 repository ancestor인 경우에만 no-process/open-handle 조건 아래 containment를 허용한다. | Full cutover gate가 green인 뒤 symlink-follow 없이 세 literal exact root만 영구 삭제한다. Current Chat `.artifacts`와 `.gitignore`는 유지한다. Guard가 실패하면 삭제하지 않는다. |
| Override/external roots | 과거 `RUNTIME_HISTORY_DIR`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, `CODEX_RUNTIME_CWD`와 smoke/parity shell wrapper를 사용한 operator가 외부 path를 스스로 disclose하도록 한다. 광범위한 home scan이나 shell/browser history 수집은 하지 않는다. | Disclosed path도 metadata-only inventory. 자동 복사·삭제·Chat root 편입 금지. |

Legacy records는 product `SemesterModel`, `ModelingRun`, native conversation 또는 Chat transcript로 migration하지 않는다. Data 존재는 code retention 근거가 아니다. 014 시점에는 code deletion이 data deletion 권한을 포함하지 않았지만, 사용자가 [018](../tickets/018-legacy-local-state-cleanup.md)에서 세 exact root와 auth/config의 영구 삭제, data rollback 포기와 필요 시 새 Chat root에서의 재로그인을 후속 승인했다. External/override root는 그 exact allowlist에 포함하지 않는다.

## 7. Atomic execution order

다음 순서는 implementation spec이 더 이상 architecture 선택을 하지 않도록 고정한다.

| Slice | Atomic boundary | Exit condition |
| --- | --- | --- |
| 0. Baseline·preflight | Full deletion 전 commit SHA와 필요 시 last-known-good release/artifact를 기록한다. 6절의 consumer/use/data inventory를 완료한다. | SHA/release, owner responses와 metadata-only inventory가 기록됨. Data mutation 없음. |
| 1. Camp tooling detach | Artifact-local Vite helper, Playwright config, tsconfig와 root scripts/devDependencies를 먼저 추가하고 camp import/copy를 갱신한다. | Camp unit/typecheck/E2E/export가 Inspector workspace 없이 실행됨. |
| 2. Mixed Server deletion | `server.ts`를 Chat-only로 바꾸고 Server fixture/status test/Chat E2E option을 정리한다. 동시에 Server legacy files/script/dependencies, 세 runtime packages와 Inspector workspace를 삭제한다. | Survivor source에 legacy import/route/env/store/factory reference가 없고 Chat Server tests가 compile/run함. Package만 먼저 삭제하는 중간 상태를 만들지 않음. |
| 3. Root graph·lock | `dev`, demo, test/e2e/build/typecheck와 root devDependencies를 target state로 바꾸고 `npm install`로 lock을 재생성한다. | `npm ls`와 lock에 deleted workspace/pin/dependency closure가 없음. `npm run dev`가 Server+Shell만 시작함. |
| 4. Decision/docs propagation | 새 cutover ADR → survivor-only map → architecture/product/package docs → root/docs indexes 순으로 갱신하고 generated inventory를 삭제한다. Historical docs와 static evidence는 위 정책대로 유지한다. | Active docs에 deleted current owner/link/command가 없고 history는 명시적으로 과거 시제임. |
| 5. Full cutover verification | Stale compiled output을 current build로 혼동하지 않도록 survivor workspaces를 clean하게 build하고 016의 full gate와 code residual oracle를 legacy state 영구 삭제 전에 실행한다. | Default, browser, actual-child/exact-local/server-actual gate와 negative checks가 모두 green. 필수 prerequisite가 `blocked`이면 cleanup을 시작하지 않음. |
| 6. Legacy local-state permanent deletion | Active Chat path와 project process/open handle이 allowlist를 사용하지 않음을 다시 확인한 뒤 세 literal exact root만 symlink-follow 없이 영구 삭제한다. | Original exact roots는 없고 current Chat `.artifacts`는 존재함. 이 current-clone local operator action을 install/start/CI/merge automation에 넣지 않음. Guard·삭제 실패 시 scope를 넓히거나 broad fallback을 사용하지 않음. |
| 7. Post-deletion verification | Cleanup-sensitive bundle/path/status와 data residual을 다시 실행한다. | 세 original root 부재, `.gitignore`, current Chat `.artifacts`와 production bundle verification이 확인됨. |

Slice 2와 3은 review를 위해 commit을 나눌 수 있지만 하나의 integration change로 함께 merge/revert 가능해야 한다. Inspector 삭제 전에 camp tooling detach가 green이어야 하며, docs가 implementation보다 먼저 “삭제됨”이라고 주장해서도 안 된다.

## 8. Rollback boundary

Rollback은 legacy code를 dormant하게 남기는 방식이 아니다.

1. Slice 0에서 full pre-deletion commit SHA와 해당 SHA의 verification 결과, 있으면 deployable release/artifact identifier를 기록한다.
2. Merge 뒤 regression이면 deletion commit range를 `git revert`하거나 직전 release를 재배포한다. Partial package resurrection이나 current Chat과 legacy dual-run을 새 fallback으로 만들지 않는다.
3. Legacy local state는 full gate green 뒤 세 literal exact root에서 영구 삭제한다. Data rollback은 없고 Git/release rollback도 auth/history를 복구하지 않는다. 이후 live provider에는 새 isolated Chat roots와 재로그인이 필요하다. Local credential 삭제는 remote OAuth token revoke와 같지 않으며 revoke는 이번 scope가 아니다.
4. Rollback 후에도 002 observable contract와 pre-deletion verification matrix를 다시 실행한다. “프로세스가 뜬다”만으로 rollback 성공으로 보지 않는다.

이 경계는 017이 정한 “Git history와 완료·역사 문서로 교훈을 보존하고, pre-deletion baseline의 Git/release rollback을 사용한다”는 결정과 일치한다([rollback decision](../tickets/017-codex-chat-only-deletion-default.md#L26-L29)).

## 9. 016에서 승인된 gate facts

### 9.1 Positive verification matrix

| Gate family | Commands/evidence | Prerequisite와 판정 |
| --- | --- | --- |
| Default survivor | `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell` | Merge-blocking. Root scripts는 survivor + camp owner만 호출해야 한다. |
| Clean install | Candidate SHA의 detached clean worktree에서 `npm ci` 뒤 default survivor, browser, camp export와 residual을 실행 | Stale workspace link나 local `node_modules`가 green을 만들 수 없다. Network/tool prerequisite가 없으면 `blocked`. |
| Browser | `npm run test:e2e` | Chat Shell Playwright와 artifact-local camp Playwright를 모두 포함. Desktop viewport만 검증한다. |
| Production bundle preflight | `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime` | Ignored macOS-arm64 bundle이 없으면 green이 아니라 `blocked`. Materialization은 별도 network/download phase다([runtime scripts](../../../../packages/codex-chat-runtime/package.json#L25-L45), [verifier behavior](../../../../packages/codex-chat-runtime/README.md#L50-L65)). |
| Node actual-child | `npm run test:node-actual -w @ay-ple/codex-chat-runtime` | Provider credential 없이 verified production bundle을 사용한다([script](../../../../packages/codex-chat-runtime/package.json#L30-L42)). |
| Exact local-provider | `npm run test:local-provider -w @ay-ple/codex-chat-runtime` | Official local Responses harness를 쓰는 provider-free exact-native gate다([gate description](../../../../packages/codex-chat-runtime/README.md#L123-L144)). |
| Server actual shutdown | `npm run test:codex-chat-actual -w @ay-ple/server` | Materialized bundle 필요. Listener refusal와 Python/native process-tree disappearance를 확인한다([script](../../../../apps/server/package.json#L7-L13), [actual fixture](../../../../apps/server/src/testing/codex-chat-shutdown.actual.ts#L19-L76)). |
| Entrypoint smoke | `npm run test:dev-entrypoint` | Root `dev`가 주입하는 origin만 있을 때 exact reason은 `invalid_configuration`, fresh six-root에서는 `configured`다. 두 case 모두 Server+Shell readiness, expected process argv와 bounded process-tree reap을 검증한다([entrypoint contract](../tickets/002-extension-envelope.md#L53-L59)). |

Live provider credential은 이번 deletion gate가 아니다. Bundle, platform 또는 required tool이 없으면 skip/green으로 표시하지 말고 prerequisite와 failure owner를 가진 `blocked` evidence로 남긴다([002 gate boundary](../tickets/002-extension-envelope.md#L73-L76)).

### 9.2 Residual oracle

016은 다음 negative checks를 승인했다.

1. `git ls-files apps/inspector packages/runtime-core packages/runtime-fake packages/runtime-codex` 결과가 비어 있다. Ignored `dist/node_modules`의 물리적 존재는 tracked-source oracle로 쓰지 않는다.
2. Production source와 manifests에 `@ay-ple/runtime-core`, `@ay-ple/runtime-fake`, `@ay-ple/runtime-codex`, `@ay-ple/inspector`, `AgentRuntimeKernel`, `CodexRawClient`, `HeadlessCodexClientHost`, `/api/runtime`, `RUNTIME_HISTORY_*`, `RUNTIME_FAKE_DELAY_MS`, `CODEX_RUNTIME_CWD`, `verify:codex-parity`, `smoke:codex` reference가 없다.
3. `package-lock.json`과 `npm ls --all`에 deleted workspace, `@openai/codex@0.144.0`, legacy optional platform packages, legacy-only `ajv`, `cors`, `@types/cors`가 없다. Current lock이 이 closure를 legacy packages 아래에 둔다는 baseline은 lock과 package graph에서 확인된다([lock baseline](../../../../package-lock.json#L603-L621), [workspace baseline](../../../../package-lock.json#L3496-L3544)).
4. Server route probe에서 `/api/runtime/*`와 legacy `/api/health`가 더 이상 contract로 존재하지 않고 네 `/api/codex-chat/*` behavior는 유지된다([preserved HTTP contract](../tickets/002-extension-envelope.md#L30-L36)).
5. Root `npm run dev` process tree에는 Server와 Chat Shell만 있고 `dev:chat-shell`·Inspector command가 없다. Root demo는 artifact-only다.
6. Active current docs와 README의 link checker가 deleted map/inventory/package/Inspector README를 가리키지 않는다. `0.144.0`·Runtime Harness·Inspector가 남는 경우 완료·역사/technical reference/Wayfinder/static screenshot/upstream source 같은 허용 구역이거나 명시적 과거 시제여야 한다. Global zero-grep은 금지한다.
7. Clean survivor build 뒤 stale legacy JS/d.ts가 release/build artifact roster에 포함되지 않는다. Exact deleted workspace 아래의 regenerable build/install output과 승인된 sensitive local-state cleanup을 별도 단계로 판정한다.
8. `.ay-ple`, `apps/server/.ay-ple`, `spikes/codex-runtime-ownership/runtime`은 없고 별도 recovery copy도 만들지 않는다. `packages/codex-chat-runtime/.artifacts`, root `.gitignore`와 production bundle verification은 유지되며 deletion 중 symlink target을 따라가지 않았음을 확인한다. `git clean -fdX` 같은 broad ignored cleanup을 사용하지 않는다.

### 9.3 Spec-ready handoff

014와 018을 바탕으로 016이 승인한 확정 사실은 다음과 같다.

- Executable legacy exception은 0개다.
- Deletion scope와 mixed atomic cluster는 1절과 7절로 폐쇄됐다.
- Camp demo는 static artifact로 유지하되 Inspector tooling owner를 제거한다.
- On-disk state와 external consumer/use check는 read-only preflight다. 세 exact legacy root는 018의 사용자 승인에 따라 full cutover gate green 뒤 영구 삭제하고 current Chat `.artifacts`와 external/override root는 제외한다. Data disposition을 다시 대칭 토론하지 않는다.
- Chat replacement는 target invariant 언어로 검증하며 legacy test/code를 1:1 이관하지 않는다.
- Code rollback은 pre-deletion commit/release baseline과 revert/redeploy다. 영구 삭제한 ignored data에는 rollback이 없으며 이후 live provider는 새 isolated roots와 재로그인을 사용한다.
- Command의 local/merge/release 적용 시점, prerequisite/failure owner, exact permanent-deletion guard와 최종 residual matrix는 [016 cutover 실행 gate](016-cutover-execution-gates.md)에서 승인됐다. 새 architecture나 keep/migrate/remove 선택은 남아 있지 않다.
