# Runtime Harness and Codex Adapter Foundation

## 기존 에이전트 작업 분류 기록

- State: completed
- Surface: local-prd
- Next actor: none

## 현재 구현 상태

- 상태: 2026-07-10 구현 완료.
- 이슈 001–007에서 정의한 패키지 구성, Runtime Inspector, Fake/Codex 단일 실행 동작 일치, 실제 프롬프트·취소 검증, `capability-slots.ts`는 현재 구현 지도에 반영되어 있다.
- 이 PRD는 1주차 요구사항을 기록하는 과거 문서이며 남은 에이전트 작업은 없다. [ADR 0005](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md)는 제품 연결 단계에서 `AgentRuntimeKernel`의 역할을 Runtime Harness 범위로 한정한다.

## Problem Statement

AY-PLE는 Codex에 기반한 학업 제품 기능을 올리기 전에 안정적인 local agent runtime 기반이 필요하다. 현재 코드베이스에는 제품 방향, runtime ownership spike, starter client/server 앱이 있지만, 제품 module이 신뢰할 수 있는 Runtime Harness, Runtime Inspector, AgentRuntimeKernel, FakeRuntimeAdapter, CodexRuntimeAdapter는 아직 없다.

핵심 위험은 순서다. AY-PLE가 SourceSelection, StatePatch, Review, TrustedState를 raw Codex app-server event 위에 바로 만들면 제품 동작이 바뀔 수 있는 protocol detail에 결합된다. 반대로 FakeRuntimeAdapter만 오래 만지면 실제 Codex app-server 제약을 너무 늦게 발견해 4주 캠프 일정이 흔들릴 수 있다. Week 1에는 학업 제품 가치를 올리기 전에 AY-PLE가 Codex-backed run을 시작하고, 관찰하고, 취소하고, 기록하고, normalize할 수 있다는 기반을 증명해야 한다.

## Solution

AY-PLE를 위한 package-first Runtime Harness 기반을 만든다. 첫 산출물은 학생-facing AY-PLE 제품 UI도 아니고 polished general chat app도 아니다. runtime package들로 뒷받침되는 developer-facing Runtime Inspector다.

Runtime Harness는 개발자가 Fake 또는 Codex runtime behavior를 선택하고, prompt를 보내고, transcript-like output을 보고, raw Codex app-server message를 검사하고, normalized run lifecycle event를 확인하고, 진행 중인 작업을 취소하고, failure state와 저장된 run log를 볼 수 있게 한다. AY-PLE product-specific flow를 시작하기 전에 CodexRuntimeAdapter가 FakeRuntimeAdapter와 parity를 가져야 한다.

Codex app-server contract는 reference-first로 다룬다. 공식 OpenAI 문서, pinned Codex version에서 생성한 schema/type, open-source Codex app-server 자료가 raw protocol behavior의 기준이다. AY-PLE는 이후 어떤 runtime capability를 학생에게 친화적인 제품 경험으로 승격할지 별도로 결정한다.

## User Stories

1. AY-PLE 개발자로서, 제품 기능보다 먼저 Runtime Harness를 만들고 싶다. 그래야 runtime 불확실성이 학업 workflow로 새지 않는다.
2. AY-PLE 개발자로서, Runtime Inspector에서 FakeRuntimeAdapter로 prompt를 실행하고 싶다. 그래야 auth, network, model behavior에 의존하지 않고 UI와 kernel loop를 개발할 수 있다.
3. AY-PLE 개발자로서, Runtime Inspector에서 CodexRuntimeAdapter로 prompt를 실행하고 싶다. 그래야 실제 Codex app-server 제약을 Week 1 안에 발견할 수 있다.
4. AY-PLE 개발자로서, Fake run과 Codex run이 호환되는 normalized lifecycle event를 내보내길 원한다. 그래야 product code가 하나의 안정된 runtime contract에 의존할 수 있다.
5. AY-PLE 개발자로서, AY-PLE SourceSelection 또는 Review 작업 전에 CodexRuntimeAdapter parity를 확보하고 싶다. 그래야 제품 기능이 상상 속 runtime 위에 만들어지지 않는다.
6. AY-PLE 개발자로서, runtime이 app-owned Codex binary와 runtime home을 사용하길 원한다. 그래야 AY-PLE가 사용자의 global Codex 설치나 global Codex 상태에 의존하지 않는다.
7. AY-PLE 개발자로서, Runtime Inspector에서 Codex binary, version, runtime home, working directory 상태를 보고 싶다. 그래야 실제 어떤 runtime이 사용되는지 확인할 수 있다.
8. AY-PLE 개발자로서, Runtime Inspector에서 prompt input과 transcript-like output을 보고 싶다. 그래야 기본 turn behavior를 익숙한 형태로 확인할 수 있다.
9. AY-PLE 개발자로서, Runtime Inspector에서 raw Codex app-server message를 보고 싶다. 그래야 normalize하기 전에 protocol behavior를 debug할 수 있다.
10. AY-PLE 개발자로서, Runtime Inspector에서 normalized run event를 보고 싶다. 그래야 AgentRuntimeKernel contract를 raw Codex detail과 분리해서 검증할 수 있다.
11. AY-PLE 개발자로서, run output streaming 또는 incremental output이 보이길 원한다. 그래야 오래 걸리는 Codex 작업이 멈춘 것처럼 보이지 않는다.
12. AY-PLE 개발자로서, Fake와 Codex adapter 모두에서 cancellation이 동작하길 원한다. 그래야 AY-PLE가 이후 잘못되었거나 길게 도는 ModelingRun을 중지할 수 있다.
13. AY-PLE 개발자로서, runtime failure가 normalized failed run state로 mapping되길 원한다. 그래야 auth, spawn, protocol, turn failure를 일관되게 드러낼 수 있다.
14. AY-PLE 개발자로서, 각 run이 durable log를 남기길 원한다. 그래야 UI state가 바뀐 뒤에도 failure와 parity gap을 검사할 수 있다.
15. AY-PLE 개발자로서, Runtime Inspector에서 run history를 보고 싶다. 그래야 Fake와 Codex behavior를 여러 시도에 걸쳐 비교할 수 있다.
16. AY-PLE 개발자로서, pinned Codex version에서 생성한 app-server schema/type을 사용하고 싶다. 그래야 raw protocol call이 손으로 추측한 형태가 아니라 실제 Codex contract를 따른다.
17. AY-PLE 개발자로서, Codex runtime package에서 Codex app-server endpoint를 broad-shallow하게 접근하고 싶다. 그래야 start, steer, interrupt, read, list 같은 common capability를 제품 UX 결정 전에 발견할 수 있다.
18. AY-PLE 개발자로서, product semantics는 좁고 안정적으로 유지하고 싶다. 그래야 AY-PLE-specific flow가 검증된 runtime lifecycle behavior만 소비한다.
19. AY-PLE 개발자로서, package-first topology를 사용하고 싶다. 그래야 runtime foundation package와 이후 AY-PLE product package가 starter app 안에서 뒤엉키지 않는다.
20. AY-PLE 개발자로서, Runtime Inspector capability를 engine-inspection affordance로 다루고 싶다. 그래야 학생-facing AY-PLE UI에 그대로 노출하겠다는 약속으로 오해되지 않는다.
21. AY-PLE product designer로서, chat-like runtime control을 예약하되 아직 productize하지 않고 싶다. 그래야 나중에 AY-PLE 표면에서 학생 친화적인 interaction으로 번역할 수 있다.
22. AY-PLE 개발자로서, raw Codex protocol type을 Codex runtime package 내부에 가두고 싶다. 그래야 AY-PLE product package가 Codex-specific message shape에 의존하지 않는다.
23. AY-PLE 개발자로서, public third-party example은 license review 이후 참고하고 싶다. 그래야 복사한 코드가 유지보수나 법적 위험을 만들지 않는다.
24. AY-PLE 개발자로서, Week 1 Definition of Done을 명확히 하고 싶다. 그래야 runtime foundation에서 product-specific modeling/review flow로 넘어갈 수 있는 시점을 알 수 있다.

## Implementation Decisions

- 첫 build target은 학생-facing AY-PLE product slice가 아니라 Runtime Harness and Codex Adapter Foundation이다.
- 첫 UI는 Runtime Inspector다. Runtime Inspector는 prompt input, transcript-like output, runtime status, raw/debug log, normalized event, cancellation, run history를 가진 developer-facing inspection surface다.
- Runtime Inspector control은 이후 product design을 위해 runtime capability의 자리를 예약하지만, 같은 control을 AY-PLE 학생-facing UI에 노출하겠다는 약속은 아니다.
- repository는 early package-first topology를 사용한다. runtime package를 먼저 구현하고, AY-PLE product package는 boundary placeholder로 둘 수 있지만 product behavior는 runtime parity gate 이후에 시작한다.
- core runtime model은 chat-message-centric이 아니라 run-centric이다. Inspector는 run을 chat-like shape로 보여줄 수 있지만, AgentRuntimeKernel은 run lifecycle, cancellation, failure, normalized event, log를 소유한다.
- primary module seam은 AgentRuntimeKernel이다. Product-specific flow는 raw Codex app-server event가 아니라 kernel의 normalized runtime behavior에 의존해야 한다.
- FakeRuntimeAdapter와 CodexRuntimeAdapter는 같은 runtime adapter role을 만족해야 한다. FakeRuntimeAdapter는 deterministic UI와 kernel 개발을 위한 것이며, 실제 Codex parity의 대체물이 아니다.
- CodexRuntimeAdapter parity는 SourceSelection, StatePatch, Review, TrustedState 구현을 시작하기 전 필수 gate다.
- Week 1 parity target은 2026-07-12 일요일 `codex/w1d7` 작업이 시작되기 전이다.
- parity gate는 같은 Runtime Inspector가 FakeRuntimeAdapter와 CodexRuntimeAdapter 모두로 prompt를 실행하고 취소할 수 있어야 한다.
- parity gate는 started, output, completed 또는 failed, cancelled run state에 대해 호환되는 normalized event를 요구한다.
- parity gate는 Fake run과 Codex run이 같은 log format으로 run log를 남길 것을 요구한다.
- Codex runtime package는 scratch-built가 아니라 reference-first로 만든다. 공식 OpenAI 문서, pinned Codex version의 generated schema/type, open-source Codex app-server 자료가 raw protocol behavior를 정의한다.
- Generated Codex app-server type은 adapter-internal이다. AY-PLE product-facing contract가 되어서는 안 된다.
- Codex runtime package는 broad-shallow protocol coverage를 지원해야 한다. 특히 Runtime Inspector experiment를 위해 raw endpoint coverage는 stable runtime semantics보다 넓을 수 있다.
- Codex runtime package 내부에는 generated-schema-backed app-server method를 노출하는 작은 raw Codex client가 있을 수 있다. 이것은 같은 package 안의 role split이며, 무거운 abstraction mandate가 아니다.
- CodexRuntimeAdapter는 raw Codex event를 runtime-core consumer가 이해하는 normalized run event로 번역한다.
- 이 PRD에서는 generic multi-provider runtime framework, adapter factory hierarchy, runtime marketplace, raw Codex type에 대한 product dependency를 피한다.
- server app은 browser-safe streaming을 포함해 Runtime Inspector transport를 위한 local companion host 역할을 한다. browser는 Codex app-server stdio와 직접 통신하지 않는다.
- Inspector app은 CodexRuntimeAdapter를 직접 소비하지 않고, server가 노출하는 runtime state와 event stream을 소비한다.
- prompt, transcript, streaming, cancellation, error display, history, profile slot, attachment, approval, settings, thread/session slot 같은 일반 AI chat capability는 engine shape에서 고려하되, product 노출 여부는 이후 별도로 결정한다.

## Testing Decisions

- 가장 높은 안정 seam인 AgentRuntimeKernel behavior를 runtime adapter role을 통해 테스트한다. 테스트는 internal adapter implementation detail이 아니라 외부 run lifecycle behavior를 검증해야 한다.
- FakeRuntimeAdapter test는 deterministic started, output, completed, failed, cancelled behavior를 증명해야 한다.
- CodexRuntimeAdapter test는 local auth와 runtime setup이 허용되는 범위에서 pinned Codex app-server에 대한 smoke/parity check를 포함해야 한다.
- Generated schema/type은 pinned Codex version에서 재생성해야 하며, Codex version이 바뀔 때 schema change가 code review에서 보여야 한다.
- Runtime Inspector는 Fake와 Codex adapter 모두에 대해 prompt execution, streaming 또는 incremental output, cancel, failure display, normalized event display, raw/debug log display, run history를 검증해야 한다.
- Run log test는 raw Codex event가 다르더라도 Fake와 Codex run이 같은 normalized log structure를 저장하는지 확인해야 한다.
- Failure test는 가능한 범위에서 fake failure, missing Codex binary 또는 spawn failure, initialization failure, turn failure mapping을 포함해야 한다.
- Cancellation test는 cancel request가 normalized cancelled state로 이어지고 UI가 running state에 남지 않는지 확인해야 한다.
- Product package placeholder는 이 PRD에서 product behavior test를 요구하지 않는다. 목적은 implementation completeness가 아니라 boundary reservation이다.
- Runtime smoke behavior의 선행 자료는 Runtime Ownership Spike에 있다. 특히 app-owned Codex binary resolution, isolated runtime home, app-server initialize handshake가 참고 대상이다.

## Out of Scope

- AY-PLE SourceSelection 구현.
- StatePatch, EvidenceRef, Review, TrustedState, MarkdownProjection behavior 구현.
- 학생-facing AY-PLE academic workspace UI 구현.
- Runtime Inspector를 general-purpose chat product로 polishing.
- LMS login, file parsing, PDF/HWP/PPT extraction, OCR, academic material intake.
- Raw observation과 reserved slot을 넘어선 full tool approval UX.
- 복잡한 steer/interrupt conflict handling algorithm.
- Multi-runtime marketplace 또는 generic provider framework.
- Desktop packaging, installer UX, cloud sync, external calendar sync, mobile layout.
- 이 PRD를 위한 GitHub Issue 또는 pull request 생성.

## Further Notes

- 이 PRD는 AY-PLE product layer보다 Runtime Harness를 먼저 만든다는 ADR 0003을 따른다.
- 현재 날짜는 2026-07-09 목요일이다. 구체적인 Week 1 목표는 2026-07-12 일요일 작업이 시작되기 전 CodexRuntimeAdapter parity를 확보하는 것이다.
- PRD 작성 시 관찰된 working branch는 `codex/w1d4`였다. 구현은 repo의 daily branch와 camp PR 규칙을 계속 따라야 한다.
- Matt Pocock skill artifact는 camp submission PR template과 혼동하면 안 된다. 이 PRD는 pull request body가 아니라 local issue-tracker artifact다.
