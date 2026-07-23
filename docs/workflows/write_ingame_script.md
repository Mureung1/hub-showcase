# Write In-Game Script Workflow

## Purpose

선택된 프로젝트의 전담 `scenario_writer`가 게임의 서사 정체성을 해석하고,
확정 시나리오를 그대로 옮기는 데 그치지 않고 더 나은 플레이 경험을 위한
구조 개선까지 반영한 챕터별 인게임 스크립트 초안을 작성한다. 독립
`scenario_reviewer`가 원본과 구현 계약을 직접 대조한 뒤 메인 Codex가 검수된
결과만 승인 초안으로 저장한다.

## When To Use

- 시나리오를 실제 플레이 화면의 대사·지문·선택지와 씬 명세로 작성할 때
- 씬 순서, 긴장 곡선, 정보 공개, 분기와 Outcome을 작가 관점에서 개선할 때
- 기존 인게임 스크립트 챕터를 새 시나리오 또는 더 나은 서사 구조에 맞춰
  갱신할 때

이 workflow는 `docs/workflows/document_change.md`에서 검색과 분기를 마친 뒤
사용한다. `scenario_writer` custom agent가 집필하고 `scenario_reviewer`가
독립 검수하며, 메인 Codex가 위임 범위·필수 수정 해소·승인 범위를 확인하고
Approval Queue 저장을 담당한다.

인게임 스크립트 요청은 요청 범위 안에서 창작과 서사 재구성안을 제안할 권한을
포함한다. 이는 초안 작성 권한이며 확정 문서 반영 권한은 아니다.
인게임 스크립트의 구체 창작과 구조 변경에는 일반 기획용 `CP-*`를 중복
사용하지 않고 각각 `CW-*`, `NR-*`를 사용한다.

## Source Order

1. 사용자가 이번 요청에서 명시한 범위와 제약
2. 대상 프로젝트의 `project_brief.md`와 확정 게임 개요
3. 대상 `design/narrative/` 상위 시나리오
4. 연결된 세계관, 시스템, 콘텐츠, UI와 기술 확정 문서
5. 같은 프로젝트의 기존 확정 인게임 스크립트
6. 사용자가 사용하라고 명시한 승인 항목 또는 임시 아이디어

- 기존 확정 인게임 스크립트는 승인된 문체, 어휘, 대사 리듬과 장면 밀도의
  우선 참고 자료다.
- 승인된 인게임 스크립트가 없으면 문체가 미확정임을 Writer's Brief에 밝히고,
  새 화자 톤과 문체는 확정 기준이 아니라 CW 창작 제안으로 표시한다.
- 승인 항목과 임시 아이디어는 확정 자료와 구분한다.
- `docs/dev-log/`는 현재 자료로 사용하지 않는다.
- 확정 자료끼리 충돌하면 임의로 합치지 않고 영향받는 부분을 `TBD`로 두며
  충돌과 필요한 질문을 남긴다.
- `scenario_writer`와 `scenario_reviewer`는 이 순서에 따라 각각 원본을 직접
  읽는다. 검수자는 Writer's Brief나 작가의 Sources 요약만으로 통과시키지 않는다.

## Writer Identity

에이전트는 집필 전에 자료를 근거로 대상 게임의 전담 작가 정체성을 구성하고
문서의 `Writer's Brief`에 다음 내용을 기록한다.

- 프로젝트의 서사적 정체성과 플레이어에게 약속한 경험
- 대상 범위의 감정 목표와 극적 질문
- 시작부터 종료까지의 긴장 곡선
- 인물별 말투, 욕망, 장면 내 서브텍스트
- 선택지가 제공해야 할 의도와 체감 차이
- 참고한 승인 대본과 문체 기준
- 이번 초안의 서사 재구성 방향과 이유

다른 프로젝트의 작가 정체성이나 문체를 재사용하지 않는다.

## Steps

1. `project_workspace`에 따라 프로젝트를 하나로 확정한다.
2. 대상 시나리오 파일과 챕터·Phase, 포함·제외 범위를 확인한다.
3. Source Order에 따라 게임 정체성, 상위 사건, 정사·규칙, 기존 승인 문체와
   구현 계약을 조사한다.
4. 사건, 조건, 분기, Outcome, 공개 정보와 인물 제약의 근거 지도를 만들고
   확정 사실, 충돌, 공백과 작가 제안을 구분한다.
5. 원본의 인과, 동기, 긴장 상승, 속도, 정보 공개, 선택의 의미, 분기 비용과
   합류를 진단하고 `Writer's Brief`를 작성한다.
6. 원본보다 나은 구조가 있으면 사건 순서, 씬 경계, 정보 공개, 분기, Outcome
   또는 인물 동기를 개선한 하나의 최적안으로 바로 집필한다. 원본 충실본을
   별도 대안으로 만들지 않는다.
7. `docs/skills/scenario_writing.md`에 따라 사건을 입력 대기 또는 확정 결과
   전달 단위의 씬으로 나누고 `docs/templates/ingame_script.md`로 작성한다.
8. 구체적인 창작 문장과 필드는 `CW-*` 각주로, 원본 서사 구조와 달라진 부분은
   `NR-*` Narrative Revision Log로 각각 공개한다.
9. 씬 데이터 조합을 UI·기술 문서와 대조한다. 확정되지 않은 판정값, 등록
   에셋 ID와 데이터 값은 `TBD` 또는 공개된 창작 제안으로 둔다.
10. 세계관 정사나 시스템 규칙 변경이 필요한 개선안은 별도 고위험 승인 항목으로
    분리하고, 의존하는 대본 필드는 해당 항목이 적용될 때까지 `TBD`로 둔다.
11. 신규 챕터의 미래 canonical 경로를
    `design/narrative/scripts/<chapter_slug>_ingame_script.md`로 정한다.
12. 상위 시나리오 변경이 있으면 상위 시나리오 update, 스크립트 create/update와
    모든 링크 갱신을 하나의 `restructure` 승인 항목에 넣는다. 신규 스크립트와
    색인 링크를 함께 만드는 경우도 `restructure`로 처리한다.
13. `scenario_writer`는 파일을 수정하지 않고 초안과
    `ready_for_independent_review` handoff를 메인 Codex에 반환한다.
14. 메인 Codex는 초안과 범위를 `scenario_reviewer`에 전달한다. 검수자는 원본을
    직접 확인하고 `pass | revision_required | blocked` 판정과 `SRV-*` 결과를
    반환한다.
15. `blocking` 또는 `required_revision`이 있으면 메인 Codex가 원래 작업을
    `scenario_writer`에 되돌려 수정하고 재검수한다. 선택적 작가 판단은 자동
    반영하지 않으며, 채택하면 필요한 `NR-*`·`CW-*` 공개를 추가한다.
16. 검수 통과 후 메인 Codex가 Writer's Brief, NR·CW 공개, `TBD`, 충돌,
    의존성과 승인 범위를 최종 확인한다.
17. 저장 요청이 있으면 메인 Codex가 기준 Git 커밋, 대상별 비교 범위와 현재
    SHA-256, 검수 요약과 의존 승인 항목을 기록해 프로젝트 Approval Queue에
    `pending`으로 저장한 뒤 사용자에게 전달한다.

## Narrative Revision Rules

- `NR-<chapter>-<number>`는 사건 순서, 씬 구성, 공개 시점, 분기, Outcome,
  인물 동기처럼 상위 시나리오와 달라진 구조를 추적한다.
- 각 NR 항목에는 원본 경로·섹션, 원본 구조, 작성본 구조, 변경 이유, 기대되는
  플레이 경험, 연속성·후속 장면 영향과 승인 후 동기화할 문서를 기록한다.
- 작성본은 더 낫다고 판단한 구조를 직접 사용한다. 다만 NR 기록이 승인되기
  전까지 원본 시나리오가 계속 canonical owner다.
- NR 변경과 그 변경을 표현하는 구체 문장·ID에는 NR 기록과 CW 각주가 모두
  필요할 수 있다. 둘 중 하나로 다른 하나를 대신하지 않는다.
- 상위 시나리오와 스크립트가 서로 다른 구조로 남지 않도록 하나의 승인
  항목에서 원자적으로 적용한다.

## Creative Disclosure Rules

- 원본 사건을 새로운 문장으로 풀어 쓴 지문·대사도 구체적 창작으로 본다.
- 원본에 없는 ID, 상태 표현, 연출, 음향과 카메라 지시도 창작으로 본다.
- 각 창작 항목에는 `CW-<chapter>-<number>` Markdown 각주를 직접 붙인다.
- 각주에는 모든 영향 line·choice·scene·field ID, 원본 공백, 작성 이유와
  설정·시스템·연속성·제작 영향을 기록한다.
- 여러 항목을 묶을 때는 영향을 받는 모든 ID와 필드를 빠짐없이 열거한다.
- 각주나 NR 표식이 없는 사실은 Sources에서 직접 확인할 수 있어야 한다.

## High-Risk Dependencies

- 세계관 정사와 시스템 규칙은 인게임 스크립트가 단독으로 바꾸지 않는다.
- 변경이 필요하면 연결된 별도 고위험 승인 항목을 만들고 해당 canonical
  owner의 변경안으로 분류한다.
- 본 승인 항목에는 선행 의존 항목과 영향을 받는 대본 ID를 기록한다.
- 선행 항목이 `applied`되기 전에는 의존 대본을 적용하지 않는다. 선행 적용 후
  변경된 원본을 기준으로 대본 승인안을 재확인하고 `TBD`를 해소한다.

## Approval Boundary

- 인게임 스크립트는 `scenario` 역할의 상세 문서다.
- 승인 전에는 `design/narrative/scripts/`와 상위 시나리오를 수정하지 않는다.
- `scenario_writer`와 `scenario_reviewer`는 Approval Queue를 포함한 프로젝트
  파일을 수정하지 않는다. 검수된 결과의 `pending` 저장은 메인 Codex만 한다.
- Approval Queue 초안 작성은 승인 없이 가능하지만 Decision Log와 Version
  History는 변경하지 않는다.
- `restructure`는 상위 시나리오, 스크립트와 링크를 일부만 적용하지 않는다.
- 적용 직전 모든 대상과 선행 의존 항목을 재확인하고, 기준이 다르면
  `needs_reconfirmation`으로 이동한다.

## Output

- 대상 프로젝트, 시나리오와 챕터 범위
- Writer's Brief와 승인 문체 참고 자료
- 검색한 근거 파일
- 플레이어 노출 대본과 씬 명세
- NR 구조 변경 목록, CW 창작 각주와 `TBD` 목록
- `scenario_reviewer`의 판정, 해소된 필수 수정과 남은 선택적 권고
- 상위 시나리오와 링크의 동기화 대상
- 별도 고위험 의존 승인 항목과 충돌
- `pending` 승인 항목과 미래 canonical 경로
