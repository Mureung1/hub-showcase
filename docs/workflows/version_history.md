# Version History Workflow

## Purpose

확정 문서에 실제로 반영된 변경만 기록한다.

## When To Write

- `workspace/design/` 문서가 승인 후 생성, 수정, 삭제되었을 때

## Steps

1. `docs/templates/version_entry.md` 형식을 따른다.
2. 변경 타입을 기록한다: create, update, delete.
3. 변경 전 요약과 변경 후 요약을 분리한다.
4. 관련 승인 큐 항목과 결정 로그 항목을 연결한다.
5. 적용 시각과 적용자를 기록한다.
6. 삭제는 Before에 삭제된 문서의 요약을, After에 `삭제됨`과 대체 문서
   경로를 기록한다.

## Output Location

`workspace/versions/version_history.md`
