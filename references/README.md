# Runtime source reference

이 directory의 Git submodule은 Runtime이나 일반 `npm test`, `npm run typecheck`, `npm run build`의 dependency가 아니라 official source review와 pin upgrade diff를 위한 dev-only reference다.

| Path | Exact commit | 역할 |
| --- | --- | --- |
| `openai-codex` | `8c68d4c87dc54d38861f5114e920c3de2efa5876` (`rust-v0.144.4`) | Official Python SDK, generated contract, Rust App Server와 first-party tests를 확인하는 semantic oracle |

Superproject gitlink가 exact commit을 소유한다. `.gitmodules`에 moving branch, `shallow`, `ignore`를 두거나 `git submodule update --remote`로 갱신하지 않는다.

```bash
git submodule update --init -- references/openai-codex
```

Active production baseline은 [official Python SDK 재사용 결정](../docs/adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)을 따른다. 과거 community TypeScript donor와 fork는 production dependency나 upgrade oracle이 아니며 active tree에서 제거했다. 시행착오와 실행 증거는 `prototype/codex-python-sdk-reuse@3b3fa9e0`에 보존한다.

기존 `packages/runtime-codex`와 root lock은 cutover 전까지 `@openai/codex@0.144.0`을 유지한다. Reference의 `0.144.4` pin만으로 현재 Harness, generated method inventory나 method integration status를 갱신하지 않는다.
