# Document Change Workflow

## Purpose

사용자의 문서 관련 요청을 신규 생성, 기존 문서 수정, 기존 문서 삭제, 자료 취합,
기획서화, 추가 질문으로 분기한다.

이 workflow는 문서 작업의 상위 진입점이다. Codex는 문서 관련 요청을
받으면 `write_design_doc` 또는 `propose_change`로 바로 이동하지 않고,
먼저 이 workflow를 따른다.

## When To Use

- 새 설정, 시스템, NPC, 퀘스트, 아이템, UI 문서를 요청할 때
- 기존 설정에 내용을 추가하거나 수정하라고 요청할 때
- 기존 확정 문서를 삭제하라고 요청할 때
- 여러 자료를 모아 정리해달라고 요청할 때
- 기존 자료를 바탕으로 기획서 형태의 문서를 만들어달라고 요청할 때
- 확정 시나리오를 플레이어 노출 대본과 씬 명세로 작성해달라고 요청할 때
- 요청이 신규 생성인지 기존 문서 수정인지 애매할 때

## Steps

1. `docs/workflows/project_workspace.md`에 따라 대상 프로젝트를 결정한다.
2. `docs/workflows/document_structure.md`에 따라 사용자 입력을 문서 역할별
   단위로 나누고 각 단위의 원본 소유 문서와 표준 경로를 정한다.
3. `docs/workflows/project_search.md` 기준으로 선택한 프로젝트의 관련 문서를 검색한다.
4. 실제로 검색한 결과를 확정 문서, 승인 큐, 임시 아이디어, 결정 로그, 버전
   기록으로 구분한다. 분류를 위해 모든 작업 기록을 자동으로 열지 않으며
   `docs/workflows/project_search.md`의 단계적 확대·조기 중단 규칙을 따른다.
5. 기존 확정 문서에 반영하는 것이 자연스러운지, 새 문서가 필요한지, 여러
   역할이 섞인 기존 문서를 재구성해야 하는지 판정한다.
6. 입력 단위에 `scenario` 역할이 있으면 검토 전용 요청은 범위와 근거를
   `scenario_reviewer`에 직접 위임한다. 시나리오 기획서화·신규 작성·변경안은
   `scenario_designer`에 위임하고 그 결과를 `scenario_reviewer`가 독립
   검수하게 한다.
7. 아래 Branch Rules 중 하나를 선택한다.
8. 신규·수정·재구성 비시나리오 Draft와 다중 역할 Draft의 비시나리오 GAP은
   `design_creative_planner`의 `classify` Phase에 위임한다. 일반 시나리오 GAP은
   `scenario_designer`, 인게임 스크립트 GAP은 `scenario_writer`가
   `docs/skills/document_completion.md`로 분류하고 `Creative Completion
   Review` 또는 전용 `TBD` 목록을 작성한다.
9. 비시나리오 `creative_fillable` 공백이 있으면 창작 가능한 항목을 한 번에
   보여주고 사용자가 명시적으로 허가하기 전에는 대안을 만들지 않는다.
   일반 시나리오의 구조 개선은 별도 Scenario Improvement Review 규칙을 따른다.
10. 승인 전에는 `workspace/projects/<project_slug>/design/`을 수정하지 않는다.
11. 생성, 수정, 삭제, 기획서화 결과물은 같은 프로젝트의 승인 큐 항목 초안으로 작성한다.

## Subagent Orchestration

메인 Codex는 서브에이전트에 위임하기 전에 프로젝트, branch, canonical owner,
요청 범위, 제외 범위, 근거 파일과 사용자에게 받은 창작 허가·선택을 명시한
작업 패키지를 만든다. 서브에이전트는 작업 패키지 범위를 스스로 넓히지 않는다.

### General Scenario Pipeline

검토 전용 요청은 `scenario_reviewer`가 대상 문서와 원본을 직접 확인해
`Scenario Review Report`를 반환하며, 파일이나 Draft를 수정하지 않는다.
변경안 작성이 필요한 후속 요청은 아래 작성 파이프라인으로 새로 진입한다.

1. `scenario_designer`가 원안 기반 Draft, GAP 목록과 분리된
   `Scenario Improvement Review`를 작성한다.
2. `scenario_reviewer`가 같은 원본을 직접 읽어 독립 검수한다.
3. `blocking` 또는 `required_revision`이 있으면 메인 Codex가
   `scenario_designer`에 되돌리고 수정본을 다시 검수한다.
4. `authorial_reconsideration`은 자동 반영하지 않고 Scenario Improvement
   Review 후보로 유지한다.
5. 검수 통과 후 메인 Codex가 승인 경계를 확인하고 필요할 때만 `pending`
   승인 항목을 저장한다.

### In-Game Script Pipeline

1. `scenario_writer`가 Writer's Brief, 플레이어 대본·씬 명세, `CW-*`와
   `NR-*`를 포함한 초안을 작성한다.
2. `scenario_reviewer`가 원본 충실도, 서사 품질, 씬 데이터, 도달 가능성,
   창작 공개와 의존성을 독립 검수한다.
3. 필수 수정은 `scenario_writer`에 되돌리고 재검수한다. 선택적 권고를
   채택하면 필요한 `CW-*`·`NR-*` 근거를 작가가 추가한다.
4. 검수 통과 후 메인 Codex만 `pending` 승인 항목을 저장한다.

### Design Creative Pipeline

1. `design_creative_planner`의 `classify` Phase가 비시나리오 일반 기획 GAP을
   분류한다. 일반 시나리오 구조와 인게임 스크립트는 각 작성 에이전트의 전용
   규칙을 따른다.
2. 메인 Codex가 분류를 검토해 전체 GAP을 사용자에게 제시한다.
3. 사용자가 허가한 정확한 `creative_fillable` GAP ID만
   `generate_options` Phase에 전달한다.
4. 사용자가 대안을 선택하면 원본을 재확인한 뒤 정확한 선택 결과만
   `incorporate_selection` Phase에 전달한다.
5. 메인 Codex가 CP 각주, 대안 보존, 의존성, 수치 검증과 승인 경계를 확인한
   뒤에만 `pending` 승인 항목을 저장한다.

모든 작성·창작·검수 서브에이전트는 read-only handoff만 반환한다. Approval
Queue, 확정 문서, Decision Log와 Version History의 저장·상태 변경·적용은
메인 Codex의 책임이다.

임시 아이디어에서 전환된 요청은
`workspace/projects/<project_slug>/ideas/temporary_ideas.md`의 아이디어 ID를 근거로 연결한다. 전환
자체를 승인으로 간주하지 않으며 다른 문서 요청과 같은 승인 절차를 따른다.

## Branch Rules

### create_new_document

사용 조건:

- 관련 확정 문서가 없다.
- 새 문서로 분리할 만큼 독립적인 주제다.
- 기존 문서에 추가하면 범위가 커지거나 찾기 어려워진다.

처리:

- `docs/templates/design_doc.md` 또는 문서 타입별 템플릿을 따른다.
- 누락 정보는 `TBD`로 남기고 유형별 GAP으로 분류한다.
- 비시나리오 `creative_fillable` GAP은 허가 전까지 대안을 만들지 않고 창작
  보완 여부를 묻는다.
- 문서 역할이 `scenario`이면 원안 기반 Draft와 `Scenario Improvement Review`를
  `scenario_designer`가 분리해 작성하고 `scenario_reviewer`가 검수한다.
- 승인 큐 항목 초안으로 만든다.

### update_existing_document

사용 조건:

- 관련 확정 문서가 있다.
- 요청 내용이 해당 문서의 기존 주제와 직접 연결된다.
- 새 문서보다 기존 문서 갱신이 더 자연스럽다.

처리:

- `docs/workflows/propose_change.md`를 따른다.
- 변경 전 요약과 변경 후 초안을 분리한다.
- `docs/skills/conflict_review.md` 기준으로 충돌과 영향 범위를 검토한다.
- 대상 역할이 `scenario`이면 `scenario_designer`가
  `docs/skills/scenario_review.md`로 구조를 작성·검토하고 개선 권고를 변경
  Draft와 분리한 뒤 `scenario_reviewer`가 독립 검수한다.
- 승인 큐 항목 초안으로 만든다.

### restructure_documents

사용 조건:

- 하나의 기존 문서에 둘 이상의 canonical document role이 섞여 있다.
- 문서 분리·이동과 링크 갱신을 함께 적용해야 정보 유실이나 링크 단절을
  피할 수 있다.
- 하나의 사용자 요청이 여러 소유 문서의 생성·수정을 동시에 요구한다.

처리:

- `docs/workflows/document_structure.md`에 따라 내용별 원본 소유 문서를 정한다.
- 현재 문서의 모든 확정 내용을 새 소유 문서, 상위 요약 또는 `TBD` 중 하나에
  배정하고 누락 여부를 검토한다.
- 각 대상 Draft의 GAP을 분류하고 비시나리오 창작 가능 공백은 한 번에
  허가받는다.
- 승인 항목의 변경 타입을 `restructure`로 두고 대상별 `create`, `update`,
  `delete` 작업 목록을 작성한다.
- 개요서, 상세 문서와 문서 색인의 상대경로 링크를 같은 승인 범위에 둔다.
- `scenario` 작업이 포함되면 원안 기반 대상별 Draft와 시나리오 개선 권고를
  `scenario_designer`가 분리하며, `scenario_reviewer` 검수 후 권고가
  세계관·시스템 변경을 요구하면 의존 canonical owner를 표시한다.
- 하나의 원자적 승인 항목으로 만들며 일부 문서만 먼저 적용하지 않는다.

### delete_existing_document

사용 조건:

- 사용자가 기존 확정 문서의 삭제를 명시적으로 요청한다.
- 삭제 대상 문서가 하나로 식별된다.
- 내용 수정이나 보관이 아니라 문서 자체를 제거하는 것이 요청 목적이다.

처리:

- 삭제 대상 경로, 삭제 이유와 현재 문서 요약을 기록한다.
- 프로젝트 전체에서 대상 문서를 참조하는 링크, 설정, 용어와 후속 문서를
  검색한다.
- 설정 유실, 링크 단절, 중복 대체 문서와 관련 기획·구현 영향 가능성을
  검토한다.
- 대체 문서가 있으면 경로와 승계할 내용을 기록한다. 없으면 `없음` 또는
  `TBD`로 명시한다.
- `docs/templates/change_proposal.md`에서 변경 타입을 `delete`로 지정하고
  After에는 삭제 후 상태와 대체 관계를 작성한다.
- `docs/templates/approval_item.md` 형식의 승인 큐 항목 초안으로 만든다.
- 사용자가 대상과 삭제를 명시적으로 승인하기 전에는 실제 파일을 삭제하지
  않는다.

### compile_from_sources

사용 조건:

- 사용자가 확정 문서 반영보다 자료 정리, 요약, 출처 묶음을 요청한다.
- 여러 문서나 아이디어에서 관련 내용을 모아 보여주는 것이 목적이다.

처리:

- 확정 정보와 미확정 정보를 구분한다.
- 출처 파일을 함께 표시한다.
- 사용자가 저장을 요청하지 않으면 파일을 수정하지 않는다.
- 저장을 요청하면 승인 큐 항목 초안으로 만든다.

### draft_design_from_materials

사용 조건:

- 사용자가 있는 자료로 기획서를 만들어달라고 요청한다.
- 새 설정을 창작하기보다 기존 자료를 구조화하는 것이 목적이다.

처리:

- `docs/workflows/write_design_doc.md`를 하위 workflow로 따른다.
- 기존 자료에 있는 내용만 확정 정보처럼 사용한다.
- 부족한 항목은 `TBD`와 GAP으로 분류하고 비시나리오 창작 가능 공백은 명시적
  허가를 받은 뒤에만 대안을 만든다.
- 결과 문서가 `scenario`이면 `scenario_designer`가
  `docs/skills/scenario_review.md`를 적용해 개선 권고를
  기획서 Draft 밖에 두고 `scenario_reviewer`가 검수한다.
- 승인 큐 항목 초안으로 만든다.

### draft_ingame_script

사용 조건:

- 시나리오의 챕터·Phase를 실제 플레이용 지문, 대사와 선택지로 구체화하거나
  더 나은 플레이 경험을 위해 서사 구조까지 개선하는 것이 목적이다.
- 씬 번호, 조건, 분기, Outcome과 제작 정보를 대본과 함께 요구한다.

처리:

- 프로젝트 custom agent `scenario_writer`에 범위가 명확한 전담 작가 작업을
  위임한다.
- 작가 결과를 `scenario_reviewer`에 전달해 독립 검수하고 필수 수정이 남으면
  작가에게 되돌린다.
- `docs/workflows/write_ingame_script.md`와
  `docs/templates/ingame_script.md`를 따른다.
- 프로젝트 근거로 Writer's Brief를 만들고 하나의 최적안으로 집필한다.
- 구체 창작은 `CW-*`, 원본 서사 구조 변경은 `NR-*`로 공개한다.
- 상위 시나리오 변경, 미래 canonical 경로와 링크 갱신을 하나의 원자적
  `restructure` 승인 큐 항목으로 만든다.
- 세계관 정사나 시스템 규칙 변경은 연결된 별도 고위험 제안으로 분리한다.

### ask_for_clarification

사용 조건:

- 신규 문서 생성인지 기존 문서 수정인지 판단할 근거가 부족하다.
- 대상 문서 후보가 여러 개다.
- 요청한 변경이 승인 없이 확정 문서를 바꾸는 것처럼 보인다.
- 중요한 누락 정보가 있어 초안 품질이 크게 떨어진다.

처리:

- 후보 문서와 판단이 필요한 이유를 제시한다.
- 질문은 승인이나 분기에 필요한 것만 묻는다.
- 파일을 수정하지 않는다.

## Creative Completion Subflow

이 하위 흐름은 `create_new_document`, `update_existing_document`,
`restructure_documents`, `draft_design_from_materials`의 Draft에만 사용한다.

1. `design_creative_planner`의 `classify` Phase가 비시나리오 Draft의
   `Creative Completion Review`에서 `creative_fillable`, `user_fact`,
   `dependency` GAP을 구분한다.
2. 사용자가 창작 보완을 허가하지 않으면 모든 GAP을 `TBD`로 유지한다.
3. 사용자가 전체 또는 일부 GAP을 명시적으로 허가하면 메인 Codex가 정확한
   GAP ID를 `design_creative_planner`의 `generate_options` Phase에 전달한다.
   서브에이전트는 `docs/skills/design_creative_completion.md`에 따라 저·중위험은
   2개, 고위험은 3개 대안과 추천안을 만든다.
4. 사용자가 대안을 선택하기 전에는 `CP-*`를 Draft에 넣지 않는다.
5. 선택 후 메인 Codex가 원본을 다시 확인하고 선택 결과를
   `incorporate_selection` Phase에 전달해 선택안만 `CP-*` 각주와 함께 Draft에
   넣는다.
6. 선택은 승인이 아니다. 갱신한 승인 항목을 `pending`으로 다시 검토받는다.
7. canonical owner나 핵심 범위가 달라지면 기존 항목을 보존하고 연결된 새
   승인 항목 또는 원자적 `restructure` 항목을 만든다.
8. 일반 시나리오 구조와 인게임 스크립트에는 각각 Scenario Improvement,
   `CW-*`·`NR-*` 규칙을 우선하고 `CP-*`를 중복 부여하지 않는다.

## Output

- 선택한 branch
- 검색한 파일
- 판정 이유
- 승인 큐 항목 초안 또는 질문
- 누락 정보
- Creative Completion Review와, 허가된 경우 Creative Proposal Log
- 사용한 서브에이전트, 독립 검수 판정과 해소되지 않은 결과
- 근거 파일 목록

## Safety Rules

- 문서 관련 요청은 먼저 검색한 뒤 분기한다.
- 검색과 변경은 처음에 결정한 하나의 프로젝트 범위 안에서 수행한다.
- 승인 전에는 `workspace/projects/<project_slug>/design/`을 수정하지 않는다.
- 관련 문서가 있다고 해서 무조건 수정하지 않는다. 독립 주제면 신규 문서 후보로 둔다.
- 개요서와 관련 있다는 이유만으로 상세 설정·시나리오·시스템 내용을 개요서에
  추가하지 않는다. canonical owner가 다르면 신규 문서 또는 다중 문서 변경으로
  분기한다.
- 관련 문서가 없다고 해서 무조건 신규 문서를 만들지 않는다. 정보가 부족하면 질문한다.
- 삭제 대상이나 영향 범위를 식별할 수 없으면 삭제 제안을 확정하지 않고
  질문한다.
- 승인 큐, 임시 아이디어, 결정 로그는 확정 문서와 구분한다.
- 일반 시나리오 개선 권고는 사용자가 선택하기 전에는 Draft, 승인 대상 또는
  확정 사실이 아니다. 선택 후 원본을 다시 확인하고 갱신된 `pending` 승인안으로
  검토받는다.
- 일반 시나리오 검토에 인게임 스크립트용 `NR-*`를 강제하지 않는다.
- 기획 창작 대안은 사용자의 명시적 허가 전에는 생성하지 않으며, 대안 선택을
  갱신된 Draft의 승인으로 간주하지 않는다.
- 시나리오 Draft나 인게임 스크립트에 `scenario_reviewer`의 `blocking` 또는
  `required_revision` 결과가 남아 있으면 사용자 검토용 최종안이나 `pending`
  승인 항목으로 저장하지 않는다.
