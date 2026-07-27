# MCP InteractionCapability를 AY와 App의 seam으로 사용한다

분류: 활성

성숙도: 채택

부분 대체·보완하는 결정: [ADR 0007 — 제품 작업을 native Codex 조합으로 실행한다](0007-use-native-codex-composition-for-product-actions.md)

관련 workspace 결정: [ADR 0018 — 사용자가 선택한 Git working tree를 SemesterWorkspace로 채택한다](0018-adopt-user-owned-git-semester-workspaces.md)

## 맥락

AY-PLE의 차별점은 Codex를 단순히 채팅 UI에 넣는 것이 아니다. AY가 작업 중 사용자 판단이 필요한 순간을 MCP로 표현하면, App이 그 의도를 자료 미리보기·선택지·변경 비교 같은 typed UI로 보여주고, 사용자의 선택을 같은 Codex Turn에 구조화된 결과로 돌려주는 상호작용이 핵심 제품 가치다.

First Assignment vertical의 `propose_state_patch`는 이 round trip의 가능성을 증명했다. 그러나 현재 구현은 caller가 `requestKey`, workspace·Course identity와 revision을 알고, App이 `ModelingRun`·`StatePatch`·`UserConfirmation`의 lifecycle과 apply까지 소유하며, 같은 결정을 built-in `request_user_input`으로 한 번 더 운반한다. 이 구조는 학업 workflow와 native execution correlation을 MCP Interface 밖으로 누출해 새 interaction을 추가할수록 App, Skill과 Server가 함께 바뀌게 한다.

## 결정

- AY-PLE App은 **InteractionCapability**를 제공하는 MCP Module을 소유한다. 이 Module의 Interface는 “AY가 표시할 내용과 허용할 응답을 요청하면, 사용자가 App UI에서 결정하고, 구조화된 결과가 같은 Codex Turn으로 반환된다”는 한 번의 round trip이다.
- MCP Module은 `hub/`가 소유하는 Codex-facing STDIO Adapter와 App-side Interaction Broker로 나눈다. Adapter는 표준 MCP request/result를 운반하고 Broker는 현재 Runtime binding, Browser projection, pending lifecycle과 사용자 result 반환을 숨긴다.
- Bootstrap Skill은 Git-tracked `<SemesterWorkspace>/.codex/config.toml`에 AY-PLE Interaction MCP의 정적 project declaration을 설치한다. 이 declaration은 hub-owned STDIO entrypoint, 전달할 environment variable 이름, capability allowlist와 startup policy만 표현한다. Exact command path, env 이름과 required policy는 implementation spec이 고정한다.
- Project config에는 endpoint, token, native identity나 다른 secret·process-local 값을 기록하지 않는다. AY-PLE Runtime은 Codex child environment에 현재 App instance의 endpoint·token·Runtime binding을 넣고, MCP declaration의 `env_vars`가 이를 STDIO Adapter에 전달한다.
- App은 Interaction MCP를 연결하기 위해 thread-start config, `--config`나 equivalent high-precedence overlay로 project MCP configuration을 다시 만들지 않는다. Global·project config layering과 trusted-project loading은 Codex native behavior를 따르며, App-owned dynamic binding만 process environment로 공급한다.
- Bootstrap Skill은 전역 `~/.codex/config.toml`의 project trust를 직접 수정하지 않는다. 정상 Workspace thread를 exact Git root `cwd`와 `workspace-write` permission으로 시작하면 현재 pinned App Server가 trust가 미지정된 exact Git root를 native user config에 기록하고 project config를 같은 start 안에서 reload한다. 명시적인 `untrusted`는 덮어쓰지 않는다.
- Skill과 AY는 workflow의 순서, interaction을 요청할 시점, 응답의 해석과 다음 행동을 소유한다. App은 학업 workflow engine, prompt sequence 또는 결과 적용기를 소유하지 않는다.
- AY는 interaction 결과에 따라 SemesterWorkspace의 실제 파일을 일반 file tool로 변경하고, [ADR 0018](0018-adopt-user-owned-git-semester-workspaces.md)의 Git 지침에 따라 의미 있는 checkpoint를 commit한다. App은 수락 결과를 대신 `workspace-state.json`에 적용하거나 Git commit을 만들지 않는다.
- 각 MCP tool은 하나의 구체적인 사용자 capability를 typed input과 closed result union으로 표현한다. 하나의 범용 event bus, 임의 schema renderer 또는 모든 App event를 운반하는 `ProductInteraction` envelope은 만들지 않는다.
- MCP caller는 `workspaceId`, `courseId`, `baseRevision`, `requestKey`, native `threadId`·`turnId`·`requestId` 같은 host binding을 보내지 않는다. Interaction MCP Module이 현재 Runtime·Turn에 tool server를 결합하고 correlation, 한 번만 응답하기, 취소, disconnect와 UI lifecycle을 내부에서 소유한다.
- Browser UI는 capability별 Adapter다. 동일 Interface의 in-memory Adapter가 `request → UI projection → user result → MCP result`를 검증하는 주 테스트 seam이 된다. 테스트 편의를 위해 내부 correlation이나 persistence shape를 공개 Interface에 추가하지 않는다.
- `propose_state_patch`는 첫 InteractionCapability로 유지한다. 요청은 특정 Assignment·Course schema나 raw Git diff가 아니라 **도메인 중립적인 semantic Review presentation model**이다. 짧은 설명과 순서가 있는 change를 보내며, 각 change는 사람이 이해할 label·설명, 변경 전·후 값과 선택적인 `EvidenceRef`를 가진다. 추가·삭제에서는 전·후 중 한쪽을 생략할 수 있다. 결과는 `accept | revise | reject`와 필요한 경우 feedback을 반환한다. `StatePatch`는 이 호출 동안의 transient presentation payload이고 `UserConfirmation`은 별도 durable App entity가 아니라 그 호출의 사용자 result다.
- 하나의 Review 결정은 `propose_state_patch` 호출 하나로 완료한다. 같은 결정을 built-in `request_user_input`과 custom MCP에 나누어 운반하지 않는다. Built-in `request_user_input`은 AY-PLE 전용 rich UI가 필요 없는 일반 clarification에 계속 사용할 수 있다.
- `ModelingRun`은 App이 복제해 보존하는 학업 객체가 아니라 native Codex Turn과 그 관측 상태로 대체한다. `RawMaterial`은 App admission을 통과해야 생기는 객체가 아니라 SemesterWorkspace의 일반 사용자 파일이다. `EvidenceRef`는 richer Review UI에 필요한 경우 쓰는 typed presentation data이지 모든 file operation을 App이 추적하게 만드는 전역 계약이 아니다.
- Native command·file·network approval은 Codex execution 권한을 결정한다. InteractionCapability의 사용자 결과는 AY의 workflow 판단을 돕는다. 어느 한쪽도 다른 쪽의 권한을 암묵적으로 승인하지 않는다.

## 역할 경계

| 주체 | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| 사용자 | App UI에서의 최종 선택과 학기 자료의 의미 | MCP correlation, native protocol |
| AY·Skill | 작업 계획, interaction 요청 시점, 결과 해석, 실제 파일 변경과 Git checkpoint | App UI lifecycle, Browser transport |
| Interaction MCP STDIO Adapter | Project config로 발견되는 typed MCP Interface와 Broker transport | App UI lifecycle, 학업 workflow 순서 |
| App-side Interaction Broker | Runtime binding, correlation, 취소·disconnect, UI projection과 결과 반환 | Workspace file apply, Skill workflow |
| AY-PLE UI Adapter | Capability별 화면 projection과 사용자 입력 수집 | Agent의 다음 행동, 학기 SSOT |
| SemesterWorkspace | 실제 학기 파일, 선택적인 구조화 snapshot과 Git history | Runtime correlation, pending UI interaction |
| Codex Runtime | Thread·Turn 실행, MCP 연결과 native permission | AY-PLE 제품 UI의 의미, 학기 SSOT |

## 고려한 대안

| 대안 | 판정 | 이유 |
| --- | --- | --- |
| App이 `ModelingRun → StatePatch → UserConfirmation → apply` workflow를 소유 | 거절 | App과 Skill이 같은 학업 순서를 중복해서 알고 native Turn까지 별도 객체로 복제한다. |
| 일반 Codex Chat만 제공하고 custom MCP를 제거 | 거절 | Agent 의도를 domain-rich UI로 바꾸고 사용자 선택을 다시 Agent에게 돌려주는 AY-PLE의 핵심 가치를 잃는다. |
| 모든 상호작용을 하나의 generic event/schema protocol로 통합 | 거절 | 작은 Interface 뒤에 복잡성을 숨기지 못하고 UI·workflow·transport variation을 caller에게 떠넘긴다. |
| 모든 사용자 질문을 built-in `request_user_input`으로 처리 | 거절 | 일반 clarification에는 적합하지만 원본 preview, diff, evidence와 capability-specific action을 표현하는 AY-PLE UI를 제공하지 못한다. |
| App이 매 thread마다 전체 MCP config를 override | 거절 | Project-native declaration과 사용자 config precedence를 우회하고 App이 Skill·MCP discovery까지 소유하게 한다. Dynamic endpoint·secret은 config가 아니라 Runtime environment로 결합할 수 있다. |
| Bootstrap Skill이 `../workspace/` parent를 전역 trust로 기록 | 거절 | Current Codex trust lookup은 하위 Git repository로 parent trust를 상속하지 않는다. Exact workspace thread start의 native trust가 실제 Git root를 기록하고 config를 즉시 reload한다. |

## 결과

현재 First Assignment 구현은 interaction round trip의 유효한 증거지만 채택한 경계의 구현은 아니다. Server의 app-owned `RawMaterial` registry, `ModelingRun` receipt, durable `StatePatch`·`UserConfirmation`, revision-bound apply transaction, MCP+`request_user_input` 이중 흐름과 thread-start private MCP config injection은 contraction 대상이다.

새 interaction을 추가할 때는 “App이 이 workflow를 얼마나 알아야 하는가”가 아니라 “사용자에게 어떤 typed 선택 경험을 제공하고 AY에 어떤 closed result를 돌려줄 것인가”를 설계한다. App 자체 설정이나 workspace 선택처럼 App state를 바꾸는 capability도 별도 MCP tool로 만들 수 있지만, 그 tool은 자신이 소유한 App mutation만 수행하고 AY의 학업 workflow를 소유하지 않는다.

Long-lived 기술 mapping은 [AY–App Interaction Capability 아키텍처](../architecture/ay-app-interaction-capabilities.md), 현재 강결합 구현과 전환 gap은 [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md), 작업 순서는 [개발 백로그](../product/ay-ple-development-backlog.md)가 소유한다.
