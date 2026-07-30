# Document Completion Skill

## Purpose

기획서 초안의 승인이나 구현 전에 필요한 누락 정보를 찾고, 사용자 확인이
필요한 사실과 창작으로 보완할 수 있는 설계 공백을 구분한다. 일반 기획 역할은
`design_creative_planner`의 `classify` Phase가, 일반 시나리오는
`scenario_designer`가, 인게임 스크립트는 `scenario_writer`가 담당한다. 메인
Codex는 분류 결과를 검토하고 사용자에게 전체 GAP 목록을 제시한다.

## Common Required Fields

- NPC: 이름, 역할, 등장 위치, 관련 퀘스트, 대사 톤, 설계 의도.
- Quest: 시작 조건, 완료 조건, 주요 NPC, 보상, 실패 조건.
- Item: 이름, 분류, 획득 방법, 효과, 밸런스 값.
- System: 목적, 규칙, 입력, 출력, 예외.
- World Setting: 요약, 규칙, 제약, 충돌 금지 설정.
- Game Overview: 핵심 경험, 디자인 원칙, 상위 루프, 거시 진행, 목표 범위,
  상세 문서 지도.
- Scenario: 서사 목표, 시작·종료 상태, Scene 흐름, 등장인물 목적,
  선택·분기, 정보 공개와 엔딩.
- Content: 진입 조건, 실제 플레이 단위, 관련 장면·시스템, 보상·실패,
  반복·완료 처리.
- UI: 목적, 주요 상태, 입력 방식, 표시 정보, 예외 상태.
- Resource: 종류, 사용 위치, 제작 요구, 의존 문서.

## Question Rule

- 이미 문서에 있는 정보는 묻지 않는다.
- 승인에 꼭 필요한 질문을 우선한다.
- 첫 초안에서 남겨도 되는 정보는 `TBD`로 둔다.
- 질문마다 왜 필요한지 짧게 설명한다.
- 다른 문서가 소유할 정보는 현재 문서의 누락으로 보지 않고 관련 문서 링크
  또는 별도 변경 대상으로 표시한다.

## Gap Classification

신규·수정·재구성 Draft의 누락마다 `GAP-<document_slug>-<number>` ID를
부여하고 다음 중 하나로 분류한다.

- `creative_fillable`: 프로젝트 근거 안에서 설계 대안을 만들 수 있다.
- `user_fact`: 실제 프로젝트 결정이나 외부 사실이 필요해 창작할 수 없다.
- `dependency`: 다른 canonical owner 또는 선행 승인 결과가 필요하다.

실제 플랫폼·엔진·예산·일정·인력, 확인되지 않은 에셋·데이터 ID, 외부 계약과
법적 조건은 `user_fact`다. 다른 문서가 소유할 정사·규칙·계약은 `dependency`다.

## Creative Completion Routing

- `classify` Phase와 GAP 목록 작성은 프로젝트 창작 규칙 없이 수행할 수 있다.
- 메인 Codex는 신규·수정·재구성 비시나리오 Draft와 다중 역할 Draft의
  비시나리오 부분을 `design_creative_planner`의 `classify` Phase에 위임한다.
  일반 시나리오와 인게임 스크립트는 각 전담 작성 에이전트가 누락 분류와
  `TBD` 표시를 수행한다.
- 메인 Codex가 분류의 canonical owner, GAP 유형과 위험도를 검토한 뒤
  비시나리오 `creative_fillable` 항목을 한 번에 보여주고 창작으로 채울지
  묻는다.
- 명시적 허가 전에는 대안을 만들거나 Draft에 창작 내용을 넣지 않는다.
- 사용자가 비시나리오 GAP의 창작을 허가하면 정확한 GAP ID를
  해당 분야의 active 프로젝트 창작 규칙과 함께 `design_creative_planner`의
  `generate_options` Phase에 전달하고
  `docs/skills/design_creative_completion.md`를 따른다.
- 일반 시나리오 구조와 인게임 스크립트는 각각 기존 Scenario Improvement,
  `CW-*`·`NR-*` 규칙을 우선한다.
- 창작 규칙이 없으면 `blocked_missing_creative_rule`, 요청 범위가 다르면
  `blocked_creative_rule_mismatch`로 두고 대안을 만들지 않는다. 규칙 누락은
  메인 Codex가 planning-only 설정 설계로 즉시 라우팅하며, 기존 규칙 불일치는
  사용자가 개정을 요청하기 전에는 자동 변경하지 않는다.

## Output

| GAP ID | 대상 문서·필드 | 유형 | 위험도 | 현재 처리 | 필요한 조치 |
|---|---|---|---|---|---|
|  |  | creative_fillable \| user_fact \| dependency | low \| medium \| high | `TBD` | 창작 허가 \| 사용자 답변 \| 선행 항목 |
