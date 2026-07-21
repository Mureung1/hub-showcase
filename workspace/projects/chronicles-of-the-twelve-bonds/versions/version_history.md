# Version History

확정 문서에 실제로 반영된 변경을 기록한다.

- 프로젝트 ID: `chronicles-of-the-twelve-bonds`

## Entries

### Version Entry: 프롤로그 Phase 1 인게임 스크립트 적용

#### Metadata

- ID: VER-20260721-001
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-21 01:05 KST
- 적용자: Codex
- 변경 타입: restructure
- 대상 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/scripts/prologue_ingame_script.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/main_scenario.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/README.md`
- 관련 승인 큐: `APPR-20260720-001`
- 관련 결정 로그: `DEC-20260721-001`

#### Before

메인 시나리오가 프롤로그 Phase 1의 신당 진입, 흑의인의 봉인 파괴 의식과
저지·관망·도주의 세 선택지를 소유했다. 플레이어 노출 문장, 내부 씬·선택·
Outcome 연결과 제작 메모를 함께 관리하는 확정 인게임 스크립트는 없었다.

#### After

`prologue_ingame_script.md`를 생성해 Phase 1의 남녀 오프닝 변형, 공통 지문,
세 선택지, 분기 Outcome, 저지 시도 상태 플래그, 정보 공개, 제작·QA 요구를
한 씬 명세로 확정했다. 메인 시나리오, 게임 개요와 문서 색인에 새 canonical
경로를 연결했다.

#### Notes

- 주의 사항: 원본에 없던 플레이어 문장, 내부 ID, 상태 표현과 연출 지시는
  창작 각주 6개로 공개했다. `scene_type`, 실제 레지스트리·에셋 ID, Phase 2~4와
  혼돈 전투 대본은 `TBD` 또는 범위 외로 남아 있다.

---

### Version Entry: 게임 개요·세계관·시나리오·시스템 문서 역할 분리

#### Metadata

- ID: VER-20260716-004
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-16 23:51 KST
- 적용자: Codex
- 변경 타입: restructure
- 대상 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/world/world_setting.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/narrative/main_scenario.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/systems/core_gameplay_systems.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/README.md`
- 관련 승인 큐: `APPR-20260716-004`
- 관련 결정 로그: `DEC-20260716-005`

#### Before

`game_design_overview.md`가 게임 개요, 주인공·세계관, 초반 Phase, 사흉 추적과
엔딩, 지도·탐험·성장·판정·전투 상세와 플레이 시간까지 함께 소유했다.
`design/README.md`에는 확정 문서 목록과 이동 링크가 없었다.

#### After

`game_design_overview.md`를 게임 정체성, 디자인 원칙, 상위 루프, 거시 진행,
목표 범위와 Document Map 중심의 `game_overview`로 재구성했다. 세계관 정사는
`world_setting.md`, 사건 흐름과 엔딩은 `main_scenario.md`, 지도·탐험·성장·
판정·전투·카르마·정보 규칙은 `core_gameplay_systems.md`로 분리했다.
개요서, 세 상세 문서와 `design/README.md`에 상호 이동 가능한 상대경로 링크를
추가했다.

#### Notes

- 주의 사항: 재구성 전 개요서의 확정 사실과 TBD를 역할별로 이관했으며 새
  설정이나 수치를 추가하지 않았다. 기존 플레이 UI와 AI GM 기술 문서는 각
  역할의 canonical document로 유지했다.

---

### Version Entry: 장면 입력 모드·중요 선택 UI 확장

#### Metadata

- ID: VER-20260716-003
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-16 04:06 KST
- 적용자: Codex
- 변경 타입: update
- 대상 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/gameplay_ui.md`, `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`
- 관련 승인 큐: `APPR-20260716-003`
- 관련 결정 로그: `DEC-20260716-004`

#### Before

UI 문서는 `choice_only`, `choice_and_text` 상태의 하단 입력 영역만 설명했고 일반 선택 목업 하나만 표시했다. 기술 문서의 `input_mode`도 두 값만 허용했으며 중요 선택 표시 설정과 고정 계속 입력 규칙이 없었다.

#### After

`narrative_only`, `choice_only`, `text_only`, `choice_and_text` 네 가지 입력 모드와 `choice_presentation: standard | emphasis`를 UI·기술 문서에 반영했다. `narrative_only`의 `continue_outcome_id`, 자연어 모드의 의도 분석 호출, 선택지 개수·입력 조합 검증과 중요 선택의 중앙 강조 규칙을 추가했다. 서술 전용, 일반 선택, 자연어 전용, 복합 입력과 중요 선택 목업을 UI 문서에 인라인으로 표시했다.

#### Notes

- 주의 사항: 목업 5종은 `1672×941` 검토용 이미지며 최종 아트·폰트·색상을 확정하지 않는다. 승인 검토용 사본은 이력으로 보존했다.

---

### Version Entry: 플레이 UI 문서·예시 이미지 명칭 정정

#### Metadata

- ID: VER-20260716-002
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-16 03:22 KST
- 적용자: Codex
- 변경 타입: update
- 대상 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/gameplay_ui.md`
- 관련 승인 큐: `APPR-20260716-002`
- 관련 결정 로그: `DEC-20260716-003`

#### Before

UI 문서와 확정 목업 파일이 각각 `visual_novel_ui.md`, `visual_novel_ui_mockup_1920x1080_v1.png`라는 이름을 사용했다. 문서는 목업의 확정 경로만 제공했고 이미지를 직접 표시하지 않았다.

#### After

UI 문서와 확정 목업을 `gameplay_ui.md`, `gameplay_ui_mockup_1920x1080_v1.png`로 정정했다. 문서 제목을 `플레이 UI 기획서`, 화면 섹션을 `장면 진행 화면`으로 정정하고 확정 목업을 `예시 목업` 섹션에 인라인으로 표시했다. 프로젝트 브리프, 전체 게임 기획서, AI GM 런타임 규칙과 임시 아이디어의 활성 참조도 새 경로로 갱신했다.

#### Notes

- 주의 사항: 확정 목업의 실제 크기는 `1672×941`이며 이번 변경에서 리샘플링하지 않았다. `approvals/assets/visual_novel_ui_mockup_1920x1080_v1.png`는 기존 승인 이력으로 보존했다.

---

### Version Entry: 게임마스터 다중 에이전트 흐름 추가

#### Metadata

- ID: VER-20260716-001
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-16 02:07 KST
- 적용자: Codex
- 변경 타입: update
- 대상 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`
- 관련 승인 큐: `APPR-20260716-001`
- 관련 결정 로그: `DEC-20260716-001`

#### Before

Unity가 게임 상태와 규칙의 단일 기준이고 AI GM이 묘사, 대사, 자연어 반응과 일러스트 ID를 생성하는 책임 경계만 확정되었다. 자연어 의도, 오래된 세션 기억과 중요 장면 서술을 분리해 처리하는 내부 에이전트 흐름은 없었다.

#### After

대표 GM, 의도 분석가, 기억 검색가와 선택형 서술가의 책임·호출 조건·턴 처리 순서를 확정했다. `IntentAnalysis`, `MemoryRecall`, `NarrativeDraft`, `ACTION_`, `SessionEvent`, `SceneMemory`, `narrative_tier`와 안전 대체 규칙, 개발 로그 및 응답 시간 목표를 기술 문서에 반영했다.

#### Notes

- 주의 사항: 실제 AI 공급자·모델·요청 제한, 네트워크 장애 정책, 세이브 직렬화와 버전 마이그레이션은 TBD다.

---

### Version Entry: 비주얼 노벨 UI 기획서 생성

#### Metadata

- ID: VER-20260715-001
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-15 01:22 KST
- 적용자: Codex
- 변경 타입: create
- 대상 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/ui/visual_novel_ui.md`
- 관련 승인 큐: `APPR-20260715-001`
- 관련 결정 로그: `DEC-20260715-001`

#### Before

동일 제목이나 역할의 확정 문서가 없었다. UI 관련 결정은 `IDEA-20260714-001`과 승인 큐 초안에만 존재했다.

#### After

1920×1080 비주얼 노벨 장면, 지도, 로그·보조 메뉴, 일러스트 ID 표시와 오류·게임 오버 UI 규칙을 확정 문서로 생성하고 예시 목업을 `workspace/projects/chronicles-of-the-twelve-bonds/design/assets/visual_novel_ui_mockup_1920x1080_v1.png`에 반영했다.

#### Notes

- 주의 사항: 월드맵 디자인, 실제 폰트·색상·안전 영역과 로그 세부 형식은 TBD다.

---

### Version Entry: AI GM 런타임 및 데이터 연동 규칙 생성

#### Metadata

- ID: VER-20260715-002
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-15 01:22 KST
- 적용자: Codex
- 변경 타입: create
- 대상 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/technical/ai_gm_runtime_rules.md`
- 관련 승인 큐: `APPR-20260715-002`
- 관련 결정 로그: `DEC-20260715-002`

#### Before

동일 제목이나 역할의 확정 문서가 없었다. 개발 연동 규칙은 `IDEA-20260714-001`과 승인 큐 초안에 함께 섞여 있었다.

#### After

Unity, AI GM, RAG와 세션 상태의 책임, AI 문맥 우선순위, 응답 JSON, 검증·재시도, 일러스트 ID, 노드·씬·RAG 데이터, 저장·복원, 자연어 예외 처리와 공통 ID 규칙을 별도 확정 문서로 생성했다.

#### Notes

- 주의 사항: AI 공급자·모델·호출 정책, 네트워크 오류, 세이브 직렬화와 전투·판정 세부 계산은 TBD다.

---

### Version Entry: 전체 게임 기획서 생성

#### Metadata

- ID: VER-20260715-003
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-15 01:35 KST
- 적용자: Codex
- 변경 타입: create
- 대상 문서: `workspace/projects/chronicles-of-the-twelve-bonds/design/game/game_design_overview.md`
- 관련 승인 큐: `APPR-20260715-003`
- 관련 결정 로그: `DEC-20260715-003`

#### Before

UI와 AI GM 런타임 규칙만 확정 문서로 존재하고, 프로젝트 방향, 시나리오, 탐험·성장, 전투 1차안, 사흉 진행과 엔딩은 `IDEA-20260714-001`에 남아 있었다.

#### After

남아 있던 현재 기획 전체를 `전체 게임 기획서`로 생성했다. 기존 UI·기술 문서를 관련 문서로 연결하고 미정 사항은 Open Questions의 TBD로 보존했다.

#### Notes

- 주의 사항: 다음 콘텐츠 설계는 남부 권역, 궁기 단서·탐험 노드와 뱀·말·양 해금·강화 사건부터 시작한다.

---

### Version Entry: 십이인연록 프로젝트 경로 분리

#### Metadata

- ID: VER-20260715-004
- 프로젝트 ID: `chronicles-of-the-twelve-bonds`
- 날짜: 2026-07-15 01:47 KST
- 적용자: Codex
- 변경 타입: update
- 대상 문서: `workspace/projects/chronicles-of-the-twelve-bonds/` 프로젝트 문서 세트
- 관련 승인 큐: `APPR-20260715-004`
- 관련 결정 로그: `DEC-20260715-004`

#### Before

십이인연록 자료가 단일 프로젝트용 `workspace/design/`, `ideas/`, `approvals/`, `decisions/`, `versions/` 경로에 저장되어 있었다.

#### After

Project Brief, 기획서, 아이디어, 승인 기록, 결정 로그, 버전 기록과 에셋을 `workspace/projects/chronicles-of-the-twelve-bonds/` 아래로 이동했다. 프로젝트 레지스트리와 신규 프로젝트 독립 생성 규칙을 추가하고 모든 내부 경로를 갱신했다.

#### Notes

- 주의 사항: 영어 표시명은 `Chronicles of the Twelve Bonds`, 내부 슬러그는 `chronicles-of-the-twelve-bonds`를 사용한다.
