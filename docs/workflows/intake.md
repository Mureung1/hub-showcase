# Intake Workflow

## Purpose

사용자 입력을 먼저 분류해서 적절한 작업 흐름으로 보낸다.

## Intent Types

- `project_workspace`: 프로젝트 생성, 선택, 전환 또는 구조 관리 요청.
- `temporary_idea`: 확정 반영 요청이 없는 아이디어, 메모, 가능성.
- `document_change`: 문서 생성, 기존 문서 수정, 자료 취합, 기획서화 요청.
- `write_design_doc`: `document_change` 하위의 자료 기반 기획서 초안 작성 요청.
- `propose_change`: `document_change` 하위의 기존 확정 문서 변경 요청.
- `project_search`: 기존 설정 확인, 검색, 요약 요청.
- `approval_decision`: 승인 큐 항목의 승인, 보류, 수정 요청, 거부.

## Steps

1. 프로젝트 생성·선택·전환 요청이면 `docs/workflows/project_workspace.md`를 먼저 따른다.
2. 그 외 프로젝트 관련 요청도 대상 프로젝트를 먼저 결정한다.
3. 사용자 요청에서 실제 수정 요청이 있는지 확인한다.
4. 검색만 요청한 경우 문서를 수정하지 않는다.
5. 문서 관련 요청이면 `docs/workflows/document_change.md`를 먼저 따른다.
6. `temporary_idea`이면 `docs/workflows/temporary_idea.md`에 따라 등록,
   수정 또는 승인 제안 전환으로 분기한다.
7. 확정 반영이 명확하지 않으면 아이디어나 승인 큐 초안으로만 처리한다.
8. 필요한 workflow 문서를 읽고 해당 절차를 따른다.
9. 비시나리오 기획 Draft의 정보가 부족하면 `design_creative_planner`의
   `classify` Phase에 위임해 `docs/skills/document_completion.md`로 GAP을
   분류한다. 메인 Codex가 창작 가능한 공백의 허가 여부를 묻고, 사실 정보는
   질문 또는 `TBD`로 남긴다.
10. 사용자가 비시나리오 창작 보완을 명시적으로 허가하면
    정확한 GAP ID와 해당 분야의 active 프로젝트 창작 규칙을
    `design_creative_planner`의 `generate_options` Phase에 전달해
    `docs/skills/design_creative_completion.md`를 적용한다. 규칙이 없으면
    `docs/workflows/project_creative_agent_setup.md`로 중단·라우팅하며 대안
    선택을 승인으로 간주하지 않는다.

## Output

- 분류 결과
- 선택한 프로젝트 ID와 루트
- 사용한 workflow
- 다음 산출물 위치
- 필요한 사용자 확인 사항
