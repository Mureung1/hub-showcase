# 프로젝트 한국어명

프로젝트의 장르, 핵심 플레이 경험과 차별점을 1~3문장으로 설명한다.
이 소개는 `project_brief.md`와 확정 `game_overview`만 요약하며 새로운 설정을
추가하지 않는다.

## Project Snapshot

| 항목 | 내용 |
|---|---|
| 프로젝트 ID | `<project_slug>` |
| 영어명 |  |
| 상태 | active \| on_hold \| archived |
| 장르 |  |
| 플랫폼·엔진 |  |
| 현재 초점 |  |
| 마지막 동기화 | YYYY-MM-DD |

## Current Focus

- `project_brief.md`의 현재 작업 초점을 간단히 요약한다.

## Confirmed Design Documents

현재 실제로 존재하고 상태가 `confirmed`인 문서만 기록한다. 아직 승인되지
않았거나 존재하지 않는 문서는 링크하지 않는다. 확정 세부 문서가 없으면
`아직 생성된 확정 세부 문서 없음`이라고 적는다.

| 역할 | 문서 | 담당 범위 |
|---|---|---|
| game_overview \| world_setting \| scenario \| system \| content \| ui \| technical | [문서 제목](design/<role>/<file>.md) | 문서가 소유하는 내용을 한 문장으로 요약 |

## Project Working Documents

- [Project Brief](project_brief.md): 프로젝트 정체성, 현재 초점과 제약
- [Confirmed Design Index](design/README.md): 승인 적용된 기획 문서 색인
- [Temporary Ideas](ideas/temporary_ideas.md): 미확정 아이디어와 발전 전 메모
- [Approval Queue](approvals/approval_queue.md): 검토·승인 대기 변경안
- [Decision Log](decisions/decision_log.md): 승인·거부·보류 결정 기록
- [Version History](versions/version_history.md): 확정 문서 적용 이력

첫 프로젝트 창작 규칙이 실제로 생성된 경우에만 다음 링크를 추가한다. 규칙이
없으면 빈 링크나 예정 경로를 남기지 않는다.

- [Project Creative Agents](agents/README.md): 프로젝트별 창작 행동 규칙 색인

## Reading Guide

1. 이 README에서 프로젝트와 현재 문서 구성을 파악한다.
2. `project_brief.md`에서 현재 목표와 제약을 확인한다.
3. `design/game/`의 게임 개요에서 전체 경험과 문서 지도를 확인한다.
4. 필요한 역할의 확정 상세 문서로 이동한다.

## Maintenance Rules

- 이 README는 탐색용 요약·색인이며 상세 설정의 canonical owner가 아니다.
- 소개와 문서 설명은 Project Brief와 확정 문서에서만 가져온다.
- 문서 생성·삭제·이동 또는 담당 범위 변경이 승인 적용될 때 같은 승인 범위에서
  이 목록과 설명을 갱신한다.
- 상세 사실을 복제하지 않고 한 문장 요약과 상대경로 링크만 유지한다.
- Project Creative Agents는 행동 설정 링크이며 Confirmed Design Documents에
  넣지 않는다.
