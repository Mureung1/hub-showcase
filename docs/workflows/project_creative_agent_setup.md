# Project Creative Agent Setup Workflow

## Purpose

프로젝트에 필요한 창작 역할을 미리 고정하지 않고, 사용자가 실제 창작 기능을
요청했을 때 해당 분야의 프로젝트 전용 창작 규칙을 Plan mode에서 설계한다.
완성된 규칙은 프로젝트 안에 저장하며 기존 전문 custom agent가 이를 읽어
프로젝트 전용 창작자로 동작한다.

프로젝트 창작 규칙은 행동 설정이다. 세계관 정사, 시스템 규칙, 콘텐츠 사실과
같은 canonical detail을 소유하거나 기존 승인 절차를 대신하지 않는다.

## Trigger

대상 프로젝트와 canonical document role을 먼저 확정한 뒤 다음 작업에서
프로젝트 창작 규칙을 확인한다.

- 비시나리오 `creative_fillable` GAP의 대안 생성과 선택 반영
- 일반 시나리오 신규 작성, 변경과 선택된 개선안 반영
- 플레이어 노출 인게임 스크립트 집필과 변경
- 원본에 없는 표현, 설정, 규칙, 구조 또는 제작 방향을 제안하는 작업

다음 작업에는 창작 규칙을 요구하지 않는다.

- 검색, 요약과 검토 전용 보고
- `design_creative_planner`의 `classify` Phase
- 확정 자료를 창작 없이 구조화하거나 형식을 바꾸는 작업
- 임시 아이디어의 최초 기록
- 승인된 변경안의 기계적 적용

검토자가 창작 규칙 없이 검토 전용 작업을 수행할 때는 문제와 필요한 조치를
지적할 수 있지만, 구체적인 대체 설정이나 서사 개선안을 새로 만들지 않는다.

## Rule Resolution

1. `docs/workflows/project_workspace.md`에 따라 프로젝트를 하나로 확정한다.
2. 요청을 canonical document role과 창작 분야로 분류한다.
3. 프로젝트에 `agents/README.md`가 있으면 이 색인만 먼저 읽어 적용 가능한
   `active` 규칙을 찾는다.
4. 정확히 일치하는 규칙이 있으면 해당 규칙 파일 하나만 읽는다.
5. 적용 가능한 규칙이 없으면 창작 전문 agent를 호출하거나 대안을 만들지
   않고 `blocked_missing_creative_rule`로 중단한다.
6. 기존 규칙이 있지만 요청 범위를 포함하지 않거나 현재 사용자 지시와
   충돌하면 `blocked_creative_rule_mismatch`로 중단한다. 규칙을 자동
   확장·개정하거나 자동으로 Plan mode에 진입하지 않는다.
7. 사용자의 명시적 규칙 작성·개정 요청이 있으면 아래 Plan Mode Setup을
   수행한다.

규칙 검색에도 Minimal Source Rule을 적용한다. 프로젝트의 모든 규칙 파일을
예방적으로 열지 않고 색인에서 선택한 정확한 파일만 읽는다.

## Plan Mode Setup

창작 규칙 작성·개정은 planning-only 작업이다. Plan mode에서는 프로젝트 파일을
수정하지 않고 다음 항목을 모두 결정한 하나의 완성 계획을 반환한다.

1. 프로젝트 ID와 규칙 ID·슬러그
2. 창작 분야와 canonical document role
3. 적용 요청, 포함 범위, 제외 범위와 중단 조건
4. 사용할 기존 실행 agent type
5. 필수 근거 파일과 출처 우선순위
6. 프로젝트에 맞는 창작 목표와 기대 플레이 경험
7. 창작 우선 원칙, 허용하는 판단과 핵심 tradeoff
8. 금지 요소, 임의 창작 금지와 반드시 `TBD`로 둘 항목
9. 기존 provenance 체계와 기대 산출물
10. 검수 방식, 검수 항목과 통과 기준
11. 규칙 충돌·범위 불일치 처리와 개정 조건

검수 방식은 비워 둘 수 없다.

- 일반 시나리오와 인게임 스크립트:
  `independent_always`만 허용하며 `scenario_reviewer`가 검수한다.
- 비시나리오:
  `self_and_main | independent_high_risk | independent_always` 중 사용자가
  Plan mode에서 하나를 선택한다.
- 비시나리오 독립 검수는 `design_creative_reviewer`가 수행한다.

하나의 요청이 서로 다른 canonical role의 창작을 포함하면 한 규칙에 합치지
않고 분야별 독립 규칙 계획으로 분리한다. Plan mode의 합의나 대안 선택은
게임 기획 변경의 승인으로 간주하지 않는다.

## Persistence

Plan mode에서는 저장하지 않는다. 사용자가 완성된 계획의 구현을 명시적으로
요청하면 메인 Codex가 다음을 수행한다.

1. 첫 규칙이면 `docs/templates/project_creative_agent_index.md`를 사용해
   프로젝트에 `agents/README.md`와 `agents/rules/`를 만든다.
2. `docs/templates/project_creative_agent_rule.md`로 규칙 파일을 작성한다.
3. 규칙 ID는 `PCA-<project_slug>-<rule_slug>`를 사용한다.
4. 신규 규칙은 `active`, 버전 `1`로 저장한다.
5. 기존 규칙 개정은 버전을 1 올리고 Change History에 사용자 요청과 변경
   이유를 기록한다.
6. `agents/README.md`에 ID, 분야, canonical role, 기본 agent type, 검수 정책,
   버전, 상태와 상대경로 링크를 기록한다.
7. 첫 규칙을 만들 때 프로젝트 README의 작업 문서 목록에 Project Creative
   Agents 링크를 추가한다.

창작 규칙은 canonical design 문서가 아니므로 Approval Queue, Decision Log와
Version History를 사용하지 않는다. Plan mode 이후의 명시적 구현 요청이
규칙 생성·개정 권한이다. 규칙 구현과 동시에 `design/` 문서를 바꾸지 않는다.

원래 창작 요청이 남아 있고 정확한 창작 권한·GAP 범위가 이미 확인되었으면
규칙 저장 후 해당 작업을 재개한다. 권한이 부족하면 기존 창작 허가 단계로
돌아간다.

## Runtime Contract

규칙을 사용하는 모든 Specialist Task Packet에 다음을 기록한다.

- 프로젝트 창작 에이전트 ID
- 규칙 경로, 버전과 현재 SHA-256
- 규칙이 허용하는 정확한 적용 범위
- 선택된 검수 정책과 reviewer
- 규칙을 사용하지 않는 단계라면 `해당 없음`과 이유

전문 agent는 전역 workflow와 canonical facts를 우선하고 프로젝트 창작 규칙을
창작 판단 기준으로 사용한다. 규칙을 새로운 프로젝트 사실의 근거로 인용하지
않는다.

대안 생성, 사용자 선택, Draft 반영 사이에 규칙 버전이나 SHA-256이 달라지면
`needs_creative_rule_reconfirmation`을 반환한다. 메인 Codex는 변경된 규칙과
원본을 재확인하기 전까지 결과를 저장하거나 적용하지 않는다.

## Review Routing

- `self_and_main`: 작성 agent의 자체 검수와 메인 Codex의 return check만
  수행한다.
- `independent_high_risk`: `high` 결과만 `design_creative_reviewer`에
  전달하고 `low | medium`은 자체 검수와 메인 검토를 수행한다.
- `independent_always`: 모든 결과를 해당 독립 reviewer에 전달한다.

독립 reviewer의 `blocking` 또는 `required_revision`이 남으면 결과를 사용자
검토용 최종안이나 `pending` 승인 항목으로 저장하지 않는다. 원 작성 agent가
수정한 뒤 같은 규칙과 원본으로 재검수한다.

## Safety Rules

- 프로젝트 생성 시 창작 규칙이나 `agents/` 폴더를 미리 만들지 않는다.
- 다른 프로젝트의 규칙을 복사하거나 현재 프로젝트의 근거로 사용하지 않는다.
- 프로젝트 규칙은 AGENTS.md, workflow, 승인, provenance와 canonical owner
  경계를 완화할 수 없다.
- 규칙 범위가 맞지 않아도 사용자가 개정을 요청하기 전에는 자동 변경하지
  않는다.
- 규칙마다 별도 `.codex/agents/*.toml` 또는 새 `agent_type`을 만들지 않는다.
- 전문 agent와 reviewer는 read-only handoff만 반환한다.

## Output

- 선택한 프로젝트와 창작 분야
- 적용한 프로젝트 창작 에이전트 ID·규칙 버전
- 규칙 조회 결과 또는 차단 상태
- Plan mode에서 확정할 항목과 미결정 사항
- 저장 후 호출할 기존 agent type과 검수 경로
- 원래 창작 요청의 재개 여부와 남은 권한 확인
