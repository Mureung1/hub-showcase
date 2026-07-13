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
7. 재확인 결과와 필요한 후속 조치를 승인 항목의 Review Notes와 Decision에
   기록한다.
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

## Safety Rule

승인 문구가 애매하면 적용하지 않는다. 예: "괜찮네", "좋아 보임"은 명시 승인으로 보지 않는다.
