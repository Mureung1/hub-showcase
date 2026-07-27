# Document Structure Workflow

## Purpose

사용자 입력을 문서 역할별로 분류하고, 하나의 상위 개요서에 세계관·시나리오·
시스템 상세가 누적되지 않도록 확정 정보의 소유 문서와 표준 경로를 정한다.

## Canonical Document Roles

| 문서 역할 | 문서 타입 | 표준 경로 | 소유하는 내용 |
|---|---|---|---|
| 게임 개요 | `game_overview` | `design/game/` | 게임 정체성, 핵심 재미, 플레이어 목표, 상위 루프, 거시 진행, 목표 규모·시간, 문서 지도 |
| 세계관 | `world_setting` | `design/world/` | 세계 구조, 역사, 문화, 정사 설정, 세력, 인물, 장소, 오브젝트, 공개 정보와 숨겨진 진실 |
| 시나리오 | `scenario` | `design/narrative/` | 막·챕터·Scene, 사건 흐름, 진입·종료 조건, 선택·분기, 복선, 정보 공개와 엔딩 |
| 시스템 | `system` | `design/systems/` | 플레이 흐름, 규칙, 입력·출력, 상태 변경, 판정, 예외, 밸런스와 QA 기준 |
| 콘텐츠 | `content` | `design/content/` | 지역, 노드, 퀘스트, 아이템, 적, 보상 등 실제 플레이 단위와 배치 |
| UI | `ui` | `design/ui/` | 화면, 입력, 표시 정보, 상태와 UI 예외 |
| 기술 | `technical` | `design/technical/` | 런타임 책임, 데이터 계약, 저장, 연동과 기술 예외 |

`scenario`의 챕터별 플레이어 노출 대본과 씬 구현 명세는
`design/narrative/scripts/<chapter_slug>_ingame_script.md`를 표준 경로로 사용한다.
상위 시나리오는 사건·분기 구조를 소유하고 인게임 스크립트는 승인된 범위의
표현과 씬 연결을 구체화한다. 인게임 스크립트 초안이 더 나은 사건 순서,
공개 시점, 분기, Outcome 또는 동기를 제안할 수는 있지만 `NR-*`로 차이를
공개하고, 승인 적용 시 상위 시나리오와 스크립트를 같은 `restructure` 항목에서
함께 갱신해야 한다. 승인 전에는 상위 시나리오가 계속 구조의 canonical
owner다. 새 세계관 정사·시스템 규칙 제안은 별도 고위험 승인 항목으로 분리한다.

일반 시나리오 문서를 신규 작성하거나 변경할 때 `scenario_designer`는
`docs/skills/scenario_review.md`로 원안 기반 Draft와 승인 항목의
`Scenario Improvement Review`를 분리하고 `scenario_reviewer`가 독립
검수한다. 사용자가 개선안을 선택하고 작성자 갱신·재검수를 거친 Draft를
명시적으로 승인하기 전에는 해당 권고를 `scenario`의 canonical 내용으로 보지
않는다.

신규·수정·재구성 비시나리오 기획 Draft의 누락은
`design_creative_planner`가 `docs/skills/design_creative_completion.md`에 따라
분류한다. 사용자가 창작을 허가한 정확한 GAP도 현재 문서의 canonical role
안에서만 제안한다. 선택한 대안이 다른 역할의 사실을 필요로 하면 현재 문서에
복제하지 않고 해당 owner의 연결 승인안 또는 원자적 `restructure` 대상으로
분리한다. 일반 시나리오 구조와 인게임 스크립트에는 각각 전용 Scenario
Improvement, `CW-*`·`NR-*` 규칙을 우선한다.

- NPC의 정사 설정은 `world_setting`, 특정 장면에서의 행동은 `scenario`가
  소유한다.
- 퀘스트·아이템·리소스의 실제 목록과 배치는 `content`가 소유한다.
- 하나의 사실은 하나의 상세 문서만 원본으로 가진다. 다른 문서는 짧은 요약과
  상대경로 링크만 둔다.

## Game Overview Depth

`game_overview`는 다른 문서의 내용을 복제하는 종합 저장소가 아니다. 다음
내용만 상위 기준으로 유지한다.

- 게임 한 줄 설명과 핵심 플레이 경험
- 디자인 원칙과 플레이어 목표
- 5~8단계 이내의 상위 플레이 루프
- 챕터·지역·보스 단위의 거시 진행 요약
- 플랫폼, 대상 플레이어, 목표 플레이 시간과 범위
- 상세 문서로 이동하는 `Document Map`
- 프로젝트 전체에 영향을 주는 상위 Open Questions

다음 내용은 개요서에 상세하게 작성하지 않는다.

- Scene별 사건과 선택 결과
- 인물·세력·장소·오브젝트별 상세 정사
- 판정식, 수치, 상태 전이, 예외 처리와 데이터 필드
- 지역 노드, 퀘스트, 아이템, 적과 보상 목록
- UI 상태 또는 기술 계약의 상세 명세

개요서에서 상세 내용을 언급해야 하면 한 문단 또는 3~7개 bullet로 요약하고
원본 상세 문서 링크를 함께 둔다.

## Classification Steps

1. 대상 프로젝트를 결정하고 `design/README.md`와 `game_overview`의
   `Document Map`을 확인한다.
2. 사용자 입력을 사실·사건·규칙·콘텐츠·표현·기술 책임 단위로 나눈다.
3. 각 단위를 Canonical Document Roles의 한 소유 문서에 배정한다.
4. 관련 확정 문서를 검색하고 신규 생성, 기존 수정 또는 문서 재구성으로
   분기한다.
5. 여러 역할에 걸친 요청은 하나의 개요서에 합치지 않고 경로별 작업 목록이
   있는 다중 문서 변경안으로 만든다.
6. 상세 문서가 아직 없으면 새 문서 초안을 만들고, 개요서에는 승인 후 사용할
   링크와 요약만 제안한다.
7. 모든 확정 문서 생성·수정은 Approval Queue와 원본 재확인 절차를 따른다.
8. Draft의 누락은 GAP으로 분류하고, 창작 가능한 공백은 명시적 허가와 대안
   선택 후에도 갱신된 `pending` 승인을 거친다.

## Link Rules

- 프로젝트 루트 `README.md`에는 Project Brief·작업 기록 링크와 모든 현재 확정
  상세 문서의 역할, 한 문장 담당 범위와 상대경로 링크를 둔다.
- `game_overview`에는 모든 현재 확정 상세 문서를 여는 상대경로 Markdown
  링크를 둔다.
- 상세 문서에는 상위 `game_overview`로 돌아가는 링크를 둔다.
- `design/README.md`는 현재 생성된 확정 문서만 링크하는 프로젝트 문서
  색인이다. 아직 승인되지 않았거나 존재하지 않는 문서 링크는 넣지 않는다.
- 문서 생성·삭제·이동·분리 또는 담당 범위 변경 시 프로젝트 README,
  `design/README.md`, `game_overview`와 상세 문서의 영향받는 링크·설명을 같은
  승인 범위에서 갱신한다.

## New Project Rule

새 프로젝트의 루트 `README.md`에는 간단한 소개, 현재 초점, 작업 문서 링크와
`아직 생성된 확정 세부 문서 없음`을 기록한다. `design/README.md`에는 표준
역할과 경로를 안내하되 빈 확정 기획서를 자동 생성하지 않는다. 실제 문서와
하위 경로는 해당 내용이 승인될 때 생성한다.

## Output

- 입력 단위별 문서 역할과 대상 경로
- 원본 소유 문서와 요약·참조 문서
- 선택한 문서 변경 branch
- 단일 또는 다중 문서 승인안
- 추가·갱신할 링크 목록
- 프로젝트 README에 추가·갱신할 문서 설명
- Creative Completion Review와 필요한 연결 승인안
