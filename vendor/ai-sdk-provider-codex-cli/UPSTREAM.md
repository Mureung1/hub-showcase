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

## Pristine baseline verification

```bash
npm ci --prefix vendor/ai-sdk-provider-codex-cli
npm run validate --prefix vendor/ai-sdk-provider-codex-cli
npm run validate:docs --prefix vendor/ai-sdk-provider-codex-cli
```

최초 import에서는 build, typecheck, format, lint와 421개 unit/integration test가 통과했고 opt-in live smoke 1개는 실행하지 않았다. `npm ci`가 보고한 upstream lock의 dependency audit 문제는 pristine reproduction과 섞어 자동 수정하지 않으며 별도 patch에서 평가한다.

이 snapshot은 아직 root npm workspace나 AY-PLE production code에 연결되지 않았다. 다음 변화인 exact stable Codex repin은 pristine import와 분리된 patch로 수행한다.
