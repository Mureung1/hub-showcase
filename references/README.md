# Runtime source references

이 directory의 Git submodule은 Runtime이나 일반 `npm test`, `npm run typecheck`, `npm run build`의 dependency가 아니라 source review·fork provenance·pin upgrade diff를 위한 dev-only reference다.

수정 가능한 pristine donor snapshot과 이후 local patch는 [`vendor/ai-sdk-provider-codex-cli`](../vendor/ai-sdk-provider-codex-cli/UPSTREAM.md)에 둔다. `references/`는 exact upstream oracle로 유지하며 fork source를 이 checkout 안에서 수정하지 않는다.

| Path | Exact commit | 역할 |
| --- | --- | --- |
| `openai-codex` | `767822446c7a594caa19609ca435281a9ec67e0d` | `@openai/codex@0.144.0`의 generated shape·Rust method/client/TUI behavior를 확인하는 official semantic oracle |
| `ai-sdk-provider-codex-cli` | `fc4a97f518af6eb380e9ecd67fa78940bffdf155` | Persistent TypeScript App Server mechanics와 tests를 보존하는 MIT fork/extraction baseline |

두 checkout은 superproject gitlink가 exact commit을 소유한다. `.gitmodules`에 moving branch, `shallow`, `ignore`를 두거나 `git submodule update --remote`로 갱신하지 않는다.

```bash
git submodule update --init -- \
  references/openai-codex \
  references/ai-sdk-provider-codex-cli
```

Community source를 실제 package code로 추출할 때는 원본 MIT copyright/license, upstream repository와 commit, imported source/test path, local patch ledger를 함께 보존한다. Community public API, AI SDK projection, manual protocol model과 runtime dependency를 자동 채택하지 않으며 AY-PLE의 official generated-schema·source/test·fake/live gate가 계속 의미와 compatibility authority를 소유한다.
