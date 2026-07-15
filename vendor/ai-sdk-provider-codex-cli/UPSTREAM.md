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

Generated JSON Schema는 runtime validation에 사용할 wire roster이고 generated TypeScript와 의도적으로 다를 수 있다. Exact pin에서 JSON Schema는 `getAuthStatus`, `getConversationSummary`, `gitDiffToRemote`와 internal-only `rawResponseItem/completed`를 제외한다. 이 차이는 manifest에 명시하며 method를 수기로 schema에 복원하지 않는다.

OpenAI generated artifact의 license와 attribution은 [`upstream/openai-codex/LICENSE`](upstream/openai-codex/LICENSE)와 [`upstream/openai-codex/NOTICE`](upstream/openai-codex/NOTICE)에 exact source oracle에서 복사해 보존하고 npm package에도 함께 싣는다. Donor root [`LICENSE`](LICENSE)의 MIT license는 변경하지 않는다.

## Sole-ingress generated decoder

Fork patch `FP-0003`은 [`decodeInboundMessage`](src/app-server/protocol/inbound-codec.ts)를 package-private seam으로 추가하고 donor의 sole stdout JSONL reader인 `AppServerRpcClient.handleLine()`을 이 seam에 연결한다. Decoder는 generated `JSONRPCMessage`, experimental `ServerRequest`, `ServerNotification` JSON Schema만 Ajv에 정적으로 묶고, method roster도 schema의 `oneOf` branch에서 직접 파생한다. Generated TypeScript union은 type-only `Extract<>`로 method discriminant를 제한하며 wire field를 다시 선언하지 않는다.

Ajv는 `coerceTypes`, `useDefaults`, `removeAdditional`을 모두 끈 채 동작하므로 inbound object를 변경하지 않는다. Generated numeric format은 JSON parsing 뒤 관찰 가능한 signed/range boundary를 검증하며, 서로 인접한 unsafe `int64`/`uint64` lexeme 구분은 후속 raw-byte parsing과 safe `RequestId` patch로 남긴다. Exact known notification은 기존 notification pipeline으로 전달되고 invalid-known notification은 method만 경고한 뒤 drop한다. Exact known Server request는 기존 handler로 전달되고 invalid-known request는 original ID에 `-32602 Invalid params`를 한 번 응답한다. Unknown request와 notification은 donor의 기존 generic path를 유지한다. Correlated response/error의 pending lookup, process lifecycle, `readline` framing, writer/backpressure, thread context, router, session과 turn controller는 이 patch에서 변경하지 않는다.

Exact JSON Schema 밖의 `skill/requestApproval`, `reasoningTextDelta`, `reasoningSummaryTextDelta`는 generated coverage로 위장하지 않고 legacy compatibility validator를 명시적으로 거친다. JSON Schema에서 의도적으로 제외된 `rawResponseItem/completed`는 generic unknown notification으로 남는다. Donor의 [`validators.ts`](src/app-server/protocol/validators.ts)와 기존 compatibility fixture는 legacy regression surface이며 production ingress authority가 아니다. Method-specific response result validation, internal generated-type migration, safe directional `RequestId`와 transport hardening은 후속 patch가 소유한다.

## Baseline and pin verification

```bash
npm ci --prefix vendor/ai-sdk-provider-codex-cli
npm run verify:codex-pin --prefix vendor/ai-sdk-provider-codex-cli
npm run verify:codex-generated --prefix vendor/ai-sdk-provider-codex-cli
npm run validate --prefix vendor/ai-sdk-provider-codex-cli
npm run validate:docs --prefix vendor/ai-sdk-provider-codex-cli
```

최초 import에서는 build, typecheck, format, lint와 421개 unit/integration test가 통과했고 opt-in live smoke 1개는 실행하지 않았다. Current pin verifier는 package/lock/vendor-local binary exactness와 stable/experimental generated TypeScript·JSON Schema fingerprint를 재현한다. JSON Schema fingerprint는 object key만 재귀 정렬하고 array order는 보존하며 TypeScript는 raw byte를 사용한다. Generated snapshot gate는 exact experimental tree의 재현성을 추가로 증명한다. FP-0003 unit/integration test는 exact T0 notification, command approval, response/error, invalid-known, unknown과 explicit legacy route를 검증하지만 method-specific response result와 live binary conformance는 아직 증명하지 않는다.

`npm ci`가 보고하는 inherited dependency audit 문제는 pin reproduction과 섞어 자동 수정하지 않고 별도 patch에서 평가한다. 이 fork는 아직 root npm workspace나 AY-PLE production code에 연결되지 않았고, opt-in live smoke도 이번 repin gate에서 실행하지 않았다.
