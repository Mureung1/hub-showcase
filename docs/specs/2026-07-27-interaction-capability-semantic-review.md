# InteractionCapability 기반 Semantic Review

## Agent triage

- State: ready-for-ticketing
- Surface: local-spec
- Next actor: /to-tickets

## Problem Statement

AY-PLE의 First Assignment vertical은 Codex가 `propose_state_patch`를 호출하고 Browser가 제안을 Review한 뒤 사용자 선택을 같은 Turn으로 돌려주는 round trip을 증명했다. 그러나 current 구현은 이 interaction을 caller-supplied `requestKey`, workspace·Course identity, `ModelingRun`, durable `StatePatch`·`UserConfirmation`, revision-bound `SemesterModel` apply와 built-in `request_user_input`에 결합한다.

그 결과 App이 사용자 interaction뿐 아니라 학업 workflow와 file mutation까지 소유한다. 새로운 rich interaction을 추가할 때마다 Runtime, Server, Browser, Skill과 workspace store가 함께 바뀌며, MCP는 교체 가능한 Interface가 아니라 AY-PLE 내부 transaction protocol처럼 동작한다.

사용자가 원하는 경계는 더 단순하다. AY가 작업 중 판단이 필요한 순간에 표시할 내용과 허용할 응답을 MCP로 보내면, App이 typed UI를 보여주고, 사용자의 `accept | revise | reject`를 같은 MCP call에 돌려준다. 그 뒤 실제 file mutation과 다음 행동은 AY가 소유해야 한다.

## Solution

`propose_state_patch`를 다음 한 번의 transient interaction으로 재구성한다.

```text
AY가 active workspace의 실제 file을 읽음
→ mutation 전에 propose_state_patch 호출
→ STDIO Adapter가 authenticated Broker POST 하나를 엶
→ Broker가 evidence 전체를 atomic preflight
→ AY Chat에 inline Review card 하나를 append
→ User가 accept | revise | reject
→ 같은 held POST와 MCP call에 structured result 반환
→ AY가 result를 해석해 실제 file을 변경하거나 새 proposal을 보냄
```

Private `@ay-ple/interaction-mcp` package는 Codex-facing STDIO Adapter, capability request/result codec과 private Adapter↔Broker wire를 소유한다. `apps/server`는 Runtime credential, one-active-Turn lease, pending slot, evidence resolution과 Browser projection을 소유한다. `@ay-ple/product-contract`와 Chat Shell은 Browser-safe frame과 capability-specific card만 안다. `@ay-ple/codex-chat-runtime`은 capability 이름을 모르고 generic child environment와 MCP readiness만 제공한다.

이 Spec은 InteractionCapability Module과 product Review vertical을 소유한다. Pre-App native Bootstrap, canonical prepared-root handoff, Git 초기화, `WorkspaceRegistry`, project config 설치와 Workspace Runtime startup은 [User-owned SemesterWorkspace lifecycle Spec](./2026-07-27-user-owned-semester-workspace-lifecycle.md)이 소유한다. Interaction Module은 prepared temporary Git workspace fixture에서 먼저 독립 검증하고, production hard cutover는 두 Spec의 required-readiness gate가 합류한 뒤 수행한다.

## User Stories

1. As a student, I want AY가 제안한 변경을 Chat 안의 semantic before/after card로 검토하기를 원한다, so that raw Git diff나 App 내부 ID를 이해하지 않아도 된다.
2. As a student, I want 변경 근거가 active workspace의 exact content version인지 확인하기를 원한다, so that stale quote나 workspace 밖 file이 근거처럼 표시되지 않는다.
3. As a student, I want Review를 수락·수정 요청·거절하기를 원한다, so that AY가 다음 행동 전에 내 의도를 structured result로 받는다.
4. As a student, I want 수정 요청 뒤 기존 card가 기록으로 남고 새 제안이 새 card로 추가되기를 원한다, so that 서로 다른 MCP call의 chronology를 이해할 수 있다.
5. As a student, I want pending Review 중에는 다른 Turn을 시작하지 않되 전체 Turn은 중단할 수 있기를 원한다, so that 기다리는 call과 별도 입력이 충돌하지 않는다.
6. As a student, I want 수락 전에는 proposed file mutation이 적용되지 않기를 원한다, so that Review가 사후 보고가 아니라 실제 의사결정이 된다.
7. As a student, I want 정상 result 뒤 실제 file mutation을 AY가 수행하기를 원한다, so that App이 학업 workflow authority가 되지 않는다.
8. As a maintainer, I want Runtime이 generic child environment와 MCP readiness만 알기를 원한다, so that 새 InteractionCapability가 native lifecycle package를 바꾸지 않는다.
9. As a maintainer, I want InteractionCapability를 in-memory UI Adapter로 독립 검증하기를 원한다, so that academic store나 live provider 없이 round trip과 failure를 재현할 수 있다.
10. As a maintainer, I want timeout·interrupt·disconnect·Runtime terminal을 사용자 result와 구분하기를 원한다, so that continuity loss가 accept·reject로 오인되지 않는다.

## Current State and Constraints

### Current implementation

| 영역 | Current | Target |
| --- | --- | --- |
| MCP | `apps/server`의 `/api/product-mcp`가 process token과 `requestKey` session을 받고 tool success를 먼저 반환한다. | Built STDIO Adapter와 held Broker POST가 같은 MCP call의 terminal result까지 유지한다. |
| Correlation | Caller가 workspace·Course·revision과 private request identity를 조립한다. | Runtime binding과 host-owned active Turn lease가 workspace·operation correlation을 주입한다. |
| Review | Separate Review endpoint와 built-in `request_user_input`이 같은 결정을 나누어 운반하고 revision은 active patch를 교체한다. | Inline card 하나가 closed result를 반환하고 revise 뒤 fresh call은 새 card를 append한다. |
| Evidence | `RawMaterial` registry·snapshot과 material ID를 전제로 한다. | Active Runtime root의 optional workspace-relative evidence만 on-demand 검증한다. |
| Apply | Server가 durable confirmation transaction으로 `SemesterModel`을 갱신한다. | AY가 result 뒤 actual file을 바꾸며 App은 apply하지 않는다. |
| Runtime | Thread start가 private MCP URL·token과 literal tool allowlist를 product-specific input으로 받는다. | Project MCP config와 generic child env·readiness를 사용한다. |

### Governing decisions and split boundary

- [ADR 0019](../adr/0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md)이 one-call InteractionCapability, inline UI, transient result와 AY-owned apply를 소유한다.
- [AY–App Interaction Capability 아키텍처](../architecture/ay-app-interaction-capabilities.md)가 long-lived Module mapping을 소유한다.
- [ADR 0018](../adr/0018-adopt-user-owned-git-semester-workspaces.md)은 actual file과 Git history의 durable authority를 소유한다. 이 Spec은 그 root를 host input으로 소비할 뿐 선택·초기화하지 않는다.
- Current First Assignment Spec과 완료 ticket은 round trip·native lifecycle·Browser failure의 characterization donor다. Durable patch/apply와 replacement semantics는 target assertion이 아니다.
- Interaction foundation slice는 workspace lifecycle과 병렬로 구현할 수 있다. Production prepared-workspace startup은 이 Spec의 built Adapter·Broker·readiness가 먼저 green이어야 하고, 이 Spec의 final public cutover는 sibling Spec의 active Git workspace가 green이어야 한다. `/to-tickets`가 이 cross-spec blocking edge를 기록한다.

## Implementation Contract

### Module Responsibilities and Seams

| Module | 소유하는 책임 | 소유하지 않는 책임 |
| --- | --- | --- |
| `@ay-ple/interaction-mcp` | Built STDIO executable, `propose_state_patch` request/result codec, private HTTP codec와 safe error mapping | Listener, Browser UI, active workspace selection |
| `apps/server` Interaction Broker | Runtime credential·handshake, active product-turn lease 소비, single pending slot, evidence resolution, Browser projection·once-only settlement | Product operation admission, capability result 적용, Agent retry, Git command |
| `@ay-ple/codex-chat-runtime` | Generic child env 전달, fixed Runtime generation, MCP readiness observation와 bounded close | Capability schema, Broker route 의미, Browser frame |
| `@ay-ple/product-contract` | Browser-safe Review request/result/frame codec | Raw MCP, private credential, filesystem authority |
| `apps/chat-shell` | Transcript inline card, pending lock, result action과 Turn interrupt | Raw MCP response, App apply, Review ledger |
| `hub/skills/ay-ple-first-assignment/`와 workspace-installed copy | Review 요청 시점, result 해석, actual file mutation instruction | Skill copy·merge, Browser correlation, endpoint·token |

`apps/server`는 Interaction package와 Runtime을 조합하지만 두 package는 서로 import하지 않는다. Chat Shell은 계속 `@ay-ple/product-contract`만 shared production contract로 사용한다.

### Interfaces and Invariants

#### 1. Project declaration과 capability-neutral Runtime seam

Interaction MCP의 static project declaration은 다음 exact shape다.

```toml
[mcp_servers.ay_ple_interaction]
command = "<SemesterWorkspace-root-relative path to hub/packages/interaction-mcp/dist/stdio.js>"
env_vars = [
  "AY_PLE_INTERACTION_BROKER_URL",
  "AY_PLE_INTERACTION_BROKER_TOKEN",
  "AY_PLE_INTERACTION_RUNTIME_BINDING"
]
enabled_tools = ["propose_state_patch"]
required = true
```

- Built executable은 Node shebang과 executable mode를 가진 `packages/interaction-mcp/dist/stdio.js`다.
- Declaration에는 `cwd`, `tool_timeout_sec`, `args`, static `env`, endpoint·token·binding value와 native identity를 쓰지 않는다.
- Relative `command`는 Workspace Runtime의 exact Git root `cwd`에서 resolve한다. Absolute path, `npx`, global install, appData copy와 symlink를 사용하지 않는다.
- Pre-App native Bootstrap·Update가 declaration을 설치·수정하는 정책은 sibling workspace Spec이 소유한다. 이 Spec의 standalone actual test는 같은 shape를 prepared temporary Git fixture에 준비한다.
- Current pinned native MCP timeout `300`초를 사용한다. App countdown·연장·keepalive·자동 retry를 만들지 않는다.

Runtime의 public seam은 capability-neutral하다.

```ts
type CodexChildEnvironment = Readonly<Record<string, string>>

interface CodexMcpReadinessPort {
  waitForMcpServerReady(input: {
    readonly serverName: string
    readonly expectedTools: readonly string[]
    readonly signal: AbortSignal
  }): Promise<void>
}
```

- `childEnvironment`는 최대 `16` entries, key `^[A-Z_][A-Z0-9_]*$`, value당 `8 KiB`, aggregate `64 KiB`다.
- `HOME`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, `TMPDIR`, `PATH`, `PYTHON*`, dynamic-loader와 Runtime-owned key override는 spawn 전에 거절한다.
- Runtime은 env key 의미를 해석하지 않고 sanitized child environment와 `CodexConfig.env`로 전달한다. Sanitized `PATH`에는 current AY-PLE Node executable directory를 포함한다.
- `waitForMcpServerReady`는 same persistent generation의 official status를 high-level `serverName + tool roster`로 축소한다. Raw App Server response와 generated type을 package 밖으로 내보내지 않는다.
- Readiness consumer는 `ay_ple_interaction`과 exact `["propose_state_patch"]` roster를 요구한다. 다른 user MCP server는 이 check의 소유가 아니다.
- New Workspace Runtime path는 project config를 유일한 MCP declaration authority로 사용하고 `StartThreadInput.mcp`, `CodexPrivateMcpServerInput`, literal capability allowlist와 thread-start MCP override를 받지 않는다. Old current vertical의 matching legacy path는 expand 단계에만 유지하고 joint cutover에서 public/testing contract와 구현을 제거한다.

#### 2. `propose_state_patch` public MCP contract

```ts
type TextQuoteEvidenceRef = {
  readonly relativePath: string
  readonly contentDigest: string
  readonly locator: {
    readonly type: 'text_quote'
    readonly quote: string
    readonly occurrence: number
  }
}

type ProposeStatePatchRequest = {
  readonly summary: string
  readonly question: string
  readonly changes: readonly {
    readonly label: string
    readonly description: string
    readonly before?: string
    readonly after?: string
    readonly evidence?: readonly TextQuoteEvidenceRef[]
  }[]
}

type ProposeStatePatchResult =
  | { readonly outcome: 'accept' }
  | { readonly outcome: 'revise'; readonly feedback: string }
  | { readonly outcome: 'reject'; readonly feedback?: string }
```

| Field | Contract |
| --- | --- |
| Whole request | Compact JSON 최대 `1 MiB` |
| `summary`, `question` | Trim 후 non-empty, 각각 최대 `2 KiB` UTF-8 |
| `changes` | `1..32`, array order가 UI order |
| `label` | Trim 후 non-empty, 최대 `256` UTF-8 bytes |
| `description` | Trim 후 non-empty, 최대 `2 KiB` UTF-8 |
| `before`, `after` | 각각 최대 `8 KiB` UTF-8; 하나 이상 필수, 둘 다 있으면 exact same string 금지 |
| `evidence` | Change당 `1..8` when present, call 전체 최대 `16` refs |
| `relativePath` | POSIX workspace-relative, 최대 `4 KiB`; absolute, empty segment, `.`, `..`, backslash와 NUL 금지 |
| `contentDigest` | Whole-file SHA-256 lowercase hex `^[0-9a-f]{64}$` |
| `locator.quote` | Trim은 하지 않는 non-empty exact text, 최대 `16 KiB` UTF-8, normalization 없음 |
| `locator.occurrence` | Left-to-right 1-based `1..1024` safe integer |
| `feedback` | `revise`는 trim 후 non-empty 필수, `reject`는 optional, 최대 `8 KiB` UTF-8 |

Additional field를 거절한다. Input에는 `requestKey`, workspace·Course·store revision, patch ID, native thread·turn identity와 Browser interaction ID가 없다. `changes`는 Assignment schema, raw Git diff와 file command를 운반하지 않는다.

Normal success는 `structuredContent`에 exact result와 짧은 text content를 함께 반환한다. `busy`, invalid evidence, timeout, Turn interrupt, disconnect, Runtime terminal과 transport loss는 result union이 아니라 MCP failure다. Adapter는 자동 retry하지 않는다.

#### 3. Evidence resolution

- Authority는 authenticated active Runtime binding의 exact workspace root다. Caller path나 registry lookup으로 root를 선택하지 않는다.
- Path를 normalize·resolve하고 realpath가 root 안에 남는 regular file인지 검증한다. Traversal, symlink escape, missing target와 non-regular file은 실패다.
- Unique file 최대 `1 MiB`, call 전체 unique-file aggregate 최대 `8 MiB`다. 같은 file의 locator는 bytes를 한 번만 읽은 snapshot에서 검증한다.
- SHA-256은 BOM·line ending을 포함한 exact bytes다. Initial codec은 fatal UTF-8 text 하나이고 locator matching에서 leading UTF-8 BOM 하나만 제외한다.
- Quote와 1-based occurrence를 normalization 없이 검증한다.
- Browser projection은 relative path, digest, exact quote와 UTF-8-safe context before/after 각각 최대 `4 KiB`를 포함한다. 전체 evidence projection은 `256 KiB`, complete `review.requested` NDJSON frame은 `512 KiB`다.
- 모든 ref와 projection bound가 통과한 뒤 card 하나를 publish한다. 하나라도 실패하면 partial card, evidence drop과 evidence-free fallback 없이 whole call을 실패시킨다.
- Preview는 current card의 transient payload다. `RawMaterial` registry, reusable cache·snapshot과 durable evidence history를 만들지 않는다.

#### 4. Private Adapter↔Broker wire와 Turn binding

| 항목 | Contract |
| --- | --- |
| Route | `POST /api/_private/interaction-mcp` |
| Token | `Authorization: Bearer <AY_PLE_INTERACTION_BROKER_TOKEN>` |
| Binding | `X-AY-PLE-Runtime-Binding: <AY_PLE_INTERACTION_RUNTIME_BINDING>` |
| Admission | Raw peer loopback, constant-time token match, exact active binding |
| Credential | Generation마다 random `32` bytes base64url token과 `runtime_[0-9a-f]{32}` binding |
| Protocol | Strict JSON `protocolVersion: 1`, additional field 거절, raw request/response body 각각 `2 MiB` |
| Lifetime | Server memory와 Codex child env only; Browser·config·registry·log·error에 없음 |

Handshake request는 exact `{ protocolVersion: 1, kind: "handshake", serverName: "ay_ple_interaction", capabilities: ["propose_state_patch"] }`, response는 `{ protocolVersion: 1, kind: "handshake_accepted" }`다. Adapter는 env validation과 handshake 뒤에만 MCP initialize를 성공시킨다.

Capability request는 exact `{ protocolVersion: 1, kind: "capability_call", capability: "propose_state_patch", request }`, normal response는 `{ protocolVersion: 1, kind: "capability_result", capability: "propose_state_patch", result }`다. Inner request `1 MiB`와 wrapper를 수용하도록 outer raw bound는 `2 MiB`이고 양쪽이 decode 전에 적용한다.

Error envelope는 `{ protocolVersion: 1, kind: "error", code, displayMessage }`다. Safe code는 `invalid_request | forbidden | busy | evidence_invalid | interaction_interrupted | runtime_inactive | broker_unavailable`로 닫고 raw path·secret·native identity를 넣지 않는다.

- Runtime generation마다 pending slot 하나만 둔다. 두 번째 call은 Browser projection·queue·preemption 없이 immediate `busy`다.
- Startup handshake 외에 capability call 하나는 held HTTP POST 하나다. `202`, poll, callback, WebSocket, Unix socket, durable outbox와 replay가 없다.
- Workspace Spec이 보존하는 하나의 process-local `ProductOperationCoordinator`가 active product Turn admission을 atomic하게 직렬화한다. Prepared-workspace startup은 product operation lease가 아니며, Runtime replacement·shutdown은 active lease를 native terminal 또는 completed close authority까지 보존해 정산한다. Obsolete candidate eligibility를 다시 만들지 않고 Broker도 별도 Turn lock을 claim하지 않는다.
- Broker는 same generation의 active `product_turn` lease가 있을 때만 call을 받고 slot에 coordinator-issued `operation_[0-9a-f]{32}`와 internal thread identity를 capture한다. Caller-supplied operation identity는 금지한다.
- Adapter HTTP abort와 Browser disconnect는 current pending call만 failure로 정산하고 native Turn interrupt를 요청한다. Runtime-generation token·binding은 유지하며 이 call-level event만으로 outer product-turn lease를 해제하지 않는다.
- STDIO EOF는 required Adapter loss이므로 Broker intake를 닫고 pending call을 failure로 정산해 token·binding을 폐기한 뒤 Workspace Runtime teardown을 필수로 요청한다.
- Coordinator는 Turn start failure, authoritative native terminal 또는 completed Runtime close 뒤에만 outer lease를 once-only 해제한다. Valid binding에 active lease가 없으면 `runtime_inactive`다.
- Browser answer 뒤 held response write를 먼저 시도하고 terminal settlement를 once-only로 수렴한다. Delivery ambiguity를 success로 추정하거나 replay하지 않는다.

#### 5. Browser wire와 inline Review

```ts
type BrowserSafeTextQuoteEvidence = {
  readonly relativePath: string
  readonly contentDigest: string
  readonly quote: string
  readonly occurrence: number
  readonly contextBefore: string
  readonly contextAfter: string
}

type BrowserSafeSemanticReview = {
  readonly summary: string
  readonly question: string
  readonly changes: readonly {
    readonly label: string
    readonly description: string
    readonly before?: string
    readonly after?: string
    readonly evidence?: readonly BrowserSafeTextQuoteEvidence[]
  }[]
}

type ProductReviewResult =
  | { readonly outcome: 'accept' }
  | { readonly outcome: 'revise'; readonly feedback: string }
  | { readonly outcome: 'reject'; readonly feedback?: string }

type ProductReviewFrame =
  | {
      readonly type: 'review.requested'
      readonly operationId: string
      readonly interactionId: string
      readonly review: BrowserSafeSemanticReview
    }
  | {
      readonly type: 'review.resolved'
      readonly operationId: string
      readonly interactionId: string
      readonly result: ProductReviewResult
    }
  | {
      readonly type: 'review.failed'
      readonly operationId: string
      readonly interactionId: string
      readonly reason:
        | 'turn_interrupted'
        | 'timed_out'
        | 'runtime_terminated'
        | 'transport_failed'
    }
```

- Current Product Turn NDJSON을 delivery channel로 재사용한다. 별도 socket이나 Review event store를 만들지 않는다.
- `interactionId`는 `interaction_[0-9a-f]{32}`이고 current slot에만 결합한다.
- `POST /api/product/reviews/:interactionId` body는 exact `ProductReviewResult`다. `patchId`, `decisionKey`, revision과 continuation을 받지 않는다.
- Valid pending answer가 held Adapter response에 전달되면 endpoint는 body 없는 `204 No Content`를 반환한다. `review.resolved` NDJSON frame이 UI의 settled authority이며 legacy patch·revision·replay·continuation response는 없다. Duplicate·late·wrong answer 또는 delivery 전 interaction close는 Browser-safe `409`이고 두 번째 result를 만들지 않는다.
- `BrowserSafeSemanticReview`는 validated MCP request의 array order와 optional-field presence를 보존한다. 모든 Browser object codec은 additional field를 거절하고 MCP text/cardinality bounds, evidence projection `256 KiB`와 complete requested frame `512 KiB` bounds를 적용한다.
- Duplicate·late·wrong answer는 conflict이고 두 번째 result를 만들지 않는다.
- Pending card는 `accept | revise | reject`와 conditional feedback만 제공한다. Modal, drawer, dedicated page, dismiss와 fourth cancel이 없다.
- Pending 동안 composer, 새 Turn과 steer를 disable하고 전체 Turn interrupt만 유지한다.
- Normal result와 failure 뒤 card는 control 없는 read-only outcome이다. Revise 뒤 fresh MCP call은 새 interaction ID와 card를 append하고 previous card를 replace·reopen하지 않는다.
- Evidence preflight 전 failure는 requested frame을 만들지 않는다. Browser disconnect는 pending call과 Turn을 failure로 끝내지만 disconnected client에 failure frame delivery를 성공 조건으로 요구하지 않는다.
- Settled request/result를 workspace store나 App Review ledger에 persist하지 않고 reload 뒤 App store에서 복원하지 않는다.

#### 6. AY-owned mutation boundary

- Tracked built-in source는 `hub/skills/ay-ple-first-assignment/`다. 이 Skill은 actual file read, mutation-before-proposal 금지, result별 다음 행동과 meaningful checkpoint 요청을 domain workflow로 소유한다. Workspace에 copy·merge하는 lifecycle은 sibling Spec이 소유한다.
- Review가 필요한 mutation은 MCP call 전 actual file에 적용하지 않는다.
- `accept` 뒤 AY가 actual file을 변경한다. `revise`는 mutation authority가 아니며 반영한 새 proposal은 fresh call이다. `reject`는 proposed mutation을 적용하지 않는다.
- App은 result를 `workspace-state.json`이나 다른 file에 대신 적용하지 않고 Git command도 실행하지 않는다.
- 같은 결정을 built-in `request_user_input`으로 다시 묻지 않는다. General clarification과 native execution approval은 별도 Codex interaction으로 유지한다.
- Git checkpoint·dirty tree·protected metadata permission의 exact policy는 sibling workspace Spec이 소유한다. Interaction result는 native permission이나 Git success를 대신하지 않는다.

### Data and State Flow

#### Runtime startup assumption

1. Host가 shared loopback listener를 bind하고 private Broker route, fresh token·binding과 empty slot을 준비한다.
2. Host가 exact Git workspace Runtime을 three-value child environment로 시작한다.
3. Native project config가 built Adapter를 시작하고 handshake 뒤 initialize를 성공시킨다.
4. Runtime readiness port가 exact server·tool roster를 확인한다.
5. Workspace lifecycle owner가 이 readiness를 prepared root의 registry active commit에 필요한 input으로 사용한다.

#### Review round trip

1. Server가 Workspace-owned `ProductOperationCoordinator`에서 active product-turn lease를 claim하고 native Turn을 시작한다.
2. AY가 actual workspace file을 읽고 mutation 전에 tool을 호출한다.
3. Adapter가 request를 검증하고 authenticated held POST를 연다.
4. Broker가 slot을 claim하고 evidence 전체를 preflight한다.
5. App이 `review.requested`를 current operation stream에 append한다.
6. User action이 slot을 once-only settle한다.
7. Broker가 held response에 result를 쓰고 `review.resolved`를 append한다.
8. Adapter가 same MCP call에 structured result를 반환한다.
9. AY가 result를 해석해 actual file을 바꾸거나 fresh proposal을 보낸다.
10. Native terminal이 operation lease를 닫는다. App은 academic receipt를 만들지 않는다.

### Failure Behaviour

| Failure | Required behavior |
| --- | --- |
| Listener/Broker preparation failure | Runtime child 0; prepared-workspace startup owner에 failure 반환 |
| Missing/stale Adapter, ignored config, env·handshake·roster mismatch | Required readiness failure; degraded success 없음 |
| Invalid token/binding | `forbidden`, no Browser projection·credential detail |
| No active Turn lease | `runtime_inactive`, caller identity 합성 없음 |
| Second call | Immediate `busy`, existing card unchanged, queue 없음 |
| Invalid evidence | Whole-call failure before requested frame |
| Duplicate/late Browser answer | Conflict, second result 없음 |
| Turn interrupt | Pending card failure, held call failure, native terminal authority |
| Adapter HTTP abort | Current pending failure와 Turn interrupt 요청; generation credential과 outer lease는 유지 |
| STDIO EOF | Required Adapter loss로 intake close·credential revoke·Runtime teardown; completed close 전 outer lease 유지 |
| Browser disconnect | Pending failure와 Turn interrupt 요청, generation credential 유지, native terminal 전 outer lease 유지, replay 없음 |
| Native 300-second timeout | MCP failure, App timer·extension·automatic retry 없음 |
| Runtime terminal/replacement/App shutdown | Intake close, pending failure, credential revoke, bounded cleanup |
| Terminal delivery ambiguity | Success·file mutation을 App이 추정하지 않음 |
| AY file/Git failure after accept | Native Turn의 honest failure; App apply·commit success 합성 없음 |

### Compatibility and Migration

1. Current First Assignment round trip을 characterization test로 고정하되 durable patch/apply, replacement와 double confirmation은 target assertion에서 제외한다.
2. Interaction package, codec, Broker와 in-memory UI Adapter를 current graph 옆에 추가한다.
3. Generic child env·MCP readiness와 active Turn lease를 추가하고 temporary Git workspace의 project config로 real Adapter startup을 검증한다.
4. Sibling workspace Spec이 pre-App native Bootstrap과 canonical prepared-root Workspace Runtime·required readiness를 연결한다.
5. Joint product gate가 green이면 sibling Workspace Spec의 active prepared-workspace surface와 이 Spec의 inline Review를 public composition에 atomic하게 hard cutover한다. Candidate/init routes나 Browser chooser를 중간 compatibility surface로 추가하지 않는다. App-owned `Course`, material refresh·selection·preview routes/types/UI, First Assignment action/retry, `RawMaterial`, `ModelingRecipe`·`ModelingInvocation`·durable `ModelingRun`, durable `StatePatch`·`UserConfirmation`, revision-bound apply와 old current MCP override를 compatibility alias 없이 제거한다.

Workspace v2/v3 bytes, registry, Runtime payload와 canonical root cleanup은 이 Spec이 바꾸지 않는다. Joint cutover 전 rollback은 current source와 matching current store/runtime graph를 한 단위로 사용한다.

## Implementation Decisions

| Decision | Rationale |
| --- | --- |
| Private `@ay-ple/interaction-mcp` package | Stable executable·typed contract를 Server lifecycle과 Runtime package에서 분리한다. |
| Shared listener의 held POST | One MCP call continuation을 표현하면서 daemon·poll·replay state를 피한다. |
| Generation별 single pending slot | Ordering·priority·preemption을 App workflow로 만들지 않는다. |
| Host-owned one-active-Turn lease | MCP payload에 native·Browser identity를 노출하지 않고 operation을 안전하게 결합한다. |
| Current Turn NDJSON 재사용 | Existing transcript ordering·disconnect seam과 inline card를 사용한다. |
| Text quote evidence 하나 | Exact TXT prior art로 path·digest·locator honesty를 먼저 닫는다. |
| `accept | revise | reject` only | User decision과 execution/continuity failure를 분리한다. |
| Revise는 fresh call·new card | Once-only settlement와 transcript chronology를 보존한다. |
| App apply 없음 | Actual file·Git과 native Turn을 durable authority로 유지한다. |
| Native default 300초 | 검증된 필요 없이 App timer state machine을 추가하지 않는다. |

## Testing Decisions

### Highest practical seam

가장 높은 반복 가능한 seam은 **real `@ay-ple/interaction-mcp` codec + real Server Broker + in-memory UI Adapter**다. Valid request 하나가 evidence preflight 뒤 UI projection 하나를 만들고, one user action이 같은 held request의 exact result로 돌아가며, busy·interrupt·disconnect·terminal은 normal result 없이 실패해야 한다.

그 위의 product seam은 **real Chromium → Vite → shared listener → deterministic Runtime/Broker → prepared temporary Git workspace**다. Sibling의 generic operation coordinator, native project context와 checkpoint policy를 소비하고 fixture는 pre-App Bootstrap 결과와 같은 exact root·project config를 공급한다.

### Required proof

- Request/result·private wire·Browser frame exact codec과 모든 byte/cardinality bound
- Evidence containment, symlink, size, digest, UTF-8, quote occurrence와 all-or-nothing projection
- Broker handshake, token/binding, active lease, single slot, held response, once-only answer와 Adapter HTTP abort·STDIO EOF를 포함한 every continuity failure
- Built STDIO executable/shebang/mode, env validation, one call→one POST→one result
- Generic Runtime child env, protected-key rejection, Node PATH와 exact MCP readiness
- Browser pending lock, interrupt, settled card, revise→fresh append와 no ledger
- Proposal-before-mutation, accept 뒤 actual file change, revise/reject no mutation과 App apply 0
- Joint cutover 뒤 removed academic routes/types/store consumer와 Browser bundle의 private credential 0

Implementation 완료 시 `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, `npm run test:e2e`, docs links, exact SDK/Runtime/Node validation과 target local-provider Server trace를 통과한다. UI는 1440×900과 1920px-class desktop에서 직접 확인한다.

## Out of Scope

- Canonical appData/Runtime root migration
- `workspace-state.json` v4, `WorkspaceRegistry`, pre-App native Bootstrap과 launch-time prepared-root selection
- Init Skill, `AGENTS.md`, Skill copy와 project config merge/update policy
- Native project trust·discovery와 exact-root permission policy
- Git status/history UI, auto-commit hook와 clean-tree gate
- Multiple simultaneous Review, queue·priority·preemption과 replay
- Modal·dedicated approval page, arbitrary schema renderer와 generic App event bus
- Settled Review hydration store, thread list/read/resume와 multi-client synchronization
- PDF/page, image, HWP/HWPX, Office와 audio evidence
- Generic user-facing native approval center
- Public distribution, mobile·small-screen과 Windows·Linux

## Open Questions

None.

## Further Notes

두 Spec은 backlog의 같은 상위 capability 아래에서 하나의 dependency graph로 처리한다. 이미 완료된 Interaction foundation과 workspace roots·registry·generic coordinator 결과는 보존하고, `/to-tickets`는 미완료 ticket의 edge만 prepared-root startup에 맞게 교정한다.

Cross-spec gate는 다음 세 가지뿐이다.

1. Runtime-neutral MCP seam은 exact Git-root native context를 소비한다.
2. Prepared-workspace startup은 built Adapter·Broker와 required MCP readiness를 소비한다.
3. Joint public cutover는 prepared-root reopen/recovery와 temporary-workspace Interaction trace가 모두 green이어야 한다.

One-call held response와 once-only settlement를 horizontal transport/UI tickets로 찢지 않고, obsolete candidate/init lifecycle을 새 Interaction ticket으로 옮기지 않는다.
