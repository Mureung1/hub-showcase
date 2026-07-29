# Project Workspace Workflow

## Purpose

여러 게임 프로젝트의 기획과 승인 기록이 섞이지 않도록 작업 대상을 먼저 식별하고, 새 프로젝트마다 독립된 문서 구조를 생성한다.

## Project Resolution

모든 프로젝트 관련 작업은 다음 순서로 대상 프로젝트를 결정한다.

1. 사용자가 프로젝트명이나 프로젝트 ID를 명시했으면 `workspace/project_registry.md`에서 일치 항목을 찾는다.
2. 명시가 없고 등록 프로젝트가 하나뿐이면 해당 프로젝트를 사용한다.
3. 명시가 없고 프로젝트가 여러 개면 변경 요청에서는 대상 프로젝트를 질문한다. 검색·요약만 요청한 경우에는 레지스트리의 Active Project를 사용한다고 밝힐 수 있다.
4. 등록되지 않은 이름을 사용자가 새 프로젝트로 만들라고 요청하면 `Create Project` 절차를 따른다.

결정된 프로젝트 루트는 `workspace/projects/<project_slug>/`다. 이후 workflow의 `<project_slug>`는 반드시 이 값으로 치환한다.

## Create Project

1. 사용자에게서 프로젝트 생성 의사와 프로젝트명을 확인한다.
2. 영어 프로젝트명이 있으면 이를 기반으로 소문자 kebab-case `project_slug`를 만든다.
3. 영어명이 없거나 슬러그가 모호하면 이름을 임의로 확정하지 말고 사용자에게 확인한다.
4. `workspace/project_registry.md`에서 슬러그와 프로젝트명이 중복되지 않는지 검사한다.
5. 다음 독립 구조를 생성한다.

```text
workspace/projects/<project_slug>/
  README.md
  project_brief.md
  design/
    README.md
  ideas/
    temporary_ideas.md
  approvals/
    approval_queue.md
    assets/
  decisions/
    decision_log.md
  versions/
    version_history.md
```

6. `docs/templates/project_readme.md`, `docs/templates/project_brief.md`와 기존
   문서 템플릿을 사용해 초기 파일을 만든다. 프로젝트 루트 `README.md`에는
   간단한 프로젝트 설명, 현재 초점, `아직 생성된 확정 세부 문서 없음`과 작업
   문서 링크를 기록한다. `design/README.md`에는
   `docs/workflows/document_structure.md`의 표준 역할과 경로를 안내하되 아직
   승인되지 않은 빈 확정 문서는 만들지 않는다.
7. 모든 초기 문서에 프로젝트 ID를 기록한다.
8. `workspace/project_registry.md`에 프로젝트 ID, 한국어명, 영어명, 상태와 루트를 등록한다.
9. 다른 프로젝트의 아이디어, 승인 항목, 결정, 버전 번호나 디자인 문서를 복사해 초기값으로 사용하지 않는다.
10. 공용 규칙과 템플릿은 `docs/`에서 공유하되 게임 고유 정보는 프로젝트 루트 밖에 저장하지 않는다.
11. 실제 상세 문서와 `design/` 하위 경로는 해당 문서가 승인될 때 생성하며,
    생성된 문서는 프로젝트 루트 `README.md`, `design/README.md`와
    `game_overview`의 Document Map에 연결한다.
12. 새 프로젝트에는 `agents/`나 창작 규칙을 만들지 않는다. 사용자가 실제
    창작 기능을 요청하고 `docs/workflows/project_creative_agent_setup.md`의
    Plan mode 설정과 명시적 구현 요청을 완료했을 때만 첫 `agents/` 구조를
    만든다.

## Project README Role

- `workspace/projects/<project_slug>/README.md`는 프로젝트 랜딩 페이지다.
- Project Brief와 확정 게임 개요에서 1~3문장 소개와 현재 초점을 요약한다.
- 실제로 존재하고 `confirmed`인 상세 문서만 역할, 링크와 한 문장 담당 범위로
  기록한다. 승인 전 문서, 예정 경로나 임시 아이디어는 확정 문서 목록에 넣지 않는다.
- Project Brief, Design Index, Temporary Ideas, Approval Queue, Decision Log와
  Version History로 이동하는 작업 문서 링크를 제공한다.
- 프로젝트 창작 규칙이 하나 이상 존재할 때만 `agents/README.md`를 Project
  Creative Agents 작업 문서로 링크한다. 이 색인과 규칙은 canonical detail
  owner가 아니다.
- 프로젝트 README는 canonical detail owner가 아니며 상세 설정을 복제하지 않는다.
- 확정 문서 생성·삭제·이동 또는 담당 범위 변경이 승인 적용되면 같은 승인
  범위에서 README의 목록·설명과 `마지막 동기화`를 갱신한다.

## Asset Directory Roles

- `approvals/assets/`는 승인 전 검토용 이미지의 임시 위치다.
- `design/assets/`는 승인 적용이 끝난 이미지의 canonical 위치이며, 첫 에셋을
  적용할 때 필요하면 생성한다.
- 승인 에셋의 반영, 동일성 검증, 참조 갱신과 검토본 삭제는
  `docs/workflows/approval_queue.md`의 Asset Promotion Rules를 따른다.

## Project Switch

- 사용자가 다른 프로젝트를 기본 작업 대상으로 지정하면 레지스트리의 `Active Project`를 갱신한다.
- 기본 프로젝트 변경은 프로젝트 자료를 이동하거나 합치는 작업이 아니다.
- 프로젝트 간 설정을 옮기려면 출처와 대상 프로젝트를 명시한 별도 승인 항목을 만든다.

## Safety Rules

- 대상 프로젝트를 식별하지 못한 상태에서 프로젝트 파일을 수정하지 않는다.
- 한 승인 항목은 하나의 프로젝트에만 속한다.
- 프로젝트 창작 규칙은 같은 프로젝트 안에서만 사용하며 다른 프로젝트로
  복사·상속하지 않는다.
- Decision Log와 Version History는 같은 프로젝트의 승인 항목만 참조한다.
- 검색 결과는 프로젝트별로 구분하며 다른 프로젝트의 내용을 현재 프로젝트의 확정 사실로 사용하지 않는다.
- 프로젝트 삭제·병합·이동은 영향 범위를 검토한 별도 승인 절차를 거친다.

## Output

- 선택한 프로젝트 ID와 프로젝트 루트
- 선택 근거 또는 사용자에게 필요한 확인 질문
- 새 프로젝트라면 생성한 구조와 레지스트리 항목
- 프로젝트 README 경로와 현재 확정 문서 목록
