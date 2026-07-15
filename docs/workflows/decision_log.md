# Decision Log Workflow

## Purpose

승인, 거부, 보류, 수정 요청의 이유와 맥락을 추적한다.

## When To Write

- 승인 큐 항목이 승인되어 적용될 때
- 승인 큐 항목이 보류될 때
- 승인 큐 항목에 수정 요청이 내려질 때
- 승인 큐 항목이 거부될 때
- 중요한 방향성이 결정될 때
- 기존 결정을 뒤집을 때

## Steps

1. 승인 항목과 같은 프로젝트의 Decision Log를 선택한다.
2. `docs/templates/decision_log_entry.md` 형식을 따른다.
3. 프로젝트 ID, 결정 상태와 이유를 기록한다.
4. 관련 승인 큐 항목, 대상 문서, 근거 파일을 연결한다.
5. 결정으로 생긴 후속 작업이 있으면 적는다.
6. 같은 승인 항목의 상태가 다시 바뀌면 기존 기록을 수정하지 않고 새 항목을
   추가해 이전 결정을 연결한다.

## Output Location

`workspace/projects/<project_slug>/decisions/decision_log.md`
