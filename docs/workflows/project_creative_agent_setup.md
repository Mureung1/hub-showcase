# Project Creative Agent Setup Workflow

## Purpose

프로젝트에 필요한 창작 역할을 미리 고정하지 않고, 사용자가 실제 창작 기능을
요청했을 때 해당 분야의 프로젝트 전용 창작 규칙을 planning-only 설정
설계로 완성한다. 이 절차는 대화 UI의 Plan mode 전환 여부와 무관하게
메인 Codex가 수행한다.
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
2. 요청을 canonical document role, 프로젝트 기준 대상 경로와 허용 작업
   `author | revise | restructure | generate_options |
   incorporate_selection` 중 하나로 분류한다.
3. 프로젝트에 `agents/README.md`가 있으면 이 색인만 먼저 읽어 적용 가능한
   `active` 규칙을 찾는다. canonical role이 같고 경로 선택자
   `exact | subtree`가 대상 경로를 포함하며 허용 작업이 일치해야 한다.
4. 정확히 일치하는 규칙이 있으면 해당 규칙 파일 하나만 읽는다.
   둘 이상 일치하면 파일을 임의로 열거나 선택하지 않고
   `blocked_creative_rule_mismatch`로 중단한다.
5. 적용 가능한 규칙이 없으면 창작 전문 agent를 호출하거나 대안을 만들지
   않고 `blocked_missing_creative_rule`로 창작 실행을 중단한 뒤 아래
   Automatic Setup Design을 즉시 수행한다.
6. 기존 규칙이 있지만 요청 범위를 포함하지 않거나 현재 사용자 지시와
   충돌하면 `blocked_creative_rule_mismatch`로 중단한다. 규칙을 자동
   확장·개정하지 않고 불일치 내용과 개정 필요성을 사용자에게 확인한다.
7. 새 규칙 설정 설계는 첫 창작 요청 자체로 시작할 수 있다. 기존 규칙 개정
   설계는 사용자의 명시적 개정 요청이 있을 때만 시작한다.

규칙 검색에도 Minimal Source Rule을 적용한다. 프로젝트의 모든 규칙 파일을
예방적으로 열지 않고 색인의 routing 메타데이터로 선택한 정확한 active 파일
하나만 읽는다. `Archived Rule Snapshots`는 새 창작 routing에 사용하지 않는다.

## Automatic Setup Design

창작 규칙 작성·개정 설계는 planning-only 작업이다. 메인 Codex는 프로젝트
파일을 수정하지 않고 `docs/templates/project_creative_agent_setup_plan.md`를
따라 다음 절차를 수행한다.

1. 현재 요청에서 프로젝트, canonical document role, 창작 분야와 목표를
   추출한다.
2. 프로젝트 README와 문서 지도로 정확한 canonical owner와 최소 근거
   경로를 먼저 확인한다. 전체 design 트리, Approval Queue, 임시 아이디어,
   Decision Log와 Version History를 예방적으로 열지 않는다.
3. 확인 가능한 항목은 현재 사용자 입력, prior user input, 확정 문서와 전역
   workflow로 미리 채운다.
4. 선택에 따라 창작 행동이 실질적으로 달라지는 항목만 질문한다. 질문에는
   항상 출처에 맞는 권장 기본값을 함께 제시하며 빈 양식을 사용자에게
   떠넘기지 않는다.
5. 사용자가 답하지 않거나 일부만 답하면 이미 제시한 기본값으로 나머지를
   완성한다. 권한 확대가 필요한 미응답은 가장 좁은 범위, 사실 생성이 필요한
   미응답은 해당 사실을 만들지 않고 `TBD`로 유지하는 규칙을 기본값으로 삼는다.
6. 아래 Required Setup Decisions를 모두 채운 하나의 decision-complete 설정
   계획을 반환한다.
7. 사용자에게 에이전트가 보충한 항목, 최종값과 사용 근거를 별도 표로
   알린다. 이 보충 내역은 PCA 파일이나 별도 프로젝트 기록에 저장하지 않는다.
8. 원래 창작 요청의 실행 상태, 저장 후 재개 가능 여부와 남은 창작·승인
   권한을 명시한다.

사용자가 아무 메시지도 보내지 않은 상태에서 파일을 자동 저장하지 않는다.
다만 완성된 권장안을 받은 뒤 `그대로 구현해`처럼 구현만 요청하면, 별도
항목별 답변 없이 표시된 기본값을 포함한 계획 전체의 구현 요청으로 처리한다.

## Required Setup Decisions

설정 계획은 다음 항목을 비워 둘 수 없다.

1. 프로젝트 ID와 규칙 ID·슬러그
2. 창작 분야, canonical document role, 경로 선택자, 대상 경로와 허용 작업
3. 적용 요청, 포함 범위, 제외 범위와 중단 조건
4. 사용할 기존 실행 agent type
5. 입력 확인, 출처 충돌·GAP 처리, Draft·대안 작성 순서, 검수·수정 반복과
   완료 조건을 포함한 작성 절차
6. 필수 근거 파일과 출처 우선순위
7. 프로젝트에 맞는 창작 목표와 기대 플레이 경험
8. 창작 우선 원칙, 허용하는 판단과 핵심 tradeoff
9. 금지 요소, 임의 창작 금지와 반드시 `TBD`로 둘 항목
10. 기존 provenance 체계와 기대 산출물
11. 검수 방식, 검수 항목과 통과 기준
12. 규칙 충돌·범위 불일치 처리와 개정 조건

검수 방식은 비워 둘 수 없다.

- 일반 시나리오와 인게임 스크립트:
  `independent_always`만 허용하며 `scenario_reviewer`가 검수한다.
- 비시나리오:
  `self_and_main | independent_high_risk | independent_always` 중 하나를
  선택한다. 사용자가 달리 선택하지 않으면 `independent_high_risk`를
  기본값으로 사용한다.
- 비시나리오 독립 검수는 `design_creative_reviewer`가 수행한다.

하나의 요청이 서로 다른 canonical role의 창작을 포함하면 한 규칙에 합치지
않고 분야별 독립 규칙 계획으로 분리한다. 설정 설계의 합의나 대안 선택은 게임
기획 변경의 승인으로 간주하지 않는다.

## Existing Project JIT Policy

- 기존 프로젝트에도 현재 요청과 무관한 분야 PCA를 일괄 생성하지 않는다.
- 이미 구현된 active PCA와 일치하는 작업만 즉시 실행한다.
- 메인 시나리오 구조와 플레이어 노출 인게임 스크립트가 같은 이야기 범위에
  속해도 실행 agent, 작성 절차와 provenance가 다르므로 각각
  `scenario_designer`, `scenario_writer`용 독립 PCA를 사용한다.
- 없는 분야는 첫 실제 창작 요청에서 Automatic Setup Design을 수행하고,
  사용자의 구현 요청 뒤 원래 작업을 재개한다.
- 프로젝트에 첫 PCA를 추가하는 변경은 `agents/` 구조와 프로젝트 README
  링크를 같은 변경 묶음에 포함한다.

## Persistence

설정 설계 중에는 저장하지 않는다. 사용자가 완성된 계획의 구현을 명시적으로
요청하면 메인 Codex가 다음을 수행한다.

1. 첫 규칙이면 `docs/templates/project_creative_agent_index.md`를 사용해
   프로젝트에 `agents/README.md`와 `agents/rules/`를 만든다.
2. `docs/templates/project_creative_agent_rule.md`로 규칙 파일을 작성한다.
3. 규칙 ID는 `PCA-<project_slug>-<rule_slug>`를 사용한다.
4. 신규 규칙은 `active`, 버전 `1`로 저장한다.
5. 기존 규칙 개정 전 현재 파일의 정확한 바이트를
   `agents/rules/archive/<rule_slug>/v<version>.md`에 보존하고 현재 SHA-256과
   snapshot 경로를 색인의 `Archived Rule Snapshots`에 기록한다.
6. 기존 규칙은 버전을 1 올리고 Change History에 사용자 요청과 변경 이유를
   기록한다. archive snapshot 자체는 수정하지 않는다.
7. `agents/README.md`에 ID, 분야, canonical role, 경로 선택자, 대상 경로,
   허용 작업, 기본 agent type, 검수 정책, 버전, 상태와 상대경로 링크를
   실제 규칙과 동일하게 기록한다.
8. 첫 규칙을 만들 때 프로젝트 README의 작업 문서 목록에 Project Creative
   Agents 링크를 추가한다.
9. 저장된 규칙의 SHA-256을 계산하고 구현 완료 보고에 경로·버전·해시와 함께
   설정 계획에서 에이전트가 보충한 항목·값·근거를 다시 알린다. 보충 내역
   자체는 PCA나 별도 프로젝트 문서에 저장하지 않는다.

창작 규칙은 canonical design 문서가 아니므로 Approval Queue, Decision Log와
Version History를 사용하지 않는다. 설정 설계 이후의 명시적 구현 요청이
규칙 생성·개정 권한이다. 규칙 구현과 동시에 `design/` 문서를 바꾸지 않는다.

원래 창작 요청이 남아 있고 정확한 창작 권한·GAP 범위가 이미 확인되었으면
규칙 저장 후 해당 작업을 재개한다. 권한이 부족하면 기존 창작 허가 단계로
돌아간다.

## Runtime Contract

규칙을 사용하는 모든 Specialist Task Packet에 다음을 기록한다.

- 프로젝트 창작 에이전트 ID
- 규칙 기준 `active_current | archived_snapshot`
- 규칙 경로, 버전과 해당 파일의 SHA-256
- 규칙이 허용하는 정확한 적용 범위
- 선택된 검수 정책과 reviewer
- 규칙을 사용하지 않는 단계라면 `해당 없음`과 이유

전문 agent는 전역 workflow와 canonical facts를 우선하고 프로젝트 창작 규칙을
창작 판단 기준으로 사용한다. 규칙을 새로운 프로젝트 사실의 근거로 인용하지
않는다.

창작·검수 결과는 생성 당시 규칙 ID·버전·SHA-256을 보존한다. 이후 active
규칙이 바뀌어도 과거 결과를 자동 재검수·수정·무효화하지 않으며 기존
선택·검수 상태로 선택, 승인과 기계적 적용을 계속할 수 있다.

과거 결과를 새로 수정하거나 선택안을 Draft에 반영하는 창작 단계는 현재
active 규칙으로 새 결과를 만든다. 사용자가 현재 규칙 재검수를 명시적으로
요청했을 때만 현재 active 규칙으로 read-only 재검수하고 기존 원문을 자동
개정하지 않는다. 별도 지정 없는 재검수는 현재 active 규칙, 당시 규칙 기준
감사는 archive snapshot을 사용한다.

Task Packet이 지목한 active 파일 또는 archive snapshot의 경로·버전·SHA-256이
실제 파일과 다르면 `blocked_creative_rule_integrity`로 중단한다. 현재 active
버전이 과거 결과의 pinned version보다 새롭다는 사실만으로는 이 상태를
반환하지 않는다. canonical 원본 변경에 따른 `needs_reconfirmation`은 별도로
적용한다.

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
- archive snapshot은 새 창작 routing이나 현재 규칙 기본값으로 사용하지 않고
  과거 결과 감사에만 사용한다.
- active 규칙 변경만으로 과거 결과를 자동 재검수하거나 무효화하지 않는다.
- 설정 기본값은 canonical fact나 사용자 승인으로 취급하지 않는다.
- 규칙마다 별도 `.codex/agents/*.toml` 또는 새 `agent_type`을 만들지 않는다.
- 전문 agent와 reviewer는 read-only handoff만 반환한다.

## Output

- 선택한 프로젝트와 창작 분야
- 적용한 프로젝트 창작 에이전트 ID·규칙 버전
- 규칙 조회 결과 또는 차단 상태
- 완성된 설정 계획과 항목별 필요 이유
- 사용자가 직접 정한 항목과 에이전트가 기본값으로 보충한 항목
- 저장 후 호출할 기존 agent type과 검수 경로
- 원래 창작 요청의 재개 여부와 남은 권한 확인
