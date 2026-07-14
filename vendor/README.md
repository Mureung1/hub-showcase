# Vendor forks

이 directory는 upstream source와 tests를 먼저 그대로 재현한 뒤 local patch를 단계적으로 적용하는 수정 가능한 fork를 보관한다. Source review와 upgrade diff만을 위한 immutable checkout은 [`references/`](../references/README.md)에 둔다.

| Path | 상태 | Production 연결 |
| --- | --- | --- |
| [`ai-sdk-provider-codex-cli/`](ai-sdk-provider-codex-cli/UPSTREAM.md) | `v2.1.1` pristine donor baseline 위에 `FP-0001` exact Codex pin 적용 | 없음. Root npm workspace, `packages/runtime-codex`, Server, Inspector와 분리됨 |

각 fork의 upstream identity와 patch history는 해당 directory의 `UPSTREAM.md`와 `upstream/` metadata가 소유한다. Fork source를 `packages/*`로 승격하기 전에는 기존 app/package consumer 계약을 변경하지 않는다.
