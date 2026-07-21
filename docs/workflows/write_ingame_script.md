# Write In-Game Script Workflow

## Purpose

확정 시나리오와 관련 자료를 플레이어 노출 대본, 씬 연결 정보와 제작 메모를
포함한 챕터별 인게임 스크립트 승인 초안으로 변환한다.

## When To Use

- 확정 시나리오를 실제 플레이 화면에 표시할 대사·지문·선택지로 작성할 때
- 씬 번호, 진입·종료 조건, 분기와 Outcome을 대본과 함께 정리할 때
- 기존 인게임 스크립트 챕터를 새 시나리오 내용에 맞춰 갱신할 때

이 workflow는 `docs/workflows/document_change.md`에서 검색과 분기를 마친 뒤
사용한다. `scenario_writer` custom agent가 이 workflow의 기본 실행 역할이다.

## Source Order

1. 사용자가 이번 요청에서 명시한 범위와 제약
2. 대상 프로젝트의 확정 `design/narrative/` 시나리오
3. 연결된 세계관, 시스템, 콘텐츠, UI와 기술 확정 문서
4. 사용자가 사용하라고 명시한 승인 항목 또는 임시 아이디어

- `docs/dev-log/`는 현재 자료로 사용하지 않는다.
- 승인 항목과 임시 아이디어는 확정 자료와 구분하며, 창작 또는 미확정 제안으로
  표시한다.
- 확정 자료끼리 충돌하면 임의로 합치지 않고 충돌 내용과 필요한 질문을 남긴다.

## Steps

1. `project_workspace`에 따라 프로젝트를 하나로 확정한다.
2. 대상 시나리오 파일과 챕터·Phase 범위를 확인한다.
3. 시나리오의 관련 문서 링크와 검색 결과를 따라 필요한 확정 자료만 읽는다.
4. `docs/skills/scenario_writing.md`에 따라 사건을 플레이어가 입력을 기다리는
   씬 단위로 나눈다.
5. `docs/templates/ingame_script.md`로 플레이어 노출 대본과 내부 연결 정보를
   한 문서에 작성한다.
6. 원본에 직접 없는 모든 창작 내용을 각주로 공개한다. 각주 누락이 있으면
   승인 초안을 완료하지 않는다.
7. 씬 데이터 조합을 UI·기술 문서의 계약과 대조한다. 확정되지 않은 판정값,
   등록 에셋 ID와 데이터 값은 `TBD` 또는 명시적 창작 제안으로 둔다.
8. 신규 챕터 문서의 표준 경로를
   `design/narrative/scripts/<chapter_slug>_ingame_script.md`로 정한다.
9. 승인 후 필요한 `design/README.md`, `game_overview`와 상위 시나리오의 링크
   갱신을 같은 `restructure` 승인 범위에 넣는다.
10. 기준 Git 커밋, 대상별 비교 범위와 현재 SHA-256을 기록하고 프로젝트의
    Approval Queue에 `pending` 항목으로 저장한다.

## Creative Disclosure Rules

- 원본의 사건을 새로운 문장으로 풀어 쓴 지문·대사도 창작으로 본다.
- 원본에 없는 ID, 상태 플래그, 분기 연결, 연출, 음향과 카메라 지시도
  창작으로 본다.
- 각 창작 항목에는 Markdown 각주 표식을 직접 붙인다.
- 각주에는 영향받는 line·choice·scene·field ID, 원본에 없던 부분, 작성 이유와
  설정·시스템·후속 장면 영향을 기록한다.
- 여러 항목을 한 각주로 묶을 때는 영향을 받는 모든 ID와 필드를 열거한다.
- 선택지와 결과가 원본에 직접 명시되어 있으면 새 표시 문구를 만들지 않고
  원문을 우선한다.

## Approval Boundary

- 인게임 스크립트는 `scenario` 역할의 상세 문서다.
- 승인 전에는 `design/narrative/scripts/`에 파일을 만들지 않는다.
- Approval Queue 초안 작성은 승인 없이 가능하지만 Decision Log와 Version
  History는 변경하지 않는다.
- 승인 적용 시에는 연결된 모든 대상과 링크를 재확인하며 일부만 적용하지 않는다.

## Output

- 대상 프로젝트, 시나리오와 챕터 범위
- 검색한 근거 파일
- `pending` 승인 항목과 미래 canonical 경로
- 플레이어 노출 대본과 씬 명세
- 창작 각주와 `TBD` 목록
- 충돌·영향 범위와 승인 후 링크 갱신 목록
