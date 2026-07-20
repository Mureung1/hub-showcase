검토 기준은 저장소 commit `b838bdc3d76ac1b2a9074107af908a6bb664a37d`의 문서·ticket·핵심 구현이며, 최신 Codex 제품 surface는 2026년 7월 18일 기준 공식 OpenAI 자료로 별도 확인했습니다. 아래에서 **사실**은 source에 직접 근거한 내용, **추론**은 그 사실들의 종합, **권고**는 선택 제안입니다.

# 1. Blunt verdict

> **독립 Chat foundation을 중단하고, 현재 runtime을 동결된 integration adapter로만 유지한 채 AY-PLE 3-pane Shell의 첫 학업 vertical에 종속된 얇은 Codex companion으로 재정의하십시오.**

두 질문에 대한 판단은 분명히 다릅니다.

* **Wayfinder의 adopt-first 조사 방식 자체는 합리적입니다.** Exact App Server → official SDK → first-party client → donor → residual이라는 순서, exact pin과 provenance, residual admission gate는 좋은 엔지니어링 규율입니다.
* **하지만 현재 Wayfinder가 조사하는 destination은 잘못됐을 가능성이 높습니다.** 001은 “독립 Chat foundation이 필요한가?”를 묻지 않고, 독립 foundation이 필요하다고 전제한 뒤 multi-conversation, restart, two-client, live rejoin, approval, local-web lifecycle을 필수 surface로 고정했습니다. Map은 동시에 3-pane Shell과 학업 product layer를 조사 밖으로 밀고 ADR 0006·0009·0011·0012를 입력 불변조건으로 취급합니다. 이것은 scope discovery가 아니라, 이미 선택한 scope 내부의 최적화입니다.

AY-PLE의 제품 문서는 오히려 반대 방향을 말합니다. 핵심 가치는 일반 Chat이 아니라 `RawMaterial → EvidenceRef가 연결된 StatePatch → UserConfirmation → SemesterModel`이며, 첫 MVP 성공 기준도 학기 자료 선택, 구조화된 변경 제안, 근거 확인, 수락·수정·거절, 확인된 상태의 재사용입니다. Multi-conversation catalog나 두 Browser client는 성공 기준에 없습니다.

# 2. 놓치고 있는 핵심 insight

## 2.1 Adopt-first보다 먼저 **need-first와 surface-owner-first**가 필요합니다

현재 순서는 사실상 다음과 같습니다.

> General Chat capability envelope → 각 capability donor 조사 → residual 결정 → 그 뒤 제품 layer

권고하는 순서는 다음입니다.

> 첫 학업 vertical → 제품이 반드시 소유할 상태와 interaction → 어느 surface가 그것을 제공할지 → official owner 재사용 → 실제 residual만 구현

Adopt-first는 잘못이 아닙니다. **무엇을 adopt할지 결정하는 상위 product decision 없이 실행되고 있다는 점**이 문제입니다.

009는 이 문제를 해결하지 못합니다. 009는 003–008이 모두 끝난 뒤에야 판단하도록 되어 있고, 001의 required surface를 줄이려면 001을 별도로 reopen해야 합니다. 즉 조사 결과가 아무리 “이 capability는 제품에 필요 없다”고 보여도, 009 자체는 scope를 줄일 권한이 없습니다.

## 2.2 AY-PLE가 필요한 것은 Chat application이 아니라 **academic action companion**입니다

ADR 0007과 native product composition 문서가 이미 올바른 architecture를 상당 부분 설명합니다.

* 사용자가 학업 action과 자료를 선택한다.
* AY-PLE가 `ModelingInvocation`을 만든다.
* Codex integration이 Skill, source mention, prompt, `outputSchema`와 turn control로 번역한다.
* 결과는 `ModelingRun`과 연결된 구조화된 `StatePatch`가 된다.
* raw thread·turn·item identity는 integration 내부에 둔다.
* 실제 기능이 요구할 때만 steer, interrupt, approval, pending input을 채택한다.

이 architecture에서 Chat transcript는 product state의 중심이 아닙니다. `Thread`와 transcript가 사라져도 확인된 `SemesterModel`과 근거는 살아 있어야 합니다. 따라서 generic transcript hydration과 perfect live reconnect를 product truth보다 먼저 완성하는 것은 순서가 뒤집힌 것입니다.

## 2.3 **SDK residual은 application responsibility와 동의어가 아닙니다**

003이 찾은 post-login convergence와 effective config read gap은 실제 gap입니다. 그러나 그것은 다음 중 하나일 수 있습니다.

* 한 번의 `account/read` 재확인으로 닫는 얇은 adapter 문제
* direct App Server 호출 한 개
* upstream SDK 개선 후보
* first-party surface를 쓰면 아예 AY-PLE 밖에 남는 문제
* 해당 UX를 제공하지 않음으로써 제거되는 문제

현재 흐름은 작은 public-seam gap을 발견할 때마다 “foundation이 소유할 application responsibility”로 승격할 유인이 있습니다. 003 자체는 신중하게 residual이라고만 기록했지만, 001의 envelope가 이미 Account lifecycle을 foundation 필수 책임으로 고정했기 때문에 결국 custom application work로 흘러갈 가능성이 큽니다.

최신 공식 surface도 이 전제를 약화합니다. 현재 OpenAI는 다음을 공식 제공하고 있습니다.

* Skills: ChatGPT desktop, Codex CLI, IDE extension에서 사용 가능
* Plugins: Skills, MCP config, connector, hook 등을 묶는 배포 단위
* MCP-backed app: structured data와 inspect·edit·compare·confirm을 위한 optional UI
* 공식 TypeScript Codex SDK
* authentication, conversation history, approvals, streamed events를 포함하는 rich-client용 App Server

따라서 “우리가 일반 Chat client를 만들어야만 Codex를 학업 product에 사용할 수 있다”는 전제는 성립하지 않습니다. ([OpenAI Developers][1])

# 3. Complexity audit

| Problem surface             | Existing owner                                                                                                                                                 | AY-PLE가 정말 소유해야 하는 residual                                                                       | 현재 계획의 과잉 여부                                                                         | Recommendation                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Account**                 | Codex App Server의 `account/read`, login, cancel, logout과 first-party client. Exact Python SDK도 대부분의 lifecycle을 이미 노출합니다.                                       | 자체 client를 유지할 경우 startup readiness 한 번과 최소한의 login 상태 projection. First-party surface를 쓰면 거의 없음. | **높음.** SDK notification gap을 AY-PLE account application으로 확대할 위험이 큼.                | Custom account center를 만들지 말고 first-party account를 사용하십시오. 자체 shell이 남을 때만 `account/read` 기반 gate와 bounded convergence를 둡니다. |
| **Config roots**            | Effective Codex config와 auth store mode는 App Server/config layering이 소유합니다.  ([OpenAI Developers][2])                                                          | AY-PLE app data, canonical 학업 DB, 선택 workspace pointer. Child를 직접 spawn할 때만 ambient env 차단.       | **부분적으로 높음.** Root 수명 분리는 필요하지만 별도 Codex config product까지 소유할 필요는 없음.                | ADR 0006의 root 분리는 유지하되, 별도 app-managed `CODEX_HOME`을 제품 불변조건에서 실험 대상으로 낮추십시오.                                               |
| **Workspace**               | AY-PLE가 `SemesterWorkspace`의 제품 의미를 소유하고 Codex가 native `cwd` semantics를 소유합니다.                                                                                 | Folder 선택, activation, missing/moved path 처리, 현재 workspace 표시.                                    | **낮음.** 실제 product core입니다. 다만 Chat foundation 문제가 아님.                               | 004·005를 합쳐 첫 Assignment vertical의 workspace activation으로 조사하십시오.                                                            |
| **Conversation catalog**    | App Server가 `thread/list`, `thread/read`, `thread/resume`, pagination, cwd filtering을 이미 제공합니다. ([OpenAI Developers][2])                                       | 첫 vertical에서는 필요하더라도 opaque active thread reference 또는 최근 한 작업 정도.                                | **매우 높음.** Multi-conversation을 product layer 선행조건으로 삼을 근거가 없음.                       | Sidebar, rename, archive, catalog를 defer하십시오. 실제 vertical에서 사용자가 대화를 다시 찾는 행동이 확인될 때 도입합니다.                                  |
| **Transcript**              | Native thread history와 first-party Codex client가 일반 transcript를 소유합니다. Current Browser transcript는 tab memory뿐입니다.                                             | 진행 중인 action 설명과 해당 `ModelingRun`에 필요한 최소 message projection. Canonical 학업 상태는 별도.                | **높음.** 일반 Chat transcript를 제품 persistence로 만들려는 방향은 제품 SSOT와 충돌.                    | Durable generic transcript를 소유하지 마십시오. Product에는 structured result, receipt, review 상태를 저장합니다.                               |
| **Reconnect**               | Native thread·turn 상태와 선택한 host/client가 소유할 문제입니다.                                                                                                             | `ModelingRun`이 `running/unknown/completed/failed` 중 무엇인지 재확인하고 사용자에게 재시도 또는 결과 확인 action을 주는 정도.  | **높음.** Snapshot, cursor, replay, live/cold convergence 전체는 speculative.             | 첫 vertical에는 honest unknown-outcome policy만 둡니다. Transcript replay infrastructure는 만들지 않습니다.                                 |
| **Multi-client**            | First-party client/product surface 또는 별도의 collaboration product가 소유할 문제.                                                                                       | 현재 MVP residual은 **0**. Remote multi-user도 명시적 non-goal입니다.                                       | **극심한 과잉.** 두 client는 architecture probe이지 사용자 requirement가 아님.                      | 013을 제거하십시오.                                                                                                                 |
| **Approvals**               | Codex App Server와 client가 command/file/network approval request와 request identity를 소유합니다. ([OpenAI Developers][2])                                             | 첫 action에 필요한 sandbox policy와, 실제로 발생하는 request family 하나씩. AY-PLE는 별도의 학업 Review만 소유.            | **지금은 높음.** Codex approval과 학업 Review가 섞일 위험도 있음.                                    | 첫 extraction vertical은 가능한 한 read-only로 시작하고, 실제 tool이 요구할 때만 interactive approval을 admission하십시오. 두 확인 경계는 유지합니다.           |
| **Local process lifecycle** | Official SDK/App Server 또는 선택한 first-party host. Current runtime은 Python/native process tree, bounds, reap을 custom 소유합니다.                                      | 자체 Shell을 배포할 경우 start, readiness, bounded stop. Plugin/first-party entrypoint면 크게 감소.            | **surface-dependent이지만 현재는 높음.** Delivery surface 결정 전에 lifecycle을 foundation으로 고정함. | 먼저 0009를 reopen하십시오. 자체 host가 선택된 후에만 필요한 lifecycle을 남깁니다.                                                                   |
| **Browser authorization**   | Local-web host가 token/session, CSRF, Host/Origin, local-process threat를 소유해야 함. Current code는 loopback와 Origin guard만 있고 user/session auth는 없습니다.              | Browser local web을 최종 surface로 선택한 경우에만 존재.                                                       | **자기 생성된 복잡성.** Browser surface 선택이 만든 문제.                                           | 008보다 앞서 local web이 필요한지 결정하십시오. 필요 없다면 surface 전체를 삭제합니다.                                                                   |
| **Chat UI**                 | Codex App·CLI·IDE 또는 mature donor가 일반 Chat interaction을 소유할 수 있습니다. First-party Codex app은 thread 전환, session/config reuse, Skills UI를 이미 제공합니다. ([OpenAI][3]) | 오른쪽 companion에서 action 설명, 진행, 정정, 중단, 필요한 follow-up만 표현.                                         | **매우 높음.** 020은 3-pane을 제외한 독립 desktop Chat UI를 설계함.                                 | 독립 Chat UI prototype을 중단하고 자료 선택·근거·Review가 포함된 3-pane vertical을 prototype하십시오.                                              |

# 4. Architecture options

## 4.1 요구한 여섯 대안 비교 — ownership와 제품 거리

| 대안                                                    | 실제 재사용                                                                                                             | 우리가 새로 소유할 코드와 lifecycle                                                                                                            | AY-PLE 고유 가치까지 거리                                           | Upstream 추종 비용                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| **1. 현재 Wayfinder 계속, 최소 residual 구현**                | App Server semantics, exact Python SDK, first-party behavior, donor pattern                                        | Account projection, workspace chooser, catalog, transcript, reconnect, multi-client routing, approval, local host security, Chat UI | **가장 멂.** product vertical은 모든 foundation research 뒤에 위치    | **매우 높음.** Exact pin·SDK patch·bridge와 donor behavior를 함께 추적 |
| **2. App Server에 아주 얇은 Browser projection**           | Auth, history, thread identity, approvals, streamed events 등 App Server native semantics. ([OpenAI Developers][2]) | Browser-safe adapter, minimal transport, local host security와 launcher                                                              | **중간.** right companion으로 바로 삽입하면 가까워짐                      | **중간~높음.** Direct protocol 사용 시 높고 official seam 사용 시 감소     |
| **3. Codex App·CLI·IDE의 Skill/Plugin/MCP 진입점**        | 기존 account, history, Chat UI, approval, Skills discovery와 first-party lifecycle                                    | Academic Skill, MCP tools, canonical SemesterModel store, optional Review UI                                                        | **가장 가까운 discovery 경로.** 일반 Chat을 전혀 만들지 않고 action 가치 검증 가능 | **낮음~중간.** 공식 extension contract만 추적                         |
| **4. Open WebUI/OpenCode/다른 OSS fork**                | Generic catalog, transcript, reconnect, UI, local-server pattern                                                   | Codex semantic adapter, fork maintenance, donor의 unrelated provider/config/security surface                                         | **중간보다 멂.** 다른 Chat product 안에 AY-PLE를 삽입하는 작업이 됨           | **매우 높음.** donor와 Codex 양쪽 추적                                |
| **5. 3-pane Shell부터 만들고 Chat은 최소 companion**          | Current runtime 또는 official SDK/App Server의 action 실행 일부                                                           | Workspace, source selection, EvidenceRef, StatePatch, Review, SemesterModel, 최소 companion                                           | **가장 가까움.** 제품 핵심 vertical 자체                               | **낮음~중간.** 실제 사용한 Codex seam만 추적                             |
| **6. Current runtime 유지, 일반 Chat 확장 중단, domain으로 이동** | 이미 구현한 exact pin, supervision, native identity, streaming, interrupt, tests                                        | Product adapter와 domain state만 추가. 기존 bridge/patch 유지비는 계속 존재                                                                       | **가까움.** 즉시 제품 vertical로 이동 가능                              | **중간~높음이지만 bounded.** 새 Chat 기능을 추가하지 않으면 통제 가능              |

## 4.2 Security, 3-pane 적합성과 숨은 전제

| 대안    | Security·auth·workspace·reconnect                                           | 3-pane 적합성                               | 현재 코드 처리                                                                   | 가장 위험한 숨은 전제                                                                     |
| ----- | --------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **1** | 모든 local-web 문제를 AY-PLE가 결국 소유                                              | 보통. foundation이 독립 app으로 굳어질수록 재배치 비용 증가 | 대부분 유지·확장                                                                  | “제품 전에 완전한 일반 Chat이 필요하다.”                                                       |
| **2** | Browser authorization과 host lifecycle은 여전히 남음. Native semantics 재발명은 감소     | 높음. 내부 right-pane adapter로 쓰기 좋음         | validation, bounds, native-ID handling 일부 유지; single lease와 tracer API는 교체 | “Browser projection이 최종 surface다.”                                               |
| **3** | first-party account·approval·history를 사용. 자체 canonical 학업 상태의 저장·권한은 별도로 필요 | 낮음~중간. 장기 3-pane 전체를 대체한다는 보장은 없음        | custom Chat runtime을 MVP에서 사용하지 않을 수 있음                                    | Plugin/MCP UI가 local file selection, evidence review와 durable local state에 충분하다. |
| **4** | OSS의 auth/config/provider assumptions까지 상속                                  | 보통                                       | 현재 코드는 대부분 버리지만 더 큰 외부 codebase를 소유                                        | Generic Chat donor의 state model을 Codex-native product에 싸게 맞출 수 있다.               |
| **5** | 실제 product action에 필요한 정책만 소유. Browser를 선택하면 해당 부분은 남음                      | **최고**                                   | runtime hardening은 provisional adapter로 재사용; Chat application policy는 버림   | Limited Chat reliability로도 첫 vertical을 검증할 수 있다. 제품 문서상 이 전제는 타당해 보임.            |
| **6** | 현재 isolated roots, process supervision, loopback/Origin을 계속 부담              | 높음                                       | hardening과 tests는 유지, single-slot UI와 generic expansion은 동결                | Exact pinned Python stack이 product vertical에 필요한 Skill/output seam까지 충분하다.       |

## 4.3 추천 shortlist

### 추천: **대안 5를 target architecture로, 대안 6을 transition으로 사용**

즉 다음 상태로 바꾸십시오.

* 3-pane product Shell과 첫 Assignment vertical이 roadmap의 중심입니다.
* Current runtime은 **foundation**이 아니라 **temporary Codex integration adapter**입니다.
* runtime에는 첫 vertical에 필요한 Skill/source/output-schema/terminal correlation만 admission합니다.
* multi-conversation, multi-client, generic recovery, full approval UI는 product observation이 생길 때까지 admission하지 않습니다.
* 첫 vertical 뒤 current runtime이 과하면 2 또는 3으로 교체합니다.

이 선택은 sunk cost를 보존하는 타협이 아닙니다. 현재 hardening 중 process reap, bounds, native identity, fail-closed decoding, deterministic tests는 유용할 수 있습니다. 반면 process-global current-thread policy, Browser tab-memory transcript, four-route tracer contract와 disconnect 즉시 auto-interrupt는 제품 architecture가 아니라 현재 tracer의 임시 정책입니다. 실제 코드도 새 thread 시작 시 이전 current thread를 release하고, accepted stream의 Browser 연결이 끊기면 자동 interrupt와 drain을 시작합니다.

### 병행할 discovery option: **대안 3**

공식 Skills는 desktop·CLI·IDE에서 사용 가능하고, Plugins는 Skill·MCP·hook 등을 묶을 수 있으며, MCP-backed app UI는 structured information의 inspect, edit, compare, confirm에 쓰도록 설계돼 있습니다. 이는 `StatePatch` Review와 매우 가까운 interaction입니다. ([OpenAI Developers][1])

다만 이를 최종 제품 architecture로 즉시 채택해서는 안 됩니다. 다음이 아직 검증되지 않았기 때문입니다.

* 사용자가 선택한 로컬 학기 폴더와 자료 selection을 제품이 원하는 방식으로 표현할 수 있는가
* `SemesterModel`을 Chat transcript와 독립된 local canonical state로 관리할 수 있는가
* 원문 위치와 변경안을 나란히 보는 장기 3-pane UX가 가능한가

따라서 대안 3은 **독립 Chat foundation을 삭제할 수 있는지 판단하는 첫 실험**이지, 검증 전 최종 선택은 아닙니다.

### Conditional fallback: **대안 2**

자체 3-pane Shell에 embedded Chat이 실제로 필요하다고 확인되면 App Server의 얇은 projection을 사용하십시오. App Server는 공식적으로 rich client를 위한 auth, history, approvals, streamed events interface입니다. ([OpenAI Developers][2])

단, 이를 다시 독립 Chat application 프로그램으로 확대하지 마십시오. AY-PLE 내부 adapter로만 두고 product feature가 사용하는 operation만 노출해야 합니다.

### 버릴 선택

* **대안 1:** 방법론은 좋지만 wrong-envelope optimization이므로 중단합니다.
* **대안 4:** donor pattern은 사용하되 fork/adoption은 거절합니다.
* **대안 6 단독:** 좋은 transition이지만 장기 target으로 삼으면 Python bridge·patch·isolated lifecycle이 관성으로 영구화됩니다.

OpenCode snapshot `d0ba538...`/package `1.17.18`은 MIT이지만 provider-keyed `auth.json`과 자체 config ownership을 전제합니다. Open WebUI `v0.9.5` snapshot은 Open WebUI branding 변경 제한을 포함합니다. Kanna `v0.41.7`은 package metadata에 MIT라고 적혀 있으나 실제 LICENSE에서 특정 개인·회사를 제외합니다. 이들은 codebase donor로 가져오기보다 UX·lifecycle comparator로만 유지해야 합니다.

## 4.4 ADR disposition

| ADR                                            | 판정                            | 당시 합리적이었던 이유                                                                                                            | 지금 다시 볼 evidence                                                                                                                                                                             | 대체 결정                                                                                                                                                     |
| ---------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0006 — package/app data/workspace roots 분리** | **부분 reopen**                 | 설치물, native state, 사용자 자료의 수명이 다르고 `process.cwd()` fallback은 위험함                                                        | Effective config/auth authority는 Codex가 이미 소유하고 별도 app-managed Codex home이 account/config lifecycle을 새로 만듦. First-party Codex app은 CLI·IDE의 session history와 config를 이어받기도 함.  ([OpenAI][3]) | `packageRoot`, AY-PLE `appDataRoot`, `workspaceRoot` 분리는 유지. 별도 `CODEX_HOME`은 기본 불변조건이 아니라 test isolation 또는 검증된 non-interference 요구가 있을 때만 사용.           |
| **0009 — macOS-first local web app**           | **reopen**                    | macOS 범위와 Browser UI는 빠른 prototype·QA에 합리적이었음                                                                           | local web이 Browser authorization, multiple clients, launcher, stale process, Host/Origin, reconnect 문제를 제품 책임으로 만듦. 현재는 first-party plugin/app와 official SDK 선택지가 존재함.                       | macOS-first는 유지하되 local-web은 dev/prototype surface로 낮춤. 최종 surface는 3-pane shell 또는 first-party entrypoint 실험 뒤 결정.                                       |
| **0011 — official Python SDK baseline**        | **원칙 유지, 구현 reopen**          | 당시 custom TypeScript protocol과 community fork보다 official Python SDK가 process, routing, streaming, interrupt를 훨씬 많이 소유했음 | 현재 official TypeScript `@openai/codex-sdk`가 존재하고, App Server도 deep product integration의 공식 interface로 문서화됨.  ([OpenAI Developers][4])                                                        | “official implementation과 native identity를 우선한다”는 원칙은 유지. Python bridge·patch stack은 first vertical 요구와 current TS/App Server seam을 비교한 뒤 fallback으로만 존속. |
| **0012 — Chat-only cutover와 legacy 제거**        | **핵심 유지, survivor 지위 reopen** | 실제 consumer 없는 legacy graph와 generic abstraction을 제거한 것은 옳았음                                                            | 남은 Chat path의 code quality가 독립 Chat application을 제품 선행조건으로 만들지는 않음. 제품 고유 vertical은 여전히 미구현.                                                                                                 | Legacy를 복원하지 말고 generic runtime도 만들지 않음. 다만 survivor runtime을 “제품 foundation”이 아니라 “교체 가능한 integration adapter”로 재분류.                                     |

명시적으로 요청된 ADR은 아니지만 **ADR 0007을 상위 governing decision으로 승격하는 것이 맞습니다.** 해당 ADR은 이미 “실제 기능이 요구할 때 capability를 case by case로 채택하고, 범용 interaction framework를 만들지 않는다”고 결정했습니다. 현재 001의 broad foundation envelope가 오히려 ADR 0007의 정신과 충돌합니다.

# 5. Wayfinder ticket disposition

| Ticket                                    | 분류                             | 판단                                                                                                                                                          |
| ----------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **004 Workspace/cwd**                     | **계속 조사 — 단, 대폭 축소**           | Workspace는 첫 vertical의 핵심입니다. Native cwd/resume 전체 inventory가 아니라 “활성 SemesterWorkspace를 한 action의 cwd로 안전하게 사용할 수 있는가”만 남깁니다.                              |
| **005 Workspace selection**               | **다른 ticket과 합침**              | 004에 합쳐 `Workspace activation for first Assignment vertical` 하나로 만듭니다. Native picker와 Browser picker 비교는 0009 surface 선택 뒤에만 필요합니다.                         |
| **006 Conversation cold recovery**        | **제품 layer 이후로 defer**         | App Server에 list/read/resume가 있다는 사실 확인은 충분합니다. Full catalog, pagination, title, ordering, cold transcript는 실제 thread UX가 드러난 뒤 결정합니다.                      |
| **007 Live rejoin·activity·pending**      | **제품 layer 이후로 defer**         | 세 개의 다른 요구를 한 ticket에 묶었습니다. 첫 product action이 요구하는 pending input 또는 status refresh만 별도 admission하고, live reconnect/activity generalization은 보류합니다.         |
| **008 Local companion lifecycle/control** | **새로운 상위 질문으로 대체**             | “AY-PLE가 local-web Chat host를 소유하는가?”를 먼저 답해야 합니다. 답이 yes일 때만 lifecycle/security subset을 새로 엽니다.                                                            |
| **009 Adoption disposition gate**         | **새로운 상위 질문으로 대체**             | 현재 009는 너무 늦고 001 envelope 안에 갇혀 있습니다. 새 질문은 **“AY-PLE가 일반 Chat client를 소유해야 하는가, 아니면 first-party surface 또는 product-bound companion을 쓰는가?”**여야 합니다.        |
| **013 Two-client/restart probe**          | **제거**                         | 두 Browser client는 실제 MVP journey가 아니라 architecture stress probe입니다. 지금 증명할 product outcome이 없습니다.                                                           |
| **014 Accepted disconnect convergence**   | **재작성된 009 surface gate까지 보류** | Browser projection을 최종 선택한 경우에만 최소 disconnect/unknown-outcome probe를 수행합니다. 선택하지 않으면 삭제합니다.                                                                 |
| **015 Pending interaction·approval**      | **제품 layer 이후로 defer**         | 첫 action이 실제 command/file/network approval을 발생시킬 때 request family별로 추가합니다. “stable rich client라면 모두 지원해야 한다”는 기준은 AY-PLE MVP requirement가 아닙니다.             |
| **017 Error/restart reconciliation**      | **제거**                         | 실제 product operation 없이 generic error/recovery taxonomy를 정하려는 ticket입니다. 각 `ModelingRun`의 실제 failure에서 정책을 파생해야 합니다.                                        |
| **020 Desktop Chat UI contract**          | **제거**                         | 3-pane과 product layer를 명시적으로 제외한 채 desktop Chat 완성도를 검증합니다. 현재 가장 잘못된 순서를 직접 구현하는 ticket입니다. 이를 3-pane Assignment vertical prototype으로 대체합니다.               |
| **021 Verification/spec readiness**       | **새로운 상위 질문으로 대체**             | “required Chat surface마다 remaining fog 0”이 아니라 “첫 학업 vertical의 source selection → structured patch → review → durable state가 falsifiable하게 닫혔는가”를 승인해야 합니다. |

결과적으로 계속할 독립 research는 사실상 **축소된 004+005 하나**입니다. 나머지는 product vertical에서 실제 requirement가 발생한 뒤 다시 admission해야 합니다.

# 6. 최소 다음 행동

| Decision 또는 experiment                          | 답하려는 질문                                                                                                                   | 가장 작은 evidence                                                                                                                                                | Stop condition                                                                                                                 | 결과에 따라 삭제·유지할 계획                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Product surface ownership gate**           | AY-PLE MVP가 자체 Chat client 없이 first-party Skill/Plugin/MCP surface에서 핵심 가치 흐름을 제공할 수 있는가?                                 | 동일한 두 TXT 자료와 하나의 `Assignment` schema를 사용해 `자료 선택 → action → EvidenceRef가 있는 StatePatch → 수락/수정 → 재열기`를 first-party surface와 minimal 3-pane shell에서 각각 한 번 수행 | 어느 한 surface가 general Chat catalog/reconnect를 만들지 않고 전체 흐름을 닫거나, first-party surface가 local file/state/review 요구에서 명확히 실패하면 종료 | First-party가 충족하면 독립 Chat foundation 전체 삭제. 실패하면 3-pane shell + thin companion 유지. 어느 결과든 broad Wayfinder는 삭제                                   |
| **2. First vertical capability envelope proof** | 실제 첫 Assignment vertical에 multi-conversation, reconnect, two-client, full approval이 필요한가?                                 | Current runtime을 동결한 상태에서 `workspace + source mention + Skill + output schema + terminal result → ModelingRun → StatePatch` 한 번과 product-state reload 한 번     | Transcript를 복원하지 않고도 confirmed SemesterModel과 Review 결과를 다시 열 수 있으면 종료                                                         | 통과하면 006·007·013·014·015·017을 pre-product plan에서 삭제/defer. 실패가 transcript dependency 때문이면 generic transcript를 만들지 말고 product state boundary를 수정 |
| **3. Official seam replacement probe**          | 첫 vertical의 정확한 capability envelope를 current official TypeScript SDK 또는 current App Server가 Python bridge·patch 없이 제공하는가? | UI 없이 account readiness, explicit cwd, 필요한 Skill/source/output contract, one turn, interrupt 또는 cancel, terminal result만 호출. 별도 controlled test roots 사용      | 첫 vertical 필수 seam 하나가 안정된 public interface에 없으면 즉시 종료                                                                         | 모두 충족하면 Python bridge·ordered patch·Node supervision 범위를 삭제 또는 축소. 실패하면 current runtime을 frozen fallback으로 유지하되 general Chat 기능은 추가하지 않음        |

이 세 실험의 목적은 새 architecture를 설계하는 것이 아니라 **삭제할 계획을 최대화하는 것**입니다.

# 7. What not to build

현재 단계에서는 다음을 만들지 마십시오.

* 독립 multi-conversation sidebar, title, archive, pagination과 catalog persistence
* 두 Browser client의 selection sync, controller ownership, stale mutation protocol
* reconnect cursor, replay journal, snapshot/offset protocol, late-attach event bus
* Browser transcript를 별도 canonical Chat store로 영속하는 계층
* full interactive approval center와 모든 App Server pending request family의 UI
* 자체 OAuth/account management center 또는 자체 `config.toml` editor
* local-web surface 결정 전의 cookie/session/capability-token authorization architecture
* `LocalChatHost`, generic Conversation Module, hydration/reconciliation framework와 generic error taxonomy
* Open WebUI·OpenCode·Kanna의 fork 또는 AY-PLE 내부 generic provider abstraction
* 3-pane과 학업 Review를 제외한 독립 desktop Chat UI prototype
* SDK에 없는 모든 native method를 AY-PLE public application API로 승격하는 adapter
* current runtime hardening을 보존하기 위한 기능 roadmap

특히 다음 네 가지는 **현재 코드가 잘 만들어졌다는 이유로 유지하면 안 됩니다.**

1. process-global current thread/turn lease
2. 새 conversation에서 transcript를 비우는 Browser policy
3. Browser disconnect를 native interrupt로 해석하는 정책
4. 네 tracer route를 장기 product API로 취급하는 것

반대로 자체 runtime이 첫 vertical에 계속 사용된다면 process-tree reap, bounded queues/deadlines, ambient environment 차단, native identity 보존, fail-closed decoding과 deterministic tests는 유지 가치가 있습니다. 이것들은 product scope가 아니라 integration safety invariant이기 때문입니다.

# 8. Confidence와 missing evidence

## Confidence

* **독립 일반 Chat foundation을 중단해야 한다:** **0.90 / 높음**
* **3-pane Shell first + thin companion이 올바른 target이다:** **0.80 / 높음**
* **Current runtime을 transition adapter로 단기 재사용해야 한다:** **0.75 / 중상**
* **First-party Skill/Plugin/MCP surface가 MVP 전체를 대체할 수 있다:** **0.55 / 중간**
* **Official TypeScript SDK가 current Python bridge를 즉시 대체할 수 있다:** **0.50 / 미확인**

## 결론을 뒤집을 수 있는 missing evidence

1. **실제 사용자 행동이 action/review보다 persistent open-ended Chat 중심이라는 증거**
   학생들이 여러 conversation을 지속적으로 오가며 transcript 자체를 핵심 학업 자산으로 사용한다면 catalog와 cold recovery 우선순위가 올라갑니다.

2. **First-party extension surface의 local-first 제약**
   Skill/Plugin/MCP app이 선택한 local folder, 원문 위치, durable SemesterModel, side-by-side evidence review를 구현할 수 없다면 자체 Shell이 필요합니다. 다만 이것도 독립 general Chat foundation의 필요성을 의미하지는 않습니다.

3. **첫 academic action이 실제로 요구하는 runtime 권한**
   TXT/PDF 읽기와 structured output만으로 충분하지 않고 command execution, file writes, network access와 pending user input이 항상 필요하다면 approval subset을 앞당겨야 합니다.

4. **Current official SDK의 exact capability coverage**
   TypeScript SDK가 thread run/resume 수준에 머물고 Skill/source/output contract나 account/config seam이 충분하지 않다면 exact Python runtime을 더 오래 유지해야 합니다. 공식 TypeScript SDK가 현재 존재한다는 사실만으로 parity를 가정해서는 안 됩니다. ([OpenAI Developers][4])

5. **배포 제약이 Browser local web을 강제하는 증거**
   교육 환경, 설치 권한, 배포 채널 또는 UI 기술 때문에 browser + local companion이 유일한 현실적 경로라면 008과 014의 일부가 필요해집니다. 그 경우에도 multi-client와 general Chat completeness는 별도 증거가 있어야 합니다.

현재 evidence에서 가장 강한 모순은 이것입니다.

> Product Brief는 “실제 기능이 생길 때 capability를 case by case로 채택하고, Codex 위에 범용 framework를 만들지 않는다”고 말하지만, Chat foundation Wayfinder는 제품 기능 전에 일반 rich-client의 lifecycle surface를 거의 전부 닫도록 요구합니다.

따라서 지금 가장 합리적인 architecture contraction은 **Wayfinder를 더 잘 수행하는 것**이 아니라, **Wayfinder의 destination을 폐기하고 첫 Assignment vertical이 요구하는 surface만 다시 admission하는 것**입니다.

[1]: https://developers.openai.com/codex/build-skills "
  Build skills | ChatGPT Learn
"
[2]: https://developers.openai.com/codex/app-server "https://developers.openai.com/codex/app-server"
[3]: https://openai.com/index/introducing-the-codex-app/ "https://openai.com/index/introducing-the-codex-app/"
[4]: https://developers.openai.com/codex/codex-sdk "https://developers.openai.com/codex/codex-sdk"
