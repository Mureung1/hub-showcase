# 001 — Codex Chat application foundation의 완료 envelope를 확정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: None

## Supersession note

2026-07-18 product-bound pivot 이후 이 Answer의 prior-art-first 조사 규율은 유지하지만, 일반 rich-client surface 전체를 AY-PLE 학업 product layer의 선행조건으로 둔 capability envelope는 active destination을 더 이상 구속하지 않는다. Current destination과 required surface는 [Wayfinder map](../map.md)과 [004 — 첫 Assignment vertical의 runtime sufficiency envelope를 확정한다](004-first-assignment-runtime-envelope.md)가 소유한다. 아래 Answer는 당시 합의와 pivot 근거를 보존하는 역사 evidence다.

## Question

AY-PLE 학업 product layer를 시작하기 전에 일반 Codex Chat application이 독립적으로 운영 가능하다고 판정하려면 어떤 사용자 journey, failure·recovery scenario와 safety constraint를 resulting spec이 반드시 닫아야 하며, 어떤 capability를 명시적으로 후속으로 남겨야 하는가?

## Resolution evidence

- Empty app data에서 app 시작, account 준비, workspace 선택과 첫 conversation까지의 대표 journey
- 여러 conversation, reload, Server restart, 두 Browser client, accepted turn disconnect를 required·deferred로 나눈 표
- Activity, pending interaction, interactive approval과 local web entrypoint의 포함·제외 판정
- Desktop Chat 완료 조건과 3-pane·학업 product layer의 명시적 non-goal
- 사용자가 승인한 destination 문장과 spec readiness를 판단할 falsifiable outcome

## Answer

### 채택한 destination

AY-PLE 학업 product layer 이전의 `Codex Chat application foundation`은 일반 Chat semantics와 UX를 새로 발명하는 application이 아니다. Pinned `openai/codex` App Server와 official Python SDK, Codex CLI·first-party client, 성숙한 OSS와 macOS·Browser platform에서 검증된 구현을 먼저 흡수하고, 그 뒤에도 남는 confirmed residual만 local web application 책임으로 결정하는 macOS-first Codex rich client foundation이다.

Foundation은 하나의 supported local-web entry action에서 Account Readiness를 확인하고, 단일 explicit local folder를 활성화한 뒤 multi-conversation을 운영할 수 있어야 한다. Browser·Server lifecycle, accepted turn disconnect, 여러 Browser client, activity, pending interaction과 approval도 빠뜨리지 않는 problem surface다. 정확한 state, recovery policy, UI와 transport는 아래 source-first 조사에서 확인한 동작을 채택한 뒤 결정한다.

### Prior-art-first 결정 순서

Foundation 단계의 novelty budget은 거의 0으로 둔다. 각 capability는 다음 순서를 통과한다.

| 순서 | 확인할 것 | 결과 |
| --- | --- | --- |
| 1 | Exact pin의 App Server native semantics와 primary tests | Codex가 이미 소유하는 identity, lifecycle와 safety semantics를 확인한다. |
| 2 | Official Python SDK public Interface | Native capability를 직접 재사용할 수 있는지, public seam에 결손이 있는지 확인한다. |
| 3 | Codex CLI와 first-party rich client 구현 | Terminal·IDE에 고정되지 않은 behavior와 UX convention을 추출한다. |
| 4 | 성숙한 OSS, 유사 local-first Agent·IDE·web companion과 platform capability | Web projection, OAuth, persistence, reconnect, local process와 filesystem 문제의 donor를 찾는다. |
| 5 | AY-PLE 환경과의 차이 비교 | Direct reuse, behavior-preserving adaptation, narrow port 또는 confirmed residual로 분류한다. |
| 6 | Residual만 결정 | 앞선 구현으로 해결되지 않는 차이에만 architecture·product decision을 만든다. |

Source를 실제로 가져올 때는 exact version·commit, license, provenance와 behavior test를 함께 보존한다. Source copy가 부적합하면 code가 아니라 behavior, negative control과 UX pattern을 adaptation한다. Donor가 없다고 확인하기 전에는 `cwd`, `CODEX_HOME` 격리, local companion, Browser recovery조차 AY-PLE 고유 문제로 가정하지 않는다.

각 downstream research answer는 가능한 범위에서 다음 disposition을 증명한다.

`App Server owner → SDK seam → first-party implementation → OSS·platform donor → confirmed gap → reuse | adapt | residual | deferred | out-of-scope`

### Capability envelope

| Problem surface | Foundation 판정 | 이번 결정에서 고정하지 않는 것 |
| --- | --- | --- |
| Cold start | Foundation 실행물과 필수 runtime이 준비된 macOS에서 foundation-owned selection·catalog state가 비어 있어도 하나의 supported entry action으로 readiness 흐름에 진입해야 한다. Account가 ready이면 explicit local folder 선택, 첫 conversation의 terminal outcome과 same-conversation follow-up까지 진행한다. | CLI command, launcher, browser auto-open, process topology와 readiness state machine |
| Account | `Account Readiness`는 required surface다. 명시적으로 provision된 Codex auth가 있으면 사용하고, 없으면 conversation mutation 전에 not-ready 경계를 드러낸다. | In-app OAuth 시작·callback·취소·logout·재인증 UX, 여러 provider와 generic login abstraction. 003이 existing Codex implementation에서 흡수할 범위를 먼저 확인한다. |
| Workspace | 단일 explicit local folder를 기준으로 한다. Foundation의 workspace는 native `cwd` 경계이며 AY-PLE `SemesterWorkspace`가 아니다. | Exact picker·registry·bookmark·reselection mechanism, multi-workspace와 학기별 workspace 연결 |
| Conversation | 단일 workspace 안의 multi-conversation은 required다. `두 conversation`은 single-slot 구현을 반증하는 probe일 뿐 product cardinality가 아니다. | Exact catalog, name·archive, capacity, owner, concurrency, persistence Interface와 UI |
| Cold continuity | Browser reload와 Server restart의 session continuity는 required research surface다. | Restore·non-restore inventory, native history projection과 selected state는 official·first-party·OSS evidence 뒤 결정한다. |
| Accepted turn disconnect | Native acceptance 뒤 Browser transport가 끊기는 scenario를 foundation에서 반드시 다룬다. | Continue, interrupt, late attach, replay·snapshot·re-read와 unknown-outcome policy는 007·014·017의 evidence 뒤 결정한다. |
| Multiple Browser clients | 두 client scenario는 isolation·ownership 문제를 드러내는 required probe이며 client 수를 2로 제한하지 않는다. | Client identity, simultaneous controller semantics, concurrency와 collaboration UX. Remote multi-user collaboration은 non-goal이다. |
| Activity | 초기 baseline은 일반 사용자가 이해할 curated Chat view다. Activity detail을 늘리는 UX는 donor implementation에서 흡수한다. | `verbose`라는 이름, detail toggle, exact command·file·tool·plan family와 live/cold presentation |
| Pending interaction·approval | Stable Codex rich-client가 제공하는 user-input request와 interactive approval을 foundation에서 임의로 누락하지 않는다. Current `deny_all + read_only` tracer는 조사 기준선이지 final completion envelope가 아니다. | Exact supported request family, SDK response seam, sandbox·approval policy와 UI. 007·015가 official implementation과 residual을 먼저 확인한다. |
| macOS local web entrypoint | 반복 가능한 start, readiness, bounded shutdown과 clean-machine verification 경계는 required다. | Exact launcher와 host/process layout, packaged Desktop App, signing·notarization과 updater |

### Failure·recovery scenario의 소유 방식

다음 scenario는 미리 만든 local state machine에 끼워 맞출 acceptance criterion이 아니라, 검증된 구현이 어떤 답을 제공하는지 조사해야 할 known problem이다.

| Scenario | Wayfinder가 닫아야 할 질문 |
| --- | --- |
| Account가 준비되지 않았거나 auth lifecycle이 바뀐다 | Native·SDK·first-party login implementation이 제공하는 readiness와 recovery 중 무엇을 그대로 흡수하고 무엇이 local-web residual인가? |
| 선택한 local folder가 missing·moved·inaccessible 상태가 된다 | Codex, donor application과 platform이 workspace identity·reselection을 어떻게 다루며 ADR 0006의 explicit root와 어디서 차이가 나는가? |
| Browser reload 또는 Server restart가 발생한다 | Persisted native conversation과 transient client state 중 무엇이 복구되며, 어떤 loss를 명시해야 하는가? |
| Accepted turn 뒤 transport가 끊긴다 | Native turn lifetime, reconnect·replay와 terminal authority가 이미 어디에 구현돼 있으며 어떤 gap이 남는가? |
| 여러 Browser client가 같은 local companion을 사용한다 | Existing clients가 selection, active work와 stale mutation을 어떻게 소유·route하며 local web에 무엇을 adaptation해야 하는가? |
| Activity 또는 pending interaction이 live·cold 경계를 지난다 | First-party presentation과 official request identity를 얼마나 직접 재사용할 수 있는가? |
| Local entrypoint 또는 process가 준비·종료에 실패한다 | Existing local companion·launcher가 readiness, cleanup과 user action을 어떻게 정산하며 verified runtime topology와 무엇이 다른가? |

각 scenario는 `reuse`, `adapt`, `confirmed residual`, `deferred` 또는 `out-of-scope` 판정과 primary evidence를 가져야 한다. Known problem을 agent가 추측한 safety bullet로 먼저 승격하거나 donor implementation을 그 checklist에 맞추지 않는다.

### Safety constraint

새 safety contract를 001에서 발명하지 않는다. 다음 두 종류만 현재 입력 제약이다.

1. ADR 0006의 `packageRoot`·`appDataRoot`·`workspaceRoot` 분리와 `process.cwd()` fallback 금지, ADR 0009의 macOS-first local web 경계, ADR 0011의 official SDK direct reuse·native identity·supervised lifecycle, ADR 0012의 Chat-only graph와 generic engine·raw event bus 금지를 보존한다.
2. 채택하거나 port한 구현은 원래의 safety assumption, exact version·license·provenance와 falsifying test를 함께 기록한다. 그 assumption이 AY-PLE의 app-managed roots나 Browser boundary와 맞지 않을 때만 precise residual decision을 만든다.

Method identifier가 존재하거나 old inventory에서 `baseline`이었다는 사실만으로 capability가 제공된다고 주장하지 않는다. Exact SDK public seam과 native behavior를 확인하고, public gap이 드러날 때만 upstream extension·adapter 질문을 새 ticket으로 만든다.

### 역사 evidence와 현재 사용법

삭제된 `docs/architecture/codex-app-server-method-inventory.md`는 legacy `@openai/codex@0.144.0` generated schema의 206개 raw method와 `packages/runtime-codex`·`HeadlessCodexClientHost` integration overlay였다. `abb0eb5ff8751f7306b5b5dcb78ebcf96be68f6d`에서 Chat-only navigation과 함께 삭제됐으며 exact `0.144.4` Python SDK public contract의 정본이 아니다.

이 inventory를 current 문서나 broad raw-protocol backlog로 복원하지 않는다. 당시 method roster는 discovery evidence로만 사용하고, 002–008이 current code, account/config, native `cwd`, workspace selection, cold recovery, live rejoin·pending interaction과 local threat를 capability별로 조사한다. 새 포괄 inventory나 OSS survey ticket은 만들지 않는다.

### Non-goal

- `RawMaterial`, `EvidenceRef`, `ModelingRun`, `StatePatch`, `SemesterModel`, Review와 `UserConfirmation`을 포함한 AY-PLE 학업 product layer
- 자료 pane·Document Workbench·Companion을 포함한 3-pane 제품 Shell
- 모든 App Server event의 1:1 노출, generic event bus, 두 번째 Agent engine과 speculative provider abstraction
- Exact Codex pin upgrade, legacy runtime 복원·migration과 삭제한 method inventory의 current owner 복원
- 여러 account 전환, cloud sync, remote multi-user service와 collaborative editing
- Packaged Desktop App, signing·notarization·update, Windows·Linux와 mobile·small-screen 지원
- 이번 Wayfinder session의 production code, implementation ticket, spec과 GitHub publication

### Falsifiable outcome

Map이 resulting spec 준비 상태에 도달하려면 위 required problem surface마다 exact source와 donor, 적용 assumption, direct reuse·adaptation 범위와 confirmed residual이 연결돼야 한다. Required surface를 단순 `deferred`로 밀거나 구현체를 조사하지 않은 채 local architecture·UX로 채울 수 없다.

Resulting spec은 다음 문장을 사실로 만들 수 있어야 한다.

> Empty foundation state의 macOS local web entrypoint에서 Account Readiness와 단일 explicit workspace를 거쳐 multi-conversation을 시작하고, lifecycle·disconnect·multi-client·activity·pending interaction·approval scenario를 검증된 기존 semantics로 설명하며, 새로 설계할 부분은 evidence로 확인한 residual뿐이다.

이 outcome이 falsifiable하려면 각 surface에 `reuse | adapt | residual` disposition과 검증 가능한 representative trace가 있어야 하고, `Not yet specified`에 owner 없는 in-scope fog가 남아서는 안 된다. 이는 foundation이 이미 구현됐다는 뜻이 아니라 implementation-ready spec이 재발명 없이 정확한 implementation boundary를 말할 수 있다는 뜻이다.

### Domain vocabulary 판정

이번 결정은 `conversation`, native `thread`, active `turn`, Browser client, runtime workspace와 local companion 같은 application·implementation vocabulary만 정리했다. 새 AY-PLE 학업 domain term을 확정하지 않았으므로 `CONTEXT.md`는 변경하지 않는다.
