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

## 3. 템플릿

- [x] 기획서 템플릿을 만든다.
- [x] 변경안 템플릿을 만든다.
- [x] 승인 큐 항목 템플릿을 만든다.
- [x] 결정 로그 항목 템플릿을 만든다.
- [x] 버전 기록 항목 템플릿을 만든다.
- [x] 프로젝트 Brief 템플릿을 만든다.

## 4. 스킬

- [x] 기획 보조 스킬을 만든다.
- [x] 충돌 검토 스킬을 만든다.
- [x] 문서 보완 질문 스킬을 만든다.
- [x] 한국어 게임 기획 문체 스킬을 만든다.

## 5. 운영 규칙

- [x] 승인 전 확정 문서 수정 금지 규칙을 명시한다.
- [x] 승인 후 Decision Log와 Version History 갱신 규칙을 명시한다.
- [x] 정보 부족 시 `TBD`와 질문을 사용하도록 명시한다.
- [x] API 호출, CLI, 웹 UI가 제외 범위임을 명시한다.
- [x] 프로젝트별 작업 공간과 기록 분리 규칙을 명시한다.

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
