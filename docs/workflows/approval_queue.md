# Approval Queue Workflow

## Purpose

AI가 만든 변경안을 사용자가 검토하고 결정할 수 있게 관리한다.

## Status

- `pending`: 검토 대기
- `approved`: 승인됨, 아직 적용 전
- `applied`: 확정 문서에 반영 완료
- `on_hold`: 보류
- `change_requested`: 수정 요청
- `rejected`: 거부
- `needs_reconfirmation`: 적용 직전 원본이 달라져 재확인 필요

## Add Item Steps

1. `docs/workflows/project_workspace.md`에 따라 대상 프로젝트를 결정한다.
2. `docs/templates/approval_item.md` 형식을 따른다.
3. 프로젝트 ID, 대상 문서와 근거 파일을 명시한다.
4. 변경 전 요약과 변경 후 초안을 분리한다.
5. 위험도, 누락 정보, 충돌 가능성을 기록한다.
6. `scenario` 작성·변경 항목이면 `scenario_designer` 또는 `scenario_writer`와
   `scenario_reviewer`의 handoff를 확인한다. 일반 시나리오는
   `Scenario Improvement Review`를 Draft와 분리하고, 독립 검수 판정과 해소된
   필수 결과를 `Subagent Review`에 기록한다.
7. 신규·수정·재구성 Draft이면 해당 전담 에이전트가 만든 GAP 분류를 메인
   Codex가 검토해 `Creative Completion Review`에 기록한다. 비시나리오 일반
   기획은 `design_creative_planner`, 일반 시나리오는 `scenario_designer`가
   분류한다.
8. 사용자가 비시나리오 창작 보완을 허가한 GAP이 있으면
   `design_creative_planner`의 `generate_options` 결과에서 대안, 추천안과 상태를
   `Creative Proposal Log`에 기록하고 메인 Codex의 허가 범위 검사를
   `Subagent Review`에 남긴다. 사용한 프로젝트 창작 에이전트 규칙 ID·버전·
   SHA-256, 검수 정책과 필요한 `design_creative_reviewer` 판정도 기록한다.
9. `restructure`이면 대상별 작업, 비교 대상, 현재 SHA-256과 적용 후 문서
   역할을 Target Operations에 기록한다.
10. 확정 문서의 생성·삭제·이동·역할 또는 한 문장 담당 범위가 바뀌면 프로젝트
    루트 `README.md`, `design/README.md`와 `game_overview`의 영향받는 색인·링크
    갱신을 같은 승인 범위와 Target Operations에 포함한다.
11. 다른 승인 항목의 적용이 선행되어야 하면 Dependency Operations에 항목 ID,
   변경 역할, 영향받는 대상과 해소 조건을 기록한다.
12. 검토용 이미지가 있으면 `approvals/assets/`에 두고, Asset Operations에
   검토 경로, 승인 후 `design/assets/` 경로와 작성 당시 SHA-256을 기록한다.
13. 선택한 프로젝트의 Approval Queue에 추가하고 상태는 기본적으로 `pending`으로 둔다.

## Scenario Improvement Selection

- `Scenario Improvement Review`의 권고는 해당 항목의 승인 대상 Draft가 아니다.
- 사용자가 권고를 선택하면 원본과 관련 문서를 다시 확인하고 선택 내용을
  `scenario_designer`에 전달한다. 갱신된 Draft를 `scenario_reviewer`가 다시
  검수한 뒤 영향 분석에 반영하며 권고 상태를 `incorporated`로 바꾸고 Decision
  History에 선택 이력을 남긴다. 거절된 권고는 `declined`로 기록할 수 있다.
- 대상, 목적과 핵심 범위가 유지되면 기존 항목을 개정해 `pending`으로 돌리고,
  달라지면 기존 항목을 보존한 채 연결된 새 승인 항목을 만든다.
- 세계관·시스템 canonical owner 변경이 필요하면 별도 또는 다중 문서 승인안과
  Dependency Operations로 분리한다.
- 사용자의 권고 선택을 갱신된 Draft의 승인으로 간주하지 않는다.

## Creative Proposal Selection

- `Creative Completion Review`의 `creative_fillable` GAP만 창작 대상으로 삼는다.
  `user_fact`나 `dependency`는 사용자가 창작을 허가해도 임의로 채우지 않는다.
- 사용자가 전체 또는 일부 GAP의 창작을 명시적으로 허가한 뒤에만
  `Creative Proposal Log`에 대안을 만든다.
- 사용자가 대안을 선택하면 원본과 관련 문서를 다시 확인하고 선택안만 Draft에
  넣도록 선택 결과를 `design_creative_planner`의 `incorporate_selection`
  Phase에 전달한다. 메인 Codex가 `CP-*` 각주와 허가 범위를 검토한 뒤 상태를
  `incorporated`로 바꾸고 Decision History에 선택자, 선택일과 선택 이유를
  남긴다.
- 선택되지 않은 대안은 Draft에 넣지 않고 Log에 보존한다. 명시적으로 제외한
  제안은 `declined`로 기록한다.
- 대상, 목적과 핵심 범위가 유지되면 기존 항목을 개정해 `pending`으로 돌리고,
  달라지면 기존 항목을 보존한 채 연결된 새 승인 항목을 만든다.
- 창작 허가, 대안 선택이나 “추천안 적용”을 갱신된 Draft의 승인으로 간주하지
  않는다. 이미 `approved`였던 항목의 Draft가 바뀌면 승인을 재사용하지 않는다.
- 프로젝트 창작 규칙은 게임 사실이나 승인 근거가 아니다. 규칙의 버전·
  SHA-256이 창작 이후 바뀌었으면 `needs_creative_rule_reconfirmation`으로
  중단하고 현재 규칙과 원본을 재확인한다.

## Apply Approved Item Steps

1. 사용자가 승인한 항목 ID나 제목을 명시했는지 확인한다.
2. 승인 항목의 프로젝트 ID, 대상 문서 경로, 기준 Git 커밋, 비교 대상, 작성 당시 원본
   요약이 기록되어 있는지 확인한다.
3. 승인 큐, 대상 문서, 결정 로그와 버전 기록이 모두 같은 프로젝트에 속하는지 확인한다.
4. Dependency Operations가 있으면 모든 선행 항목이 같은 프로젝트에 속하고
   `applied`인지 확인한다. 미적용 항목이 있으면 본 항목을 적용하지 않고 Review
   Notes에 대기 사유를 기록한다.
5. 선행 항목이 적용되었다면 그 변경으로 본 항목의 원본, `TBD` 또는 영향 범위가
   달라졌는지 확인한다. 달라졌으면 본 항목을 `needs_reconfirmation`으로 이동해
   초안을 갱신하고 다시 승인받는다.
6. 기존 문서 변경 또는 삭제는 기준 Git 커밋의 비교 대상과 현재 내용을
   비교한다.
7. 신규 문서 생성은 현재 `workspace/projects/<project_slug>/design/`에서 동일 제목이나 같은 주제의
   문서가 새로 생겼는지 검색한다.
8. `restructure`이면 모든 기존 대상의 비교 결과와 모든 신규 문서의 역할
   중복 여부를 먼저 확인한다. 하나라도 불일치하면 어떤 대상도 변경하지 않는다.
9. `Subagent Review`가 있으면 시나리오 독립 검수의 `blocking` 또는
   `required_revision`과 프로젝트 창작 규칙이 요구한 비시나리오 독립 검수의
   필수 finding이 해소되었는지, 기획 창작이 사용자 허가 GAP 범위를 벗어나지
   않았는지 확인한다. 검수 근거가 없거나 필수 결과가 남아 있으면 적용하지
   않고 `needs_reconfirmation`으로 이동한다.
10. `Scenario Improvement Review`가 있으면 `proposed`나 `declined` 권고가
   Draft에 섞이지 않았는지 확인한다. `incorporated` 권고도 갱신된 Draft가
   명시적으로 승인된 경우에만 적용 대상으로 본다.
11. `Creative Proposal Log`가 있으면 `proposed`·`declined` 대안이 Draft에
    섞이지 않았는지, 모든 `incorporated` 내용에 대응하는 `CP-*` 각주가 있는지
    확인한다. 수치 제안은 `provisional`과 검증 기준이 있어야 한다.
12. 확정 문서 목록·경로·역할·담당 범위가 바뀌면 프로젝트 루트 README와
    `design/README.md`, `game_overview`의 영향받는 갱신이 승인 범위에 있는지
    확인한다. 누락되었으면 적용하지 않고 `needs_reconfirmation`으로 이동한다.
13. 비교 결과가 모두 일치하면 승인된 내용을 `workspace/projects/<project_slug>/design/`과
    승인 범위에 포함된 프로젝트 README·색인에 반영한다.
14. 승인 항목에 검토용 에셋이 있으면 Asset Operations를 확인하고 아래 Asset
   Promotion Rules에 따라 각 에셋을 `design/assets/`로 반영해 동일성을 검증한다.
15. 비교 결과가 다르거나 기준 정보가 부족하면 적용을 중단하고
   `needs_reconfirmation`으로 처리한다.
16. 재확인 결과와 필요한 후속 조치를 승인 항목의 Review Notes와
   Decision History에 기록한다.
17. 승인 큐에서 실제 파일을 여는 근거 경로와 인라인 이미지 참조를 승인 후
    `design/assets/` 경로로 갱신하고, Decision Log와 Version History에도 이
    canonical 경로를 사용한다.
18. 같은 프로젝트의 Decision Log에 적용된 CP ID와 `provisional` 항목을 포함한
    결정 로그를 기록한다.
19. 같은 프로젝트의 Version History에 적용된 CP ID와 `provisional` 항목을
    포함한 버전 기록을 남긴다.
20. `design/assets/` 반영, 동일성 검증과 참조 갱신이 모두 끝난 에셋만
    `approvals/assets/`에서 삭제하고 Asset Operations의 적용 결과에
    canonical 경로와 검토본 삭제 완료를 기록한다.
21. 대응하는 모든 검토용 에셋의 삭제까지 끝난 뒤 승인 큐 상태를
    `applied`로 갱신한다.

## Asset Promotion Rules

- `approvals/assets/`는 승인 검토 중인 에셋의 임시 위치이고,
  `design/assets/`는 적용된 에셋의 canonical 위치다.
- 항목이 `approved`이지만 아직 적용 전이면 검토용 에셋을 삭제하지 않는다.
- 이전 템플릿으로 작성되어 Asset Operations가 없는 항목은 기록된 검토
  경로, 승인 후 경로와 작성 당시 SHA-256으로 표를 먼저 보완한다. 이 중
  하나라도 확인할 수 없으면 적용하거나 검토본을 삭제하지 않고
  `needs_reconfirmation`으로 이동한다.
- 적용 전 검토용 파일의 현재 SHA-256을 Asset Operations의 작성 당시 값과
  비교한다. 값이 다르거나 파일이 없으면 에셋을 반영하거나 삭제하지 않고
  항목을 `needs_reconfirmation`으로 이동한다.
- 승인 후 경로에 파일이 없으면 승인된 파일을 해당 경로로 옮긴 뒤 SHA-256이
  검토본과 같은지 확인한다.
- 승인 후 경로에 같은 SHA-256의 파일이 이미 있으면 그 파일을 canonical
  에셋으로 사용한다. 다른 내용의 파일이 있으면 덮어쓰거나 검토본을 삭제하지
  않고 `needs_reconfirmation`으로 이동한다.
- 승인 큐에서 실제 파일을 여는 근거 경로 및 인라인 이미지 링크와 새
  Decision Log·Version History 기록은 `design/assets/`의 canonical 경로를
  가리켜야 한다. 이런 활성 참조가 `approvals/assets/`에 남아 있는 동안에는
  검토본을 삭제하지 않는다.
- Asset Operations의 기존 검토 경로와 SHA-256은 감사 이력으로 보존하고,
  적용 결과에 canonical 경로 반영과 검토본 삭제를 명시한다. 이 이력 표기는
  삭제된 파일을 계속 사용하는 활성 참조로 보지 않는다.
- 모든 검증과 참조 갱신이 성공한 뒤 해당 승인 항목에 연결된 검토본만
  `approvals/assets/`에서 삭제한다. 다른 항목의 에셋은 삭제하지 않는다.
- `on_hold`, `change_requested`, `rejected`, `needs_reconfirmation` 상태나 적용
  실패 상태에서는 검토본을 유지한다.

## Source Reconfirmation Rules

- 기준 Git 커밋은 변경안 작성 시점의 저장소 `HEAD`를 기록한다.
- 비교 대상은 전체 문서가 기본이며, 독립적으로 식별 가능한 섹션만 바뀌는
  경우 해당 섹션을 기록할 수 있다.
- 원본 요약은 비교 대상의 핵심 내용과 전제 조건을 적는다. Git 커밋만으로
  비교 대상을 식별할 수 없는 항목은 적용하지 않는다.
- 기존 문서의 비교 대상 밖에서 발생한 변경도 제안의 영향 범위를 바꾸면
  불일치로 판단한다.
- 신규 문서는 동일 제목뿐 아니라 같은 역할이나 범위의 문서가 생겼는지도
  확인한다.
- `restructure`의 Target Operations는 하나의 비교 단위다. 기존 대상의
  해시·내용, 신규 문서 역할, 링크 영향 중 하나라도 달라지면 전체 항목을
  `needs_reconfirmation`으로 이동한다.
- Dependency Operations의 선행 항목이 적용되면 그 결과로 본 항목의 근거,
  `TBD` 또는 영향 범위가 달라졌는지 반드시 확인한다. 하나라도 달라지면 기존
  승인을 사용하지 않고 `needs_reconfirmation`으로 이동한다.
- `CP-*` 선택 후에는 선택 대안의 프로젝트 근거, 대상 필드와 영향 범위를
  다시 확인한다. 달라졌으면 선택이나 이전 승인을 재사용하지 않고 Draft와
  Creative Proposal Log를 갱신해 `pending`으로 되돌린다.
- Asset Operations의 검토용 파일 해시, 승인 후 경로 또는 대상 경로의 기존
  파일 상태가 기록과 다르면 해당 에셋을 삭제하지 않고 전체 항목을
  `needs_reconfirmation`으로 이동한다.
- 불일치 시 기존 승인을 사용해 자동 적용하지 않는다.

## Needs Reconfirmation Workflow

### Enter

1. 적용 직전 비교에서 원본, 영향 범위 또는 신규 문서 존재 여부가 달라지면
   적용을 중단한다.
2. 항목 상태를 `needs_reconfirmation`으로 바꾸고 실제 승인 큐의
   `Needs Reconfirmation` 영역으로 이동한다.
3. Reconfirmation에 진입 사유, 감지일, 현재 원본 요약과 비교 결과를
   기록한다.
4. 이전 승인 결정은 이력으로 보존하되 적용 권한으로 재사용하지 않는다.
5. `workspace/projects/<project_slug>/design/`, Decision Log, Version History는 수정하지 않는다.

### Resolve

- 현재 원본을 기준으로 변경안을 다시 작성한 뒤 검토를 기다리면 `pending`으로
  이동한다. 기준 Git 커밋, 비교 대상과 원본 요약도 함께 갱신한다.
- 사용자가 현재 원본과 갱신된 초안을 특정해 명시적으로 재승인하면
  `approved`로 이동한다. 재확인 결정자, 결정일과 이유를 기록한다.
- 사용자가 내용 수정을 요구하면 `change_requested`로 이동한다.
- 사용자가 보류하거나 거부하면 각각 `on_hold`, `rejected`로 이동한다.
- 어느 경우에도 `needs_reconfirmation`에서 `applied`로 직접 이동하지 않는다.
- 후속 상태와 전환 이유를 Reconfirmation에 기록해 재확인 이력을 보존한다.

## Non-Approval State Workflow

모든 상태 변경은 기존 Decision History를 덮어쓰지 않고 새 Decision Entry로
추가하며, 상태를 결정한 시점에 Decision Log도 작성한다.

### On Hold

- 사용자가 검토나 적용을 명시적으로 미룰 때 `on_hold`로 이동한다.
- 초안, 기준 정보, 기존 결정과 보류 이유를 그대로 보존한다.
- 사용자가 검토 재개를 요청하면 원본을 재확인한다. 기준이 같으면
  `pending`, 다르면 `needs_reconfirmation`으로 이동한다.
- 사용자가 수정 또는 거부를 결정하면 각각 `change_requested`, `rejected`로
  이동한다.

### Change Requested

- 사용자가 초안, 영향 분석 또는 누락 정보의 수정을 명시할 때
  `change_requested`로 이동하고 요청 내용을 Decision History에 기록한다.
- 대상 문서, 변경 목적과 범위가 유지되는 수정은 기존 승인 항목에 개정
  내용을 추가한다. 이전 Draft는 해당 Decision Entry의 Draft 요약으로
  추적한다.
- 대상 문서, 변경 목적 또는 핵심 범위가 달라지면 기존 항목을 종료하지 않고
  `change_requested`로 보존한 채 새 승인 항목을 만든다. 두 항목은
  `상위/대체 승인 항목`으로 서로 연결한다.
- 개정이 끝나면 기준 정보와 원본 요약을 갱신하고 `pending`으로 이동한다.
- 사용자가 수정 요청을 철회하고 검토를 종료하면 `rejected`로 이동한다.

### Rejected

- 사용자가 제안을 명시적으로 거부하거나 수정 없이 종료할 때 `rejected`로
  이동한다.
- 거부된 항목은 삭제하거나 Draft를 재사용하지 않고 결정 이유와 함께
  보존한다.
- 같은 목적을 다시 제안하려면 새 승인 항목을 만들고 기존 항목을 연결한다.
- `rejected`는 종료 상태이며 기존 항목을 `pending`으로 되돌리지 않는다.

## Apply Delete Item

1. 승인 항목의 변경 타입이 `delete`이고 사용자가 항목 ID 또는 제목과 삭제를
   명시적으로 승인했는지 확인한다.
2. Source Reconfirmation Rules에 따라 대상 문서 전체와 영향 범위를 다시
   확인한다.
3. 새 참조, 대체 문서 변경 또는 설정 유실 위험이 발견되면 삭제하지 않고
   `needs_reconfirmation`으로 이동한다.
4. 비교 결과가 같으면 대상 문서를 삭제하고, 같은 작업에서 Decision Log와
   Version History에 `delete` 기록을 추가한다.
5. Version History의 Before에는 삭제 문서 요약, After에는 `삭제됨`과 대체
   문서 경로를 기록한다.
6. 문서 삭제와 두 기록이 모두 끝난 뒤에만 승인 항목을 `applied`로 바꾼다.

삭제 승인에는 다른 문서의 동시 삭제나 수정 권한이 포함되지 않는다. 링크
정리나 대체 문서 변경이 필요하면 각각 승인 범위에 포함하거나 별도 승인
항목으로 제안한다.

## Safety Rule

승인 문구가 애매하면 승인하거나 적용하지 않는다. 예: "괜찮네", "좋아 보임",
"마음에 들어"는 명시 승인으로 보지 않는다. 이 경우 아무 변경도 적용하지
않았고 현재 승인 상태를 유지했다는 사실을 사용자에게 명시적으로 안내한다.
또한 적용하려면 대상 항목과 행동을 특정한
`APPR-...을 승인하고 적용해줘` 같은 확인이 필요하다고 알려준다.
다른 프로젝트의 승인 항목이나 결정 기록을 적용 근거로 사용하지 않는다.
`restructure`는 일부 경로만 적용하지 않는다. 검증을 모두 끝낸 뒤 전체를
적용하고 Decision Log와 Version History에 대상별 작업을 함께 기록한다.
미적용 Dependency Operations가 있는 항목은 적용하지 않는다.
`Scenario Improvement Review`의 `proposed`·`declined` 권고는 적용하지 않고,
`incorporated` 권고도 명시적으로 승인된 Draft에 포함된 내용만 적용한다.
`Creative Proposal Log`의 `proposed`·`declined` 대안은 적용하지 않고,
`incorporated` 내용도 CP 각주가 연결된 갱신 Draft가 명시적으로 승인된
경우에만 적용한다.
`Subagent Review`에 해소되지 않은 `blocking`·`required_revision` 결과가 있거나
허가받지 않은 GAP의 창작이 포함된 항목은 적용하지 않는다.
검토용 에셋이 포함된 항목은 대응하는 파일이 `design/assets/`에 검증되어 있고
`approvals/assets/`에서 제거된 뒤에만 `applied`로 처리한다.
