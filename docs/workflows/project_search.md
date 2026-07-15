# Project Search Workflow

## Purpose

확정 문서, 아이디어, 승인 큐, 결정 로그, 버전 기록에서 근거 있는 답변을 만든다.

## Search Order

먼저 `workspace/project_registry.md`와 `docs/workflows/project_workspace.md`를 사용해 대상 프로젝트를 결정한다. 이후 선택한 프로젝트 안에서 다음 순서로 검색한다.

1. `workspace/projects/<project_slug>/design/`
2. `workspace/projects/<project_slug>/decisions/decision_log.md`
3. `workspace/projects/<project_slug>/versions/version_history.md`
4. `workspace/projects/<project_slug>/approvals/approval_queue.md`
5. `workspace/projects/<project_slug>/ideas/temporary_ideas.md`

## Steps

1. 질문에서 프로젝트명 또는 프로젝트 ID를 확인한다.
2. `Project Resolution` 규칙으로 대상 프로젝트와 루트를 확정한다.
3. 질문의 핵심 키워드, 대상 문서 타입, 시점을 파악한다.
4. 선택한 프로젝트 안에서 관련 파일을 검색한다.
5. 확정 문서와 미승인 아이디어를 구분한다.
6. 다른 프로젝트의 검색 결과를 현재 프로젝트의 근거로 섞지 않는다.
7. 답변에 프로젝트 ID, 파일 경로와 근거를 포함한다.
8. 근거가 부족하면 추정하지 말고 부족한 점을 말한다.

## Safety Rule

검색 요청은 문서 수정 요청이 아니다. 사용자가 별도로 변경을 요청하지 않으면 파일을 수정하지 않는다.
대상 프로젝트가 불명확하면 전체 프로젝트를 임의로 통합 검색해 답을 만들지 않는다.
