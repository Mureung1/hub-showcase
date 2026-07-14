# 기존 Headless Codex Client Host consumer와 compatibility constraint 감사

## 감사 기준과 결론

- 감사 대상 fixed point는 `898ab72803e431eb4133984511aa3d151c4ed4b9` (`codex/codex-native-client-redesign`)이다. `git merge-base HEAD f335333fd9609739380441635eeb79ca4d465303`은 `f335333fd9609739380441635eeb79ca4d465303`, `git rev-list --count f335333fd9609739380441635eeb79ca4d465303..HEAD`은 `2`였다.
- Repository 안에서 `HeadlessCodexClientHost` Interface나 `threadRef`·`turnRef`·`itemRef`·`interactionRef` semantics를 사용하는 **durable external/product consumer는 0개**다. 현재 Host는 private workspace package의 root export이자 production source이지만 실제 app/server/product caller가 없다. `@ay-ple/runtime-codex` 자체도 `private: true`다. (`packages/runtime-codex/package.json:2-12`, `packages/runtime-codex/src/index.ts:24-35`)
- Active branch의 Host 구현은 lifecycle `start`·`stop`·snapshot·subscription까지만 제공한다. Thread/turn/item/interaction ref는 구현에 없고, `host_state_changed`는 Host와 그 전용 test에서만 사용한다. (`packages/runtime-codex/src/headless-codex-client-host.ts:20-69`, `packages/runtime-codex/src/headless-codex-client-host.ts:143-272`, `packages/runtime-codex/src/headless-codex-client-host.test.ts:12-104`)
- Ticket 004 implementation archive `f695f96572599d2deac41c09284406312db8767b`까지 넓혀도 Host 관련 source는 implementation·test·barrel·두 fake의 5개 파일에 닫혀 있고, `apps/**`와 `packages/runtime-core/**`에는 Host/ref consumer가 0개다. 즉 archive의 더 큰 state machine도 integration evidence이지 product adoption evidence가 아니다. 아래 fixed-point `git grep` 결과가 이를 소유한다.
- 따라서 clean-slate replacement는 기존 Host API나 ref/event shape를 위한 compatibility adapter, migration layer 또는 deprecation period를 만들 필요가 없다. 보존해야 하는 것은 Host shape가 아니라 Codex-first 제품 방향, runtime root 소유권, raw protocol 격리, native Codex composition, macOS-first local companion 경계와 기존 Runtime Harness 동작이다. (`docs/adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md:7-26`, `docs/adr/0006-separate-package-app-data-and-semester-workspace-roots.md:7-24`, `docs/adr/0007-use-native-codex-composition-for-product-actions.md:7-35`, `docs/adr/0009-use-a-macos-first-local-web-app-product-path.md:7-14`)

## 재현 가능한 repository 검색

다음 검색은 fixed point에서 실행했다.

```bash
git grep -n -E "from ['\"]@ay-ple/runtime-codex|import\(['\"]@ay-ple/runtime-codex|require\(['\"]@ay-ple/runtime-codex" -- apps packages

git grep -n -E \
  'HeadlessCodexClientHost|headless-codex-client-host|threadRef|turnRef|itemRef|interactionRef|host_state_changed|stale_reference' \
  -- apps packages \
  ':!packages/runtime-codex/src/headless-codex-client-host.ts' \
  ':!packages/runtime-codex/src/headless-codex-client-host.test.ts' \
  ':!packages/runtime-codex/src/testing/fake-headless-codex-client-host.ts'

git grep -l -E \
  'threadRef|turnRef|itemRef|interactionRef|stale_reference' \
  -- apps packages

for rev in f335333fd9609739380441635eeb79ca4d465303 898ab72803e431eb4133984511aa3d151c4ed4b9 \
  f695f96572599d2deac41c09284406312db8767b \
  d547c3d7448302debbf2a0a685878f60d2f75aeb; do
  git grep -n -E \
    'HeadlessCodexClientHost|headless-codex-client-host|threadRef|turnRef|itemRef|interactionRef|host_state_changed|stale_reference' \
    "$rev" -- apps packages/runtime-core
done

git grep -l -E \
  'HeadlessCodexClientHost|headless-codex-client-host' \
  f695f96572599d2deac41c09284406312db8767b \
  -- 'apps/**/src/**' 'packages/**/src/**'

git check-ignore -v \
  packages/runtime-codex/dist/index.d.ts \
  packages/runtime-codex/dist/headless-codex-client-host.d.ts
git ls-files 'packages/runtime-codex/dist/**' | wc -l

jq -r \
  'to_entries[] | select(.value.integration == "client-host") | .key' \
  packages/runtime-codex/codex-method-decisions.json
git show \
  f695f96572599d2deac41c09284406312db8767b:packages/runtime-codex/codex-method-decisions.json \
  | jq -r \
    'to_entries[] | select(.value.integration == "client-host") | .key'
```

첫 검색은 Inspector의 `capabilities` type, server와 그 tests의 `CodexRuntimeAdapter`·status·기존 fake만 반환했다. 두 번째 검색은 `packages/runtime-codex/src/index.ts:25-35`와 `packages/runtime-codex/README.md:67-73`만 반환했고, 세 번째 검색은 0개 파일을 반환했다. Revision별 `apps`·`runtime-core` 검색도 네 revision 모두 0줄이었다. Archive-wide source 검색은 위에서 열거한 Host 자체 5개 파일만 반환했다. 실제 import 지점은 Host가 아니라 기존 Runtime Harness 표면을 사용한다. (`apps/inspector/src/App.tsx:1-15`, `apps/server/src/server.ts:3-15`, `apps/server/src/codex-parity.ts:7-20`)

Local `dist` 확인에서는 `.gitignore:2`가 두 declaration을 ignore했고 tracked dist file 수는 0이었다. Persisted compatibility 판정은 임의 local cache의 일반 문자열 검색이 아니라 아래 tracked store schema와 실제 caller를 근거로 한다.

## Surface별 분류

### Production code, imports와 package exports

| Surface | 분류 | 근거 | Clean-slate 판정 |
| --- | --- | --- | --- |
| `HeadlessCodexClientHost` class와 public lifecycle types | internal production dependency | Host source가 layout과 stdio transport를 직접 조합하며 snapshot, generation, lifecycle sequence와 subscribers를 자체 소유한다. Host 이외의 production caller가 이 Interface를 import하지 않는다. (`packages/runtime-codex/src/headless-codex-client-host.ts:1-18`, `packages/runtime-codex/src/headless-codex-client-host.ts:20-69`, `packages/runtime-codex/src/headless-codex-client-host.ts:143-162`; 위 repository 검색) | 기존 구현 자체는 forward-remove할 수 있다. 새 client의 compatibility target이 아니다. |
| `@ay-ple/runtime-codex` root export | internal production dependency | Private package의 `.` export가 `src/index.ts` 또는 `dist/index.js`를 가리키고, root index가 Host class·error·snapshot·event types를 export한다. (`packages/runtime-codex/package.json:2-12`, `packages/runtime-codex/src/index.ts:24-35`) | Host export 삭제는 repository caller migration 없이 가능하다. 단, 같은 root의 `CodexRuntimeAdapter`, status와 raw wrapper exports는 기존 Harness가 사용하므로 함께 제거하면 안 된다. (`packages/runtime-codex/src/index.ts:1-15`, `packages/runtime-codex/src/index.ts:36-72`) |
| Ignored local `packages/runtime-codex/dist` | unrelated | Local build output에는 archived Ticket 004의 `threadRef` 등 stale declaration/JS가 남아 있지만 `.gitignore`가 모든 `dist/`를 제외하고 tracked file count는 0이다. (`.gitignore:1-2`; 위 `git check-ignore`·`git ls-files` command evidence) | Source, package contract 또는 consumer evidence가 아니다. Removal 때 old output을 지운 clean build에서 Ticket 004 symbol이 재생성되지 않는지 검증해야 하며, stale declaration을 위해 compatibility를 유지하지 않는다. |
| `apps/server` composition | unrelated | Server는 `CodexRuntimeAdapter`, capability/status helper와 `CodexRawClientOptions`만 import하고 `AgentRuntimeKernel`에 adapter를 등록한다. (`apps/server/src/server.ts:3-15`, `apps/server/src/server.ts:42-75`) | Host 교체와 별도로 기존 Runtime Harness contract를 보존한다. Host adapter를 이 kernel에 억지로 끼우지 않는다. |
| `apps/inspector` | unrelated | Inspector가 runtime-codex에서 import하는 값은 `CodexCapabilitySlot` type 하나이며 RuntimeRun state와 HTTP/SSE Runtime Harness API를 사용한다. (`apps/inspector/src/App.tsx:1-15`, `apps/inspector/src/App.tsx:48-70`) | Host compatibility consumer가 아니다. Inspector 회귀만 별도 보호한다. |
| `ProductRuntimeLayout` | internal production dependency | Layout은 package root에서 export되고 Host가 첫 start 때 호출하지만, Host·layout tests·root export 밖의 production caller는 없다. Host는 성공 결과를 자체 cache한다. (`packages/runtime-codex/src/index.ts:16-23`, `packages/runtime-codex/src/headless-codex-client-host.ts:274-293`) | API shape는 compatibility constraint가 아니다. ADR 0006의 세 root 소유권을 보존하되 구현 재사용은 새 seam 확정 뒤 판단한다. |
| `CodexStdioTransport` | internal production dependency | Host가 package-internal transport를 생성하고 single observation pump로 소비한다. (`packages/runtime-codex/src/headless-codex-client-host.ts:12-18`, `packages/runtime-codex/src/headless-codex-client-host.ts:282-303`, `packages/runtime-codex/src/headless-codex-client-host.ts:394-435`) | Transport의 현재 class/observation Interface는 외부 compatibility 대상이 아니다. Exact ID routing·bounded queue·child cleanup test evidence는 selective-salvage 후보로 보존한다. |
| `CodexRawClient`·`CodexRuntimeAdapter` | unrelated | Adapter는 run마다 raw client를 만들어 initialize, thread/start와 turn/start를 수행하고 terminal 뒤 닫는 기존 Runtime Harness 구현이다. (`packages/runtime-codex/src/adapter.ts:43-79`, `packages/runtime-codex/src/adapter.ts:105-151`, `packages/runtime-codex/src/adapter.ts:214-245`) | Goal이 명시한 developer-only Runtime Harness 회귀 방지 대상이다. 새 Codex client와 동일 Interface로 만들 필요는 없지만 현 동작을 깨면 안 된다. |

`ProductRuntimeLayout`과 `CodexStdioTransport`는 기존 Host가 **의존하는** lower primitive이지, 기존 Host Interface를 보존하게 만드는 consumer가 아니다. 각각의 완료 ticket도 Host 이전에 독립 slice로 구현했다고 기록한다. (`docs/tickets/2026-07-12-headless-codex-client-host/001-product-runtime-layout-preflight.md:13-33`, `docs/tickets/2026-07-12-headless-codex-client-host/001-product-runtime-layout-preflight.md:71-77`, `docs/tickets/2026-07-12-headless-codex-client-host/002-bidirectional-stdio-transport.md:13-39`, `docs/tickets/2026-07-12-headless-codex-client-host/002-bidirectional-stdio-transport.md:109-117`)

### HTTP routes와 browser surface

| Surface | 분류 | 근거 | Clean-slate 판정 |
| --- | --- | --- | --- |
| Current Express routes | unrelated | 등록된 endpoint는 health, adapter/capability/status와 `/api/runtime/runs*`뿐이다. Host lifecycle, conversation, thread/turn ref 또는 product command route가 없다. (`apps/server/src/server.ts:82-102`, `apps/server/src/server.ts:102-195`, `apps/server/src/server.ts:195-253`) | 기존 route는 Runtime Harness compatibility로 보존한다. 새 browser adapter는 새 product seam에서 설계한다. |
| Current Inspector HTTP/SSE caller | unrelated | Inspector는 `/api/runtime/runs`, run event SSE, cancellation, health, adapters, Codex capabilities/status만 호출한다. (`apps/inspector/src/App.tsx:142-169`, `apps/inspector/src/App.tsx:227-234`, `apps/inspector/src/App.tsx:691-790`) | Host DTO나 event shape를 소비하지 않으므로 migration이 없다. |
| Planned product browser adapter | documentation/adoption claim | 기존 spec은 `/api/runtime/*`와 분리한 HTTP JSON command + SSE를 계획하고 Host의 atomic subscription을 그대로 소비하도록 요구하지만 아직 route나 React shell이 없다. (`docs/specs/2026-07-12-headless-codex-client-host.md:208-219`) | Transport 선택과 DTO는 새 source-grounded spec에서 다시 결정할 수 있다. Same-origin, loopback, raw protocol/secret 비노출 같은 제품 보안 제약은 별도로 보존한다. |

### Persisted·stored state

| Surface | 분류 | 근거 | Clean-slate 판정 |
| --- | --- | --- | --- |
| Host snapshot과 correlation state | internal production dependency | 현재 Host state는 in-memory `snapshot`, sequence, generation, lifecycle epoch와 Promise fields뿐이며 snapshot에는 status, generation, failure, recoverable만 있다. (`packages/runtime-codex/src/headless-codex-client-host.ts:42-47`, `packages/runtime-codex/src/headless-codex-client-host.ts:147-162`) | Persisted schema migration은 없다. Public lifecycle state shape도 삭제·교체할 수 있다. |
| Product runtime-home pair | internal production dependency | Layout은 `appDataRoot/codex/home`과 `appDataRoot/codex/sqlite`를 만들고 canonical containment를 검증하며, Host는 그 경로를 child environment에 넣는다. (`packages/runtime-codex/src/product-runtime-layout.ts:332-368`, `packages/runtime-codex/src/headless-codex-client-host.ts:644-660`) | Directory ownership은 ADR 0006에 따라 보존하지만 Host code 제거가 기존 native Codex state를 삭제해서는 안 된다. Host ref/event migration과는 무관하다. |
| Runtime Diagnostic History | unrelated | Store envelope는 `RuntimeRunLog`만 저장하고, parser가 허용하는 log key도 runId, adapter, prompt, status, output, events, timestamps와 optional error/debugLog뿐이다. (`apps/server/src/runtime-run-json-store.ts:23-31`, `apps/server/src/runtime-run-json-store.ts:117-143`, `packages/runtime-core/src/runtime-run-log.ts:66-103`) | Host snapshot/ref/event를 복원하거나 migration할 데이터가 없다. 기존 per-run persistence는 그대로 유지한다. |
| Browser local persistence | unrelated | Current Inspector state는 React memory와 server RuntimeRun API를 사용하며 Host ref용 local/session storage schema가 없다. Current source의 API 사용은 run/history/status에 한정된다. (`apps/inspector/src/App.tsx:48-70`, `apps/inspector/src/App.tsx:778-790`) | Host ref migration이 없다. 새 product transcript/workspace persistence는 별도 설계가 소유한다. |

기존 spec도 Host connection snapshot·pending interaction을 memory-only로 두고, product database·transcript persistence·workspace-local schema를 추가하지 않는다고 명시했다. (`docs/specs/2026-07-12-headless-codex-client-host.md:44-52`, `docs/specs/2026-07-12-headless-codex-client-host.md:84-86`, `docs/specs/2026-07-12-headless-codex-client-host.md:254-259`)

### Tests와 fakes

| Surface | 분류 | 근거 | Clean-slate 판정 |
| --- | --- | --- | --- |
| `headless-codex-client-host.test.ts` | self-oracle/test fixture | Test는 Host와 전용 fake를 직접 import하고 lifecycle sequence, generation, subscription, failure mapping, process cleanup과 environment filtering을 검증한다. (`packages/runtime-codex/src/headless-codex-client-host.test.ts:1-12`, `packages/runtime-codex/src/headless-codex-client-host.test.ts:21-104`, `packages/runtime-codex/src/headless-codex-client-host.test.ts:150-188`) | 기존 public shape를 자기 자신에게 증명하는 oracle이다. Host 제거와 함께 삭제하고 새 client의 source-conformance oracle로 교체한다. |
| `fake-headless-codex-client-host.ts` | self-oracle/test fixture | Fixture는 Host type·testing seam을 import하고 temporary package/app-data/workspace roots, fake binary와 journal을 만들어 `createHeadlessCodexClientHostForTesting()`을 호출한다. Package의 `./testing` subpath는 `fake-codex-app-server.ts`를 가리키므로 이 Host fake를 export하지 않는다. (`packages/runtime-codex/src/testing/fake-headless-codex-client-host.ts:1-14`, `packages/runtime-codex/src/testing/fake-headless-codex-client-host.ts:51-77`, `packages/runtime-codex/src/testing/fake-headless-codex-client-host.ts:78-125`, `packages/runtime-codex/package.json:19-23`) | Product consumer가 아니며 그대로 보존할 이유가 없다. Child/journal pattern만 새 tests가 필요할 때 재사용한다. |
| Layout contract tests | self-oracle/test fixture | Layout ticket은 canonical roots, pin, runtime-home pair와 Harness 비회귀를 독립적으로 검증했다고 기록한다. (`docs/tickets/2026-07-12-headless-codex-client-host/001-product-runtime-layout-preflight.md:36-54`, `docs/tickets/2026-07-12-headless-codex-client-host/001-product-runtime-layout-preflight.md:71-77`) | Host API oracle이 아니다. ADR 0006 invariant와 새 source-shaped spawn seam이 일치하는 부분만 유지한다. |
| Stdio transport tests와 fake | self-oracle/test fixture | Actual-child fixture는 four-direction routing, exact IDs, bounded observation queue, request validation과 child cleanup을 검증한다. (`packages/runtime-codex/src/testing/fake-codex-stdio-transport.ts:16-53`, `packages/runtime-codex/src/testing/fake-codex-stdio-transport.ts:65-120`, `docs/tickets/2026-07-12-headless-codex-client-host/002-bidirectional-stdio-transport.md:41-61`) | 현재 transport Interface를 고정하지 않되, pinned source/schema와 대조한 뒤 재사용 가능한 protocol evidence로 남긴다. |
| Existing fake App Server와 generic fake stdio support | self-oracle/test fixture | `@ay-ple/runtime-codex/testing`은 `fake-codex-app-server.ts`를 export하고, 이 entry는 generic `withFakeCodexStdioTransport`도 다시 export한다. App Server fixture는 `CodexRawClientOptions`를 제공해 existing Adapter/server tests가 사용하고, fake stdio는 transport tests의 독립 oracle이다. (`packages/runtime-codex/package.json:19-23`, `packages/runtime-codex/src/testing/fake-codex-app-server.ts:7-13`, `packages/runtime-codex/src/testing/fake-codex-app-server.ts:42-65`, `packages/runtime-codex/src/testing/fake-codex-app-server.ts:86-110`, `packages/runtime-codex/src/stdio-transport.test.ts:1-23`, `apps/server/src/codex-parity.test.ts:1-27`) | Host 전용 fake와 구분해 보존한다. 새 client test helper를 이 기존 Harness fixture와 억지로 통합하지 않는다. |

### Method inventory와 decision overlay

| Surface | 분류 | 근거 | Clean-slate 판정 |
| --- | --- | --- | --- |
| `initialize`·`initialized` decision | documentation/adoption claim | Sparse JSON은 두 method를 `integration: client-host`, `adoption: baseline`으로 표시한다. (`packages/runtime-codex/codex-method-decisions.json:2-6`, `packages/runtime-codex/codex-method-decisions.json:224-228`) | 기존 Host가 사라지는 commit에서 현재 integration claim도 제거하거나 새 seam의 실제 도달 단계로 바꾼다. Protocol method 자체의 필요성은 별도 source fact다. |
| Archived Ticket 004 integration rows | documentation/adoption claim | `jq`로 `integration == "client-host"`를 집계하면 active tree는 `initialize,initialized` 두 개이고 archive `f695f96572599d2deac41c09284406312db8767b`는 thread/turn/item/error/warning을 포함한 14개다. `git show <hash>:packages/runtime-codex/codex-method-decisions.json | jq ...`가 exact command evidence다. | Archive의 더 많은 row도 consumer가 아니라 당시 code-to-metadata claim이다. New client가 실제로 연결한 method만 새 vocabulary로 승격한다. |
| `client-host` integration vocabulary | documentation/adoption claim | Renderer type·allowlist와 generated legend가 `client-host`를 Headless Host Interface 도달 단계로 정의한다. (`packages/runtime-codex/scripts/render-codex-app-server-methods.ts:19-36`, `packages/runtime-codex/scripts/render-codex-app-server-methods.ts:70-76`, `packages/runtime-codex/scripts/render-codex-app-server-methods.ts:197-203`) | Superseding architecture에 맞게 stage vocabulary를 바꾸거나 일반 client/use-case adapter 단계로 재정의한다. 이름만 남겨 새 구조를 구 구조로 보이게 하지 않는다. |
| Generated method inventory | documentation/adoption claim | Inventory는 generated artifact이며 schema와 sparse decision을 합친다. 현재 `initialize`와 `initialized`만 `client-host`이고 thread/start·turn/start는 기존 raw-wrapper다. (`docs/architecture/codex-app-server-method-inventory.md:7-24`, `docs/architecture/codex-app-server-method-inventory.md:75-80`, `docs/architecture/codex-app-server-method-inventory.md:114-127`, `docs/architecture/codex-app-server-method-inventory.md:256-260`) | Generator/inventory mechanism은 유지하되 Host-specific legend와 실제 integration rows를 replacement에 맞춰 deterministic하게 재생성한다. |
| Baseline adoption rows | documentation/adoption claim | `thread/start`, `thread/resume`, `turn/start`, native notifications 등은 구현 여부와 별개인 제품 채택 판단으로 기록되어 있고, inventory 스스로 integration과 adoption을 구분한다. (`docs/architecture/codex-app-server-method-inventory.md:9-11`, `docs/architecture/codex-app-server-method-inventory.md:28-34`, `docs/architecture/codex-app-server-method-inventory.md:114-127`, `docs/architecture/codex-app-server-method-inventory.md:242-252`) | Source/use-case 재조사 결과가 나오기 전 일괄 유지나 일괄 삭제하지 않는다. Integration claim과 product adoption을 별도로 재검토한다. |

### Formal docs, spec, tickets와 backlog

| Surface | 분류 | 근거 | Clean-slate 판정 |
| --- | --- | --- | --- |
| ADR 0008 | documentation/adoption claim | 하나의 Headless Host Interface가 process lifecycle부터 thread 전환, event, transcript, approval, account/context, recovery까지 소유하도록 채택했다. (`docs/adr/0008-separate-headless-codex-client-host-from-product-ui.md:7-16`) | Generic Codex client와 concrete product/use-case adapter seam을 채택하는 새 ADR로 supersede한다. |
| Headless Host spec | documentation/adoption claim | Spec은 Host가 product layout, generation, correlation, normalized events, pending interaction과 Skills를 한 module에 소유하도록 하고, browser adapter도 이 Host subscription을 직접 소비하도록 정했다. (`docs/specs/2026-07-12-headless-codex-client-host.md:24-30`, `docs/specs/2026-07-12-headless-codex-client-host.md:58-68`, `docs/specs/2026-07-12-headless-codex-client-host.md:208-219`) | 전체를 replacement spec의 compatibility source로 사용하지 않고 supersede한다. Product invariant와 verified primitive evidence만 새 owner로 옮긴다. |
| Ticket 001·002 | documentation/adoption claim | 두 completed ticket은 layout과 transport primitive를 구현했고 기존 Harness를 유지했다. (`docs/tickets/2026-07-12-headless-codex-client-host/001-product-runtime-layout-preflight.md:5-17`, `docs/tickets/2026-07-12-headless-codex-client-host/002-bidirectional-stdio-transport.md:5-17`) | 완료 이력·test evidence로 보존하되 새 Interface를 제약하지 않는다. Implementation salvage는 Wayfinder ticket 014에서 결정한다. |
| Ticket 003 | documentation/adoption claim | Completed ticket은 현재 Host lifecycle과 its self-oracle을 도입했다고 기록하고 thread/turn/browser는 미구현으로 남겼다. (`docs/tickets/2026-07-12-headless-codex-client-host/003-initialized-host-lifecycle.md:13-17`, `docs/tickets/2026-07-12-headless-codex-client-host/003-initialized-host-lifecycle.md:71-79`) | Ticket 001·002와 마찬가지로 completed historical evidence로 보존한다. 다만 이 이력은 Host code의 forward removal이나 새 Interface를 제약하지 않는다. |
| Ticket 004–010 | documentation/adoption claim | Active branch에서 004는 `ready-for-agent`이고, 이후 tickets도 동일 parent spec의 미완료 계획이다. 004는 Host-generated refs를, 005는 interactionRef를, 006은 generation fencing/stale refs를 요구한다. (`docs/tickets/2026-07-12-headless-codex-client-host/004-long-lived-correlated-work.md:3-11`, `docs/tickets/2026-07-12-headless-codex-client-host/004-long-lived-correlated-work.md:24-35`, `docs/tickets/2026-07-12-headless-codex-client-host/005-pending-interaction-round-trips.md:3-15`, `docs/tickets/2026-07-12-headless-codex-client-host/006-connection-loss-and-restart-fencing.md:3-11`, `docs/tickets/2026-07-12-headless-codex-client-host/006-connection-loss-and-restart-fencing.md:27-37`) | 미구현 queue에서 제거하고 `State: wontfix`, `Next actor: none`으로 닫으며 본문에 `Superseded by <new spec>`을 기록한다. Ref/event shape를 미구현 acceptance criteria 때문에 보존하지 않는다. |
| Development backlog | documentation/adoption claim | Backlog는 ADR 0008 seam 채택을 완료로 표시하지만 Host 제품 기반 자체와 모든 하위 capability는 미완료다. (`docs/product/ay-ple-development-backlog.md:35-55`) | 완료된 product capability rollback은 없다. Host 명칭과 old seam 완료 표기를 새 ADR에 맞춰 고치고 사용자 capability 순서는 유지·재검토한다. |
| Product Brief와 ADR 0009의 Host 명칭 | documentation/adoption claim | Product Brief와 ADR 0009는 macOS local companion + browser 제공 형태를 설명하면서 Headless Host를 구현명으로 넣는다. (`docs/product/ay-ple-product-brief.md:65-71`, `docs/adr/0009-use-a-macos-first-local-web-app-product-path.md:7-14`) | macOS-first local web app 결정은 유지하고 implementation 명칭만 새 composition으로 바꾼다. |
| Package README·Runtime Harness map | documentation/adoption claim | README와 map은 현재 Host lifecycle, lower transport 연결과 두 handshake method의 integration status를 구현 사실로 기록한다. (`packages/runtime-codex/README.md:41-53`, `packages/runtime-codex/README.md:71-85`, `docs/architecture/runtime-harness-implementation-map.md:30-36`, `docs/architecture/runtime-harness-implementation-map.md:145-152`) | Host 제거·replacement와 같은 commit series에서 current-state 설명을 갱신한다. 기존 Harness 설명은 유지한다. |
| Root indexes와 AGENTS pointer | documentation/adoption claim | Root README, docs index와 AGENTS가 ADR 0008을 active navigation/operating source로 가리킨다. (`README.md:70-76`, `docs/README.md:87-93`, `AGENTS.md:49-55`) | 새 ADR/spec owner가 확정되면 pointer를 교체한다. |

## Ref/event semantics의 실제 도달 범위

Active tracked tree에서 `threadRef`, `turnRef`, `itemRef`, `interactionRef`, `stale_reference`에 대한 production search는 0개 파일이었다. Archived Ticket 004 Host는 thread/turn/item refs와 `stale_reference`를 자체 구현하지만 downstream caller나 stored schema는 없고, `interactionRef`는 archive에도 구현되지 않았다.

| Semantics | 문서 위치 | 판정 |
| --- | --- | --- |
| Host-generated thread/turn/item refs와 generation-scoped invalidation | `docs/specs/2026-07-12-headless-codex-client-host.md:129-148`, `docs/tickets/2026-07-12-headless-codex-client-host/004-long-lived-correlated-work.md:24-35`, `docs/tickets/2026-07-12-headless-codex-client-host/006-connection-loss-and-restart-fencing.md:27-37` | Active tree 구현 없음; archived Ticket 004 Host 자체의 implementation/test evidence는 있으나 downstream consumer·route·stored schema 없음 |
| `interactionRef`와 one-shot response | `docs/specs/2026-07-12-headless-codex-client-host.md:186-206`, `docs/tickets/2026-07-12-headless-codex-client-host/005-pending-interaction-round-trips.md:13-26` | Active tree와 archived Ticket 004 모두 구현·consumer·stored data 없음 |
| normalized Host event union | `docs/specs/2026-07-12-headless-codex-client-host.md:150-184` | documentation/adoption claim; current code에는 lifecycle `host_state_changed` 하나만 있음 |
| current lifecycle `host_state_changed` | `packages/runtime-codex/src/headless-codex-client-host.ts:49-55`, `packages/runtime-codex/src/headless-codex-client-host.ts:503-519`, `packages/runtime-codex/src/headless-codex-client-host.test.ts:62-95` | internal production state + self-oracle; downstream consumer 없음 |

Archived Ticket 004 implementation도 active compatibility surface가 아니다. Redesign branch는 shared `f335333f` tree에서 시작했고 Ticket 004 15 commits는 별도 fork branch와 tags로 보존되었으며 active ancestry에 넣지 않았다. (`docs/wayfinding/codex-native-client-redesign/tickets/001-preserve-evidence-and-establish-fixed-point.md:17-30`)

## Clean-slate가 반드시 보존해야 하는 것

아래 항목은 기존 Host consumer 때문이 아니라 상위 product/architecture decision 또는 현재 사용 중인 unrelated Runtime Harness 때문에 보존한다.

| 보존 항목 | Authority와 이유 | 구현 자유도 |
| --- | --- | --- |
| Codex App Server direct integration과 exact pin/schema 검증 | AY-PLE는 Codex 위에 얇은 제품 계층을 올리고 raw protocol은 통합 내부에 둔다. (`docs/adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md:7-24`, `packages/runtime-codex/README.md:5-21`) | 기존 Host Interface는 불필요하다. Source-shaped client module로 다시 구현할 수 있다. |
| Native workspace·AGENTS.md·Skills·thread/turn 사용 | 별도 범용 agent/workflow/memory engine을 만들지 않는 채택 결정이다. (`docs/adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md:11-16`, `docs/adr/0007-use-native-codex-composition-for-product-actions.md:7-17`) | First-party source pattern과 concrete use case에 맞춰 seam을 다시 정한다. |
| Product root ownership | package, app data와 user workspace를 분리하고 product `cwd`에 `process.cwd()` fallback을 쓰지 않는다. (`docs/adr/0006-separate-package-app-data-and-semester-workspace-roots.md:11-20`, `docs/architecture/codex-runtime-isolation.md:79-91`) | `ProductRuntimeLayout` class/function shape는 고정하지 않는다. 새 connection/composition이 필요한 subset을 사용할 수 있다. |
| Raw protocol/identity 비노출과 product-meaning conversion | Raw IDs는 통합 내부에 두고 제품에는 좁은 use-case Interface와 필요한 correlation만 제공한다. (`docs/adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md:14-15`, `docs/adr/0007-use-native-codex-composition-for-product-actions.md:14-17`, `docs/architecture/codex-native-product-composition.md:15-29`) | Native ID를 별도 generation-scoped UUID로 remap해야 한다는 뜻은 아니다. Product adapter가 실제로 필요한 opaque execution reference를 결정한다. |
| ModelingInvocation·ModelingRun 경계 | Product execution은 Recipe → Invocation → Run이고 raw thread/turn은 product receipt가 소유하지 않는다. (`docs/adr/0007-use-native-codex-composition-for-product-actions.md:11-17`, `docs/architecture/codex-native-product-composition.md:31-50`) | Generic chat client와 첫 ModelingInvocation tracer를 서로 다른 concrete adapter/use-case로 둘 수 있다. |
| macOS-first local companion + browser product path | 지원/QA 범위와 local companion/browser 제공 형태의 채택 결정이다. (`docs/adr/0009-use-a-macos-first-local-web-app-product-path.md:7-14`, `docs/product/ay-ple-product-brief.md:65-71`) | Headless Host라는 구현명과 atomic subscription shape는 바꿀 수 있다. |
| Existing Runtime Harness APIs, run log와 Inspector | 실제 server와 Inspector가 현재 사용하고 ADR 0005도 developer-only 기반으로 유지하기로 했다. (`docs/adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md:15-16`, `docs/adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md:26-28`, `apps/server/src/server.ts:42-75`, `apps/server/src/server.ts:82-253`) | 새 product client와 공유 abstraction을 강제하지 않는다. 기존 tests/routes/storage를 회귀시키지 않는다. |
| Method inventory의 schema-derived completeness | Inventory는 pinned schema와 sparse decisions를 분리해 method 존재와 adoption/integration을 기록한다. (`docs/architecture/codex-app-server-method-inventory.md:7-34`) | Host-specific integration stage와 rows는 새 architecture에 맞춰 바꾼다. |
| Existing native Codex state의 비파괴 원칙 | Root ownership상 native session/runtime state는 app data에 있고, 기존 spec도 rollback 시 native state를 임의 삭제하지 않도록 했다. (`docs/adr/0006-separate-package-app-data-and-semester-workspace-roots.md:13-20`, `docs/specs/2026-07-12-headless-codex-client-host.md:254-259`) | Ref migration은 없지만 forward removal script나 cleanup이 user app data를 삭제해서는 안 된다. |

## 삭제하거나 supersede할 수 있는 것

| 대상 | 판정 | 필요한 동반 작업 |
| --- | --- | --- |
| `HeadlessCodexClientHost` class, errors, snapshot/event/subscription types와 root exports | 삭제 가능 | Host source, `src/index.ts` export block과 Host-only test helper를 함께 제거한다. |
| Lifecycle `status` union, public `generation`, global `sequence`, atomic subscription과 exact failure-code mapping | 재설계 가능 | 새 client의 connection/process state와 product delivery model을 source evidence 및 concrete caller에서 다시 도출한다. |
| Host-generated `threadRef`·`turnRef`·`itemRef`·`interactionRef`, generation invalidation과 `stale_reference` | 조건 없이 폐기·재결정 가능 | Active tree에는 구현·route·persisted state·consumer가 없고, archived Ticket 004에도 Host self-implementation/test 외의 route·persisted state·consumer가 없으므로 data/API migration은 없다. Native branded identity와 product execution ref의 경계를 후속 identity ticket이 정한다. |
| `host_state_changed`와 계획된 normalized event union | 재설계 가능 | 새 connection/client event, conversation view, browser delivery를 한 전역 event bus로 미리 고정하지 않는다. |
| `createHeadlessCodexClientHostForTesting`, 전용 fake와 Host self-oracle | 삭제 가능 | Pinned source/schema/live fact를 검증하는 새 client fixture와 tracer-bullet contract test로 대체한다. |
| ADR 0008, old Headless Host spec과 미구현 Ticket 004–010 | supersede 필요 | 새 ADR/spec/tickets에서 source-shaped client, conversation/use-case adapter와 product boundary를 기록한다. 004–010은 `State: wontfix`, `Next actor: none`으로 닫고 본문에 `Superseded by <new spec>`을 남긴다. Completed Ticket 001–003은 당시 구현·검증의 historical evidence로 보존한다. |
| `client-host` inventory stage와 `initialize`·`initialized`의 current integration claim | 교체 필요 | Decision JSON, renderer vocabulary/test, generated inventory를 실제 새 seam에 맞춰 함께 갱신한다. |
| Product Brief·backlog·runtime map·package README·root indexes의 Host 명칭과 current-state claim | 교체 필요 | Product capability와 macOS/browser 결정은 유지하고 module 이름·완료 상태·구현 지도를 새 architecture에 정렬한다. |
| `ProductRuntimeLayout`과 `CodexStdioTransport`의 현재 API/implementation | compatibility 없이 교체 가능, 즉시 삭제는 보류 | 후속 source review가 first-party pattern 및 새 module requirements와 대조한 뒤 primitive 단위로 재사용·수정·폐기를 결정한다. 기존 tests는 evidence로 사용한다. |
| Ignored `packages/runtime-codex/dist`의 Ticket 004 output | 삭제·재생성 필요 | Host removal 뒤 old `dist`를 clean하고 `npm run build -w @ay-ple/runtime-codex` 결과에 removed Host/ref symbol이 없는지 확인한다. Git diff만으로 stale local declarations를 검증했다고 보지 않는다. |

## 최종 답

1. **Durable Host consumer는 없다.** Root export가 존재한다는 사실은 사용 중인 product contract를 뜻하지 않으며, repository app/server/browser/persistence 어느 곳도 Host나 ref/event semantics를 소비하지 않는다.
2. **Clean-slate replacement는 API 호환성을 제공할 필요가 없다.** 기존 Host class, lifecycle state machine, generated refs, event union과 self-oracle을 forward-remove해도 repository consumer migration은 없다.
3. **호환성 보호 대상은 옆의 실제 사용 경로다.** `CodexRawClient`·`CodexRuntimeAdapter`·`AgentRuntimeKernel`·`/api/runtime/*`·Runtime Diagnostic History·Inspector를 회귀시키지 않고, native Codex state를 임의 삭제하지 않아야 한다.
4. **Ticket 001/002 자산은 compatibility target이 아니라 salvage evidence다.** Root ownership, protocol exactness, boundedness와 cleanup 중 source-grounded 새 seam에 맞는 부분만 재사용한다.
5. **문서상 완료/채택 표시는 구현 caller보다 앞서 있다.** ADR 0008, old spec, 미구현 Ticket 004–010, `client-host` inventory stage, backlog와 README/map/index claims를 새 ADR/spec과 actual integration 상태에 맞춰 함께 supersede해야 한다. Completed Ticket 001–003은 historical evidence로 남긴다.
