# Protocol-driven AY–App Interaction Layer를 제품 확장 seam으로 채택한다

분류: 활성

성숙도: 구현됨

부분 대체·보완하는 결정: [ADR 0007 — 제품 작업을 native Codex 조합으로 실행한다](0007-use-native-codex-composition-for-product-actions.md), [ADR 0019 — MCP InteractionCapability로 App UI round trip을 제공한다](0019-use-mcp-interaction-capabilities-as-the-ay-app-seam.md)

관련 workspace 결정: [ADR 0018 — 사용자가 선택한 Git working tree를 SemesterWorkspace로 채택한다](0018-adopt-user-owned-git-semester-workspaces.md)

관련 startup 결정: [ADR 0020 — SemesterWorkspace를 App 실행 전에 native Bootstrap으로 준비한다](0020-bootstrap-semester-workspaces-before-app-startup.md)

## 맥락

AY-PLE을 일반 Codex client와 구분하는 제품 가치는 별도 Agent workflow engine이 아니라 **App의 의미 있는 GUI 맥락을 AY 작업에 전달하고, AY가 요청한 사용자 판단을 App-native UI로 다시 받아 같은 작업을 이어 가는 것**이다.

초기 First Assignment vertical은 이 가설의 두 방향을 각각 한 사례로 구현했다. `선택한 자료 정리하기`는 선택 자료를 `SkillInput`과 file reference가 포함된 native Turn으로 전달했고, `propose_state_patch`는 AY의 MCP request를 Review UI와 closed result로 왕복시켰다. 그러나 캠프 마감에 맞춘 contraction 과정에서 전자는 app-owned `ModelingRun` workflow와 함께 제거됐고, 후자인 `InteractionCapability` 하나가 AY와 App의 전체 seam인 것처럼 일반화됐다.

`ModelingRun`과 `propose_state_patch`는 AY–App Interaction의 첫 사례이지 상호작용 계층 자체가 아니다. 새 제품 기능을 추가할 때마다 Runtime coordinator나 App-owned workflow를 다시 만드는 대신, 기능별 typed interaction과 Codex-native Skill·MCP protocol을 조합할 수 있는 장기 seam이 필요하다.

## 결정

- AY-PLE은 **AY–App Interaction Layer**를 채택한다. 이 Layer는 하나의 범용 event router가 아니라 시작 방향과 lifecycle이 다른 두 deep Module의 Interface로 구성한다.
  - **ActionInvocation**은 학생이 App GUI에서 목적이 분명한 action을 명시적으로 실행할 때, App이 검증한 request-scoped 맥락을 하나의 native Codex Turn으로 전달하는 `App → AY` Interface다.
  - **InteractionCapability**는 AY가 MCP로 목적이 분명한 사용자 상호작용을 요청하고, App이 capability-specific UI에서 수집한 closed result를 같은 MCP call과 Codex Turn에 돌려주는 `AY → App → User → AY` Interface다.
- Source explorer의 preview·selection과 일반 App state 변화는 AY 입력을 암묵적으로 바꾸지 않는다. ActionInvocation은 사용자의 명시적인 action에서만 현재 입력을 동결하며, raw click event가 아니라 `model_semester`처럼 제품 의미가 닫힌 typed intent를 받는다.
- 학업 사실을 `SemesterModel`로 정리하는 canonical 작업명은 `SemesterModeling`, 이를 소유하는 built-in Skill identity는 `ay-ple-semester-modeling`, 선택한 `WorkspaceFileRef`를 작업 맥락으로 전달하는 App command identity는 `model_semester`로 구분한다. Command는 전체 학기 정보가 한 번에 완성된다고 약속하거나 durable Run을 만들지 않는다. 이 identity들은 public contract·Server·Browser·Skill source에서 함께 사용하며 이전 development identifier의 compatibility alias는 만들지 않는다.
- ActionInvocation의 App-facing Interface는 native `SkillInput`, `TextInput`, `MentionInput`, Skill path, absolute path와 raw thread·turn identity를 노출하지 않는다. App-owned action definition이 active SemesterWorkspace의 request-scoped file reference와 입력을 검증하고, project에서 발견한 workspace-local Skill과 bounded native Turn input으로 번역한다.
- Current single action에서는 `model_semester` definition 한 곳이 required `ay-ple-semester-modeling` identity와 binding을 명시적으로 소유한다. 이를 별도 generic Skill registry, dynamic action manifest나 공용 action→Skill mapping Module로 추출하지 않는다. 두 번째 실제 action에서 공통 mechanics와 variation이 확인될 때만 shared internal Module을 검토한다.
- ActionInvocation은 request가 가리킬 `WorkspaceFileRef` 목록을 동결할 뿐 file content version을 동결하지 않는다. 각 action definition이 reference freshness 의미를 소유하며, current `model_semester` command는 Turn 직전 safe path를 다시 검증한 뒤 AY가 actual file의 현재 bytes를 읽는 current-path semantics를 사용한다. App의 검증 handle과 이후 AY reader를 같은 inode에 원자적으로 bind하거나 source snapshot을 만드는 것은 이 Interface의 보장이 아니다. Exact content binding이 필요한 기능은 `EvidenceRef` 같은 version-bound contract를 별도로 채택해야 한다.
- `SkillInput + file reference`, `SkillInput + structured text` 같은 조합은 특정 `ModelingRun` 기능이 아니라 여러 ActionInvocation이 재사용할 수 있는 native composition primitive다. Local file을 실제 native `MentionInput`, rendered path 또는 다른 official input으로 운반할지는 검증된 Codex Adapter mapping이 소유하며 제품 Interface에 고정하지 않는다.
- InteractionCapability는 ADR 0019의 typed MCP tool, closed result, capability-specific UI, authenticated Broker binding, once-only settlement와 failure semantics를 유지한다. `propose_state_patch`는 이 Interface의 첫 capability일 뿐 catalog 전체나 AY–App Interaction 전체가 아니다.
- 새 제품 기능은 목적이 분명한 typed GUI action과 Skill, typed MCP capability와 UI Adapter 중 하나 또는 둘을 조합해 추가한다. 기능을 추가하기 위해 공통 Runtime·operation lifecycle을 다시 구현하지 않으며, 반대로 arbitrary payload를 받는 `emit_event`, dynamic workflow registry 또는 arbitrary JSON schema renderer를 만들지 않는다.
- 새 학업 workflow는 기존 file·Git·native tool과 AY–App Interaction Interface로 충분하면 AY-PLE built-in Skill로 먼저 제공한다. Skill만으로 사용자가 App에서 이미 표현한 맥락을 전달할 수 없거나 작업 중 필요한 판단을 알맞은 UI로 받을 수 없을 때만 새 ActionInvocation 또는 InteractionCapability를 추가한다. Built-in Skill catalog의 진화는 AY-PLE capability 확장의 기본 경로지만, Skill directory의 존재만으로 완성된 App feature를 주장하지 않는다.
- Built-in Skill은 explicit ActionInvocation의 `SkillInput`과 native model invocation 양쪽에서 사용할 수 있다. ActionInvocation이 제공하는 file reference와 arguments는 검증된 request-scoped context이지 Skill 자체의 required invocation signature가 아니다. Skill은 사용 가능한 대화·workspace 문맥에서 작업 범위를 판단하며 action marker나 file argument 부재를 일률적인 종료·clarification 조건으로 만들지 않는다.
- ActionInvocation은 normal Chat과 Product Turn admission·native activity·interrupt·terminal lifecycle을 재사용한다. InteractionCapability는 별도 Turn이나 Product operation을 시작하지 않고 이미 실행 중인 Chat 또는 ActionInvocation Turn 안에 nested되어 자신의 pending request와 same-call result를 정산한다. 두 Interface는 active SemesterWorkspace·Runtime·thread binding, correlation과 interrupt·disconnect coordination만 함께 사용하며, 공통 workflow 순서나 기능 payload 의미를 해석하는 중앙 engine을 만들지 않는다.
- App은 GUI action의 제품 의미, request-scoped context validation, capability-specific UI와 Browser-safe projection을 소유한다. AY와 Skill은 작업 계획, prompt sequence, InteractionCapability 호출 시점, 결과 해석, 실제 file mutation과 Git checkpoint를 소유한다. Codex Runtime Adapter는 양쪽의 제품 의미를 알지 않는 capability-neutral native execution Adapter로 남는다.
- `SemesterModeling`의 snapshot mutation 전 Review는 Skill instruction과 InteractionCapability tool semantics로 harness하고 representative actual trace로 검증한다. App Hook, native write interceptor나 accepted proposal↔filesystem diff ledger를 추가해 runtime invariant로 만들지 않는다. 실제 bypass가 사용자 피해로 반복되거나 여러 workflow가 동일한 enforceable invariant를 요구할 때만 별도 enforcement seam을 검토한다.
- ActionInvocation의 Product operation, pending InteractionCapability와 실행 관측 상태는 process-local state다. App-owned durable `ModelingRun`, duplicate Turn ledger, `RawMaterial` registry, source copy·snapshot 또는 학업 event sourcing을 복원하지 않는다. 장기 결과와 rollback은 SemesterWorkspace의 실제 file과 Git history가 소유한다.
- ActionInvocation retry는 fresh invocation과 Turn이고, InteractionCapability retry는 fresh MCP call이다. Interrupt, disconnect, timeout과 terminal 전달 여부가 불명확한 상태를 성공이나 사용자 result로 추정하지 않는다.
- Native command·file·network approval은 Codex execution 권한이고, ActionInvocation과 InteractionCapability는 제품 intent와 사용자 판단을 전달한다. 어느 결과도 다른 권한을 암묵적으로 승인하지 않는다.

## 고려한 대안

| 대안 | 판정 | 이유 |
| --- | --- | --- |
| 일반 Chat과 MCP InteractionCapability만 유지 | 거절 | App GUI에서 이미 표현한 선택·맥락을 사용자가 prompt로 다시 설명해야 하므로 AY-PLE의 양방향 제품 가치가 사라진다. |
| First Assignment의 `ModelingRecipe → ModelingInvocation → ModelingRun`을 복원 | 거절 | 재사용할 native composition을 특정 학업 workflow와 durable 실행 객체에 다시 결합한다. |
| 모든 App event와 MCP request를 하나의 generic envelope로 통합 | 거절 | 방향별 lifecycle, typed UI와 실패 의미를 caller에게 누출하고 기능별 contract를 약화한다. |
| App이 Skill·MCP와 별도의 workflow runtime을 소유 | 거절 | Codex-native protocol과 AY의 자율성을 중복하고 새 기능마다 App과 Skill에 같은 작업 순서를 구현하게 한다. |
| ActionInvocation과 InteractionCapability를 독립 기능으로만 hard-code | 거절 | Workspace binding, Turn activity projection, ActionInvocation admission과 nested capability settlement가 기능마다 반복돼 seam의 leverage와 locality를 잃는다. |

## 결과

- `ModelingRun`은 AY–App Interaction의 이름이나 필수 제품 객체가 아니다. Native Turn과 process-local operation이 실행을 관측하며, durable run history가 실제로 필요해질 때 별도 결정으로 다룬다.
- ADR 0007의 native Skill·text/file input·Turn 조합과 별도 workflow runtime 거절은 유지한다. `ModelingRecipe → ModelingInvocation → ModelingRun`을 canonical 제품 경계로 삼은 부분과 재사용 가능한 typed invocation seam까지 함께 금지한 해석은 이 결정이 대체한다.
- ADR 0019는 AY가 시작하는 MCP InteractionCapability의 상세 결정으로 유지한다. `InteractionCapability`가 AY–App의 전체 seam이라는 제목·해석은 이 결정이 대체한다.
- 현재 구현은 normal Chat, `model_semester` ActionInvocation과 `propose_state_patch` InteractionCapability를 같은 Product Turn lifecycle에서 제공한다. Exact current topology는 [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md), 장기 기술 mapping은 [AY–App Interaction Layer 아키텍처](../architecture/ay-app-interaction-layer.md), 후속 작업 순서는 [개발 백로그](../product/ay-ple-development-backlog.md)가 소유한다.
- Pre-distribution identifier였던 `organize_sources`와 `ay-ple-first-assignment`는 compatibility alias 없이 각각 `model_semester`와 `ay-ple-semester-modeling`으로 교체했다. `First Assignment`가 실제 대표 시나리오를 뜻하는 conformance 이름과 완료·역사 문서는 그 의미를 보존한다.
