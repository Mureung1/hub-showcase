# Architecture

## 1. Overview

GamePM Codex Workspace는 코드 실행 제품이 아니라 문서 기반 작업 환경이다.

```text
User
  -> Codex 입력창
    -> AGENTS.md
    -> docs/workflows/
    -> docs/skills/
    -> docs/templates/
    -> workspace/
```

Codex가 에이전트 실행부 역할을 하고, 이 저장소의 Markdown 파일들이 규칙, 메모리, 승인 상태, 산출물 역할을 한다.

## 2. Directory Roles

### `docs/workflows/`

작업 절차를 정의한다. Codex는 요청 유형에 맞는 workflow를 먼저 확인한 뒤 작업한다.
문서 관련 요청은 먼저 `document_change` workflow에서 검색과 분기를 수행한 뒤,
필요한 하위 workflow로 이동한다.
확정 반영 요청이 없는 아이디어는 `temporary_idea` workflow에서 등록하거나
승인 제안 전환 여부를 판단한다.

### `docs/skills/`

반복적으로 쓰는 판단 기준과 품질 규칙을 정의한다. 예: 충돌 검토, 문서 보완 질문, 한국어 기획 문체.

### `docs/templates/`

산출물 형식을 정의한다. 승인 큐, 변경안, 기획서, 결정 로그, 버전 기록은 템플릿을 따른다.
게임 개요, 세계관, 시나리오와 시스템은 역할별 템플릿을 우선 사용한다.

### `workspace/`

프로젝트 레지스트리와 프로젝트별 상태를 저장한다.

- `project_registry.md`: 등록 프로젝트와 현재 기본 프로젝트
- `projects/<project_slug>/project_brief.md`: 프로젝트 정체성, 현재 초점과 제약
- `projects/<project_slug>/design/`: 승인된 확정 기획 문서와 문서 색인
  - `game/`: 상위 게임 개요와 전체 방향
  - `world/`: 세계관, 인물, 세력, 장소와 오브젝트의 정사 설정
  - `narrative/`: 시나리오, 장면, 분기, 복선과 엔딩
  - `systems/`: 게임플레이 규칙, 판정, 상태 변화와 밸런스
  - `content/`: 지역, 노드, 퀘스트, 아이템, 적과 보상
  - `ui/`: 화면과 상호작용 명세
  - `technical/`: 런타임, 데이터, 저장과 연동 명세
- `projects/<project_slug>/ideas/`: 임시 아이디어
- `projects/<project_slug>/approvals/`: 승인 대기 변경안과 검토용 에셋
- `projects/<project_slug>/decisions/`: 프로젝트 결정 로그
- `projects/<project_slug>/versions/`: 프로젝트 버전 기록

게임 고유 정보는 해당 프로젝트 루트 밖에 저장하지 않는다.

### `docs/dev-log/`

과거 개발 기록 보관용이다. 현재 아키텍처, 행동 규칙, workflow 정책의 근거로 사용하지 않는다.

## 3. Project Boundary

- 모든 프로젝트 작업은 `docs/workflows/project_workspace.md`에 따라 대상 프로젝트를 먼저 결정한다.
- 새 프로젝트는 기존 프로젝트 폴더를 재사용하지 않고 완전한 독립 구조로 생성한다.
- 한 프로젝트의 아이디어, 승인 큐, 결정 로그와 버전 기록은 다른 프로젝트에서 사용하지 않는다.
- 여러 프로젝트가 존재하고 요청 대상이 불명확하면 변경 전에 사용자에게 확인한다.
- 공용 workflow, skill과 template만 `docs/`에서 공유한다.

## 4. Approval Boundary

Codex는 다음 작업을 승인 없이 수행할 수 있다.

- 문서 검색
- 요약
- 질문 생성
- 문서 요청 분기
- 자료 기반 기획서 초안 작성
- 변경안 초안 작성
- 승인 큐 항목 작성
- 충돌/영향도 분석

Codex는 다음 작업을 사용자 승인 없이 수행하지 않는다.

- `workspace/projects/<project_slug>/design/` 확정 문서 수정
- 승인 큐 항목을 적용 완료로 처리
- 결정 로그에 승인 결정을 기록
- 버전 기록에 반영 완료 기록

## 5. Source Reconfirmation

승인된 변경안을 적용하기 전에는 대상 문서를 다시 읽는다.

- 승인 항목에는 작성 당시의 기준 Git 커밋, 대상 문서 경로, 비교 대상,
  원본 요약을 기록한다.
- 기존 문서 변경과 삭제는 기준 커밋의 비교 대상과 현재 내용을 비교한다.
- 대상 문서 내용이나 영향 범위가 변경안 작성 당시와 다르면 적용하지 않고
  `needs_reconfirmation` 항목으로 남긴다.
- 변경안에 대상 문서, 기준 커밋 또는 비교 대상이 불명확하면 적용하지 않고
  질문을 만든다.
- 신규 문서 생성은 동일 제목뿐 아니라 같은 주제나 역할의 문서가 이미
  생겼는지 먼저 확인한다.
- 재확인에서 불일치가 확인되면 기존 승인을 재사용하지 않는다.
- 불일치 항목은 승인 큐의 `Needs Reconfirmation` 영역으로 이동하며,
  갱신된 기준 정보와 초안에 대한 명시적 재승인 전에는 적용할 수 없다.
- `needs_reconfirmation` 항목은 `pending`, `approved`, `change_requested`,
  `on_hold`, `rejected` 중 하나로 전환한 뒤 후속 절차를 따른다.

## 6. Document Change Routing

문서 관련 요청은 신규 생성, 기존 문서 수정이나 삭제로 바로 확정하지 않는다.
Codex는 먼저 관련 문서를 검색하고 다음 중 하나로 분기한다.

분기 전에 `docs/workflows/document_structure.md`로 입력 단위별 canonical
document role과 원본 소유 문서를 정한다. `game_overview`는 상세 정보의 원본이
아니며 상세 문서의 요약과 링크를 제공한다.

- `create_new_document`: 독립 문서로 분리하는 것이 자연스러운 경우
- `update_existing_document`: 기존 확정 문서 갱신이 자연스러운 경우
- `restructure_documents`: 여러 문서 역할을 분리하거나 원자적으로 함께 갱신해야 하는 경우
- `delete_existing_document`: 기존 확정 문서 삭제를 안전하게 검토할 경우
- `compile_from_sources`: 자료 정리, 요약, 출처 묶음이 목적일 경우
- `draft_design_from_materials`: 기존 자료를 기획서 형식으로 구조화할 경우
- `ask_for_clarification`: 분기나 대상 문서 판단 근거가 부족한 경우

`restructure_documents`는 경로별 create/update/delete 작업을 하나의 승인
항목으로 관리한다. 적용 전 모든 대상을 재확인하며 일부 문서만 적용하지 않는다.

## 7. Operating Model

이 저장소는 테스트 가능한 Python 패키지를 제공하지 않는다. 품질 관리는 문서 구조와 운영 규칙으로 한다.

기본 검증 기준:

- 요청 유형에 맞는 workflow를 따랐는가
- 산출물이 template 형식을 따르는가
- 승인 전 확정 문서가 수정되지 않았는가
- 승인 후 Decision Log와 Version History가 함께 갱신되었는가
- 임시 아이디어가 승인 제안으로 전환되어도 명시적 승인 전 확정 문서를
  수정하지 않았는가
- 모든 검색·승인·결정·버전 기록이 같은 프로젝트 ID와 루트를 사용하는가
