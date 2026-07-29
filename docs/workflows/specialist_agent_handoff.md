# Specialist Agent Handoff Workflow

## Purpose

메인 Codex가 전문 custom agent를 호출할 때 부모 대화 전체를 넘기지 않고도
사용자 의도, 프로젝트 근거, 선택과 금지 조건을 빠짐없이 전달한다. 호출 인자
충돌, 불필요한 전체 대화 복사, 광범위한 재탐색과 권한 추정을 방지한다.

적용 대상은 `scenario_designer`, `scenario_writer`, `scenario_reviewer`,
`design_creative_planner`, `design_creative_reviewer`의 모든 신규 호출과 후속
호출이다.

## Required Specialist Task Packet

메인 Codex는 호출 전에 `docs/templates/specialist_task_packet.md` 형식으로 아래
항목을 모두 확정한다.

1. 대상 agent와 정확한 작업 Phase 또는 작업 종류
2. 프로젝트 ID, 프로젝트 루트와 canonical document role
3. 사용자의 현재 목표와 요청 결과
4. 작업 범위, 포함 대상, 제외 대상과 중단 조건
5. 전문 agent가 직접 읽을 필수 근거 파일
6. 사용자 제공 사실, 확정 사실, 제안 입력과 테스트 픽스처 가정의 항목별
   출처 유형과 근거
7. 대화에서 결정된 선택, 승인 항목·GAP·CP·NR·CW ID와 현재 상태
8. 창작 허가, 선택 권한, 승인·적용 권한의 유무와 정확한 경계
9. 임의 창작 금지, `TBD`, 의존성과 충돌 처리 조건
10. 입력 산출물 또는 이전 handoff와 기대 출력 형식
11. 반환 후 메인 검토와 독립 검수 조건
12. 창작 규칙이 필요한 작업이면 프로젝트 창작 에이전트 ID, 규칙 경로·버전·
    SHA-256, 적용 범위와 검수 계약

메인 Codex는 현재 사용자 요청과 작업에 영향을 주는 이전 사용자 발화를
Task Packet과 대조한다. 파일에 아직 기록되지 않은 사용자 사실, 선택,
금지사항이나 범위 변경이 있으면 반드시 `대화에서 전달할 필수 정보`에
명시한다. 단순 인사, 반복 설명과 무관한 대화는 전달하지 않는다.

모든 사실·입력에는 `current_user_input`, `prior_user_input`,
`confirmed_document`, `proposal_input`, `synthetic_test_fixture` 중 하나를
기록한다. `synthetic_test_fixture`는 `[TEST FIXTURE: SYNTHETIC]` 표시와 함께
별도 `테스트 픽스처 가정` 표에만 둔다. 이를 사용자 사실이나 확정 사실로
표현하지 않는다. 테스트 호출은
`docs/workflows/behavior_testing.md`와 Behavior Test Manifest도 함께 따른다.

필수 항목을 저장소에서 확인할 수 없고 안전한 `TBD`로도 둘 수 없으면 전문
agent를 호출하지 않는다. 메인 Codex가 먼저 사용자에게 필요한 정보를
확인한다.

창작 대안 생성·선택 반영, 일반 시나리오 작성·변경 또는 인게임 스크립트
집필에는 `docs/workflows/project_creative_agent_setup.md`의 정확한 `active`
규칙이 필요하다. 규칙이 없으면 전문 agent를 호출하지 않고
`blocked_missing_creative_rule`, 범위가 맞지 않으면
`blocked_creative_rule_mismatch`로 중단한다. `design_creative_planner`의
`classify`, 검토 전용, 검색·요약과 비창작 구조화 단계는 Task Packet에
`창작 규칙 필요: 아니요`와 이유를 적어 규칙 없이 호출할 수 있다.

출처 유형이 없거나, 합성 데이터를 사용자 사실·확정 사실로 분류했거나,
Task Packet과 테스트 매니페스트의 출처가 충돌하면
`blocked_test_provenance`로 중단한다. 이 오류는 일반 인계 필드 누락을 뜻하는
`blocked_missing_handoff`와 구분한다.

## Required Invocation Mode

새 전문 agent 호출은 다음 방식을 사용한다.

```text
agent_type: <scenario_designer | scenario_writer | scenario_reviewer |
  design_creative_planner | design_creative_reviewer>
fork_turns: "none"
message: <완성된 Specialist Task Packet>
```

- custom `agent_type`을 지정하면서 `fork_turns`를 생략하거나 `"all"`로 두지
  않는다. 전체 대화 상속은 부모 agent type도 상속하므로 전문 agent 지정과
  충돌할 수 있다.
- 부모 대화 전체를 Task Packet에 복사하지 않는다. 필요한 사용자 사실,
  결정과 제약만 명시적으로 전달한다.
- `model` 또는 `reasoning_effort`를 임의로 덮어쓰지 않는다.
- 같은 agent의 같은 작업을 수정·재검수하는 경우에만 기존 agent에
  `followup_task`를 사용한다. 프로젝트, 역할, Phase 또는 핵심 범위가
  달라지면 갱신된 Task Packet으로 새 호출을 만든다.
- 전문 agent 대신 일반 agent를 조용히 대체하거나, 실패한 인자를 그대로
  반복 호출하지 않는다.

호출 인자 오류가 발생하면 오류가 지시한 비호환 인자만 바로잡아 한 번
재호출한다. 같은 오류가 반복되거나 전문 agent를 실행할 수 없으면 해당
전문 검수를 완료했다고 기록하지 않고 사용자에게 실패와 미완료 범위를
명확히 알린다.

## Minimal Source Rule

- 이 규칙은 전문 agent뿐 아니라 메인 Codex의 Task Packet 준비 단계에도
  적용한다.
- 메인 Codex는 레지스트리에서 프로젝트 루트를 확정한 뒤 프로젝트 README와
  `design/README.md`의 문서 지도로 정확한 canonical 경로를 찾는다. 이미 대상
  경로가 확정되었으면 전체 `design/` 트리를 열거하거나
  `workspace/projects/**/design/**` 같은 광범위한 패턴으로 검색하지 않는다.
- Approval Queue, 임시 아이디어, Decision Log와 Version History는 사용자가
  정확한 항목·자료를 입력으로 지정했거나 현재 workflow가 해당 이력 확인을
  요구할 때만 읽는다. 단순 `classify`, Draft 검토 또는 읽기 전용 호출에서
  “혹시 관련 기록이 있는지” 확인하려고 전부 열지 않는다.
- Task Packet에 필수 근거 파일을 구체적인 경로로 적는다.
- 전문 agent는 해당 파일, 직접 연결된 필수 canonical owner와 지정 workflow만
  읽는다.
- 프로젝트 창작 규칙은 먼저 프로젝트 `agents/README.md`에서 선택한 정확한
  파일 하나만 읽는다. 다른 규칙이나 다른 프로젝트의 `agents/`를 열거하지
  않는다.
- 저장소 전체 파일 목록 출력, `docs/dev-log/` 탐색, 같은 문서의 반복 읽기와
  요청 범위 밖 자료 수집을 기본 동작으로 하지 않는다.
- 추가 파일이 필요하면 handoff에 필요 이유와 경로를 기록한다. 추가 파일이
  다른 프로젝트나 허가되지 않은 제안 자료라면 읽지 않고 메인 Codex에
  반환한다.
- 같은 단계에서 이미 읽은 문서는 내용이나 기준이 변경되지 않은 한 반복해서
  읽지 않는다. 작성자와 독립 검수자는 독립성 때문에 각각 원본을 읽을 수
  있지만, 메인 Codex가 그 내용을 대신 중복 수집하지 않는다.

## Specialist Entry Check

전문 agent는 본 작업을 시작하기 전에 Task Packet을 검사한다.

- agent, 프로젝트, Phase·작업 종류, 범위, 근거 파일, 사용자 사실·선택,
  권한 경계, 금지사항과 기대 출력이 모두 있어야 한다.
- 사실·입력마다 허용된 출처 유형과 근거가 있고, 테스트 픽스처 가정이
  사용자 사실 또는 확정 사실과 분리되어야 한다.
- 테스트 출처가 없거나 잘못 분류되면 `blocked_test_provenance`를 반환한다.
  이 상태에는 출처 누락·충돌만 적고 Draft, 대안 또는 검수 판정을 만들지
  않는다.
- 필수 항목이 빠졌거나 서로 충돌하면 `blocked_missing_handoff`를 반환한다.
- `blocked_missing_handoff`에는 누락·충돌 필드만 적고 Draft, 대안, 검수
  판정이나 새로운 설정을 만들지 않는다.
- Task Packet에 없는 승인, 창작 허가, 대안 선택 또는 적용 권한을 추정하지
  않는다.
- 창작 규칙이 필요한 작업에는 정확한 규칙 ID, 경로, 버전, SHA-256, 적용
  범위와 검수 정책이 있어야 한다. 누락되면
  `blocked_missing_creative_rule`, 범위가 다르면
  `blocked_creative_rule_mismatch`, 전달 후 규칙 버전·해시가 바뀌면
  `needs_creative_rule_reconfirmation`을 반환하고 Draft·대안·검수 판정을
  만들지 않는다.

## Main-Agent Return Check

메인 Codex는 전문 agent 결과를 사용자에게 제시하거나 Approval Queue에
저장하기 전에 다음을 Task Packet과 대조한다.

1. agent, 프로젝트, Phase·작업 종류와 대상 범위가 일치한다.
2. 전문 agent가 실제로 확인한 근거 파일이 기록되어 있다.
3. 사용자 사실, 선택, 금지사항과 권한 경계를 벗어나지 않았고 사실·입력의
   출처 유형이 보존되었다.
4. 제외 대상, `TBD`, 의존성과 canonical owner 경계를 지켰다.
5. 필요한 자체 검수와 독립 검수 상태가 명확하다.
6. `blocked_missing_handoff`, `blocked_test_provenance`, 필수 수정 또는
   미해결 충돌이 남지 않았다.
7. 창작 작업이면 프로젝트 창작 규칙의 ID·버전·SHA-256과 적용 범위가
   일치하고 규칙에 지정된 독립 검수가 완료되었다.

하나라도 실패하면 결과를 확정 사실처럼 제시하거나 `pending`으로 저장하거나
적용하지 않는다. 메인 Codex가 Task Packet을 보완해 같은 전문 agent에
수정 요청을 보내거나, 필요한 사용자 확인을 요청한다.

## Output Record

전문 agent가 참여한 승인 초안의 `Subagent Review`에는 다음을 남긴다.

- Task Packet 검증 상태
- 호출한 agent와 Phase·작업 종류
- 전달한 사용자 사실·선택·금지사항
- 전달한 사실·입력의 출처 유형과 테스트 픽스처 표시
- 전달한 권한과 명시적으로 부여하지 않은 권한
- 직접 확인한 근거 파일
- 적용한 프로젝트 창작 에이전트 규칙 ID·경로·버전·SHA-256과 검수 정책
- 반환 판정과 메인 Codex의 대조 결과
