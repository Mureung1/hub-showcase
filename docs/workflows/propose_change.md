# Propose Change Workflow

## Purpose

기존 확정 문서 변경 요청을 검토 가능한 변경안으로 만든다.

이 workflow는 문서 관련 요청의 최상위 진입점이 아니다.
`docs/workflows/document_change.md`의 `update_existing_document` 분기에서
하위 workflow로 사용한다.

## When To Use

- 관련 확정 문서가 발견되었을 때
- 요청 내용이 기존 문서의 주제와 직접 연결될 때
- 새 문서를 만드는 것보다 기존 문서 갱신이 자연스러울 때

## Steps

1. `docs/workflows/document_change.md`에서 선택한 프로젝트, 대상 문서와 분기 결과를 확인한다.
2. 대상 문서가 선택한 프로젝트 안에 있는지 확인한다.
3. 같은 역할의 대상 문서 후보가 여러 개라 canonical owner를 식별할 수 없으면
   변경안을 확정하지 말고 후보와 질문을 제시한다. 요청 자체가 여러 역할의
   문서를 명확히 변경하는 경우에는 `restructure_documents`로 되돌려 보낸다.
4. 대상 문서의 현재 요약, 관련 설정, 변경 요청을 분리한다.
5. `docs/skills/conflict_review.md` 기준으로 충돌과 영향 범위를 검토한다.
6. 대상 역할이 `scenario`이면 원본, 요청과 범위를 `scenario_designer`에
   전달한다. 서브에이전트는 더 나은 구조를 변경 후 Draft와 분리된
   `Scenario Improvement Review`에 기록하고, `scenario_reviewer`가 독립
   검수한다.
7. 비시나리오 역할은 메인 Codex가 변경 후 문서 초안 또는 변경 섹션을
   작성한다. 시나리오 역할은 검수된 `scenario_designer` Draft를 사용한다.
8. 비시나리오 Draft를 `design_creative_planner`의 `classify` Phase에 전달해
   `docs/skills/document_completion.md`로 누락을 GAP으로 분류하고
   `Creative Completion Review`를 작성한다. 시나리오 Draft의 누락은
   `scenario_designer`가 분류한다.
9. 메인 Codex가 비시나리오 `creative_fillable` GAP을 한 번에 보여주고 창작
   보완 여부를 묻는다. 명시적 허가를 받으면 정확한 GAP ID를
   해당 분야의 active 프로젝트 창작 규칙과 함께
   `design_creative_planner`의 `generate_options` Phase에 전달해 복수 대안과
   추천안을 만든다. 규칙이 없으면
   `docs/workflows/project_creative_agent_setup.md`로 중단·라우팅한다. 일반
   시나리오의 사건 구조 개선은 Scenario Improvement Review로 처리한다.
10. 사용자가 비시나리오 대안을 선택하면 원본을 재확인하고 선택 결과를
    `incorporate_selection` Phase에 전달해 선택안만 `CP-*` 각주와 함께 Draft에
    넣는다. 선택은 승인이 아니며 갱신된 항목은 `pending`으로 둔다.
11. 메인 Codex가 서브에이전트 handoff와 검수 결과를 확인한 뒤 프로젝트 ID를
    포함해 `docs/templates/change_proposal.md`와
    `docs/templates/approval_item.md` 형식으로 같은 프로젝트의 승인 큐 항목을
    만든다. 프로젝트 창작 규칙이 독립 검수를 요구하면
    `design_creative_reviewer`의 필수 finding을 먼저 해소한다.

## Approval Rule

변경안 생성은 허용된다. 확정 문서 수정은 사용자 승인 이후에만 허용된다.
분리된 시나리오 개선 권고는 승인 대상 Draft가 아니며, 사용자가 선택하면
원본을 재확인해 Draft를 개정한 뒤 다시 `pending`으로 검토받는다.
기획 창작 대안도 사용자의 명시적 허가 전에는 만들지 않으며, 대안 선택은
갱신된 Draft의 승인이 아니다.

## Output

- 변경안 제목
- 대상 문서
- 변경 전 요약
- 변경 후 초안
- 충돌/영향 분석
- 누락 정보
- Creative Completion Review와, 허가된 경우 Creative Proposal Log
- 승인 큐 항목 초안
- 시나리오인 경우 분리된 개선 검토 결과
- 사용한 서브에이전트와 독립 검수 판정
