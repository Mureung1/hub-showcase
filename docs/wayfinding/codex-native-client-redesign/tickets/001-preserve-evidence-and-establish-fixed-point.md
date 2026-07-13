# 001 — 기존 evidence와 재설계 기준점을 보존한다

## Wayfinder ticket

- Type: task
- State: resolved
- Blocked by: None

## Question

Current HEAD의 local-only Ticket 004 commit, uncommitted Rust source research와 이미 fork integration에 들어간 Ticket 001–003·macOS-first 이력을 잃지 않으면서, 어떤 ref·branch·tree를 redesign의 시작점과 비교 기준으로 삼아야 하는가?

## Answer

현재 history를 rewrite하지 않고, 용도가 다른 fixed point를 하나의 “되돌아갈 commit”으로 뭉치지 않는다.

| 용도 | Commit | 판정 |
| --- | --- | --- |
| Head spec·tickets만 있고 새 Host 구현이 아직 없는 archaeology 기준점 | `a4b77aea144d90d30a3581ca1fff01348649f79b` | 잘못된 가정이 실제 구현으로 번지기 전 문서 비교에만 사용한다. 이후의 공유 이력을 버리는 active branch base로 사용하지 않는다. |
| Ticket 001/002 selective salvage 기준점 | `b9d4a8199f6d63b25a4ab0a1a453c6f785f3af81` | `ProductRuntimeLayout`과 stdio transport가 있고 `headless-codex-client-host.ts`는 없는 snapshot이다. 새 Interface가 확정된 뒤 primitive 단위 비교에만 사용한다. |
| 공유된 redesign branch base | `f335333fd9609739380441635eeb79ca4d465303` | Ticket 001–003과 macOS-first 결과가 fork integration에 들어간 마지막 shared tree다. 감사 시점의 `fork/N180_하성욱` merge commit `1885a8047d62fc491a3e36c5691a28ce1f65d5aa`와 tree `ef8ea083b27a42b4f5e5e7d2a0bda892025ff515`가 같다. |
| 기존 Ticket 004 구현 종점 | `f695f96572599d2deac41c09284406312db8767b` | `f335333f..f695f965`의 정확히 15 commits를 기존 Host/state-machine evidence로 보존한다. Follow-up fixed point `3546d019603e5d00ffdc7aeb20bb47844424836c` 이후 종점까지는 7 commits다. |

보존 작업을 다음과 같이 완료했다.

- 미커밋 research 51줄은 secret·binary·generated content가 없는 UTF-8 Markdown임을 검사하고 `d547c3d7448302debbf2a0a685878f60d2f75aeb` (`docs: preserve Codex source architecture research`)로 커밋했다. 최종 research blob은 `8a0a87a0be86204dd0727d197b0e1bd359fe3212`다.
- `fork/codex/headless-host-ticket-004-archive`를 `d547c3d7448302debbf2a0a685878f60d2f75aeb`에 만들고 push했다. 이 ref가 Ticket 004, original Wayfinder commit과 보강 research를 모두 reachable하게 한다.
- Annotated tag `archive/headless-codex-client-host-ticket-004-f695f965`는 pure implementation endpoint `f695f96572599d2deac41c09284406312db8767b`를, `archive/headless-codex-client-host-evidence-20260713`은 research 포함 evidence commit을 고정한다. 두 tag를 `fork`에 push하고 peeled remote hash를 검증했다.

Active redesign은 새 branch `codex/codex-native-client-redesign`에서 수행한다. 이 branch는 `f335333fd9609739380441635eeb79ca4d465303`에서 갈라지고, 검토된 Wayfinder map만 `dd48874849de8b9e6eaca14bc0d99ffde76ea949`로 cherry-pick했다. 따라서 공유된 Ticket 001–003·macOS-first history는 유지하지만 local-only Ticket 004 구현은 active baseline에 포함하지 않는다. 기존 Host의 공유된 Ticket 003 부분은 architecture 결정 뒤 forward-remove하며, `a4b77aea`로 shared history를 reset/rebase하지 않는다.

앞으로의 비교는 목적별로 고정한다.

```text
a4b77aea..<new-head>  = 구현 전 spec 가정과 새 설계 비교
b9d4a819..<new-head>  = Ticket 001/002 primitive selective salvage 비교
f335333f..f695f965    = 폐기한 Ticket 004 Host/state-machine evidence
```
