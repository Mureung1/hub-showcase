# Codex 실행 권한과 AY-PLE 제품 확인 경계 정정

이 문서는 004–006에서 `read-only extraction`, Codex approval과 sandbox를 하나의 fail-closed requirement로 묶어 해석한 범위를 2026-07-19에 정정한 evidence다. Prototype의 raw 관찰과 report는 변경하지 않고, 008이 사용할 active interpretation만 바로잡는다.

## 서로 다른 세 경계

| 경계 | 결정하는 것 | 소유자 | 다른 경계에 미치는 영향 |
| --- | --- | --- | --- |
| AY-PLE Review·`UserConfirmation` | 제안된 `StatePatch`를 확인된 `SemesterModel`로 반영할지 | AY-PLE product layer | Codex command·file·network 실행을 승인하지 않는다. |
| Codex execution approval | Native Codex가 요청한 command·file·network 등 실행을 허용할지 | Codex client/integration과 사용자 permission 설정 | `StatePatch`를 학업 사실로 확인하지 않는다. |
| Codex sandbox | 실행에 기술적으로 허용되는 filesystem·network capability | Native Codex configuration | Review·`UserConfirmation`의 존재나 결과를 결정하지 않는다. |

첫 Assignment vertical의 `read-only extraction`은 결과를 proposal로 유지하고 Review·`UserConfirmation` 전에는 사용자 자료나 확인된 `SemesterModel`을 바꾸지 않는다는 **제품 효과**다. 이 표현만으로 `Sandbox.read_only`, network 차단, `ApprovalMode.deny_all` 또는 예상 밖 request의 explicit reject를 채택하지 않는다.

## Exact current-pin 사실

| 사실 | 근거 | 판정 |
| --- | --- | --- |
| Official high-level SDK의 `thread_start` 기본 approval은 `ApprovalMode.auto_review`이고 sandbox 기본값은 `None`이다. | [Exact SDK API](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L374-L405) | Pure SDK 기본값을 `yolo`나 `deny_all + read_only`로 표현하지 않는다. |
| Low-level `CodexClient` default handler는 command/file approval request에 `accept`를 반환하며 synthetic harness가 이를 관찰했다. | [Exact SDK client](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L773-L779) | Current-pin request fallback 관찰이며 AY-PLE 제품 확인 실패는 아니다. |
| Current bridge가 thread와 turn마다 `ApprovalMode.deny_all + Sandbox.read_only`를 직접 전달한다. | [Current bridge](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L368-L440) | Current tracer override이며 장기 제품 permission profile이 아니다. |
| Ordered patch `0001`–`0005`는 routing·settlement·notification을 수정하고 approval handler·sandbox policy를 바꾸지 않는다. | [Patch provenance](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md#L32-L45) | “Local approval fork가 SDK를 막았다”는 설명은 사실이 아니다. |

## 004–006 evidence의 active interpretation

- 004의 runtime envelope에서 authoritative settlement, bounded lifecycle, honest recovery와 repeatable trace 요구는 유지한다.
- 004의 product `read-only extraction`은 proposal-only mutation boundary로 해석한다. 당시 기술적 `read_only + no-network + unexpected-request reject`를 함께 required로 둔 문구는 superseded다.
- 005의 source 조사와 006의 synthetic negative control은 exact SDK default `accept`를 실제로 관찰했다는 evidence로 유효하다.
- Prototype report의 `confirmed_residual`/exit `2`는 당시 harness assertion에 대한 immutable 결과로 보존한다. 그러나 그 assertion은 더 이상 first-vertical product invariant가 아니므로 default `accept`만으로 SDK extension·lower-level seam·narrow port를 요구하지 않는다.
- Normal local/live representative turn에서는 approval request가 발생하지 않았고 write·network marker도 관찰되지 않았다. 이 사실도 synthetic fallback 관찰과 분리한다.

## 008이 결정할 것

008은 official SDK 재사용, native identity와 supervised lifecycle이라는 durable input을 유지하면서 다음을 결정한다.

1. Current bridge의 fixed `deny_all + read_only`를 `keep | replace | delete | frozen fallback` 중 어디에 둘지
2. First vertical과 장기 product action에 필요한 native Codex permission profile 및 설정 소유자
3. Native request가 실제 발생할 때 Codex request identity·결정·결과를 AY-PLE Review·`UserConfirmation`과 분리해 어떻게 projection할지
4. 원하는 profile과 UX를 정한 뒤에도 public SDK seam에 실제 gap이 남는지

022+ residual ticket, upstream extension 또는 narrow port는 4번이 evidence로 확인될 때만 만든다. 이번 정정은 새 permission profile이나 UI를 미리 채택하지 않는다.
