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

최초 donor dependency 범위와 lock은 위 표의 immutable baseline 사실로 유지한다. Fork patch `FP-0001`은 격리된 fork의 실행 target과 official source oracle만 다음 exact stable release로 갱신했다.

| 항목                                        | 값                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Package                                     | `@openai/codex@0.144.4`                                                                           |
| npm integrity                               | `sha512-DTHzYatlKq9dw55E0/HsbK4tRCEKabuJ10ybbqpsG8gVv/kvwEdg3Z4OI3cvLXKa21xkIa4lkGlZoO/HmqmFFw==` |
| Official tag                                | `rust-v0.144.4`                                                                                   |
| Annotated tag object                        | `632c07017ed17f00ca6d911b754683dee785af69`                                                        |
| Exact source commit                         | `8c68d4c87dc54d38861f5114e920c3de2efa5876`                                                        |
| Official source oracle                      | [`references/openai-codex`](../../references/openai-codex)                                        |
| Machine-readable package/generator contract | [`upstream/codex-pin.json`](upstream/codex-pin.json)                                              |

`0.144.0`에서 `0.144.4`까지 pinned source diff는 App Server의 `thread/resume` persisted reasoning-effort 보정에 한정되고, donor가 재사용할 external client·routing·T0 ordering mechanics와 generated stable/experimental TypeScript·JSON Schema의 의미는 바뀌지 않았다. 이 source diff는 현재 fork pin의 adoption 근거이지 legacy `packages/runtime-codex`의 pin이나 method integration 상태를 자동 변경하지 않는다.

## Baseline and pin verification

```bash
npm ci --prefix vendor/ai-sdk-provider-codex-cli
npm run verify:codex-pin --prefix vendor/ai-sdk-provider-codex-cli
npm run validate --prefix vendor/ai-sdk-provider-codex-cli
npm run validate:docs --prefix vendor/ai-sdk-provider-codex-cli
```

최초 import에서는 build, typecheck, format, lint와 421개 unit/integration test가 통과했고 opt-in live smoke 1개는 실행하지 않았다. Current pin verifier는 package/lock/vendor-local binary exactness와 stable/experimental generated TypeScript·JSON Schema fingerprint를 재현한다. JSON Schema fingerprint는 object key만 재귀 정렬하고 array order는 보존하며 TypeScript는 raw byte를 사용한다. 이 gate는 donor의 manual protocol type·validator가 `0.144.4` 전체 wire contract와 호환됨을 증명하지 않으며, 그 compatibility는 후속 generated-protocol replacement와 fake/live conformance가 소유한다.

`npm ci`가 보고하는 inherited dependency audit 문제는 pin reproduction과 섞어 자동 수정하지 않고 별도 patch에서 평가한다. 이 fork는 아직 root npm workspace나 AY-PLE production code에 연결되지 않았고, opt-in live smoke도 이번 repin gate에서 실행하지 않았다.
