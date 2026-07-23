# Project Search Workflow

## Purpose

확정 문서, 아이디어, 승인 큐, 결정 로그, 버전 기록에서 근거 있는 답변을 만든다.

## Search Order

먼저 `workspace/project_registry.md`와 `docs/workflows/project_workspace.md`를 사용해 대상 프로젝트를 결정한다. 이후 선택한 프로젝트 안에서 다음 순서로 검색한다.

아래 순서는 단계적 확대 순서이며 모든 파일을 반드시 읽으라는 뜻이 아니다.
현재 요청에 필요한 canonical 근거와 상태가 충분해지는 즉시 검색을 중단한다.

1. `workspace/projects/<project_slug>/README.md`의 프로젝트 요약과 문서 지도
2. `workspace/projects/<project_slug>/design/README.md`와 `design/game/`의
   `game_overview` 문서 지도
3. 질문의 canonical document role에 해당하는 `design/` 하위 경로
4. `workspace/projects/<project_slug>/decisions/decision_log.md`
5. `workspace/projects/<project_slug>/versions/version_history.md`
6. `workspace/projects/<project_slug>/approvals/approval_queue.md`
7. `workspace/projects/<project_slug>/ideas/temporary_ideas.md`

4~7단계의 작업 기록은 사용자가 결정·버전·승인 항목·아이디어를 직접
지정했거나, 현재 workflow에서 과거 결정·적용 상태·제안 출처 확인이 필요한
경우에만 연다. 확정 문서만으로 답하거나 Task Packet을 만들 수 있으면 작업
기록 전체를 검색하지 않는다.

## Steps

1. 질문에서 프로젝트명 또는 프로젝트 ID를 확인한다.
2. `Project Resolution` 규칙으로 대상 프로젝트와 루트를 확정한다.
3. 질문의 핵심 키워드, canonical document role, 대상 문서 타입과 시점을 파악한다.
4. 선택한 프로젝트 안에서 관련 파일을 검색한다.
5. 확정 문서와 미승인 아이디어를 구분한다.
6. 다른 프로젝트의 검색 결과를 현재 프로젝트의 근거로 섞지 않는다.
7. 답변에 프로젝트 ID, 파일 경로와 근거를 포함한다.
8. 근거가 부족하면 추정하지 말고 부족한 점을 말한다.
9. 같은 사실이 여러 문서에 있으면 `docs/workflows/document_structure.md`의
   canonical owner를 우선하고 중복·충돌을 함께 알린다.
10. 프로젝트 README의 설명은 탐색용 요약으로만 사용하고, 상세 답변은 연결된
    canonical design document를 다시 확인한다.
11. 문서 지도에서 정확한 대상 경로를 찾았으면 전체 `design/` 파일 목록을
    출력하거나 무관한 역할 디렉터리를 탐색하지 않는다.
12. `tests/fixtures/`, `/tmp` 실행 복사본, 테스트 대화·로그와
    `[TEST FIXTURE: SYNTHETIC]` 자료는 실제 프로젝트 검색 근거에서 제외한다.
    테스트 픽스처는 `docs/workflows/behavior_testing.md`에 따른 동작 테스트
    안에서만 사용한다.

## Safety Rule

검색 요청은 문서 수정 요청이 아니다. 사용자가 별도로 변경을 요청하지 않으면 파일을 수정하지 않는다.
대상 프로젝트가 불명확하면 전체 프로젝트를 임의로 통합 검색해 답을 만들지 않는다.
테스트 픽스처의 문장을 사용자 제공 사실, 확정 문서 또는 실제 프로젝트
제안으로 재분류하지 않는다.
