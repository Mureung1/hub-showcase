# Scenario Review Skill

## Purpose

`scenario_designer`가 시나리오 자료를 일반 시나리오 문서로 작성·수정하면서
원안을 보존하고 더 나은 전개, 분기와 Outcome을 별도 권고안으로 제시한다.
`scenario_reviewer`는 작성 결과를 프로젝트 원본과 직접 대조해 독립 검수하며,
메인 Codex는 프로젝트·범위 확정, 검수 라우팅과 승인안 저장을 담당한다.

일반 시나리오 작성·변경에는
`docs/workflows/project_creative_agent_setup.md`의 active 프로젝트 창작 규칙과
`independent_always` 검수 계약이 필요하다. 검토 전용 요청은 규칙 없이 문제를
판정할 수 있지만, 구체적인 대체 구조나 새 개선 권고를 만들려면 규칙이
필요하다.

이 스킬은 인게임 스크립트 집필용 `scenario_writer`를 대신하지 않는다.
플레이어 노출 대본과 씬 명세를 작성하는 요청은
`docs/workflows/write_ingame_script.md`와 `docs/skills/scenario_writing.md`를
따른다.

일반 기획 공백의 `CP-*` 규칙도 사건 순서, 공개 시점, 동기, 선택, 분기와
Outcome 개선을 대신하지 않는다. 이 범위는 `Scenario Improvement Review`만
사용한다. 세계관 정사나 시스템 규칙의 창작 보완은 해당 canonical owner의
`docs/skills/design_creative_completion.md` 제안으로 분리한다.

## Agent Responsibilities

- 메인 Codex: 대상 프로젝트·canonical owner·범위·근거를 확정하고
  작성·변경은 `scenario_designer`, 검토 전용 요청은 `scenario_reviewer`에
  위임한다. 작성 결과의 독립 검수를 확인한 뒤에만 사용자에게 제시하거나
  Approval Queue에 저장한다.
- 메인 Codex는 작성 전에 정확한 프로젝트 창작 규칙 ID·경로·버전·SHA-256을
  Task Packet에 기록하고 결과와 재검수까지 같은 규칙인지 확인한다.
- `scenario_designer`: 프로젝트별 Scenario Designer's Brief를 구성하고 원안
  기반 Draft, GAP 목록과 분리된 `Scenario Improvement Review`를 작성한다.
- `scenario_reviewer`: 작성자의 요약에 의존하지 않고 원본을 직접 읽어 출처
  충실도, 서사 품질, 연속성, 의존성과 승인 경계를 검수한다. Draft를 직접
  수정하지 않고 `blocking | required_revision | authorial_reconsideration |
  note` 결과를 반환한다.
- 필수 수정은 메인 Codex가 원 작성 에이전트에 돌려보낸다. 선택적 서사 개선은
  일반 시나리오에서는 `Scenario Improvement Review` 후보로만 처리한다.
- 작성·검수 서브에이전트는 프로젝트 파일을 수정하지 않는다. 검수 후 승인
  항목 저장과 적용 판단은 메인 Codex만 수행한다.
- 검토 전용 요청은 `scenario_reviewer`가 대상 확정 문서를 직접 검수하고
  `Scenario Review Report`만 반환한다. 변경 Draft가 필요해지면 메인 Codex가
  별도 작성 범위를 확정해 `scenario_designer`에 전달한다.

## When To Use

- 사용자가 시나리오 자료나 초안을 제공해 검토를 요청할 때
- 사용자가 제공한 자료를 `scenario` 문서로 기획서화할 때
- 새 `scenario` 문서의 승인 초안을 작성할 때
- 기존 `scenario` 문서의 변경안이나 재구성안을 작성할 때
- 여러 역할을 다루는 요청에 사건 흐름, 선택, 분기, 공개 정보 또는 엔딩 변경이
  포함될 때

단순 검색·질의응답, 임시 아이디어의 최초 기록, 이미 승인된 항목의 기계적
적용에는 새 개선 권고를 추가하지 않는다. 다만 승인안 적용 직전 원본 재확인에서
권고안이 Draft에 포함되지 않았는지 구분해 확인한다.

## Source Rules

1. 대상 프로젝트와 사용자 요청 범위를 먼저 확정한다.
2. 작성·변경이면 색인에서 선택한 정확한 프로젝트 창작 규칙 하나를 읽는다.
3. 사용자 제공 자료, Project Brief, 게임 개요와 대상 시나리오를 읽는다.
4. 관련된 확정 세계관, 시스템, 콘텐츠와 기존 시나리오를 필요한 범위에서
   확인한다.
5. 승인 항목과 임시 아이디어는 사용자가 입력 근거로 지정한 경우에만 사용하고
   확정 자료와 구분한다.
6. `docs/dev-log/`는 현재 시나리오의 근거나 운영 규칙으로 사용하지 않는다.

`scenario_designer`와 `scenario_reviewer`는 각각 관련 원본을 직접 읽는다.
검수자는 작성자의 Source 요약만 근거로 통과 판정을 내리지 않는다.

## Review Criteria

- 사건 사이의 인과와 진입·종료 상태가 자연스러운가
- 인물의 욕망, 동기와 행동이 장면마다 이어지는가
- 긴장 상승과 속도가 목표 플레이 경험에 맞는가
- 복선과 정보 공개 시점이 너무 이르거나 늦지 않은가
- 플레이어 선택이 의미 있는 차이와 이해 가능한 결과를 만드는가
- 분기 비용, 분량과 합류 지점이 유지 가능한가
- Outcome과 상태 변화가 이후 시나리오에 일관되게 연결되는가
- 개선안이 세계관 정사, 시스템 규칙, 제작 범위와 충돌하지 않는가

## Output Rules

1. `scenario_designer`는 사용자 요청과 자료에 충실한 원안 기반 Draft를 먼저
   작성한다.
2. 더 나은 구조가 있을 때만 Draft 밖의 `Scenario Improvement Review`에 별도
   권고안으로 제시한다. 원안 기반 Draft에 자동으로 섞지 않는다.
3. 권고안마다 다음 내용을 기록한다.
   - 상태: `proposed`
   - 대상 범위
   - 원안 요약
   - 권고 구조
   - 개선 이유
   - 기대되는 플레이 경험
   - 연속성, 제작과 후속 문서 영향
   - 세계관·시스템 canonical owner 의존성
4. 의미 있는 개선점이 없으면 `추가 개선 권고 없음`이라고 명시한다. 대안을
   만들기 위해 불필요한 설정이나 분기를 창작하지 않는다.
5. 권고안은 승인 대상 Draft가 아니며 선택 전에는 적용하거나 확정 사실처럼
   참조하지 않는다.
6. `scenario_reviewer`는 독립 `Scenario Review Report`에 판정
   (`pass | revision_required | blocked`), 근거, 영향, 필요한 조치와 원 작성
   에이전트 라우팅을 기록한다.
7. `blocking` 또는 `required_revision`이 남은 결과는 사용자 검토용 최종안이나
   `pending` 승인 항목으로 저장하지 않는다. 원 작성 에이전트가 고친 뒤 다시
   독립 검수한다.
8. `authorial_reconsideration`은 자동 수정 지시가 아니며, 채택하려면 기존과
   같은 Scenario Improvement 선택·재확인 절차를 거친다.
9. 작성·선택·재검수 사이에 프로젝트 창작 규칙 버전이나 SHA-256이 바뀌면
   `needs_creative_rule_reconfirmation`으로 중단한다.

## Selection And Approval

- 사용자가 권고안을 선택하면 메인 Codex가 관련 자료와 현재 원본을 다시
  확인하고 `scenario_designer`에 선택 내용을 전달한다. 갱신된 Draft는
  `scenario_reviewer`의 재검수를 거친 뒤 상태를 `incorporated`로 바꾸고 선택
  이력을 Decision History에 기록한다. 거절된 권고는 `declined`로 기록할 수
  있다.
- 기존 승인 항목의 대상, 목적과 핵심 범위가 유지되면 항목을 개정해
  `pending`으로 다시 검토받는다. 핵심 범위나 대상 문서가 달라지면 연결된 새
  승인 항목을 만든다.
- 세계관 정사나 시스템 규칙 변경이 필요하면 해당 canonical owner를 별도
  또는 다중 문서 변경안으로 분류한다. 필요한 선행 승인이 적용되기 전에는
  시나리오 Draft에 그 변경을 확정해 넣지 않는다.
- 선택된 권고안도 사용자의 명시적 승인과 적용 직전 원본 재확인 없이는
  `design/narrative/`에 반영하지 않는다.
- 승인 적용은 Draft만 대상으로 한다. `proposed`나 `declined` 상태의 권고는
  어떤 승인 문구로도 함께 적용하지 않는다.

## Relationship To Narrative Revision Logs

일반 시나리오 문서의 분리된 권고안에는 `NR-*`를 강제하지 않는다. `NR-*`는
인게임 스크립트 초안이 상위 시나리오와 다른 구조를 직접 사용하는 경우에
`docs/workflows/write_ingame_script.md` 규칙대로 사용한다.
