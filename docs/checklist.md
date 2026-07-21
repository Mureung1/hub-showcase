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
- [x] 프로젝트 범위 custom agent 폴더와 `scenario_writer` 정의를 만든다.

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
- [x] 시나리오를 챕터별 인게임 스크립트 승인 초안으로 만드는 흐름을 정의한다.

## 3. 템플릿

- [x] 기획서 템플릿을 만든다.
- [x] 변경안 템플릿을 만든다.
- [x] 승인 큐 항목 템플릿을 만든다.
- [x] 결정 로그 항목 템플릿을 만든다.
- [x] 버전 기록 항목 템플릿을 만든다.
- [x] 프로젝트 Brief 템플릿을 만든다.
- [x] 게임 개요, 세계관, 시나리오와 시스템 타입별 템플릿을 만든다.
- [x] 플레이어 노출 대본과 씬 명세를 결합한 인게임 스크립트 템플릿을 만든다.

## 4. 스킬

- [x] 기획 보조 스킬을 만든다.
- [x] 충돌 검토 스킬을 만든다.
- [x] 문서 보완 질문 스킬을 만든다.
- [x] 한국어 게임 기획 문체 스킬을 만든다.
- [x] 메인 에이전트가 일반 시나리오의 구조를 검토하고 개선 권고를 Draft와
  분리하는 스킬을 만든다.
- [x] 플레이어 주도권, 씬 데이터와 창작 각주를 검토하는 시나리오 저작 스킬을 만든다.

## 5. 운영 규칙

- [x] 승인 전 확정 문서 수정 금지 규칙을 명시한다.
- [x] 승인 후 Decision Log와 Version History 갱신 규칙을 명시한다.
- [x] 정보 부족 시 `TBD`와 질문을 사용하도록 명시한다.
- [x] API 호출, CLI, 웹 UI가 제외 범위임을 명시한다.
- [x] 프로젝트별 작업 공간과 기록 분리 규칙을 명시한다.
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
- [ ] 새 고유 슬러그와 `project_brief.md`, Design, Ideas, Approvals, Decisions, Versions 구조가 생성된다.
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
- 확인 파일: `.codex/agents/scenario_writer.toml`, 전용 workflow·skill·template,
  Approval Queue, 상위 시나리오, 인게임 스크립트와 링크 문서.

### 6.13 메인 에이전트 일반 시나리오 개선 권고

- 검증 입력: 시나리오 자료를 일반 `scenario` 기획서로 작성하거나 기존
  시나리오를 수정하면서 더 나은 분기가 있는지 함께 검토하는 요청.
- [ ] 메인 Codex가 Project Brief, 게임 개요, 대상 시나리오와 관련 확정 문서를
  읽고 인과, 동기, 긴장, 공개 시점, 선택, 분기·합류와 Outcome을 검토한다.
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
- 확인 파일: `docs/skills/scenario_review.md`, 일반 문서 작성·변경 workflow,
  변경안·승인 항목 template, Approval Queue와 대상 시나리오 문서.
