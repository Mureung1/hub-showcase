# 십이인연록

한국·중국·일본의 문화와 신화 요소를 혼합한 가상세계를 배경으로 하는 PC용
1인 AI 게임 마스터 TRPG다. 플레이어는 십이지신을 해금·강화하고 장소의 이상
현상에서 사흉의 단서를 추리하며, 고정 선택지와 장면별 자연어 입력으로
이야기를 진행한다.

## Project Snapshot

| 항목 | 내용 |
|---|---|
| 프로젝트 ID | `chronicles-of-the-twelve-bonds` |
| 영어명 | Chronicles of the Twelve Bonds |
| 상태 | active |
| 장르 | 동양 판타지 1인 AI 게임 마스터 TRPG |
| 플랫폼·엔진 | PC · Unity |
| 현재 초점 | 혼돈 튜토리얼 이후 남부 권역의 궁기 여정 설계 |
| 마지막 동기화 | 2026-07-27 |

## Current Focus

- 4방향 권역과 처음 열리는 남부 지도를 설계한다.
- 궁기 단서와 탐험 노드를 구성한다.
- 뱀·말·양 사건과 장면별 판정 규칙을 구체화한다.

## Confirmed Design Documents

| 역할 | 문서 | 담당 범위 |
|---|---|---|
| game_overview | [전체 게임 기획서](design/game/game_design_overview.md) | 핵심 경험, 디자인 원칙, 상위 플레이 루프와 전체 문서 지도 |
| world_setting | [세계관 설정](design/world/world_setting.md) | 세계 구조, 십이지신, 사흉, 인물·세력·장소와 정사 설정 |
| scenario | [메인 시나리오](design/narrative/main_scenario.md) | 도입부터 사흉 추적, 흑의인 전투와 엔딩 분기까지의 사건 구조 |
| scenario · ingame_script | [프롤로그 인게임 스크립트](design/narrative/scripts/prologue_ingame_script.md) | 프롤로그 Scene 1·2A·2B·2C·3·4의 플레이어 노출 대본과 씬 구현 명세 |
| system | [핵심 게임 시스템](design/systems/core_gameplay_systems.md) | 지도·탐험, 성장, 판정, 전투, 카르마·정보 시스템 |
| content | [요괴 후보 목록](design/content/yokai_candidates.md) | 탐험 중 조우할 비사흉 요괴 후보와 활용 검토 |
| ui | [플레이 UI 기획서](design/ui/gameplay_ui.md) | 장면 입력 모드, 지도, 로그, 보조 메뉴와 화면 상태 |
| technical | [AI GM 런타임 및 데이터 연동 규칙](design/technical/ai_gm_runtime_rules.md) | Unity·AI GM·RAG·세션 상태의 책임과 데이터 계약 |

## Project Working Documents

- [Project Brief](project_brief.md): 프로젝트 정체성, 현재 초점과 제약
- [Confirmed Design Index](design/README.md): 승인 적용된 기획 문서 색인
- [Temporary Ideas](ideas/temporary_ideas.md): 미확정 아이디어와 발전 전 메모
- [Approval Queue](approvals/approval_queue.md): 검토·승인 대기 변경안
- [Decision Log](decisions/decision_log.md): 승인·거부·보류 결정 기록
- [Version History](versions/version_history.md): 확정 문서 적용 이력

## Reading Guide

1. 이 README에서 프로젝트와 현재 문서 구성을 파악한다.
2. [Project Brief](project_brief.md)에서 현재 목표와 제약을 확인한다.
3. [전체 게임 기획서](design/game/game_design_overview.md)에서 전체 경험과
   문서 지도를 확인한다.
4. 필요한 역할의 확정 상세 문서로 이동한다.

## Maintenance Rules

- 이 README는 탐색용 요약·색인이며 상세 설정의 canonical owner가 아니다.
- 소개와 문서 설명은 Project Brief와 확정 문서에서만 가져온다.
- 문서 생성·삭제·이동 또는 담당 범위 변경이 승인 적용될 때 같은 승인 범위에서
  이 목록과 설명을 갱신한다.
- 상세 사실을 복제하지 않고 한 문장 요약과 상대경로 링크만 유지한다.
