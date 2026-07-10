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
2. 대상 문서를 다시 읽어 현재 내용이 변경안 작성 당시와 맞는지 확인한다.
3. 내용이 달라졌으면 적용하지 않고 `needs_reconfirmation`으로 처리한다.
4. 내용이 맞으면 `workspace/design/`에 반영한다.
5. `docs/workflows/decision_log.md`에 따라 결정 로그를 기록한다.
6. `docs/workflows/version_history.md`에 따라 버전 기록을 남긴다.
7. 승인 큐 상태를 `applied`로 갱신한다.

## Safety Rule

승인 문구가 애매하면 적용하지 않는다. 예: "괜찮네", "좋아 보임"은 명시 승인으로 보지 않는다.
