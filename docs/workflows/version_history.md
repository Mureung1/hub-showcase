# Version History Workflow

## Purpose

확정 문서에 실제로 반영된 변경만 기록한다.

## When To Write

- `workspace/projects/<project_slug>/design/` 문서가 승인 후 생성, 수정, 삭제되거나
  여러 문서 역할로 재구성되었을 때

## Steps

1. 승인 항목 및 대상 문서와 같은 프로젝트의 Version History를 선택한다.
2. `docs/templates/version_entry.md` 형식을 따른다.
3. 프로젝트 ID와 변경 타입을 기록한다: create, update, delete, restructure.
4. 변경 전 요약과 변경 후 요약을 분리한다.
5. 관련 승인 큐 항목과 결정 로그 항목을 연결한다.
6. 적용된 `CP-*` ID와 확정 문서에 남은 `provisional` 항목·검증 조건을
   기록한다.
7. 적용 시각과 적용자를 기록한다.
8. 삭제는 Before에 삭제된 문서의 요약을, After에 `삭제됨`과 대체 문서
   경로를 기록한다.
9. `restructure`는 대상별 create/update/delete 결과와 최종 canonical owner,
   프로젝트 README·문서 색인·game overview의 링크 갱신을 하나의 버전 항목에
   기록한다.

## Output Location

`workspace/projects/<project_slug>/versions/version_history.md`
