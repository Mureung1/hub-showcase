# AY-PLE Design System Direction

> 범위 정정: 공식 Public Landing은 현재 제품 surface에서 제외했고 구현 workspace도 제거했다. 아래 local app workbench 지침이 현재 시각 기준이며, ActionInvocation component는 채택 target을 표현한다.

작성일: 2026-07-08

최종 업데이트: 2026-07-28

분류: 활성

성숙도: 초안

관련 문서: [AY-PLE Product Brief](ay-ple-product-brief.md), [AY–App Interaction Layer 아키텍처](../architecture/ay-app-interaction-layer.md), [InteractionCapability 상세 아키텍처](../architecture/ay-app-interaction-capabilities.md), [historical Review Workspace Scenario](ay-ple-review-workspace-scenario.md)

## 방향

AY-PLE의 local app workbench는 기존 다크 IDE 테마가 아니라 **밝은 학업 워크스페이스**를 따른다. 학생이 실제 학기 자료를 읽고 AY의 interaction 요청을 판단하는 앱이므로 화면은 개발자 도구보다 노트, 자료함, 조용한 생산성 앱에 가까워야 한다.

| 원칙 | 설명 |
| --- | --- |
| Light-first | 기본 화면은 밝은 배경과 종이 같은 surface를 쓴다. 다크 모드는 후속 접근성/개인화 옵션이지 기본 브랜드 톤이 아니다. |
| Student-friendly | 비개발자 대학생이 이해할 수 있는 말과 시각 신호를 우선한다. IDE, 터미널, runtime 느낌을 줄인다. |
| Source-grounded | 자료 목록, 원본 미리보기, 근거 연결이 흐릿해지지 않도록 정보 밀도는 유지한다. |
| Calm productivity | 귀엽지만 유아적이지 않게, 친근하지만 장난감처럼 보이지 않게 잡는다. |
| AY as companion | AY는 로봇이나 시스템 로그가 아니라, 자료를 함께 정리하는 companion으로 보인다. |

## 제품 표면 구분

| 표면 | 역할 | 표현 방향 |
| --- | --- | --- |
| Local app workbench | Source 선택과 명시적 ActionInvocation, AY 작업과 capability-specific Review가 일어나는 실제 제품 공간 | calm productivity와 source-grounded 정보 구조를 유지하며 marketing layout보다 현재 작업·사용자 판단·다음 행동을 우선한다. |

## 색상

브랜드 자산의 coral, leaf green, honey yellow를 가져오되, 전체 화면은 warm paper와 ink neutral이 받친다.

| 역할 | 토큰 | 값 | 사용 |
| --- | --- | --- | --- |
| App canvas | `--app-bg` | `#f4f1e8` | 앱 전체 바탕 |
| Main surface | `--editor` | `#fffdf8` | 원본 자료 미리보기 |
| Sidebar surface | `--sidebar` | `#fbf8f0` | 자료 목록 |
| AY surface | `--panel` | `#fff8e8` | AY 대화 패널 |
| Primary text | `--text` | `#1c2b32` | 본문과 제목 |
| Muted text | `--muted` | `#66737b` | 보조 설명 |
| Brand accent | `--accent` | `#ff6b57` | 현재 탭, 강조선 |
| Helpful green | `--green` | `#34a853` | 수락/반영 |
| Companion teal | `--teal` | `#45b7a7` | 대화 입력, 선택, 실행 |
| Evidence blue | `--blue` | `#3c78d8` | 근거/파일 신호 |
| Caution honey | `--amber` | `#f2b84b` | 검토 대기/주의 |

## 컴포넌트 톤

| 컴포넌트 | 방향 |
| --- | --- |
| Header | 브랜드와 현재 학기/과목을 작고 안정적으로 보여준다. hero처럼 과장하지 않는다. |
| Activity bar | 앱 구조를 보조하는 낮은 대비의 아이콘 rail로 둔다. IDE chrome처럼 어둡게 만들지 않는다. |
| Source explorer | 자료함처럼 보이게 하고 preview focus와 ActionInvocation input selection을 구분한다. Selection은 green/teal 계열로 표시하되 선택만으로 AY 작업이 시작된 것처럼 표현하지 않는다. |
| Source preview | 가장 넓고 밝은 종이 surface로 둔다. 원본을 읽는 화면이라는 감각이 우선이다. |
| Action trigger | `선택한 자료로 학기 정보 정리하기`처럼 무엇이 AY에게 전달되는지 설명하는 명시적 command로 둔다. Invalid selection·busy·preparing·running·terminal 상태를 정직하게 표현한다. |
| AY chat dock | Side panel이지만 콘솔처럼 보이지 않게 warm surface와 말풍선으로 구성한다. Pending Review 중에는 free-form composer와 steer를 잠그고 전체 Turn interrupt만 유지한다. |
| Change proposal | AY Chat transcript의 inline card로 둔다. AY가 응답을 기다리는 `검토 대기`는 honey로, settled `수락됨`, `수정 요청됨`, `거절됨`은 control 없는 read-only outcome으로 구분한다. `수락됨`을 App이 file 반영까지 확인했다는 뜻으로 쓰지 않는다. Fresh proposal은 새 card로 아래에 append하고 이전 card를 교체·재개하지 않는다. Modal·별도 approval page·card dismiss를 만들거나 내부 correlation을 노출하지 않는다. |
| Buttons | command button은 실용적으로 작게 두되, 수락/수정 요청/거절 색상은 명확히 구분한다. |

## 피해야 할 것

| 피할 표현 | 이유 |
| --- | --- |
| Dark IDE default | 개발자 도구처럼 보여서 전체 대학생 대상 제품과 맞지 않는다. |
| Terminal/log styling | AY의 작업이 시스템 로그처럼 느껴진다. |
| Purple-blue tech gradient | 흔한 AI SaaS 느낌이 강하고 AY-PLE 브랜드 자산과 맞지 않는다. |
| Local app workbench 안의 marketing hero | 실제 setup·Review workflow보다 홍보 메시지가 앞서면 현재 작업과 상태를 찾기 어렵다. |
| Cute-only mascot UI | 학업 자료와 마감 관리를 믿고 맡기는 생산성 앱 신뢰도가 떨어진다. |
| Review modal·별도 approval page | AY의 요청 맥락과 사용자 결정을 transcript에서 분리하고 불필요한 navigation·focus lifecycle을 만든다. |

## 검증 적용 위치

| 위치 | 상태 |
| --- | --- |
| `artifacts/camp-demo/product-flow/demo.css` | light-first 토큰과 주요 컴포넌트 색상을 통합 prototype에 적용 |
| `assets/brand/` | AY-PLE 로고, 헤더 마크, AY 프로필 이미지의 프로젝트 공용 원본 |
| `artifacts/camp-demo/product-flow/index.html?step=6&present=1` | 검토 대기 상태의 밝은 workspace 방향 검증 |
| `artifacts/camp-demo/product-flow/index.html?step=7&present=1` | 반영됨 상태의 밝은 workspace 방향 검증 |

이 문서는 최종 디자인 시스템이 아니라, 검증 prototype과 product brief가 같은 방향을 보게 하는 첫 기준이다.
