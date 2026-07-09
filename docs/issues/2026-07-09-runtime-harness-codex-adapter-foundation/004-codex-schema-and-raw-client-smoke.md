## Agent triage

- State: ready-for-agent
- Surface: local-issue
- Next actor: agent

## Parent

`docs/prds/2026-07-09-runtime-harness-codex-adapter-foundation.md`

## What to build

Codex App Server의 공식 계약을 pinned Codex version의 generated schema/type과 raw client smoke path로 고정한다. 개발자는 app-owned Codex binary와 isolated runtime home을 사용해 `stdio` JSONL transport로 app-server를 시작하고, `initialize` request와 `initialized` notification handshake가 성공하는지 Runtime Inspector 또는 server-side smoke path에서 확인할 수 있어야 한다.

이 slice는 CodexRuntimeAdapter의 제품 의미 mapping을 만들기 전, raw protocol을 정확히 말할 수 있는 기반이다.

## Acceptance criteria

- [ ] pinned Codex version에서 `codex app-server generate-ts`를 실행해 runtime-codex 내부 generated type을 생성하는 경로가 마련된다.
- [ ] generated Codex app-server type은 adapter-internal로 유지되고 runtime-core 또는 AY-PLE product-facing contract로 노출되지 않는다.
- [ ] app-server는 `--listen stdio://` 또는 기본 stdio transport를 사용하며 browser가 stdio에 직접 연결하지 않는다.
- [ ] `CODEX_HOME`과 `CODEX_SQLITE_HOME`을 app-managed 위치로 주입하는 smoke path가 있다.
- [ ] raw client가 `initialize` request 후 `initialized` notification을 보내는 handshake를 수행한다.
- [ ] raw/debug message와 initialize result 또는 error가 run/debug log에서 관측 가능하다.
- [ ] 관련 구현은 Runtime Ownership Spike의 app-owned binary와 isolated runtime proof를 참고하되, spike artifact를 그대로 제품 code로 간주하지 않는다.

## Blocked by

- `docs/issues/2026-07-09-runtime-harness-codex-adapter-foundation/001-package-first-workspace-topology.md`
