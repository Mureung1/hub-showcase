# AY-PLE 제품 데모 UI 판단 기록

## 검증 질문

| 항목 | 내용 |
| --- | --- |
| 질문 | 첫 AY-PLE Review Workspace는 어떤 학업 작업공간이어야 하는가? |
| 시나리오 | 문제해결글쓰기 / 개요 작성하기 → 문제해결글쓰기 개요 작성 / 2026-07-12 23:59 |
| 기본 산출물 | [index.html](index.html) |
| 검토 대기 | [6단계](index.html?step=6&present=1) |
| 반영 완료 | [7단계](index.html?step=7&present=1) |
| 구성 파일 | [scenario.mjs](scenario.mjs), [product-demo-core.mjs](product-demo-core.mjs), [demo.js](demo.js), [demo.css](demo.css)와 `styles/` |
| 브랜드 자산 | [ay-ple-logo.png](../../../assets/brand/ay-ple-logo.png), [ay-ple-mark.png](../../../assets/brand/ay-ple-mark.png), [ay-profile.png](../../../assets/brand/ay-profile.png) |
| 원본 화면 | [index.html](index.html)에 포함한 결정적 자료 preview |
| 실행 방법 | `npm run demo` 후 `http://127.0.0.1:4174/artifacts/camp-demo/product-flow/?step=1&present=1` |
| 검증 화면 | 1440×900과 1920×1080 화면 공유를 기준으로 page scroll 없이 표시하며, 핵심 원문·대화·제안은 13–15px, 보조 label은 11–13px 범위로 유지 |
| 제약 | Backend, model 호출, persistence가 없는 browser-native 발표 시제품 |

## 원본 자료 탭

| 편집기 탭 | 자료 탐색기 항목 | 검증하는 내용 |
| --- | --- | --- |
| `lms-outline-notice.txt` | 문제해결글쓰기 선택 자료 | 왼쪽에서 선택한 실제 원본이 중앙의 열린 자료로 읽히는가? |
| `problem-solving-syllabus.pdf` | 문제해결글쓰기 선택 자료 | PDF 추출 내용을 Markdown 편집/preview 전환과 함께 검토할 수 있는가? |

## 피드백 반영 기록

| 2026-07-08 피드백 | 반영 판단 |
| --- | --- |
| Editor tab은 생성된 workspace surface가 아니라 실제 선택 원본이어야 한다. | `lms-outline-notice.txt`와 `problem-solving-syllabus.pdf`를 source explorer와 중앙 tab에서 같은 이름으로 사용한다. |
| ChatSidecar가 실제 chat UI와 멀고 inline dropdown처럼 느껴진다. | 왼쪽 자료, 중앙 원본, 오른쪽 AY 대화를 지속적으로 보이는 3-pane workspace로 구성하고 검토 action은 AY message 안에 둔다. |
| 학생 화면에 개발자용 내부 용어가 노출된다. | `ModelingRun`, `ReviewState`, `TrustedState`는 docs/code에만 두고 UI에는 `선택한 자료 정리하기`, `검토 대기`, `반영됨`을 사용한다. |
| `mp3`, `png`까지 선택하면 과제 시나리오의 초점이 흐려진다. | 주변 자료로는 보이되 TXT 공지와 PDF 강의계획서 두 개만 선택하고 preview tab으로 연다. |
| TXT가 Markdown처럼 보이거나 PDF 내용 안에 편집 control이 있으면 안 된다. | TXT는 plain text 형태로 표시하고 `편집하기`/`프리뷰 보기`는 문서 toolbar에 둔다. |
| `AY가 참고한 문장` 같은 해석을 원본 preview에 섞지 않아야 한다. | 원본은 그대로 두고 AY가 찾은 값과 위치는 별도 evidence panel에 표시한다. |
| 한 화면에 모든 후속 surface를 고정하면 제품 범위를 너무 일찍 제한한다. | 자료 선택, Assignment 제안과 수락까지만 고정하고 timeline, 추천 task, 읽기 surface는 후속 검증으로 남긴다. |
| 생성 이미지 mockup과 실제 HTML/CSS 판단이 달라진다. | 독립 screen mockup은 제거하고 실제 prototype에 연결하는 좁은 brand asset만 유지한다. |
| IDE나 OS chrome을 흉내 내면 학생용 제품보다 개발자 도구처럼 보인다. | AY-PLE header와 밝은 학업 workspace를 사용하고 source selection은 왼쪽 explorer에 둔다. |
| 상태 전환용 prototype toggle은 제품 UI처럼 보이지 않는다. | 자료 선택부터 수락까지 실제 action으로 전환하고, 수락 전후에도 같은 workspace와 제안을 유지한다. |
| 단계마다 Chat 내용을 덮어쓰면 실제 대화 기록처럼 보이지 않는다. | 처음에는 빈 Chat을 보이고, 작업 요청·AY 응답·도구 기록·제안·결정 결과를 각각 별도 항목으로 누적한다. |
| Composer에서 정정하면 수정 대상과 조작 위치가 멀어 발표 중 맥락이 끊긴다. | `수정 요청`은 제안 카드 안의 prompt form을 열어 AY에게 보낼 요청과 응답을 같은 카드에 남기고, 공통 Composer는 이 시제품에서 비활성 안내로 둔다. |
| 원본 근거 아래 `변경 제안 검토하기` CTA는 하단 이동과 역할이 겹치고 근거 영역을 압박한다. | 중앙 workspace CTA를 DOM·상태에서 제거하고, 근거 확인 뒤 제안 진입은 AY 대화의 `제안 보기`로 유지한다. |
| 작업 요청 아래 `AY가 한 작업 보기` CTA도 하단 단계 이동과 같은 상태 전환을 중복한다. | 중앙 workspace action wrapper 전체를 DOM·상태·CSS에서 제거하고, 작업 요청에서 도구 기록으로의 전환은 하단 `다음`으로 단일화한다. |
| dark theme는 대학생 대상 학업 제품보다 개발자 도구에 가깝다. | 따뜻한 paper surface, ink text와 coral/green/yellow brand accent를 사용하는 light-first 방향을 채택한다. |
| mobile 피드백이 desktop Review Workspace 검증을 분산시킨다. | 저장소 Interface Scope에 따라 desktop 1440~1920px을 검증 대상으로 유지한다. |

초기 static prototype은 `styles.css`, 검토 대기/반영 완료 shell과 별도 iframe preview로 판단을 나눠 검증했다. 2026-07-16에 [index.html](index.html), [demo.css](demo.css), [demo.js](demo.js)의 단일 상태 흐름이 이 판단을 흡수했으며 별도 static 실행물은 제거했다.

## 현재 판정

| 판단 | 내용 |
| --- | --- |
| Workspace 구조 | 자료 목록 / 원본 preview / AY chat을 지속적으로 보이고, 누적 대화 안에서 변경 제안을 정정하거나 결정한다. |
| 유지 | 실제 원본명 tab, 분리된 evidence panel, 누적 transcript, 명시적 수락, light-first academic tone |
| 후속 검증 | 제품 vertical과 연결할 때 resize, 상태 persistence, 실제 source loading과 편집 범위를 검증한다. |
| 제거 | 별도 static shell, variant switcher, 생성 이미지 기반 layout 판단 |

## 발표용 guided flow 승격 기록

| 항목 | 내용 |
| --- | --- |
| 검증 질문 | AI Agent를 처음 접하는 사람이 90초 안에 AY-PLE가 Agent 제품인 이유를 이해할 수 있는가? |
| 기본 산출물 | [Camp demo product flow](index.html) |
| 상태 | Backend, model 호출, persistence가 없는 결정적 in-memory 발표 흐름 |
| 발표 deep link | `?step=1&present=1`부터 `?step=7&present=1`까지 |
| 조작 | 자료 선택, 정리 시작, 하단 단계 이동, AY 대화의 제안 action, 제안 카드의 AY 수정 요청, 명시적 수락·거절, 이전·다음·초기화, 키보드 화살표와 URL 상태를 제공한다. 7단계는 제안의 수락 action으로만 진입한다. |

일곱 단계는 흩어진 자료, 자료 선택, 작업 위임, 사용자에게 보이는 Agent activity, 원본 근거, 사용자 검토, 확인된 학기 상태 순서로 진행한다. 모든 단계는 자료 목록, 원본 preview와 AY 대화를 유지하는 하나의 3-pane workspace에서 전환된다. 1·2단계 Chat은 비어 있고, 작업을 맡긴 뒤부터 작업 요청 카드와 AY turn이 누적된다. 6단계에서는 제안 카드 안에서 준비된 과제명 수정 prompt 한 건만 AY에게 보내며, 요청을 생략하고 최초 제안을 바로 수락하는 경로도 보존한다.

## 유지보수 경계

| 모듈 | 책임 | 변경하는 경우 |
| --- | --- | --- |
| `scenario.mjs` | 단계별 발표 문구, 대상 자료, 정규화된 proposal·confirmed 값, 결정적 수정 요청·AY 응답 fixture와 상태 안내 문구 | 제품 시나리오와 카피가 바뀔 때 |
| `product-demo-core.mjs` | 자료 선택, 단계 이동, 수정 요청·거절·수락의 순수 상태 전이와 UI snapshot | 데모 상호작용 규칙이 바뀔 때 |
| `demo.js` | DOM event 연결, snapshot 렌더링, URL·focus·scroll·toast·수정 응답 timer effect | browser surface가 바뀔 때 |
| `index.html` | 접근 가능한 3-pane 구조와 결정적 원본·evidence·tool·chat fixture markup | 화면 구조나 실제로 보여주는 입력·근거·대화가 바뀔 때 |
| `demo.css` | `styles/`의 세 ownership module을 순서대로 불러오는 안정된 style entrypoint | style module을 추가·제거할 때 |
| `styles/foundation.css` | canvas token, header, progress, footer와 3-pane shell | 전체 presentation chrome이나 큰 layout이 바뀔 때 |
| `styles/workspace.css` | source explorer, stage, document preview, evidence와 confirmed banner | 자료 검토 workspace가 바뀔 때 |
| `styles/companion.css` | AY chat, tool activity, proposal review와 trusted-state feedback | 대화와 사용자 결정 surface가 바뀔 때 |
| `product-demo-core.test.mts` | 브라우저 없이 검증하는 전이 불변식 | 상태 규칙을 추가하거나 바꿀 때 |
| `e2e/camp-demo.spec.mts` | deck smoke와 제품 흐름의 대표 happy path | 관객에게 보여주는 핵심 서사나 동선이 바뀔 때 |

`product-demo-core.mjs`는 DOM이나 browser timer를 직접 다루지 않고 `{ state, view, effect }` snapshot과 완료 예약 effect만 선언한다. `demo.js`는 이 snapshot을 한 번에 반영하고 timer를 실행하며 제품 규칙을 다시 판단하지 않는다. proposal·confirmed 초기 markup은 placeholder만 두고 `scenario.mjs`의 값으로 render한다. 원본 TXT/PDF, evidence와 tool activity처럼 화면에 고정된 input fixture는 layout과 함께 `index.html`에 남긴다. 수정 prompt·AY 응답·수정된 proposal은 상태 전이와 함께 검증할 수 있도록 `scenario.mjs`가 소유한다. 이 시제품은 원본을 실제로 parse하지 않으므로 input fixture와 정규화된 state 값의 의미상 일치는 의도적인 예외이며, 시나리오 변경 시 두 owner를 함께 검토한다.
