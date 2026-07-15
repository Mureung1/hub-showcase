# Upstream provenance

이 directory는 MIT-licensed `ai-sdk-provider-codex-cli`의 수정 가능한 AY-PLE fork다. 최초 source snapshot은 아래 upstream tree를 `git archive`로 완전히 복제했으며 `.git` metadata와 ignored/generated output만 제외했다.

| 항목                  | 값                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------ |
| Package               | `ai-sdk-provider-codex-cli@2.1.1`                                                    |
| Repository            | `https://github.com/ben-vargas/ai-sdk-provider-codex-cli.git`                        |
| Tag                   | `v2.1.1`                                                                             |
| Commit                | `fc4a97f518af6eb380e9ecd67fa78940bffdf155`                                           |
| Git tree              | `67c448a431e74161d616a7bb1235811a936f2ea6`                                           |
| Original author       | Ben Vargas                                                                           |
| License               | MIT, `Copyright (c) 2025 Ben Vargas`                                                 |
| Immutable reference   | [`references/ai-sdk-provider-codex-cli`](../../references/ai-sdk-provider-codex-cli) |
| Original Codex range  | `@openai/codex ^0.144.0`                                                             |
| Original locked Codex | `@openai/codex 0.144.1`                                                              |

원본 [`LICENSE`](LICENSE)는 변경 없이 fork와 함께 보존한다. Exact source identity와 import metadata의 machine-readable 사본은 [`upstream/baseline.json`](upstream/baseline.json), 이후 semantic patch는 [`upstream/PATCHES.md`](upstream/PATCHES.md)가 소유한다. Git tree ID가 최초 donor file roster와 content의 권위다.

## Current fork pin

최초 donor dependency 범위와 lock은 위 표의 immutable baseline 사실로 유지한다. Fork patch `FP-0001`은 격리된 fork의 package-local default와 official source oracle만 다음 exact stable release로 갱신했다. Caller가 선택하는 global, `PATH`, `npx` 또는 custom binary는 이 default와 verifier 범위 밖이다.

| 항목                                        | 값                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Package                                     | `@openai/codex@0.144.4`                                                                           |
| npm integrity                               | `sha512-DTHzYatlKq9dw55E0/HsbK4tRCEKabuJ10ybbqpsG8gVv/kvwEdg3Z4OI3cvLXKa21xkIa4lkGlZoO/HmqmFFw==` |
| Official tag                                | `rust-v0.144.4`                                                                                   |
| Annotated tag object                        | `632c07017ed17f00ca6d911b754683dee785af69`                                                        |
| Exact source commit                         | `8c68d4c87dc54d38861f5114e920c3de2efa5876`                                                        |
| Official source oracle                      | [`references/openai-codex`](../../references/openai-codex)                                        |
| Machine-readable package/generator contract | [`upstream/codex-pin.json`](upstream/codex-pin.json)                                              |

`0.144.0`에서 `0.144.4`까지 donor-relevant surface를 감사한 결과 generated stable/experimental TypeScript·JSON Schema, Rust `app-server-client`와 Python external stdio client에는 semantic delta가 없고, App Server method implementation delta는 `thread/resume`의 persisted reasoning-effort 보정이다. Upstream 전체 repository에는 TUI, Guardian, code-mode와 installer 변경도 존재하지만 이번 fork patch가 채택하는 client mechanics나 protocol contract는 아니다. 이 scoped source audit는 현재 fork pin의 adoption 근거이지 legacy `packages/runtime-codex`의 pin이나 method integration 상태를 자동 변경하지 않는다.

## Generated contract snapshot

Fork patch `FP-0002`는 package-local binary가 생성한 complete experimental TypeScript·JSON Schema tree를 [`src/app-server/protocol/generated`](src/app-server/protocol/generated)에 package-private snapshot으로 보존한다. TypeScript는 upstream raw byte를 유지하고 JSON Schema는 object key만 재귀 정렬하며 array order는 보존한다. [`manifest.json`](src/app-server/protocol/generated/manifest.json)은 exact package와 source commit, generator argv, tree fingerprint, JSON Schema method roster와 TypeScript-only method를 기록하고 timestamp나 machine-local path를 포함하지 않는다.

```bash
npm run generate:codex-protocol
npm run verify:codex-generated
```

`generate:codex-protocol`은 tracked tree를 의도적으로 교체하는 write command이고, `verify:codex-generated`는 OS temp directory에서 다시 생성해 tracked file roster와 byte를 비교하는 non-mutating gate다. 두 command 모두 package·lock·installed binary exactness와 experimental fingerprint를 먼저 확인한다. Stable generated output은 tracked하지 않고 [`codex-pin.json`](upstream/codex-pin.json)의 fingerprint evidence로 유지한다.

두 command는 임시 directory 아래 격리된 `CODEX_HOME`과 `CODEX_SQLITE_HOME`을 사용한다. Generated TypeScript 전체는 package strict typecheck에 포함하지만 upstream raw output이므로 직접 수정하지 않고 Prettier·ESLint 대상에서는 제외한다. Raw generated tree는 package root export나 npm package file roster에 넣지 않으며, runtime ingress에 필요한 JSON Schema만 package-private decoder bundle에 포함한다.

Generated JSON Schema는 runtime validation에 사용할 wire roster이고 generated TypeScript와 의도적으로 다를 수 있다. Exact pin에서 JSON Schema는 `getAuthStatus`, `getConversationSummary`, `gitDiffToRemote`와 internal-only `rawResponseItem/completed`를 제외한다. 이 차이는 manifest에 명시하며 method를 수기로 schema에 복원하지 않는다.

OpenAI generated artifact의 license와 attribution은 [`upstream/openai-codex/LICENSE`](upstream/openai-codex/LICENSE)와 [`upstream/openai-codex/NOTICE`](upstream/openai-codex/NOTICE)에 exact source oracle에서 복사해 보존하고 npm package에도 함께 싣는다. Donor root [`LICENSE`](LICENSE)의 MIT license는 변경하지 않는다.

## Sole-ingress generated decoder

Fork patch `FP-0003`은 [`decodeInboundMessage`](src/app-server/protocol/inbound-codec.ts)를 package-private seam으로 추가하고 donor의 sole stdout JSONL reader인 `AppServerRpcClient.handleLine()`을 이 seam에 연결한다. Decoder는 generated `JSONRPCMessage`, experimental `ServerRequest`, `ServerNotification` JSON Schema만 Ajv에 정적으로 묶고, method roster도 schema의 `oneOf` branch에서 직접 파생한다. Generated TypeScript union은 type-only `Extract<>`로 method discriminant를 제한하며 wire field를 다시 선언하지 않는다.

Ajv는 `coerceTypes`, `useDefaults`, `removeAdditional`을 모두 끈 채 동작하므로 inbound object를 변경하지 않는다. Generated numeric format은 JSON parsing 뒤 관찰 가능한 signed/range boundary를 검증하며, 서로 인접한 unsafe `int64`/`uint64` lexeme 구분은 후속 raw-byte parsing과 safe `RequestId` patch로 남긴다. Exact known notification은 기존 notification pipeline으로 전달되고 invalid-known notification은 method만 경고한 뒤 drop한다. Exact known Server request는 기존 handler로 전달되고 invalid-known request는 original ID에 `-32602 Invalid params`를 한 번 응답한다. Unknown request와 notification은 donor의 기존 generic path를 유지한다. Correlated response/error의 pending lookup, process lifecycle, `readline` framing, writer/backpressure, thread context, router, session과 turn controller는 이 patch에서 변경하지 않는다.

Exact JSON Schema 밖의 `skill/requestApproval`, `reasoningTextDelta`, `reasoningSummaryTextDelta`는 generated coverage로 위장하지 않고 legacy compatibility validator를 명시적으로 거친다. JSON Schema에서 의도적으로 제외된 `rawResponseItem/completed`는 generic unknown notification으로 남는다. Donor의 [`validators.ts`](src/app-server/protocol/validators.ts)와 기존 compatibility fixture는 legacy regression surface이며 production ingress authority가 아니다. Method-specific response result validation, remaining outbound generated-type adapter migration, safe directional `RequestId`와 transport hardening은 후속 patch가 소유한다.

## Generated internal client contract

Fork patch `FP-0004a`는 [`generated-client-contract.ts`](src/app-server/protocol/generated-client-contract.ts)에 donor production code가 실제로 호출하는 `initialize`, `thread/start`, `thread/resume`, `turn/start`, `turn/interrupt`, `model/list` 여섯 method의 package-private type dictionary를 둔다. Request params는 generated `ClientRequest` union에서 method discriminant로 `Extract<>`해 파생하고, correlated response association은 각 generated response type을 직접 import해 기록한다. Generated tree에 method가 존재한다는 이유만으로 나머지 method를 채택하거나 builder·decoder를 선제 구현하지 않는다.

이 dictionary의 response association은 compile-time provenance다. Generated TypeScript가 일부 serde default/optional field를 runtime JSON Schema보다 좁게 표현하므로 schema-valid response를 generated response type으로 cast하는 근거가 아니다. 후속 response decoder는 exact generated JSON Schema를 runtime authority로 사용하고 필요한 normalization을 별도로 결정해야 한다.

`AppServerRpcClient`는 이미 exact shape인 internal pending `RequestId`, `initialized` notification과 `turn/interrupt` params에서 이 contract를 소비한다. 기존 public handwritten types, generic `request<T>()`/`notify()`, emitted JSON bytes와 package declaration은 유지한다. Initialize·thread·turn·model outbound adapter, method-specific response validation과 legacy authority 제거는 독립된 후속 checkpoint다. Donor process, router, request context, session과 turn controller mechanics는 변경하지 않는다.

## Generated outbound request builder

Fork patch `FP-0004b`는 [`outbound-client-request.ts`](src/app-server/protocol/outbound-client-request.ts)에 package-private builder를 추가하고 `AppServerRpcClient`가 사용하는 여섯 adopted Client method를 모두 이 경로로 보낸다. Builder는 handwritten input object를 그대로 spread하지 않고 method별 exact field를 다시 만들며, 전송 전에 generated `ClientRequest` JSON Schema로 exact core를 검증한다. `FP-0003` decoder와 같은 Ajv 설정을 [`generated-schema-ajv.ts`](src/app-server/protocol/generated-schema-ajv.ts)에서 공유하므로 coercion, default 삽입과 property 제거는 일어나지 않는다.

Generated TypeScript가 serde default보다 좁은 두 initialize field는 의미를 바꾸지 않는 값으로 명시한다. `clientInfo.title`은 `null`, `requestAttestation`은 `false`이며, donor의 `experimentalApi: true`와 `optOutNotificationMethods: null`은 유지한다. 또한 generated `ClientRequest`의 모든 adopted branch가 `params`를 요구하므로 인자 없는 `model/list`도 `params: {}`를 전송한다. 이는 first-party [Rust test client](../../references/openai-codex/codex-rs/app-server-test-client/src/lib.rs)의 typed request 구성과 [Python external client](../../references/openai-codex/sdk/python/src/openai_codex/client.py)의 method별 request facade를 TypeScript stdio 경계에 맞춰 따른 결과다.

이번 patch는 legacy authority 제거가 아니다. Exact `0.144.4` generated TypeScript에 없는 `persistExtendedHistory`, `modelProviders`, image input의 `imageUrl`과 handwritten `approvalPolicy` field 전체는 exact core 밖의 명시적 compatibility overlay로 기존 wire behavior를 보존한다. 이 field에는 generated 값뿐 아니라 donor가 허용해 온 legacy 값도 포함되며, 어느 쪽도 아직 generated core 검증 근거로 위장하지 않는다. Generic `request<T>()`와 `notify()`도 unknown/test method를 위한 donor optional-params escape hatch로 남고 adopted wrapper만 generated builder를 사용한다. Method-specific response result는 아직 검증하지 않으며 pending response routing, process lifecycle, writer/backpressure, router, request context, session과 turn controller mechanics도 바꾸지 않는다.

## Current checkpoint

| 범위                                  | 상태   | 현재 경계                                                                                                    |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `FP-0001` provenance와 exact pin      | 완료   | Fork와 official source oracle만 갱신했으며 legacy production pin은 바꾸지 않았다.                            |
| `FP-0002` generated contract snapshot | 완료   | Complete experimental wire contract와 non-mutating reproduction gate를 package-private로 보존한다.           |
| `FP-0003` sole-ingress decoder        | 완료   | Donor의 sole stdout ingress만 generated authority로 교체했고 process/router/session/public API는 보존했다.   |
| `FP-0004a` generated internal types   | 완료   | 현재 사용 중인 여섯 request의 generated type association만 고정하고 runtime/public behavior는 유지한다.      |
| `FP-0004b` generated outbound builder | 완료   | 여섯 adopted request의 exact core를 generated schema로 검증하고 기존 legacy wire value는 overlay로 격리한다. |
| Production integration                | 미착수 | Root workspace, `packages/runtime-codex`, Server와 Inspector는 이 fork를 import하거나 실행하지 않는다.       |

`FP-0004b`는 method-specific response decoder와 legacy authority 제거를 구현하지 않았다. 이 문서와 patch ledger는 fork-local provenance와 현재 구현 경계만 기록하며, 제품 task order와 completion status는 [AY-PLE 개발 백로그](../../docs/product/ay-ple-development-backlog.md)가 소유한다. 기존 AY-PLE spec이나 Wayfinder는 fork 내부 acceptance criterion으로 사용하지 않는다.

## Baseline and pin verification

```bash
npm ci --prefix vendor/ai-sdk-provider-codex-cli
npm run verify:codex-pin --prefix vendor/ai-sdk-provider-codex-cli
npm run verify:codex-generated --prefix vendor/ai-sdk-provider-codex-cli
npm run validate --prefix vendor/ai-sdk-provider-codex-cli
npm run validate:docs --prefix vendor/ai-sdk-provider-codex-cli
```

Donor import baseline에서는 build, typecheck, format, lint와 421개 unit/integration test가 통과했고 opt-in live smoke 1개는 실행하지 않았다.

Current `FP-0004b` checkpoint에서는 generated builder unit test와 mock-child stdin integration을 포함해 457개 unit/integration test가 통과했고 opt-in live test 1개는 skip 상태를 유지했다. Initialize default normalization, adopted request의 항상 존재하는 `params`, null·false·0 보존, legacy overlay, invalid exact-core rejection과 generic request escape hatch를 검증했다. Exact pin/generated verification, build, typecheck, format, lint와 14개 Markdown docs validation이 green이고, public declaration hash는 `b05d85da6b32d45bf32c46ff585eefdbad865565e3168387216e6dce644b5e07`로 `FP-0004a`와 동일하며 dry-run package roster도 7개 entry를 유지한다. Root `npm test`, `npm run typecheck`, `npm run build`와 Inspector lint도 모두 통과했다. Independent Source와 Spec review는 각각 0 findings, Standards review는 documented violation 0건이며 method별 schema drift를 명시적으로 드러내기 위해 `thread/start`·`thread/resume` field picker의 판단성 중복 1건을 유지했다. Method-specific response result와 live binary conformance는 아직 증명하지 않았고 live smoke는 실행하지 않았다.

Current pin verifier는 package/lock/vendor-local binary exactness와 stable/experimental generated TypeScript·JSON Schema fingerprint를 재현한다. JSON Schema fingerprint는 object key만 재귀 정렬하고 array order는 보존하며 TypeScript는 raw byte를 사용한다. Generated snapshot gate는 exact experimental tree의 재현성을 추가로 증명한다.

`npm ci`가 보고하는 inherited dependency audit 문제는 pin reproduction과 섞어 자동 수정하지 않고 별도 patch에서 평가한다. 이 fork는 아직 root npm workspace나 AY-PLE production code에 연결되지 않았다. `npm run validate`는 non-live package gate이며, 실제 Codex를 시작하는 `validate:examples:app-server`와 이를 포함한 `validate:full`은 명시적으로 선택할 때만 실행한다.
