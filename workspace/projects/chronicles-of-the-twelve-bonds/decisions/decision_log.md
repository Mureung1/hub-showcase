# Decision Log

승인, 거부, 보류, 수정 요청 등 중요한 결정을 기록한다.

- 프로젝트 ID: `chronicles-of-the-twelve-bonds`

## Entries

### Decision: 프롤로그 Scene 2A~4 인게임 스크립트 승인

#### Metadata

- ID: DEC-20260727-002
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-27
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260727-002`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/scripts/prologue_ingame_script.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/main_scenario.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`, 프로젝트 `README.md`, `design/README.md`
- 적용된 창작·서사 공개: `CW-PROLOGUE-07`~`15`, `NR-PROLOGUE-02`

#### Context

확정 프롤로그 스크립트는 Scene 1의 플레이어 대본과 Scene 2A·2B·2C 연결만
소유했다. 사용자는 Scene 2 세 분기를 모두 작성하되 게임오버 없이 Scene 3으로
합류시키고, Scene 3과 Scene 4의 도주 게임오버를 모두 유지하도록 요청했다.
Scene 4에서는 신령의 피리 제안을 수락하거나 거절하고 도주하는 최종 선택이
필요했다.

#### Decision

Scene 2A·2B·2C의 선택별 봉인 파괴 대본, Scene 3의 혼돈·오염과 접근·도주
분기, Scene 4의 조건부 신령 반응·피리 계약·수락/거절 결과를 확정한다.
Scene 2 세 분기는 게임오버 없이 Scene 3으로 합류한다. Scene 3 도주는 기존
오염 게임오버로, Scene 4의 거절·도주는 더 빠르게 덮친 오염 게임오버로
처리한다. 수락은 피리 수령 후 혼돈 보스전으로 전환한다.

메인 시나리오, 프롤로그 스크립트, 게임 개요와 두 색인의 확정 범위를
Scene 1·2A·2B·2C·3·4로 원자적으로 동기화한다.

#### Rationale

`scenario_writer`가 기존 Scene 1 문체와 확정 세계관·시스템·UI·저장 규칙에
근거한 Draft를 작성했다. `scenario_reviewer`의 필수 수정 2건을 해소하고
재검수 `pass`를 받았으며 활성 `blocking`과 `required_revision`은 0건이다.
적용 직전 다섯 대상의 SHA-256이 승인안 작성 당시 값과 모두 일치했고
선행 의존 승인도 없다.

#### Follow-up

- 후속 작업: 혼돈 보스전 내부 Scene ID, 대본·판정·전투 규칙과 실제 item·RAG·리소스·게임오버 호출 ID를 별도 범위에서 확정한다.
- `provisional` 검증·재조정: 없음

---

### Decision: 프롤로그 Scene 구조·ID 및 시나리오 작성 규칙 통일 승인

#### Metadata

- ID: DEC-20260727-001
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-27
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260727-001`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/main_scenario.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/scripts/prologue_ingame_script.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`
- 적용된 창작 제안: 없음

#### Context

프롤로그의 상위 시나리오는 사건 구분을 Phase 1~4로, 인게임 스크립트는
`SCENE_PROLOGUE_PHASE_*`와 `P01-S01` 계열 ID로 관리해 Scene 구현 단위와
용어가 일치하지 않았다. 사용자는 큰 서사 단위 아래 구분을 Scene으로
통일하고 분기 결과를 Scene 2A·2B·2C로 나누도록 요청했다.

#### Decision

프롤로그를 Scene 1·2A·2B·2C·3·4로 재구성하고, Scene 1의 line·choice·
outcome ID를 `S01` 기준으로 통일한다. 메인 시나리오, 인게임 스크립트,
게임 개요, 기술 ID 규칙, 프로젝트 색인과 향후 시나리오 작성 지침을 같은
원자적 변경으로 적용한다. 작업 workflow와 전투·시스템 단계의 `Phase`는
유지한다.

#### Rationale

`scenario_designer`와 `scenario_writer`가 기존 사건·대사·선택·Outcome·상태를
보존한 Draft를 작성했고 `scenario_reviewer`가 필수 수정 해소 후 `pass`로
판정했다. 적용 전 12개 대상의 원본 해시가 승인안과 일치했으며, 사용자가
기존 ID를 사용하는 실제 registry·참조·세이브 데이터가 없다고 확인해
ID migration 의존성도 해소됐다.

#### Follow-up

- 후속 작업: Scene 2A·2B·2C·3·4의 플레이어 노출 대본과 실제 Scene 데이터는 별도 승인 범위에서 작성한다.
- `provisional` 검증·재조정: 없음

---

### Decision: 요괴 후보 목록 문서 생성 승인

#### Metadata

- ID: DEC-20260721-002
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-21
- 결정자: 사용자
- 상태: approved
- 관련 승인 큐: `APPR-20260721-001`
- 관련 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/content/yokai_candidates.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/README.md`

#### Context

확정 시스템은 탐험에서 요괴 사건이 발생한다고 정하지만 개별 요괴 후보와
설명을 계속 축적할 독립 콘텐츠 문서는 없었다. 최초 후보 네 종은 임시
아이디어에만 기록되어 있었다.

#### Decision

`요괴 후보 목록`을 신규 콘텐츠 문서로 생성해 `백귀야행`,
`불가살(중국 설화의 맥)`, `두억시니+이매망량`, `그슨대`를 최초 후보로
등록한다. 아직 제공되지 않은 설명과 조우 정보는 `TBD`로 유지하고 게임 개요와
문서 색인에서 새 문서를 연결한다.

#### Rationale

사용자가 `APPR-20260721-001`을 승인했다. 적용 전 재확인에서 게임 개요와 문서
색인의 SHA-256이 승인안 작성 당시 값과 일치했고 같은 제목·역할의 확정 문서도
존재하지 않았다. 후보 목록을 별도 콘텐츠 문서로 두면 새 요괴와 설명을 같은
구조로 축적하면서 실제 채택 여부를 구분할 수 있다.

#### Follow-up

- 후속 작업: 사용자가 새 요괴나 설명을 제공할 때 후보별 항목을 갱신하고,
  실제 조우로 채택할 후보는 권역·노드, 십이지신, 판정·전투와 보상을 별도
  승인 범위에서 구체화한다.

---

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
