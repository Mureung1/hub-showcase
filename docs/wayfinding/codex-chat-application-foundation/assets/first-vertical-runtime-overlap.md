# First-vertical runtime overlap

이 문서는 Wayfinder ticket `005`의 bounded research 결과다. [004 runtime envelope](../tickets/004-first-assignment-runtime-envelope.md#answer)가 요구한 첫 Assignment vertical의 observable outcome만 exact pin, official Python SDK, first-party donor behavior와 current adapter에 대조한다. 이 문서의 disposition과 `keep | replace | delete | probe-needed`는 006이 falsify할 후보이며, 최종 선택은 008이 소유한다.

## 결론

- 새 Codex runtime semantics를 처음부터 만들 근거는 없다. Exact App Server와 official Python SDK가 Account read, explicit `cwd`, structured `SkillInput`, `outputSchema`, native thread·turn identity, interrupt와 authoritative `turn/completed`를 이미 제공한다.
- Current `CodexChatRuntime`은 controlled process environment, exact bundle verification, acceptance-first native identity, strict notification projection, bounded queue·deadline과 process-group cleanup을 이미 겹쳐 소유한다. 이는 자동 survivor가 아니지만 first vertical을 검증할 수 있는 상당한 conformance 자산이다.
- Current adapter는 text-only Chat tracer라서 Account preflight, selected TXT·versioned Recipe·validated arguments, `outputSchema`, parsed/schema-validated result를 전달하지 못한다. Current Server·Browser의 process-global current thread/turn과 네 route도 first vertical의 product contract가 아니다.
- `SkillInput`은 discoverable·enabled skill의 exact path를 선택하는 native seam이다. 그러나 `name`·`path` 외 Recipe version·arguments 필드가 없으므로 Recipe metadata/argument validation은 product adaptation이다. Local `@file`은 first-party TUI에서 selected path를 `TextInput`에 넣는 client convention이고, 사용자가 관찰한 Codex App은 같은 선택을 Markdown link/chip으로 표현한다. 어느 쪽도 `MentionInput`이 TXT 본문을 attachment로 주입한다는 뜻은 아니다.
- `Sandbox.read_only`는 exact generated policy에서 `networkAccess: false`이고 current exact-local test도 이 effective policy를 관찰한다. 반면 exact Python client의 default approval handler는 unexpected command/file approval을 `accept`하므로, “예상하지 않은 request를 자동 승인하지 않는다”는 004 invariant는 아직 충족됐다고 주장할 수 없다. 같은 pin의 `codex exec`는 그런 server request를 명시적으로 reject하는 first-party behavior donor다.
- Current offline exact-native trace와 deterministic fake는 출발점이지만 004의 representative semantic input, schema-valid source-linked output, fresh isolated roots 3회, credential-missing `blocked`와 한 command cleanup gate를 아직 증명하지 않는다. 특히 current exact-native test는 local Responses provider를 사용하므로 “live provider가 없는 offline gate”이지 문자 그대로 provider가 없는 successful model trace는 아니다.

## Source와 provenance

| 조사 층 | Exact evidence | 이번 문서에서의 용도 |
| --- | --- | --- |
| Pinned App Server | `openai/codex@8c68d4c87dc54d38861f5114e920c3de2efa5876`, tag `rust-v0.144.4`, Apache-2.0 ([pin ledger](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md#L3-L16)) | Native owner, protocol·processor와 primary test |
| Official Python SDK | 같은 commit의 immutable source snapshot, ordered patch `0001`–`0005`, SDK distribution `0.0.0.dev0`, native `openai-codex-cli-bin==0.144.4` ([patch ledger](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md#L18-L45)) | Current public seam과 package-owned exact behavior |
| Production runtime artifact | Patched SDK wheel, exact native wheel, standalone Python과 AY-PLE bridge의 digest/provenance ledger ([artifact ledger](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md#L61-L74)) | Current actual-child 경계와 custom overlap |
| First-party surfaces | 같은 pinned checkout의 TUI와 `codex exec` | Skill selection, account gate, headless request 처리와 one-shot alternative behavior |
| Current adapter | `packages/codex-chat-runtime`, `apps/server`, `apps/chat-shell`의 source와 tests | `keep | replace | delete | probe-needed` 후보 |
| Latest official surface | Current [Codex App Server](https://learn.chatgpt.com/docs/app-server), [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk), [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) 문서 | Upgrade/alternative lens만 제공하며 exact `0.144.4` 사실을 덮어쓰지 않음 |

실사용자 credential, 실제 `~/.codex`, live provider와 filesystem/network mutation은 조사하지 않았다. Current custom boundary가 조사 중 바뀌지 않았는지 확인하기 위해 offline Node unit 51개와 bridge protocol unit 5개만 실행했으며, exact actual-child·local-provider·live-provider trace는 실행하지 않았다.

## Required outcome coverage matrix

| 004 observable outcome | Exact owner·public seam·first-party evidence | Current adapter overlap | Assumption delta와 후보 disposition | Falsifying evidence |
| --- | --- | --- | --- | --- |
| Account Readiness 직후 admission | App Server `account/read` 결과는 `account`와 `requiresOpenaiAuth`를 가지며 SDK `AsyncCodex.account()`가 public seam이다 ([response](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L6296-L6302), [API](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L363-L371)). Pinned TUI도 startup read를 `Authenticated | NotAuthenticated` gate로 사용한다 ([first-party read](../../../../references/openai-codex/codex-rs/tui/src/app_server_session.rs#L385-L400)). | Bridge는 account method를 노출하지 않고 Server `ready`는 runtime 준비만 뜻한다 ([current status](../../../../apps/server/src/codex-chat-service.ts#L75-L90), [003 finding](account-config-adoption-surface.md#account-readiness-lifecycle-matrix)). | Native fact는 `direct reuse`, turn 전 no-execution gate는 `adapt`. Full OAuth UX는 필요하지 않다. | Not-ready fixture에서 App Server journal에 `thread/start`·`turn/start`가 하나라도 남거나, `account()`가 required auth 여부를 판별하지 못하면 기각한다. |
| Explicit `SemesterWorkspace`와 exact `cwd` | SDK `thread_start(cwd=...)`와 per-turn `turn(cwd=...)`가 public seam이고 ([thread](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L374-L413), [turn](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L666-L703)), App Server가 `cwd`를 turn settings에 적용한다 ([processor](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/turn_processor.rs#L484-L528)). Native test는 두 turn의 `cwd` 변경을 command working directory까지 검증한다 ([test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/turn_start.rs#L2533-L2675)). | Server가 six-env workspace를 existing readable directory로 검증하고 bridge가 같은 fixed workspace를 thread와 turn에 전달한다 ([preflight](../../../../apps/server/src/codex-chat-config.ts#L109-L205), [bridge](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L368-L433)). | Exact `cwd`는 `direct reuse`; product-selected invocation 경계는 `adapt`. Native resolver는 path syntax/absolute conversion만 수행하므로 missing·wrong folder의 pre-accept existence check는 current/product owner가 유지해야 한다 ([resolver](../../../../references/openai-codex/codex-rs/app-server/src/request_processors.rs#L556-L562)). | Missing path가 native acceptance에 도달하거나 journaled effective `cwd`가 canonical selected workspace와 다르거나 ambient `process.cwd()`로 성공하면 기각한다. |
| Selected TXT source 목록 | Exact `UserInput` union에는 text, image, local image, skill, mention만 있고 generic local TXT/file item은 없다 ([wire union](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L4839-L4897)). Exact TUI의 `@file` search는 selected token을 path text로 치환하며 ([composer](../../../../references/openai-codex/codex-rs/tui/src/bottom_pane/chat_composer.rs#L2161-L2179), [path insertion](../../../../references/openai-codex/codex-rs/tui/src/bottom_pane/chat_composer.rs#L2512-L2535)), primary test는 `@ma`가 submitted `src/main.rs` text가 되는 것을 고정한다 ([test](../../../../references/openai-codex/codex-rs/tui/src/bottom_pane/chat_composer.rs#L9080-L9122)). App Server fuzzy search도 file `path`를 반환할 뿐 body를 turn에 attach하지 않는다 ([result](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/common.rs#L1541-L1562)). | Current `StartTurnInput`과 bridge command는 `{threadId,text}`뿐이다 ([Node contract](../../../../packages/codex-chat-runtime/src/contract.ts#L131-L152), [bridge contract](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/protocol.py#L26-L67)). | Validated workspace-relative path 또는 Markdown file link를 semantic text에 넣고 read-only filesystem으로 읽게 하는 first-party convention은 `adapt`. `MentionInput`은 TXT attachment로 전제하지 않는다. Selected-only use와 source reference가 증명되지 않으면 그때 `candidate residual`이다. | 두 selected TXT와 한 unselected control TXT를 둔 trace에서 selected fact/reference가 없거나 unselected control fact가 결과에 나타나면 path/link mapping을 기각한다. `MentionInput`을 함께 보낼지 여부는 이 trace의 선행조건이 아니다. |
| Versioned Recipe instructions·validated arguments | SDK `SkillInput(name,path)`는 public typed input이며 exact SDK integration test가 workspace `.agents/skills/.../SKILL.md` body의 native injection을 증명한다 ([input type](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_inputs.py#L29-L45), [SDK test](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/tests/test_app_server_inputs.py#L81-L126)). Native resolution은 enabled catalog의 exact skill path만 선택하고 missing/disabled path를 무시한다 ([resolver](../../../../references/openai-codex/codex-rs/core-skills/src/injection.rs#L138-L205), [invalid-path test](../../../../references/openai-codex/codex-rs/core-skills/src/injection_tests.rs#L150-L191)). | Current text-only bridge는 `SkillInput`을 전달하지 않는다. | Discoverable Recipe body injection은 `direct reuse` 후보, current command 확장은 `adapt`. `SkillInput`에 version/arguments field가 없으므로 Recipe identity/version pin과 argument schema validation은 AY-PLE product adaptation이다. Skill catalog installation/lifecycle만 probe 전에는 확정하지 않는다. | Exact version의 Recipe path가 다른 version/동명 skill로 resolve되거나 invalid argument가 native turn을 시작하거나 structured selection이 injection되지 않으면 기각한다. |
| Structured output contract와 schema-valid result | `AsyncThread.turn(..., output_schema=...)`가 public seam이고 ([API](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L666-L703)), App Server가 schema를 `final_output_json_schema`로 전달한다 ([processor](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L528)). Native primary test는 Responses request의 strict JSON Schema format을 확인한다 ([test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/output_schema.rs#L20-L103)). | Bridge는 `outputSchema`를 보내지 않고 completed agent message text만 projection한다 ([turn call](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L415-L456), [projection](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L87-L162)). | Native constraint는 `direct reuse`; bridge 전달과 final-response JSON parse는 `adapt`. SDK collector가 `final_response: str | None`을 반환하므로 product-side JSON·schema·source-reference validation도 thin product adaptation이다 ([collector](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_run.py#L21-L33), [settlement](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_run.py#L102-L135)). | Malformed JSON, schema mismatch 또는 selected source reference 누락을 success로 받거나 schema가 upstream request에 strict하게 전달되지 않으면 기각한다. |
| One invocation과 native correlation·acceptance | `turn/start` response가 native UUIDv7 turn ID와 `inProgress` status를 반환하고 ([type](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L8399-L8452)), processor가 submission ID를 response turn ID로 사용한다 ([owner](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L568)). | Bridge는 SDK response 뒤 exact native thread/turn ID를 acceptance result로 보내고 Node·HTTP가 `turn.accepted`를 먼저 projection한다 ([bridge acceptance](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L415-L456), [HTTP acceptance](../../../../apps/server/src/codex-chat-http.ts#L240-L264)). | Native identity는 `direct reuse`; product `ModelingInvocation`/`ModelingRun` receipt와 one-to-one mapping은 `adapt`. Current process-global lease를 product cardinality로 채택하지 않는다. | 한 product receipt가 둘 이상의 native turn을 시작하거나 native ID 없는 accepted state가 생기거나 acceptance 전 failure를 accepted로 기록하면 기각한다. |
| Authoritative terminal·progress·interrupt | Native `TurnStatus`는 `completed | interrupted | failed | inProgress`; handle stream은 matching `turn/completed`까지 지속하고 `interrupt()` public seam을 제공한다 ([status](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L4825-L4829), [handle](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L767-L795)). Primary test는 interrupt response 뒤 별도 terminal `Interrupted`를 확인한다 ([test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/turn_interrupt.rs#L32-L140)). | Bridge projection은 세 terminal status만 허용하고 interrupt result를 terminal로 합성하지 않는다 ([projection](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L138-L162), [interrupt](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L499-L517)). | Terminal/interrupt는 `direct reuse`; `preparing | running | stopping | settled` product phase projection은 `adapt`. | Interrupt ack 시점에 settled되거나 matching native terminal 없이 success/failure를 합성하거나 terminal이 두 번 정산되면 기각한다. |
| Process/transport loss, unknown outcome와 no auto-retry | Native terminal만 authority다. SDK collector는 matching terminal이 없으면 error를 내고 failed native status도 error로 보존한다 ([collector](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_run.py#L60-L99)). | Node runtime은 dispatched pre-response mutation loss를 `unknownOutcome: true`로 reject하고, accepted stream loss는 한 `runtime.failed`로 끝낸다 ([pre-response tests](../../../../packages/codex-chat-runtime/src/runtime.actual.test.ts#L410-L474), [post-accept tests](../../../../packages/codex-chat-runtime/src/runtime.actual.test.ts#L580-L614)). 자동 retry는 없다. | Strict settlement은 `direct reuse + adapt`. `mutationOutcomeKnown: true`는 native mutation acceptance가 알려졌다는 뜻이지 execution result가 알려졌다는 뜻이 아니므로 accepted runtime loss를 product `unknown outcome`으로 변환하는 seam은 `candidate residual`. | Accepted process kill 뒤 product가 success/failed terminal을 추정하거나 같은 invocation을 자동 재전송하거나 새 `ModelingRun` 없이 retry하면 기각한다. |
| Read-only·no-network와 unexpected permission request | `ApprovalMode.deny_all`은 native `never`, `Sandbox.read_only`는 `ReadOnlySandboxPolicy(networkAccess=false)`로 mapping된다 ([approval](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_approval_mode.py#L13-L35), [sandbox](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_sandbox.py#L15-L73), [policy type](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/generated/v2_all.py#L3459-L3464)). | Current exact-local test는 effective `never`·`readOnly`·`networkAccess:false`를 확인한다 ([policy probe](../../../../packages/codex-chat-runtime/src/local-provider.actual.test.ts#L129-L140)). 그러나 SDK default handler는 unexpected command/file approval을 `accept`한다 ([handler](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L773-L779)). | Policy는 `direct reuse`; actual denial과 unexpected request fail-closed는 `probe-needed` 성격의 `candidate residual`. 같은 pin `codex exec`의 explicit reject behavior는 `narrow port` 후보 ([first-party reject](../../../../references/openai-codex/codex-rs/exec/src/lib.rs#L1655-L1789)). | Injected unexpected approval에 current client가 accept를 보내거나 write/network side effect가 관찰되거나 no-network escape가 성공하면 004 permission claim을 기각한다. |
| Bounded lifecycle, fresh restart와 reproducible gate | SDK context/`close()`는 child lifecycle seam을 제공한다 ([SDK lifecycle](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L289-L338)). | Runtime은 graceful → `SIGTERM` → `SIGKILL` process-group cleanup을 bound하고 ([cleanup](../../../../packages/codex-chat-runtime/src/runtime.ts#L921-L976)), actual tests가 idempotent close와 stubborn descendant reap을 고정한다 ([tests](../../../../packages/codex-chat-runtime/src/runtime.actual.test.ts#L692-L746)). Exact-local test는 bundle→Python→SDK→native와 policy를 한 번 검증한다 ([trace](../../../../packages/codex-chat-runtime/src/local-provider.actual.test.ts#L46-L157)). | Lifecycle behavior는 `adapt` 또는 current supervision `keep` 후보다. Semantic fixture·three-layer·3-run·one-command orchestration은 006이 검증할 `probe-needed` gap이며 별도 runtime surface 비교를 요구하지 않는다. | Fresh root 반복 간 thread/account/output state가 섞이거나 cleanup 뒤 process group이 남거나 credential 부재가 skip/pass가 되거나 세 층을 한 documented action으로 재현하지 못하면 기각한다. |

## Semantic input 판정

### Selected TXT는 `MentionInput` attachment가 아니라 path/link text convention이다

Exact Python SDK는 `MentionInput(name,path)`를 generic-looking public type으로 노출하지만, official App Server examples와 pinned TUI가 structured `Mention`을 사용하는 주된 대상은 `app://`·`plugin://` resource다 ([App Server examples](../../../../references/openai-codex/codex-rs/app-server/README.md#L794-L829), [TUI mapping](../../../../references/openai-codex/codex-rs/tui/src/chatwidget/input_submission.rs#L228-L293)). Local `@file` completion은 이 경로와 다르다. File search가 선택한 `@token`을 workspace-relative path string으로 치환하고, submit할 때 그 string은 ordinary `UserInput::Text`에 남는다. 공백이 있는 path만 quote한다 ([insertion](../../../../references/openai-codex/codex-rs/tui/src/bottom_pane/chat_composer.rs#L2161-L2179), [plain-path rule](../../../../references/openai-codex/codex-rs/tui/src/bottom_pane/chat_composer.rs#L2512-L2535)).

Codex App의 file chip이 사용자 메시지에서 `[label](path)` Markdown link로 보이는 동작도 이 모델과 양립한다. Link는 선택된 path를 text 안에서 정확히 보존하는 client presentation이며 file bytes를 별도 native item으로 주입한다는 계약이 아니다. Pinned TUI의 `mention_codec`이 만드는 Markdown link는 app/plugin/skill binding의 history round-trip용이고 arbitrary local file ingestion owner가 아니다 ([history codec](../../../../references/openai-codex/codex-rs/tui/src/mention_codec.rs#L12-L81), [tool-path filter](../../../../references/openai-codex/codex-rs/tui/src/mention_codec.rs#L190-L205)).

그러므로 [현재 composition 문서의 `SourceSelection → mention` mapping](../../../architecture/codex-native-product-composition.md)은 direct-reuse 사실이 아니라 006이 검증할 가설로 낮춘다. 005에서 이를 다른 target Interface로 교체하지 않는다.

첫 vertical에서 가장 좁은 evidence-backed 가설은 다음과 같다.

1. Product가 `SourceSelection`의 canonical workspace-relative TXT path와 digest를 검증한다.
2. Runtime input은 선택된 path를 workspace-relative Markdown link 또는 명시적 path text와 source-linking instruction으로 전달한다.
3. Codex는 exact `cwd`의 read-only filesystem을 통해 source를 읽는다.
4. `outputSchema`와 product validator가 selected source reference를 강제한다.

이는 아직 `adapt` 가설일 뿐이다. 006은 unselected control file을 포함한 negative trace로 “선택한 두 source가 실제로 읽혔고 결과 reference가 그 목록에 속한다”는 outcome을 검증해야 한다. SourceSelection은 접근 권한 경계가 아니므로 unselected file의 단순 존재를 failure로 보지 않으며, selected input으로 주장되지 않은 control fact가 결과에 섞일 때 mapping을 기각한다. 이 가설이 실패해도 곧바로 custom file-ingestion protocol을 설계하지 않고 exact native의 다른 public input/context seam 또는 first-party host를 다시 비교한다.

### Recipe는 Skill body와 product metadata로 나뉜다

`SkillInput`의 body injection은 exact SDK test까지 있어 direct reuse 가능성이 높다. 그러나 native selection의 identity는 enabled skill catalog의 path이고, public input에는 `name`과 `path`만 있다. 따라서 다음은 Codex가 아니라 product-owned validation이다.

- Recipe stable identity와 version
- Recipe argument schema, validated argument value와 invocation receipt
- Recipe version이 가리키는 immutable instruction body/digest
- 이 Recipe·argument·source set이 어느 `ModelingRun`을 만들었는지의 persistence

006은 app-managed isolated root에서 exact Recipe가 discoverable·enabled 상태로 injection되는지 먼저 probe한다. 실패하면 `SkillInput`을 흉내 내는 새 protocol을 만들기 전에 explicit instructions 또는 first-party skill installation pattern과 assumption delta를 비교한다.

### `outputSchema`는 result validation을 대체하지 않는다

Native `outputSchema`는 model request의 final assistant message를 strict schema로 constrain한다. 하지만 SDK의 `TurnResult.final_response`는 여전히 문자열이고 current bridge도 completed text만 전달한다. 따라서 product boundary는 다음을 별도로 확인해야 한다.

- completed native turn과 matching final response인지
- UTF-8 JSON parse가 성공하는지
- exact versioned Assignment schema를 통과하는지
- 모든 source reference가 selected `SourceSelection`에 속하는지
- parse/schema/reference failure를 runtime native failure와 구분하는지

앞의 세 항목은 native capability 재구현이 아니라 thin validation adaptation이다. `StatePatch`, Review와 `SemesterModel` mutation은 004가 정한 대로 runtime 밖이다.

## Settlement와 permission의 중요한 delta

### Accepted loss의 `mutationOutcomeKnown`은 result-known이 아니다

Current Node runtime은 response 전 dispatched mutation loss를 `unknownOutcome: true`로 표현하지만, native turn ID를 받은 뒤 process가 죽으면 active stream에 `runtime.failed { mutationOutcomeKnown: true }`를 보낸다 ([runtime settlement](../../../../packages/codex-chat-runtime/src/runtime.ts#L795-L824)). 여기서 true는 `turn/start` mutation이 acceptance됐다는 사실을 안다는 의미다. 그 turn의 결과가 completed·failed·interrupted 중 무엇인지 안다는 의미가 아니다.

따라서 first vertical의 headless seam은 두 사실을 분리해야 한다.

| Fact | Product 해석 |
| --- | --- |
| Native acceptance 전 mutation outcome도 모름 | Accepted `ModelingRun` result를 만들지 않고 request outcome unknown으로 반환 |
| Native turn ID를 받았지만 authoritative terminal을 잃음 | Native correlation을 보존한 accepted execution의 `unknown outcome` |
| Matching `turn/completed` 수신 | Native status 그대로 authoritative terminal |

이 adaptation은 새 error taxonomy를 요구하지 않는다. 006은 representative trace에서 정확히 이 세 분기를 관찰하고 자동 retry가 없음을 증명한다.

### Python SDK default approval은 fail-closed가 아니다

Current bridge는 high-level `AsyncCodex(config)`를 생성하며 approval handler를 주입할 public constructor option이 없다 ([high-level constructor](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L289-L301), [bridge construction](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py#L89-L127)). Underlying `CodexClient`는 handler injection을 지원하지만 default가 command/file approval `accept`다 ([lower-level constructor](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L193-L221), [default](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L773-L834)).

`approvalPolicy=never`가 정상 경로에서 request를 만들지 않는다는 가정만으로 unexpected-request invariant를 증명할 수 없다. 같은 exact pin의 first-party `codex exec`는 command, file change, user input, dynamic tool, permissions request를 JSON-RPC error로 명시적으로 reject한다. 006은 current SDK path에서 injected request가 실제로 어떻게 처리되는지 negative control로 고정해야 하며, 실패하면 008이 adopted Python SDK path 안의 upstream/public extension, lower-level seam 또는 narrow port 중 가장 얇은 선택을 한다.

## Current custom responsibility candidate ledger

| Current custom responsibility | 005 후보 | 이유·falsifier |
| --- | --- | --- |
| Exact source/bundle provenance와 controlled child env | `keep` | SDK spawn은 caller env를 소비하므로 ambient authority를 차단하는 현재 boundary가 유효하다. Exact digest drift 또는 ambient secret leakage가 관찰되면 기각 ([provenance](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md#L61-L74), [controlled env test](../../../../packages/codex-chat-runtime/src/runtime.actual.test.ts#L89-L168)). |
| Workspace existence·directory·access preflight | `keep` | Native `cwd` seam은 재사용하되 missing workspace를 acceptance 전에 닫는 current check가 004 invariant를 담당한다. Product-selected path를 받을 수 없으면 `replace`로 재평가. |
| Runtime `configured | starting | ready | failed`를 Account Readiness로 사용 | `replace` | Runtime readiness와 `account/read`는 다른 fact다. Not-ready에서도 native turn이 시작되면 즉시 기각. |
| Text-only `start_turn` private command와 네-route Chat tracer | `replace` | Recipe/source/output contract를 표현하지 못한다. Current trace의 identity/settlement behavior는 보존하되 tracer shape는 product API가 아니다. |
| Strict bridge command decode, response-last routing, native ID matching과 bounded queues/deadlines | `keep` | Semantic command로 확장해도 malformed/duplicate/wrong-scope fail-closed와 one-settlement property는 유효하다. Official seam이 동일 behavior를 conformance test로 완전히 대체하면 삭제 후보로 재평가. |
| Agent-message-only notification projection | `replace` | Structured result validator에 final response는 필요하지만 general activity projection은 불필요하다. Exact terminal·error identity를 잃지 않는 좁은 projection으로 비교. |
| `deny_all`·`read_only` 전달만으로 permission invariant 완료 주장 | `probe-needed` | Effective policy는 검증됐지만 unexpected approval default와 actual network denial이 남는다. Injected approval 또는 network negative control이 실패하면 완료 주장 삭제. |
| SDK patch `0001`–`0005`와 five-command bridge | `probe-needed` | Current strict settlement의 근거지만 first vertical에 모두 필요한지, exact first-party `codex exec`/newer public SDK가 대체하는지는 006–008 evidence 전 결정하지 않는다. |
| Node→Python→native process-group supervision | `keep` 후보 | Current persistent topology에서는 bounded cleanup을 실제 제공한다. Official SDK lifecycle과 006 trace만으로 같은 bounded cleanup을 증명하면 custom layer의 `replace | delete` 후보로 재평가. |
| Process-global current thread/turn lease와 Browser disconnect 즉시 auto-interrupt | `delete` 후보 | 첫 headless invocation의 required invariant가 아니며 product receipt/lifecycle을 Browser transport에 결합한다. 단, native one-active-turn invariant나 explicit interrupt semantics를 삭제한다는 뜻은 아니다. |
| Deterministic text-only runtime fake | `replace` | Native ID/terminal regression은 재사용할 수 있지만 semantic input, Account gate, schema validation과 honest unknown을 모델링하도록 first-vertical fake contract가 필요하다. |
| Exact-local provider trace | `keep` and extend | Exact bundle·native ID·interrupt·policy·cleanup을 이미 검증한다. Representative TXT·Recipe·schema와 fresh-root repetition이 추가되지 않으면 004 gate로 승격하지 않는다. |

`delete`는 current custom behavior에만 적용한다. ADR 0011의 supervised lifecycle·native identity와 004의 required outcome을 제거한다는 뜻이 아니며, 008의 final disposition을 선결하지 않는다.

## Reproducible verification gap

| 004 evidence layer | Current evidence | 아직 없는 proof | 006 handoff |
| --- | --- | --- | --- |
| Deterministic contract trace | `DeterministicCodexChatRuntime`이 exact scripted text input, call log, native IDs, terminal과 interrupt를 검증한다 ([fake](../../../../packages/codex-chat-runtime/src/testing.ts#L20-L182)). | Account preflight, selected source·Recipe·output schema mapping, schema/reference validator, accepted crash→unknown, duplicate retry 방지 | First-vertical semantic contract fake를 가장 얇게 만들거나 throwaway harness에서 같은 observable trace를 고정 |
| Exact pinned actual-child, non-live trace | `local-provider.actual.test.ts`가 production bundle→Python bridge→official SDK→exact native→local Responses harness, nominal/interrupt/follow-up/policy/cleanup을 한 test에서 확인한다 ([test](../../../../packages/codex-chat-runtime/src/local-provider.actual.test.ts#L46-L157)). | Account gate, two TXT, Skill Recipe, `outputSchema`, parsed result, crash/unknown, repeatability | Local provider가 schema-conforming Assignment output과 request journal을 제공하도록 bounded probe. “provider-free”는 external/live provider 없음으로 해석하며 local deterministic provider 사용을 명시 |
| Opt-in live-provider representative trace | 과거 point-in-time manual T0 기록만 있고 current first-vertical automated gate가 아니다 ([historical note](../../../../apps/chat-shell/README.md#L42-L42)). | Explicit isolated auth, fresh roots, two TXT, exact Recipe/schema, 3 consecutive passes, blocked credential state, cleanup/non-leakage | 하나의 opt-in command가 setup→3 runs→validate→cleanup을 수행하고 credential 없음은 nonzero/`blocked`로 보고 |

Root `npm test`는 package unit/provenance suites를 조합하지만 `test:local-provider`와 live-provider representative trace를 포함하지 않는다 ([root scripts](../../../../package.json#L8-L21), [runtime scripts](../../../../packages/codex-chat-runtime/package.json#L25-L50)). 따라서 현재 script roster 자체는 004의 “하나의 문서화된 command”를 충족하지 않는다.

## First-party donor와 latest official evidence

### Exact pinned `codex exec`

같은 `rust-v0.144.4` checkout의 `codex exec`는 별도 외부 donor가 아니라 exact first-party comparison surface다.

- `-C/--cd`, `--sandbox`, `--output-schema`, `--json`, `--ephemeral`, `--ignore-user-config`와 `--ignore-rules`가 있다 ([shared options](../../../../references/openai-codex/codex-rs/utils/cli/src/shared_options.rs#L8-L62), [exec options](../../../../references/openai-codex/codex-rs/exec/src/cli.rs#L9-L85)).
- Explicit `-C`가 없으면 current directory로 fallback하므로 first vertical wrapper는 항상 canonical workspace를 전달해야 한다 ([cwd resolution](../../../../references/openai-codex/codex-rs/exec/src/lib.rs#L311-L317)).
- `outputSchema`를 App Server turn에 전달하고 in-process App Server client를 시작한다 ([input mapping](../../../../references/openai-codex/codex-rs/exec/src/lib.rs#L760-L799), [schema loader](../../../../references/openai-codex/codex-rs/exec/src/lib.rs#L1798-L1821)).
- Unexpected interactive request를 모두 reject하는 fail-closed behavior가 있다 ([request handling](../../../../references/openai-codex/codex-rs/exec/src/lib.rs#L1655-L1789)).

반면 exact exec initial input은 prompt text와 local images로 구성되고 structured `SkillInput`/selected TXT receipt API를 직접 노출하지 않는다. CLI JSONL event와 process exit를 004의 native acceptance·unknown contract로 정확히 map할 수 있는지도 이 문서에서 증명하지 않았다. 그러므로 `codex exec`는 unexpected request를 fail closed하는 behavior donor일 뿐, adopted Python SDK runtime과 local-web product surface를 대신하는 후보가 아니다.

### Current official guidance

Current official documentation은 App Server를 authentication·history·approvals·streamed events가 필요한 deep product integration용으로, SDK를 jobs/CI/automation용으로 구분한다 ([App Server](https://learn.chatgpt.com/docs/app-server), [SDK](https://learn.chatgpt.com/docs/codex-sdk)). Current `codex exec` 문서는 non-interactive pipeline, default read-only, `--json`, `--output-schema`와 explicit automation auth를 안내한다 ([Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)).

이 guidance는 adopted Python SDK가 automation-oriented first vertical에 부적합하다는 근거를 제공하지 않는다. First-party source는 006의 conformance donor로만 사용하며 별도 one-shot product surface 비교를 만들지 않는다. Latest main/docs에 존재하는 transport·auth·event 기능도 current `0.144.4` public seam으로 간주하지 않는다. Upgrade가 residual을 지운다는 주장은 exact newer pin·license·provenance·conformance trace가 있을 때만 가능하다.

## 006–008에 넘길 precise probes

| Probe | 통과 기준 | 실패 시 의미 |
| --- | --- | --- |
| Account admission | `account/read` not-ready에서 native start journal 0, ready에서만 실행 | Gate adaptation 필요 또는 chosen surface 부적합 |
| Workspace negative control | missing/invalid은 pre-accept failure, valid exact canonical `cwd`, ambient fallback 0 | Product preflight seam 필요 |
| Recipe selection | Exact version skill path/body가 한 번만 injected, invalid version/argument는 native start 전 failure | `SkillInput` adoption assumption 기각 또는 version/arg residual 확인 |
| TXT selection | Selected two files의 facts와 selected-list reference가 schema result에 존재하고 unselected control을 selected evidence로 주장하지 않음 | Text/path mapping 불충분; 다른 official input/context seam 재조사 |
| Structured result | Upstream request에 strict schema, final JSON parse·schema·reference validation, malformed result는 non-success | Thin validator residual 확인 |
| Acceptance/terminal | Product receipt ↔ native thread/turn 1:1, terminal exactly once | Current correlation seam 부적합 |
| Interrupt | Ack 뒤 running/stopping 유지, matching terminal 뒤만 settled | First-party/native behavior projection 오류 |
| Crash/unknown | Pre-accept, accepted process loss, authoritative terminal 세 분기와 retry 0 | Honest recovery residual 확인 |
| Permission | Effective read-only/no-network, injected unexpected request rejected, write/network side effect 0 | Current high-level SDK의 fail-closed gap을 확인하고 008에서 narrow port·alternative disposition을 결정 |
| Repeatability | Fresh isolated roots로 offline gate 자동 반복, opt-in live gate 3회, cleanup 후 process/root leakage 0; no credential은 `blocked` | 004 runtime sufficiency 미충족 |

005는 confirmed runtime residual을 승인하지 않는다. Source shape만으로 확정할 수 있는 것은 Recipe version/args, `SourceSelection` receipt, product `ModelingRun` correlation과 final JSON/reference validation이 AY-PLE product adaptation이라는 책임 경계다. Approval handler, path/link behavior, process topology와 exact adapter survivor는 006 trace 뒤 008이 판정하며, 그 전에는 Module이나 API shape를 정하지 않는다.

## 실행한 검증

| Command | 결과 | 증명 범위 |
| --- | --- | --- |
| `npm run test:node-unit -w @ay-ple/codex-chat-runtime` | 51/51 pass | Current exact provenance verifier, strict decode·queue settlement와 deterministic native-ID lifecycle regression이 조사 중 변하지 않았음 |
| `npm run test:bridge-unit -w @ay-ple/codex-chat-runtime` | 5/5 pass | Current five-command bridge의 exact decode, frame bound와 request-lease regression이 조사 중 변하지 않았음 |

Exact actual-child, `test:local-provider`, live-provider와 materialized runtime gate는 실행하지 않았다. 위 unit 결과는 004 representative trace나 permission·SourceSelection 가설을 증명하지 않으며, 그 probe는 006이 소유한다.

## Exclusions

- General multi-conversation, transcript catalog/replay, two Browser client, rich activity view, full approval center와 Desktop packaging은 조사하지 않는다.
- `StatePatch`, Review, `UserConfirmation`, `SemesterModel` schema·persistence와 3-pane Browser UI를 설계하지 않는다.
- Direct App Server adapter, Python SDK extension, `codex exec` wrapper 중 하나를 선택하지 않는다.
- Current patches·bridge·Server·Browser code를 수정하거나 production interface를 제안하지 않는다.
- Latest official docs 또는 main branch capability를 exact `0.144.4` adoption evidence로 섞지 않는다.
- 006 prototype과 008 disposition을 대신 해결하지 않는다. 이 문서는 각 가설의 falsifier와 bounded handoff만 제공한다.
