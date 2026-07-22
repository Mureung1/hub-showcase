# Design Creative Completion Skill

## Purpose

게임 개요, 세계관, 시스템, 콘텐츠, UI와 기술 기획 초안의 누락 정보를
분류하고, 사용자가 명시적으로 허용한 설계 공백에만 복수 창작 대안을 만든다.
선택된 창작 내용은 `CP-*`로 공개하고 승인 전에는 확정 사실로 취급하지 않는다.

## When To Use

- 신규 기획 문서 Draft를 작성할 때
- 기존 기획 문서의 변경 Draft를 작성할 때
- 여러 canonical document role을 재구성하는 Draft에서 누락을 발견할 때
- 사용자가 이미 발견된 설계 공백을 창작으로 보완해 달라고 요청할 때

단순 검색·요약, 임시 아이디어의 최초 기록, 삭제 전용 제안, 이미 승인된
항목의 기계적 적용에는 사용하지 않는다.

## Specialized Rule Precedence

- 일반 `scenario`의 사건 순서, 공개 시점, 동기, 선택, 분기와 Outcome 개선은
  `docs/skills/scenario_review.md`의 `Scenario Improvement Review`를 사용한다.
- 인게임 스크립트의 구체 창작과 서사 변경은 각각 `CW-*`, `NR-*`를 사용한다.
- 같은 내용에 `CP-*`, `CW-*`, `NR-*` 또는 Scenario Improvement Review를
  중복 적용하지 않는다.
- 시나리오 요청에서 세계관 정사나 시스템 규칙의 창작 보완이 필요하면 해당
  canonical owner의 별도 `CP-*` 제안으로 분리한다.

## Source Grounding

1. 대상 프로젝트와 문서 역할을 먼저 확정한다.
2. 사용자 입력, Project Brief, 관련 확정 문서와 적용된 결정만 근거로 사용한다.
3. 승인 큐와 임시 아이디어는 사용자가 근거로 지정한 경우에만 사용하고 확정
   자료와 구분한다.
4. 원문이 직접 뒷받침하는 요약·재배열·문체 정리는 창작으로 표시하지 않는다.
5. 근거에 없는 이름, 설정, 규칙, 수치, 조건, 예외, 콘텐츠, UI 흐름 또는 기술
   설계 결정을 추가하면 창작 제안으로 분류한다.

## Gap Classification

`docs/skills/document_completion.md`로 누락을 찾은 뒤 각 항목에
`GAP-<document_slug>-<number>` ID를 부여하고 다음 중 하나로 분류한다.

| 유형 | 의미 | 처리 |
|---|---|---|
| `creative_fillable` | 프로젝트 근거 안에서 복수 설계안으로 제안할 수 있는 공백 | 허가 전에는 대안을 만들지 않고 창작 보완 여부를 묻는다. |
| `user_fact` | 사용자의 실제 결정이나 외부 사실이 필요한 공백 | 창작하지 않고 `TBD`와 질문을 유지한다. |
| `dependency` | 다른 canonical owner나 선행 승인 결과가 필요한 공백 | 영향 문서·선행 항목을 표시하고 해소 전까지 `TBD`로 둔다. |

다음은 `user_fact`로 취급한다.

- 실제 플랫폼, 엔진, 예산, 일정과 인력
- 존재가 확인되지 않은 에셋·데이터·리소스 ID
- 외부 API·도구의 실제 계약, 법적 조건과 라이선스
- 사용자가 선택해야 하는 사업·출시·제작 사실

기술 문서에서도 새 데이터 구조나 오류 처리 방식은 창작 제안할 수 있지만,
현재 런타임 상태나 외부 계약을 추측해서는 안 된다.

## Creative Completion Offer

1. 신규·수정·재구성 Draft마다 누락 분류를 수행한다.
2. `Creative Completion Review`에 GAP ID, 문서·필드, 유형, 위험도, 필요한
   조치를 표로 제시한다.
3. `creative_fillable` 항목을 한 번에 보여주고 어떤 GAP을 창작으로 채울지
   명시적으로 선택해 달라고 요청한다.
4. 사용자가 처음부터 대상 GAP 또는 범위를 지정해 창작 보완을 요청했다면
   별도 허가 질문을 반복하지 않는다.
5. “채워줘”, GAP ID 선택 또는 동등하게 명확한 문구가 없으면 대안을 만들지
   않고 `TBD`를 유지한다.

## Option Generation

허가된 GAP마다 `CP-<document_slug>-<number>`를 만들고 다음을 지킨다.

- 위험도는 `docs/skills/conflict_review.md`의 `low | medium | high`를 사용한다.
- `low`와 `medium`에는 서로 구별되는 대안 2개를 만든다.
- 세계관 정사, 핵심 루프·규칙, 문서 간 계약 또는 제작 범위를 바꾸는
  `high` 항목에는 대안 3개를 만든다.
- 수만 채우거나 이름만 바꾼 후보를 별도 대안으로 세지 않는다.
- 각 대안에 설계 의도, 프로젝트 근거, 플레이 영향, 제작 영향과 후속 문서
  영향을 적는다.
- 프로젝트 약속과 제약에 가장 잘 맞는 대안 하나를 추천하고 이유를 적는다.
- 사용자가 “추천안 모두 적용”처럼 선택을 위임하면 추천안을 선택한 것으로
  기록할 수 있다.

## Provisional Number Rules

밸런스 값, 확률, 시간, 비용과 보상량은 창작할 수 있지만 다음을 모두 기록한다.

- 상태: `provisional`
- 값 또는 범위를 선택한 설계 가정
- 기대하는 플레이어 행동과 체감
- 플레이테스트 또는 텔레메트리 검증 지표
- 재조정 조건

승인은 해당 값을 초기 기획값으로 채택한다는 뜻이며 밸런스 검증 완료를
뜻하지 않는다. 검증 전에는 확정 문서에서도 `provisional` 표시를 유지한다.

## Creative Proposal Log And Footnotes

승인 항목의 `Creative Proposal Log`에 다음을 기록한다.

- CP ID와 원본 GAP ID
- 원본 공백과 대상 문서·필드
- 대안 A/B 또는 A/B/C 전문
- 추천안과 추천 이유
- 프로젝트 근거와 영향 범위
- 선택 결과와 상태: `proposed | incorporated | declined`
- 수치 제안이면 검증 기준과 `provisional` 상태

사용자가 선택하기 전에는 CP 상태를 `proposed`로 두고 Draft에 넣지 않는다.
대안 하나가 선택되면 해당 CP를 `incorporated`, 모든 대안이 거절되면
`declined`로 기록한다.
`incorporated` 내용의 문장이나 필드에는 `[^CP-<document_slug>-<number>]`
Markdown 각주를 직접 붙인다. 각주에는 AI 기획 창작임을 밝히고 선택 근거,
영향과 관련 승인 항목을 요약한다. 승인 적용 후에도 각주는 확정 문서에 남긴다.

## Selection And Approval

1. 사용자가 대안을 선택하면 관련 원본과 영향을 다시 확인한다.
2. 대상, 목적과 핵심 범위가 같으면 기존 승인 항목을 개정하고 선택 이력을
   Decision History에 추가한 뒤 `pending`으로 둔다.
3. 핵심 범위나 canonical owner가 달라지면 기존 항목을 보존하고 연결된 새
   승인 항목 또는 원자적 `restructure` 항목을 만든다.
4. 다른 문서나 선행 승인에 의존하면 Dependency Operations에 기록하고
   해소 전까지 영향받는 Draft 필드는 `TBD`로 유지한다.
5. 선택되지 않은 대안은 Draft에 넣지 않지만 Creative Proposal Log에는
   감사 이력으로 보존한다.
6. 창작 허가나 대안 선택을 갱신된 Draft의 승인으로 간주하지 않는다.
7. 명시적 승인과 적용 직전 원본 재확인 후에만 `design/`에 반영한다.
8. 적용된 CP ID와 남은 `provisional` 항목을 Decision Log와 Version History에
   기록한다.

## Output

- Creative Completion Review
- 사용자 허가가 필요한 GAP 목록과 사실 확인 질문
- 허가된 GAP의 Creative Proposal Log
- 추천안과 선택 대기 상태
- 선택 후 CP 각주가 연결된 갱신 Draft
- 충돌, 의존성, 검증 계획과 승인 상태
