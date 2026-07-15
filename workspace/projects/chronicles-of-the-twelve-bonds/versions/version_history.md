# Version History

확정 문서에 실제로 반영된 변경을 기록한다.

- 프로젝트 ID: `chronicles-of-the-twelve-bonds`

## Entries

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
