# Decision Log

승인, 거부, 보류, 수정 요청 등 중요한 결정을 기록한다.

- 프로젝트 ID: `chronicles-of-the-twelve-bonds`

## Entries

### Decision: 프롤로그 Phase 1 인게임 스크립트 승인

#### Metadata

- ID: DEC-20260721-001
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-21
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260720-001`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/scripts/prologue_ingame_script.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/main_scenario.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/README.md`

#### Context

확정 메인 시나리오는 프롤로그 Phase 1의 사건과 세 선택지를 정의했지만,
플레이어가 실제로 읽을 지문·독백과 Unity가 연결할 씬·선택·Outcome ID,
상태 표현 및 제작 연출은 별도 인게임 스크립트로 구체화되지 않았다.

#### Decision

`APPR-20260720-001`의 플레이어 노출 대본과 씬 명세를 프롤로그 인게임
스크립트의 Phase 1 확정 범위로 적용한다. 원본에 없던 문장, ID, 상태 플래그와
연출 지시는 문서의 창작 각주를 유지해 확정 근거와 창작 범위를 구분한다.
상위 시나리오, 게임 개요와 문서 색인에서 새 스크립트를 연결한다.

#### Rationale

사용자가 승인 항목을 명시적으로 승인했다. 적용 전 재확인에서 세 기존 대상의
SHA-256이 작성 당시 값과 모두 일치했고 동일 제목·역할의 확정 스크립트도
존재하지 않았다. 창작 내용과 구현 미정값이 각주와 `TBD`로 공개되어 있어
Phase 1 범위에서 검토 가능한 확정 문서로 관리할 수 있다.

#### Follow-up

- 후속 작업: 실제 `scene_type`, 화자·장소·RAG·일러스트 레지스트리와 리소스
  ID를 확인하고 Phase 2~4 및 혼돈 전투 대본은 별도 승인 항목으로 확장한다.

---

### Decision: 게임 개요·세계관·시나리오·시스템 문서 역할 분리 승인

#### Metadata

- ID: DEC-20260716-005
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-16
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260716-004`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/world/world_setting.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/main_scenario.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/systems/core_gameplay_systems.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/README.md`

#### Context

기존 전체 게임 기획서는 게임 개요뿐 아니라 세계관 정사, Phase별 시나리오,
지도·탐험·성장·전투·판정 상세까지 함께 소유해 이후 콘텐츠가 늘어날수록
정보 위치와 원본 문서가 불분명해질 수 있었다.

#### Decision

전체 게임 기획서는 게임 정체성, 디자인 원칙, 상위 플레이 루프, 거시 진행,
목표 범위와 문서 지도를 소유한다. 세계관 설정, 메인 시나리오와 핵심 게임
시스템을 별도 canonical document로 생성하고 개요서와 문서 색인에서 모든
상세 문서로 이동할 수 있는 상대경로 링크를 제공한다.

#### Rationale

사용자가 `APPR-20260716-004`를 명시적으로 승인했다. 적용 전 재확인에서
개요서와 문서 색인의 SHA-256이 승인안 작성 시점과 일치했고 새 상세 문서와
같은 역할의 확정 문서가 존재하지 않았다. 상세 사실의 원본을 역할별로 하나만
두면 이후 세계관·시나리오·시스템 변경을 해당 문서에서 독립적으로 검토할 수 있다.

#### Follow-up

- 후속 작업: 남부 권역과 궁기 여정을 설계할 때 세계관·시나리오·시스템
  내용을 각 canonical document에 반영하고 실제 지역·노드 콘텐츠가 구체화되면
  `design/content/` 아래에 별도 문서를 제안한다.

---

### Decision: 장면 입력 모드와 중요 선택 UI 확장 승인

#### Metadata

- ID: DEC-20260716-004
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-16
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260716-003`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/gameplay_ui.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`

#### Context

장면에 따라 선택지가 없거나, 선택지만 있거나, 자연어 입력만 필요하거나, 두 입력을 함께 제공해야 한다. 또한 중요한 선택은 일반 선택과 다른 시각적 중요도가 필요했다.

#### Decision

공통 장면 화면 안에서 `narrative_only`, `choice_only`, `text_only`, `choice_and_text` 네 가지 `input_mode`를 사용한다. 선택지 표시는 `choice_presentation: standard | emphasis`로 분리하고, `emphasis`는 시나리오에서 중요 분기로 지정한 `choice_only` 장면에서 화면 중앙의 큰 선택 패널로 표시한다. 상황별 목업 5종을 UI 문서에 인라인으로 표시한다.

#### Rationale

사용자가 `APPR-20260716-003`을 명시적으로 승인했다. 입력 모드와 선택 표시 방식을 분리하면 개별 화면 문서를 중복 생성하지 않고도 장면별 표현을 조합할 수 있다. 적용 전 재확인에서 두 확정 문서와 검토 이미지가 승인안 작성 시점과 일치했다.

#### Follow-up

- 후속 작업: 선택지 최대 개수, 최종 폰트·색상 토큰·안전 영역은 후속 승인 항목에서 확정한다.

---

### Decision: 플레이 UI 문서·예시 이미지 명칭 정정 승인

#### Metadata

- ID: DEC-20260716-003
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-16
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260716-002`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/gameplay_ui.md`

#### Context

해당 게임은 동양 판타지 1인 AI GM TRPG인데 확정 UI 문서와 예시 이미지의 `비주얼 노벨` 명칭이 게임 장르로 오인될 수 있었다. 또한 UI 이미지를 문서에서 바로 확인할 수 있게 할 필요가 있었다.

#### Decision

`visual_novel_ui.md`와 확정 목업을 각각 `gameplay_ui.md`, `gameplay_ui_mockup_1920x1080_v1.png`로 정정하고 현재 사용 중인 참조 경로와 UI 유형 표현을 갱신한다. `gameplay_ui.md`의 `예시 목업` 섹션에 확정 이미지를 Markdown으로 직접 표시한다.

#### Rationale

사용자가 개정된 `APPR-20260716-002`를 명시적으로 승인했다. 적용 전 재확인에서 기준 커밋과 현재 확정 원본이 일치했으며, 게임 규칙과 이미지 내용은 변경하지 않는다.

#### Follow-up

- 후속 작업: 이후 해당 UI 문서의 확정 예시 이미지를 추가·교체할 때 `예시 목업` 섹션의 인라인 표시도 함께 갱신한다.

---

### Decision: 플레이 UI 문서에 예시 이미지 인라인 표시 요청

#### Metadata

- ID: DEC-20260716-002
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-16
- 결정자: 사용자
- 상태: change_requested
- 관련 승인 큐: `APPR-20260716-002`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/gameplay_ui.md`

#### Context

확정 UI 목업 이미지가 `design/assets/`에 있어도 문서에서는 경로만 보이므로 검토할 때 별도로 파일을 열어야 했다.

#### Decision

`APPR-20260716-002`의 초안을 개정해 `gameplay_ui.md`의 `예시 목업` 섹션에 확정 UI 이미지를 Markdown으로 직접 표시한다. 이후 해당 문서의 UI 예시를 추가·교체할 때도 같은 섹션에서 인라인으로 확인할 수 있게 유지한다.

#### Rationale

사용자가 UI 문서에서 예시 이미지를 바로 확인할 수 있게 하도록 명시적으로 수정을 요청했다. 이미지 내용이나 UI 규칙은 변경하지 않는다.

#### Follow-up

- 후속 작업: 개정된 `APPR-20260716-002`의 명시적 승인 후 확정 UI 문서와 이미지 경로에 반영한다.

---

### Decision: 게임마스터 다중 에이전트 흐름 승인

#### Metadata

- ID: DEC-20260716-001
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-16
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260716-001`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`

#### Context

기존 기술 문서는 Unity와 단일 AI GM의 책임 경계를 정의했지만, 자연어 의도 해석, 오래된 세션 기억 검색과 중요 장면 서술을 어떤 내부 흐름으로 처리할지는 정하지 않았다.

#### Decision

플레이어에게는 대표 GM의 최종 응답 하나만 표시하고, 의도 분석가·기억 검색가·선택형 서술가를 조건부로 호출하는 혼합형 다중 에이전트 구조를 사용한다. Unity는 규칙, 판정, Outcome, 세션 기억과 상태 변경의 최종 권한을 유지한다.

#### Rationale

사용자가 `APPR-20260716-001`을 명시적으로 승인했다. 필수 호출은 병렬화하고 일반 장면에서 불필요한 전문 호출을 생략하여 설정·기억 정확도와 응답 속도를 균형 있게 유지할 수 있다.

#### Follow-up

- 후속 작업: 실제 AI 공급자와 `fast_model`, 네트워크 장애 정책, 세이브 직렬화 형식은 별도 승인 항목에서 확정한다.

---

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
