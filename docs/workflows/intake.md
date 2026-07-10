# Intake Workflow

## Purpose

사용자 입력을 먼저 분류해서 적절한 작업 흐름으로 보낸다.

## Intent Types

- `temporary_idea`: 확정 반영 요청이 없는 아이디어, 메모, 가능성.
- `document_change`: 문서 생성, 기존 문서 수정, 자료 취합, 기획서화 요청.
- `write_design_doc`: `document_change` 하위의 자료 기반 기획서 초안 작성 요청.
- `propose_change`: `document_change` 하위의 기존 확정 문서 변경 요청.
- `project_search`: 기존 설정 확인, 검색, 요약 요청.
- `approval_decision`: 승인 큐 항목의 승인, 보류, 수정 요청, 거부.

## Steps

1. 사용자 요청에서 실제 수정 요청이 있는지 확인한다.
2. 검색만 요청한 경우 문서를 수정하지 않는다.
3. 문서 관련 요청이면 `docs/workflows/document_change.md`를 먼저 따른다.
4. 확정 반영이 명확하지 않으면 아이디어나 승인 큐 초안으로만 처리한다.
5. 필요한 workflow 문서를 읽고 해당 절차를 따른다.
6. 정보가 부족하면 바로 확정하지 말고 질문 또는 `TBD`를 남긴다.

## Output

- 분류 결과
- 사용한 workflow
- 다음 산출물 위치
- 필요한 사용자 확인 사항
