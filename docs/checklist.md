# 체크리스트

## 완료 표시 기준

- 1~5절은 구조, workflow, template, skill과 운영 규칙의 존재 여부를
  확인한다.
- 6절은 구체적인 입력을 기준으로 산출물과 승인 경계를 끝까지 확인하는
  시나리오 검증이다.
- 문서가 존재한다는 이유만으로 시나리오 항목을 완료 처리하지 않는다.
- 시나리오의 입력, 기대 산출물, 승인 경계와 확인 대상 파일을 모두 확인한
  경우에만 `[x]`로 바꾼다.

## 1. 저장소 구조

- [x] Codex 작업장 목적의 README를 작성한다.
- [x] API/CLI 제품 설명을 제거한다.
- [x] 워크플로우 문서 폴더를 만든다.
- [x] 스킬 문서 폴더를 만든다.
- [x] 템플릿 문서 폴더를 만든다.
- [x] 작업 공간 폴더를 만든다.
- [x] 프로젝트 범위 custom agent 폴더와 `scenario_writer`,
  `scenario_designer`, `scenario_reviewer`, `design_creative_planner` 정의를 만든다.

## 2. 핵심 워크플로우

- [x] 입력 분류 흐름을 정의한다.
- [x] 임시 아이디어 등록 및 승인 제안 전환 흐름을 정의한다.
- [x] 신규 기획서 작성 흐름을 정의한다.
- [x] 변경안 생성 흐름을 정의한다.
- [x] 확정 문서 삭제 제안 및 승인 반영 흐름을 정의한다.
- [x] 승인 큐 처리 흐름을 정의한다.
- [x] 결정 로그 작성 흐름을 정의한다.
- [x] 버전 기록 작성 흐름을 정의한다.
- [x] 프로젝트 검색 흐름을 정의한다.
- [x] 프로젝트 선택 및 신규 프로젝트 생성 흐름을 정의한다.
- [x] 기획 Draft의 GAP 분류, 창작 허가, 복수 대안 선택과 재승인 흐름을 정의한다.
- [x] 시나리오를 챕터별 인게임 스크립트 승인 초안으로 만드는 흐름을 정의한다.

## 3. 템플릿

- [x] 기획서 템플릿을 만든다.
- [x] 변경안 템플릿을 만든다.
- [x] 승인 큐 항목 템플릿을 만든다.
- [x] 결정 로그 항목 템플릿을 만든다.
- [x] 버전 기록 항목 템플릿을 만든다.
- [x] 프로젝트 Brief 템플릿을 만든다.
- [x] 프로젝트 소개와 확정 문서 지도를 위한 프로젝트 README 템플릿을 만든다.
- [x] 게임 개요, 세계관, 시나리오와 시스템 타입별 템플릿을 만든다.
- [x] 플레이어 노출 대본과 씬 명세를 결합한 인게임 스크립트 템플릿을 만든다.
- [x] 승인 항목에 Creative Completion Review와 Creative Proposal Log 형식을 만든다.

## 4. 스킬

- [x] 기획 보조 스킬을 만든다.
- [x] 충돌 검토 스킬을 만든다.
- [x] 문서 보완 질문 스킬을 만든다.
- [x] 일반 기획 공백을 허가 기반 복수 창작안으로 보완하는 스킬을 만든다.
- [x] 한국어 게임 기획 문체 스킬을 만든다.
- [x] `scenario_designer`가 일반 시나리오의 구조를 작성·검토하고 개선 권고를
  Draft와 분리하며 `scenario_reviewer`가 독립 검수하는 스킬을 만든다.
- [x] 플레이어 주도권, 씬 데이터와 창작 각주를 검토하는 시나리오 저작 스킬을 만든다.

## 5. 운영 규칙

- [x] 승인 전 확정 문서 수정 금지 규칙을 명시한다.
- [x] 승인 후 Decision Log와 Version History 갱신 규칙을 명시한다.
- [x] 정보 부족 시 `TBD`와 질문을 사용하도록 명시한다.
- [x] 창작 가능 GAP과 사용자 사실·선행 의존성 GAP의 분리 규칙을 명시한다.
- [x] 선택된 기획 창작의 `CP-*` 공개, 수치의 `provisional` 상태와 재승인 규칙을 명시한다.
- [x] API 호출, CLI, 웹 UI가 제외 범위임을 명시한다.
- [x] 프로젝트별 작업 공간과 기록 분리 규칙을 명시한다.
- [x] 프로젝트 루트 README의 비정사 색인 역할과 확정 문서 동기화 규칙을 명시한다.
- [x] 문서 역할별 canonical owner와 표준 경로를 정의한다.
- [x] 게임 개요의 상세 누적 금지와 상세 문서 링크 규칙을 정의한다.
- [x] 다중 문서 재구성의 원자적 승인·재확인 규칙을 정의한다.
- [x] 승인 에셋의 canonical 경로 전환과 검토용 사본 삭제 규칙을 정의한다.
- [x] 일반 시나리오의 개선 권고 선택과 재승인 경계를 정의한다.
- [x] 인게임 스크립트 창작 내용의 각주 공개와 승인 전 확정 경로 수정 금지 규칙을 정의한다.

## 6. 시나리오 기반 workflow 검증

### 6.1 신규 문서 생성 제안 및 승인 반영

- 검증 입력: 관련 확정 문서가 없는 독립 주제의 신규 기획서 작성 요청.
- [ ] 입력이 `create_new_document`로 분기되고 기준 Git 커밋과 신규 문서
  제목/주제가 기록된 `pending` 승인 항목이 생성된다.
- [ ] 명시적 승인 전에는 `workspace/projects/<project_slug>/design/`에 문서가 생성되지 않고
  Decision Log와 Version History도 변경되지 않는다.
- [ ] 명시적 승인 후 문서가 생성되고 승인 항목이 `applied`로 이동하며
  Decision Log와 Version History에 연결된 `create` 기록이 남는다.
- 확인 파일: `workspace/projects/<project_slug>/design/`, `workspace/projects/<project_slug>/approvals/approval_queue.md`,
  `workspace/projects/<project_slug>/decisions/decision_log.md`, `workspace/projects/<project_slug>/versions/version_history.md`.

### 6.2 기존 문서 변경 제안 및 승인 반영

- 검증 입력: 하나의 기존 확정 문서를 대상으로 한 내용 변경 요청.
- [ ] 입력이 `update_existing_document`로 분기되고 대상 경로, 기준 Git
  커밋, 비교 대상과 원본 요약을 포함한 `pending` 승인 항목이 생성된다.
- [ ] 명시적 승인 전에는 원본 문서와 결정·버전 기록이 변경되지 않는다.
- [ ] 명시적 승인 후 대상 문서만 변경되고 승인 항목, Decision Log와
  Version History에 연결된 `update` 기록이 남는다.
- 확인 파일: 대상 확정 문서와 신규 문서 생성 시나리오의 세 기록 파일.

### 6.3 원본 변경 및 재확인

- 검증 입력: 승인된 생성 또는 변경 제안의 적용 직전에 대상 원본이나 동일
  주제 문서 상태가 달라진 상황.
- [ ] 적용이 중단되고 항목이 `Needs Reconfirmation` 영역으로 이동하며 진입
  사유, 현재 원본 요약과 비교 결과가 기록된다.
- [ ] 기존 승인을 재사용하지 않고, 명시적 재승인 전에는 확정 문서,
  Decision Log와 Version History가 변경되지 않는다.
- [ ] 갱신된 기준 정보와 초안이 `pending` 또는 `approved`를 거친 뒤에만
  적용되며 `needs_reconfirmation`에서 `applied`로 직접 이동하지 않는다.
- 확인 파일: 대상 확정 문서, `workspace/projects/<project_slug>/approvals/approval_queue.md`,
  `workspace/projects/<project_slug>/decisions/decision_log.md`, `workspace/projects/<project_slug>/versions/version_history.md`.

### 6.4 보류·수정 요청·거부 상태 전환

- 검증 입력: 같은 `pending` 항목에 대한 보류, 수정 요청, 거부 결정.
- [ ] 각 결정이 `On Hold`, `Change Requested`, `Rejected` 영역으로 이동하고
  Decision History와 Decision Log에 이유·결정자·결정일이 보존된다.
- [ ] 보류 재개 시 원본 재확인을 거쳐 `pending` 또는
  `needs_reconfirmation`으로 이동한다.
- [ ] 수정 범위가 유지되면 기존 항목을 개정하고, 대상이나 핵심 범위가
  달라지면 서로 연결된 새 승인 항목을 만든다.
- [ ] 거부 항목은 종료 상태로 보존되며 모든 비승인 결정에서 확정 문서와
  Version History가 변경되지 않는다.
- 확인 파일: `workspace/projects/<project_slug>/approvals/approval_queue.md`,
  `workspace/projects/<project_slug>/decisions/decision_log.md`, `workspace/projects/<project_slug>/versions/version_history.md`.

### 6.5 확정 문서 삭제 제안 및 승인 반영

- 검증 입력: 하나의 확정 문서를 대상으로 한 명시적 삭제 요청.
- [ ] 입력이 `delete_existing_document`로 분기되고 링크 단절, 설정 유실과
  대체 문서를 검토한 `delete` 승인 항목이 생성된다.
- [ ] 명시적 승인 전에는 대상 문서가 삭제되지 않으며, 영향 범위가 달라지면
  `needs_reconfirmation`으로 이동한다.
- [ ] 명시적 승인 후 대상 문서만 삭제되고 Decision Log와 Version History에
  연결된 `delete` 기록과 대체 문서 정보가 남는다.
- 확인 파일: 삭제 대상 문서 경로와 신규 문서 생성 시나리오의 세 기록 파일.

### 6.6 임시 아이디어 등록 및 승인 제안 전환

- 검증 입력: 확정 반영 요청이 없는 아이디어와 이후 해당 아이디어의 문서화
  요청.
- [ ] 최초 입력은 고유 ID와 `active` 상태로 Temporary Ideas에만 기록되고
  확정 문서와 승인·결정·버전 기록은 변경되지 않는다.
- [ ] 문서화 요청 시 관련 자료를 다시 검색하고 아이디어 ID를 근거로 연결한
  승인 항목이 생성되며 아이디어 상태가 `converted`로 바뀐다.
- [ ] `converted`를 승인으로 간주하지 않고 명시적 승인 전에는 확정 문서를
  생성하거나 수정하지 않는다.
- 확인 파일: `workspace/projects/<project_slug>/ideas/temporary_ideas.md`,
  `workspace/projects/<project_slug>/approvals/approval_queue.md`, `workspace/projects/<project_slug>/design/`.

### 6.7 신규 프로젝트 생성 및 프로젝트 격리

- 검증 입력: 기존 프로젝트가 있는 상태에서 별도의 새 게임 프로젝트 생성 요청.
- [ ] 새 고유 슬러그와 프로젝트 `README.md`, `project_brief.md`, Design, Ideas,
  Approvals, Decisions, Versions 구조가 생성된다.
- [ ] 프로젝트 README에 간단한 소개, 현재 초점, 작업 기록 링크와
  `아직 생성된 확정 세부 문서 없음`이 기록된다.
- [ ] 새 프로젝트가 `workspace/project_registry.md`에 등록되고 모든 초기 문서에 같은 프로젝트 ID가 기록된다.
- [ ] 기존 프로젝트의 아이디어, 승인 큐, 결정 로그, 버전 기록과 디자인 문서가 새 프로젝트에 복사되거나 변경되지 않는다.
- [ ] 프로젝트가 여러 개일 때 대상이 불명확한 변경 요청은 프로젝트 확인 전까지 파일을 수정하지 않는다.
- 확인 파일: `workspace/project_registry.md`, 신규 프로젝트 루트, 기존 프로젝트 루트.

### 6.8 문서 역할 분류와 개요서 깊이

- 검증 입력: 세계관 설정, 시나리오 장면과 시스템 규칙을 한 요청에서 함께
  추가해 달라는 요청.
- [ ] 입력 단위별 canonical document role과 표준 경로가 제시되고 상세
  정보가 `game_overview` 한 문서로 합쳐지지 않는다.
- [ ] 개요서 변경안에는 핵심 요약과 존재할 상세 문서의 상대경로 링크만
  포함되고 장면·설정·판정 상세는 각 소유 문서 초안에 들어간다.
- [ ] 같은 상세 사실을 둘 이상의 확정 문서가 원본으로 소유하지 않는다.
- 확인 파일: `docs/workflows/document_structure.md`, 승인 큐 초안,
  `workspace/projects/<project_slug>/design/`의 대상 문서.

### 6.9 다중 문서 재구성 승인

- 검증 입력: 세계관·시나리오·시스템 상세가 섞인 기존 개요서를 역할별
  문서로 분리하는 요청.
- [ ] `restructure` 승인 항목에 경로별 create/update/delete, 비교 대상,
  현재 SHA-256, 최종 문서 역할과 링크 갱신이 기록된다.
- [ ] 명시적 승인 전에는 기존 개요서와 신규 상세 문서가 변경되지 않는다.
- [ ] 적용 전 대상 하나라도 달라지면 전체 적용을 중단하고
  `needs_reconfirmation`으로 이동한다.
- [ ] 모든 대상이 일치할 때만 전체 문서와 링크가 함께 반영되고 Decision
  Log와 Version History에 하나의 연결된 재구성 기록이 남는다.
- 확인 파일: 승인 큐, 대상 확정 문서, Decision Log, Version History.

### 6.10 승인 에셋 반영과 검토본 정리

- 검증 입력: `approvals/assets/`의 검토 이미지가 포함된 승인 항목을 명시적으로
  승인하고 적용하는 요청.
- [ ] 적용 전 또는 `approved` 상태에서는 검토 이미지가 유지되고
  `design/assets/`의 확정 에셋으로 간주되지 않는다.
- [ ] 적용 시 검토본의 SHA-256을 다시 확인하고 `design/assets/`의 승인 후
  경로에 같은 파일이 존재하도록 반영한다.
- [ ] 승인 큐에서 실제 파일을 여는 근거 경로와 인라인 이미지 참조, Decision
  Log와 Version History가 `design/assets/`의 canonical 경로를 사용한다.
- [ ] 모든 검증과 참조 갱신 후 대응하는 검토본만 `approvals/assets/`에서
  삭제되며, 삭제가 끝난 뒤 항목이 `applied`로 이동한다.
- [ ] 검토본 해시가 달라졌거나 승인 후 경로에 다른 내용의 파일이 있으면
  검토본을 삭제하지 않고 `needs_reconfirmation`으로 이동한다.
- 확인 파일: 승인 항목의 Asset Operations, `approvals/assets/`,
  `design/assets/`, Decision Log, Version History.

### 6.11 프롤로그 Phase 1 인게임 스크립트 제안

- 검증 입력: 십이인연록 메인 시나리오의 프롤로그 Phase 1을 플레이어 노출
  대본과 전체 씬 정보가 있는 문서로 작성하되 창작 부분을 모두 알리는 요청.
- [x] `scenario_writer` 역할, 전용 workflow·skill·template이 정의되고 대상
  프로젝트와 관련 확정 문서를 먼저 조회한다.
- [x] `APPR-20260720-001`이 `pending`으로 생성되고 미래 canonical 경로,
  기준 커밋, 대상별 SHA-256과 승인 후 링크 갱신을 기록한다.
- [x] Phase 1 초안에 씬 번호·ID, 플레이어 노출 지문·대사·선택지, 진입·종료
  조건, 분기·Outcome, 상태·참조·제작·QA 정보가 포함된다.
- [x] 원본에 직접 없는 문장, ID, 상태 표현과 연출 지시에 각주가 연결되고
  각주에서 창작 이유와 영향 범위를 공개한다.
- [x] 명시적 승인 전 `design/narrative/scripts/`, Decision Log와 Version
  History를 변경하지 않는다.
- 확인 파일: `.codex/agents/scenario_writer.toml`,
  `docs/workflows/write_ingame_script.md`, `docs/skills/scenario_writing.md`,
  `docs/templates/ingame_script.md`, 대상 프로젝트의 Approval Queue와 확정 문서.

### 6.12 프로젝트 적응형 전담 시나리오 라이터

- 검증 입력: 확정 시나리오의 한 챕터를 전담 작가 관점에서 진단하고 원본보다
  나은 서사 구조가 있으면 최적안으로 작성해 달라는 요청.
- [x] `scenario_writer` 작성 → `scenario_reviewer` 독립 검수 → 메인 Codex의
  `pending` 저장으로 이어지는 read-only handoff 구조가 정의되어 있다.
- [ ] Writer's Brief가 대상 프로젝트의 Brief, 게임 개요, 세계관, 상위
  시나리오와 기존 승인 대본을 근거로 게임 고유의 정체성을 정리한다.
- [ ] 에이전트가 원본 충실본과 개선본을 중복 작성하지 않고 하나의 최적안을
  제시한다.
- [ ] 원본 사건 순서, 공개 시점, 분기, Outcome과 인물 동기의 변경이 `NR-*`로,
  구체 창작 문장·ID·연출은 `CW-*`로 각각 공개된다.
- [ ] 상위 시나리오 변경, 인게임 스크립트와 링크 갱신이 하나의 `restructure`
  승인 항목에 기록되고 일부 적용되지 않는다.
- [ ] 세계관 정사·시스템 규칙 변경은 별도 고위험 의존 항목으로 분리되고,
  관련 대본은 선행 적용과 재확인 전까지 `TBD`로 유지된다.
- [ ] 명시적 승인 전 `design/narrative/`가 변경되지 않고, 적용 전 모든 대상과
  의존 항목을 재확인한다.
- [ ] `scenario_reviewer`가 작가 요약에 의존하지 않고 원본을 직접 읽으며,
  `blocking`·`required_revision` 결과가 해소될 때까지 작가 수정과 재검수를
  반복한다.
- 확인 파일: `.codex/agents/scenario_writer.toml`,
  `.codex/agents/scenario_reviewer.toml`, 전용 workflow·skill·template, Approval
  Queue, 상위 시나리오, 인게임 스크립트와 링크 문서.

### 6.13 일반 시나리오 작성·독립 검수

- 검증 입력: 시나리오 자료를 일반 `scenario` 기획서로 작성하거나 기존
  시나리오를 수정하면서 더 나은 분기가 있는지 함께 검토하는 요청.
- [x] `scenario_designer` 작성 → `scenario_reviewer` 독립 검수 → 메인 Codex의
  `pending` 저장으로 이어지는 read-only handoff 구조가 정의되어 있다.
- [ ] `scenario_designer`와 `scenario_reviewer`가 각각 Project Brief, 게임 개요,
  대상 시나리오와 관련 확정 문서를 읽고 인과, 동기, 긴장, 공개 시점, 선택,
  분기·합류와 Outcome을 검토한다.
- [ ] 요청과 자료에 충실한 Draft가 보존되고 더 나은 구조는
  `Scenario Improvement Review`에 이유, 기대 경험과 영향 범위를 갖춘 별도
  권고로 기록된다.
- [ ] 개선점이 없으면 불필요한 대안을 창작하지 않고
  `추가 개선 권고 없음`으로 기록한다.
- [ ] 미선택 권고는 Draft, 승인 대상이나 확정 문서에 포함되지 않는다.
- [ ] 사용자가 권고를 선택하면 원본을 다시 확인하고 Draft와 영향 분석을
  갱신한 `pending` 승인안을 다시 제시하며 선택 자체를 승인으로 간주하지 않는다.
- [ ] 세계관 정사·시스템 규칙 변경은 해당 canonical owner의 별도 또는 다중
  문서 변경으로 분류되고 명시적 승인 전 `design/narrative/`가 변경되지 않는다.
- [ ] 독립 검수의 `blocking`·`required_revision` 결과가 해소되지 않으면
  `pending` 승인 항목으로 저장되지 않는다.
- 확인 파일: `.codex/agents/scenario_designer.toml`,
  `.codex/agents/scenario_reviewer.toml`, `docs/skills/scenario_review.md`, 일반 문서
  작성·변경 workflow, 변경안·승인 항목 template, Approval Queue와 대상
  시나리오 문서.

### 6.14 일반 기획 문서 창작 보완

- 검증 입력: 신규 시스템 기획서 초안의 규칙, 예외, 밸런스 수치와 실제
  플랫폼·에셋 ID가 비어 있는 상태에서 누락을 검토하고 창작 보완을 요청한다.
- [x] `design_creative_planner`의 `classify → generate_options →
  incorporate_selection` Phase와 메인 Codex의 사용자 허가 통제 구조가 정의되어
  있다.
- [ ] 최초 Draft에서 모든 누락에 `GAP-*`가 부여되고 `creative_fillable`,
  `user_fact`, `dependency`로 분류되며 창작 허가 전에는 대안이 생성되지 않는다.
- [ ] 사용자가 일부 GAP만 허가하면 저·중위험에는 2개, 고위험에는 3개 대안과
  추천안이 해당 GAP에만 생성된다.
- [ ] 실제 플랫폼·엔진·예산·일정·에셋 ID와 외부 계약은 창작되지 않고
  `TBD`와 사용자 질문으로 남는다.
- [ ] 밸런스 수치 대안은 `provisional`, 설계 가정, 기대 행동, 검증 지표와
  재조정 조건을 포함한다.
- [ ] 사용자가 선택하기 전 대안은 Draft에 들어가지 않고, 선택된 내용만
  `CP-*` 각주와 함께 들어가며 다른 대안은 Creative Proposal Log에 보존된다.
- [ ] 대안 선택 후 원본을 재확인한 승인 항목이 `pending`으로 다시 제시되고
  선택 자체로 확정 문서, Decision Log와 Version History가 변경되지 않는다.
- [ ] 다른 canonical owner에 영향을 주는 선택안은 연결 승인안 또는 원자적
  `restructure`로 분리되고 의존 필드는 선행 적용 전까지 `TBD`로 유지된다.
- [ ] 명시적 승인 적용 후 확정 문서에 CP 각주가 남고 Decision Log와 Version
  History에 적용된 CP ID와 남은 `provisional` 검증 조건이 기록된다.
- [ ] 일반 시나리오 구조와 인게임 스크립트는 각각 Scenario Improvement,
  `CW-*`·`NR-*`를 사용하고 같은 내용에 `CP-*`가 중복되지 않는다.
- 확인 파일: `.codex/agents/design_creative_planner.toml`,
  `docs/skills/design_creative_completion.md`, 문서 작성·변경 및 승인 workflow,
  승인·결정·버전 template, Approval Queue와 대상 기획 문서.

### 6.15 프로젝트 랜딩 README와 확정 문서 지도

- 검증 입력: 새 프로젝트를 생성한 뒤 첫 상세 기획 문서를 승인 적용하고,
  이후 해당 문서를 이동하거나 삭제하는 요청.
- [ ] 프로젝트 루트 README에 Project Brief와 확정 게임 개요만 근거로 한
  1~3문장 소개, 현재 초점과 작업 기록 링크가 있다.
- [ ] 확정 문서가 없을 때 예정 경로를 링크하지 않고
  `아직 생성된 확정 세부 문서 없음`을 표시한다.
- [ ] 상세 문서 승인 적용 시 역할, 상대경로 링크와 한 문장 담당 범위가
  프로젝트 README와 `design/README.md`에 추가된다.
- [ ] 문서 삭제·이동·역할·담당 범위 변경 시 프로젝트 README,
  `design/README.md`와 `game_overview`의 영향받는 링크·설명이 같은 승인
  범위에서 갱신된다.
- [ ] 프로젝트 README가 상세 설정을 복제하거나 canonical owner로 참조되지 않는다.
- 확인 파일: `docs/templates/project_readme.md`, 프로젝트 생성·문서 구조·승인
  workflow, 프로젝트 루트 README, `design/README.md`와 game overview.

### 6.16 모호한 승인 표현의 안전 처리

- 검증 입력: `pending` 승인 항목을 특정하면서 `좋아 보이네`, `괜찮네` 또는
  `마음에 들어`처럼 승인·적용 행동을 명시하지 않은 표현.
- [ ] 해당 표현을 승인으로 간주하지 않고 승인 항목, 확정 문서, Decision
  Log와 Version History를 변경하지 않는다.
- [ ] 사용자에게 표현이 명시적 승인이 아니어서 아무 변경도 적용하지
  않았으며 현재 승인 상태를 유지했다고 안내한다.
- [ ] 적용을 원하면 `APPR-...을 승인하고 적용해줘`처럼 대상 항목과 행동을
  명시해야 한다고 안내한다.
- 확인 파일: `AGENTS.md`, `docs/workflows/approval_queue.md`, 대상 프로젝트의
  Approval Queue, 확정 문서, Decision Log와 Version History.

### 6.17 전문 에이전트 인계와 호환 호출

- 검증 입력: 이전 대화에서 프로젝트, 사용자 제공 사실, 제외 범위와 창작
  금지사항이 결정된 뒤 `design_creative_planner`의 `classify` Phase를 호출하는
  요청.
- [x] 모든 전문 에이전트 호출 전에 작성할 Specialist Task Packet의 필수
  필드와 반환 대조 절차가 정의되어 있다.
- [x] named custom `agent_type`과 `fork_turns: "none"`을 사용하고
  full-history fork를 함께 사용하지 않는 호출 방식이 정의되어 있다.
- [ ] Task Packet에 프로젝트, Phase, 범위, 근거, 사용자 사실·선택,
  권한 경계, 금지사항과 기대 출력이 모두 전달된다.
- [ ] 부모 대화 전체, 무관한 발화와 저장소 전체 파일 목록을 전달하거나
  불필요하게 탐색하지 않는다.
- [ ] 필수 인계 정보가 빠진 호출은 전문 에이전트가
  `blocked_missing_handoff`로 중단하고 Draft, 대안 또는 검수 판정을 만들지
  않는다.
- [ ] 완성된 Packet을 `agent_type: design_creative_planner`,
  `fork_turns: "none"`으로 호출하면 인자 충돌 없이 지정 Phase만 수행한다.
- [ ] 메인 Codex가 결과를 Packet과 대조해 범위 초과, 사용자 정보 누락이나
  권한 추정이 있는 결과를 제시·저장·적용하지 않는다.
- [ ] 호출 인자 실패가 발생하면 같은 인자를 반복하거나 일반 agent로 조용히
  대체하지 않고, 교정된 인자로 한 번만 재시도하며 반복 실패를 사용자에게
  알린다.
- 확인 파일: `AGENTS.md`,
  `docs/workflows/specialist_agent_handoff.md`,
  `docs/templates/specialist_task_packet.md`, `.codex/agents/`,
  변경안·승인 항목 template과 전문 에이전트가 참여한 Approval Queue 항목.

### 6.18 테스트 픽스처 출처와 격리

- 검증 입력: 실제 사용자나 프로젝트에서 나온 것이 아닌 합성 설정 문장으로
  전문 에이전트의 분류·작성·검수 동작을 확인하는 요청.
- [x] 합성 입력의 첫 등장, Task Packet, handoff와 결과 보고에
  `[TEST FIXTURE: SYNTHETIC]`과 `synthetic_test_fixture`를 유지하는 규칙이
  정의되어 있다.
- [x] 기본 동작 테스트용 `tests/fixtures/behavior/sample-game/`과 Behavior
  Test Manifest가 실제 프로젝트 레지스트리 밖에 존재한다.
- [x] 합성 데이터를 `user_fact` 또는 확정 사실로 분류하면 자동 검증이
  실패하고 모든 전문 에이전트가 `blocked_test_provenance`로 중단한다.
- [x] 테스트 실행 작업 경로가 `/tmp` 아래인지, 원본 변경과 실제 프로젝트
  채택이 없는지, 네 가지 필수 결과 보고 필드가 있는지 자동 검사한다.
- [ ] 실제 프로젝트 복사본이 필요한 스모크 테스트는 이유와 비교 기준을
  기록하고 테스트 전후 원본이 동일함을 확인한다.
- [ ] 사용자 보고에서 합성 입력을 “사용자가 제공한 설정”이라고 부르지 않고
  “테스트 픽스처 가정”이라고 명시한다.
- 확인 파일: `AGENTS.md`, `docs/workflows/behavior_testing.md`,
  `docs/templates/behavior_test_manifest.md`,
  `docs/templates/specialist_task_packet.md`, `.codex/agents/`,
  `scripts/workspace_validation.py`, `tests/`.
