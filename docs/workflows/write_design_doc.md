# Write Design Doc Workflow

## Purpose

기존 자료를 바탕으로 게임 기획서 형태의 초안을 만들되, 승인 전에는
확정 문서로 저장하지 않는다.

이 workflow는 문서 관련 요청의 최상위 진입점이 아니다.
`docs/workflows/document_change.md`의 `draft_design_from_materials` 분기에서
하위 workflow로 사용한다.

## When To Use

- 사용자가 있는 자료로 기획서를 만들어달라고 요청할 때
- 설정, 아이디어, 승인 큐 항목, 결정 로그를 기획서 형식으로 구조화할 때
- 새 설정을 창작하기보다 기존 자료를 정리하는 것이 목적일 때

## Steps

1. `docs/workflows/document_change.md`에서 선택한 프로젝트, 검색 근거와 분기 결과를 확인한다.
2. `docs/workflows/document_structure.md`에 따라 문서 타입과 표준 경로를
   정한다: `game_overview`, `world_setting`, `scenario`, `system`, `content`,
   `ui`, `technical`.
3. 타입별 템플릿이 있으면 이를 우선하고, 없을 때만
   `docs/templates/design_doc.md`를 사용한다.
   - `game_overview`: `docs/templates/game_overview.md`
   - `world_setting`: `docs/templates/world_setting.md`
   - `scenario`: `docs/templates/scenario.md`
   - `system`: `docs/templates/system.md`
4. 출처가 없는 세부 설정은 확정 사실로 쓰지 않는다.
5. 비시나리오 Draft는 `design_creative_planner`의 `classify` Phase에 전달해
   `docs/skills/document_completion.md`로 누락을 `creative_fillable`,
   `user_fact`, `dependency` GAP으로 분류하고 `Creative Completion Review`에
   기록한다. 시나리오 Draft의 누락은 `scenario_designer`가 같은 분류 규칙으로
   기록한다.
6. 메인 Codex가 비시나리오 `creative_fillable` GAP을 사용자에게 한 번에
   보여주고 창작 보완 여부를 묻는다. 명시적 허가를 받으면 정확한 GAP ID를
   해당 분야의 active 프로젝트 창작 규칙과 함께
   `design_creative_planner`의 `generate_options` Phase에 전달해
   `docs/skills/design_creative_completion.md`에 따른 복수 대안을 만들며,
   허가받지 않은 공백은 `TBD`로 둔다. 일반 시나리오의 사건 구조 개선은 8단계의
   Scenario Improvement Review로 처리한다. 규칙이 없으면
   `docs/workflows/project_creative_agent_setup.md`로 중단·라우팅한다.
7. 다른 역할의 상세 내용을 발견하면 현재 문서에 복제하지 않고 원본 소유
   문서와 필요한 링크를 표시한다.
8. 문서 타입이 `scenario`이면 `scenario_designer`가
   `docs/skills/scenario_review.md`에 따라 원안 기반 초안과 별도의
   `Scenario Improvement Review`를 작성하고 `scenario_reviewer`가 독립
   검수한다. 더 나은 구조는 본문에 자동 반영하지 않는다.
9. 사용자가 비시나리오 창작 대안을 선택하면 메인 Codex가 원본을 재확인하고 선택 결과를
   `design_creative_planner`의 `incorporate_selection` Phase에 전달해 선택안만
   `CP-*` 각주와 함께 Draft에 넣는다. 선택은 승인이 아니다.
10. 서브에이전트의 read-only handoff와 필수 검수 결과를 메인 Codex가 확인한
    뒤에만 같은 프로젝트의 승인 큐에 `docs/templates/approval_item.md` 형식의
    `pending` 항목을 만든다. 프로젝트 창작 규칙이 독립 검수를 요구하면
    `design_creative_reviewer`의 필수 finding을 먼저 해소한다.

## Approval Rule

사용자가 명시적으로 승인하기 전에는 `workspace/projects/<project_slug>/design/`에 새 확정 문서를 만들지 않는다.

## Output

- 승인 큐 항목 초안
- 기획서 초안 제목
- 문서 타입
- 표준 대상 경로와 관련 문서 링크
- 초안 전문
- 시나리오인 경우 분리된 개선 검토 결과
- 사용한 서브에이전트와 독립 검수 판정
- Creative Completion Review, 허가된 경우 Creative Proposal Log와 누락 정보 질문
- 근거 파일 목록
