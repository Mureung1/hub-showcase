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

1. `docs/templates/approval_item.md` 형식을 따른다.
2. 대상 문서와 근거 파일을 명시한다.
3. 변경 전 요약과 변경 후 초안을 분리한다.
4. 위험도, 누락 정보, 충돌 가능성을 기록한다.
5. 상태는 기본적으로 `pending`으로 둔다.

## Apply Approved Item Steps

1. 사용자가 승인한 항목 ID나 제목을 명시했는지 확인한다.
2. 승인 항목의 대상 문서 경로, 기준 Git 커밋, 비교 대상, 작성 당시 원본
   요약이 기록되어 있는지 확인한다.
3. 기존 문서 변경 또는 삭제는 기준 Git 커밋의 비교 대상과 현재 내용을
   비교한다.
4. 신규 문서 생성은 현재 `workspace/design/`에서 동일 제목이나 같은 주제의
   문서가 새로 생겼는지 검색한다.
5. 비교 결과가 일치하면 승인된 내용을 `workspace/design/`에 반영한다.
6. 비교 결과가 다르거나 기준 정보가 부족하면 적용을 중단하고
   `needs_reconfirmation`으로 처리한다.
7. 재확인 결과와 필요한 후속 조치를 승인 항목의 Review Notes와
   Decision History에 기록한다.
8. `docs/workflows/decision_log.md`에 따라 결정 로그를 기록한다.
9. `docs/workflows/version_history.md`에 따라 버전 기록을 남긴다.
10. 승인 큐 상태를 `applied`로 갱신한다.

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
5. `workspace/design/`, Decision Log, Version History는 수정하지 않는다.

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

승인 문구가 애매하면 적용하지 않는다. 예: "괜찮네", "좋아 보임"은 명시 승인으로 보지 않는다.
