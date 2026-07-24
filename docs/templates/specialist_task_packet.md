# Specialist Task Packet

전문 custom agent를 호출하기 전에 메인 Codex가 모든 필드를 채운다. 해당
사항이 없으면 비워 두지 말고 `없음` 또는 `권한 없음`으로 적는다.

## Routing

- 대상 agent: `scenario_designer | scenario_writer | scenario_reviewer |
  design_creative_planner`
- 작업 Phase·종류:
- 프로젝트 ID:
- 프로젝트 루트:
- canonical document role:
- 대상 문서·섹션·산출물:

## User Intent

- 현재 사용자 목표:
- 기대 결과:
- 포함 범위:
- 제외 범위:
- 중단·질문 조건:

## Material Conversation Context

- 사실·입력 출처:

  | 내용 | 분류 | 출처 유형 | 근거 |
  |---|---|---|---|
  |  | `user_fact | confirmed_fact | proposal_input` | `current_user_input | prior_user_input | confirmed_document | proposal_input` | 발화 또는 파일·섹션 |

- 테스트 픽스처 가정:

  | 내용 | 분류 | 출처 유형 | 근거 |
  |---|---|---|---|
  | `없음` | `test_fixture_assumption` | `synthetic_test_fixture` | `[TEST FIXTURE: SYNTHETIC]` 표시가 있는 매니페스트·입력 |

- 이전에 확정한 선택:
- 변경되거나 취소된 이전 지시:
- 대화에서 전달할 필수 정보:

출처 유형은 표에 정의된 값만 사용한다. 합성 테스트 데이터가 없다면 테스트
픽스처 가정에 `없음`을 적는다. 합성 데이터를 `user_fact`,
`confirmed_fact` 또는 사용자 제공 사실로 분류하지 않는다.

## Authority Boundary

- 창작 허가와 허가된 정확한 범위·ID:
- 선택된 대안·권고와 정확한 ID:
- 승인 항목 ID·현재 상태:
- 승인 권한: `없음 | 명시된 범위`
- 적용 권한: `없음 | 명시된 범위`
- 임의 창작 금지:
- 반드시 `TBD`로 둘 항목:

## Sources And Inputs

- 필수 근거 파일:
- 허가된 제안 자료:
- 입력 Draft·handoff·Review Report:
- 출처 우선순위:
- 금지된 자료:

## Expected Handoff

- 반환 형식:
- 필수 포함 항목:
- 자체 검수:
- 독립 검수·후속 routing:
- 메인 Codex 대조 기준:

## Invocation

- `agent_type`:
- `fork_turns`: `"none"`
- 추가 model·reasoning override: `없음`
