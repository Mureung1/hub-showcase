# Decision Log

승인, 거부, 보류, 수정 요청 등 중요한 결정을 기록한다.

- 프로젝트 ID: `chronicles-of-the-twelve-bonds`

## Entries

### Decision: 비주얼 노벨 UI 기획서 및 예시 목업 승인

#### Metadata

- ID: DEC-20260715-001
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-15
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260715-001`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/visual_novel_ui.md`

#### Context

PC용 동양 판타지 TRPG의 플레이 화면 기준과 검토용 UI 시안을 확정 문서로 분리할 필요가 있었다.

#### Decision

`16:9`, `1920×1080` 기준 비주얼 노벨 UI, 지도·보조 메뉴, 일러스트 ID 표시 규칙과 예시 목업을 승인하고 확정 문서에 반영한다.

#### Rationale

사용자가 지금까지 정한 내용을 모두 승인해 추가하도록 명시했다. 적용 전 검색에서 같은 제목이나 역할의 확정 문서가 없고 기준 Git 커밋도 일치했다.

#### Follow-up

- 후속 작업: 월드맵 디자인, 실제 폰트·색상·안전 영역과 로그 세부 형식은 후속 승인 항목에서 확정한다.

---

### Decision: AI GM 런타임 및 데이터 연동 규칙 승인

#### Metadata

- ID: DEC-20260715-002
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-15
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260715-002`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`

#### Context

기획 내용과 별도로 Unity, AI 게임 마스터, RAG와 세션 상태의 책임 및 데이터 연동 규칙을 개발자가 반복 확인할 수 있는 문서가 필요했다.

#### Decision

게임 상태의 단일 기준을 Unity로 두고 AI GM의 생성 범위, 응답 JSON, 검증·재시도, 저장·복원, 자연어 예외 처리, 데이터 필드와 ID 규칙을 승인해 확정 문서에 반영한다.

#### Rationale

사용자가 지금까지 정한 내용을 모두 승인해 추가하도록 명시했다. 적용 전 검색에서 같은 제목이나 역할의 확정 문서가 없고 기준 Git 커밋도 일치했다.

#### Follow-up

- 후속 작업: AI 공급자·모델·호출 정책, 네트워크 오류, 세이브 직렬화와 전투·판정 계산은 후속 승인 항목에서 확정한다.

---

### Decision: 남은 전체 게임 기획 승인

#### Metadata

- ID: DEC-20260715-003
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-15
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260715-003`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`

#### Context

UI와 AI GM 런타임 규칙은 확정 문서로 전환되었지만 시나리오, 탐험, 성장, 전투 1차안과 엔딩은 `IDEA-20260714-001`에 남아 있었다.

#### Decision

현재 임시 기획 문서에 있는 나머지 내용을 모두 승인하고, 이미 분리된 UI·기술 문서와 연결되는 `전체 게임 기획서`로 확정한다. 미정 사항은 새로운 사실을 만들지 않고 TBD로 보존한다.

#### Rationale

사용자가 임시 문서에 남은 범위를 안내받은 뒤 `지금 있는 것들 전부`를 명시적으로 승인했다. 적용 전 검색에서 같은 제목이나 역할의 확정 문서가 없었고 기존 문서와의 중복은 링크와 책임 분리로 해소했다.

#### Follow-up

- 후속 작업: 혼돈 튜토리얼 이후 남부 권역과 궁기 여정 설계부터 재개한다.

---

### Decision: 십이인연록 프로젝트 분리와 신규 프로젝트 격리 규칙

#### Metadata

- ID: DEC-20260715-004
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-15
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260715-004`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/project_brief.md`, `AGENTS.md`, `docs/workflows/project_workspace.md`

#### Context

기존 작업 공간은 모든 게임 자료와 승인 기록을 공용 `workspace/` 하위 경로에 두는 단일 프로젝트 구조여서 향후 프로젝트 간 정보가 섞일 위험이 있었다.

#### Decision

`십이인연록`의 영어명을 `Chronicles of the Twelve Bonds`, 프로젝트 ID를 `chronicles-of-the-twelve-bonds`로 정한다. 현재 자료 전체를 해당 프로젝트 루트로 이동하고, 앞으로 새 프로젝트마다 독립된 작업 구조를 만들도록 에이전트 규칙과 workflow를 변경한다.

#### Rationale

프로젝트별 확정 문서뿐 아니라 아이디어, 승인 큐, 결정과 버전 기록을 함께 격리해야 검색 근거와 승인 이력이 다른 게임과 혼합되지 않는다.

#### Follow-up

- 후속 작업: 모든 새 프로젝트 생성 요청에서 `docs/workflows/project_workspace.md`를 우선 적용한다.
