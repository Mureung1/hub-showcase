# Decision Log Workflow

## Purpose

승인, 거부, 보류, 수정 요청의 이유와 맥락을 추적한다.

## When To Write

- 승인 큐 항목이 승인되어 적용될 때
- 승인 큐 항목이 거부될 때
- 중요한 방향성이 결정될 때
- 기존 결정을 뒤집을 때

## Steps

1. `docs/templates/decision_log_entry.md` 형식을 따른다.
2. 결정 상태와 이유를 기록한다.
3. 관련 승인 큐 항목, 대상 문서, 근거 파일을 연결한다.
4. 결정으로 생긴 후속 작업이 있으면 적는다.

## Output Location

`workspace/decisions/decision_log.md`
