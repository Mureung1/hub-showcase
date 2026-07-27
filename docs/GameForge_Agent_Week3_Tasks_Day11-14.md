# GameForge Agent — 3주차 작업 세분화 (Day 11~14)

> Day 10까지 완성된 건 "Planning Agent 하나로 로그인→분석→채팅→문서 승인까지" 한 바퀴 도는 데모였다. 이번 Day 11~14는 그 하나짜리 루프를 **9단계 전체로 확장하고, 로컬 상태 전환에 그쳤던 Approve를 실제 GitHub 커밋으로 완성**하는 게 목표다.
> `docs/GameForge_Agent_Week2_Tasks_Day7-10.md`와 같은 형식으로, 하루 작업이 반나절을 넘지 않도록 세분화했다.

---

## Day 11 — 문서형 Agent 5종 확장 (1, 3, 4, 5, 6, 9단계)

> Requirements / System Design / Architecture / ScriptableObject / Documentation Agent. Planning Agent(2단계)에서 이미 만든 채팅→문서생성→편집→승인 인프라를 그대로 재사용하고, Agent별로 다른 건 system prompt뿐이어야 한다.

### 백엔드
- Agent별 system prompt를 하드코딩하지 않고 `Step.agent_name` 기준으로 프롬프트를 조회하는 구조로 리팩터링 (현재 Planning Agent만 있어서 하드코딩되어 있었을 가능성 있음 — 먼저 확인)
- 5개 Agent의 system prompt 작성:
  - Requirements Agent — 사용자 아이디어를 요구사항 체크리스트로 구체화
  - System Design Agent — 2단계 기획 문서를 입력받아 시스템 동작 규칙 정의 (WHAT→HOW 전환, 기획서 5절 원칙 반영)
  - Architecture Agent — 클래스 설계(UML) + 프로젝트 구조 설계 두 문서를 순차 생성
  - (ScriptableObject 설계 Agent) — 클래스 설계 문서 기반으로 데이터 에셋 구조 제안
  - Documentation Agent — 1~8단계 산출물을 종합해 최종 문서(요구사항 명세서/게임 기획서/시스템 설계서) 정리
- 각 Agent는 "이전 단계 문서 전체 + 현재까지의 대화 이력"을 입력으로 받는 동일한 인터페이스를 따르는지 확인

### 프론트엔드
- Step 전환 시 사이드바에서 다음 Agent 이름/뱃지가 자동으로 올바르게 표시되는지 확인 (하드코딩된 "Planning Agent" 문자열이 남아있다면 제거)

**Day 11 완료 기준**: 1, 3, 4, 5, 6, 9단계 각각을 클릭했을 때 해당 Agent와 채팅이 시작되고, 몇 차례 대화 후 그 단계에 맞는 Markdown 문서가 자동 생성된다.

---

## Day 12 — 코드 생성 / 리팩토링 Agent + 파일 단위 구조화 출력

> 7~8단계는 문서 하나가 아니라 **여러 파일**이 나와야 하므로, 다른 Agent와 출력 형식 자체가 다르다.

### Code Generation Agent (7단계)
- 입력: 클래스 설계, 프로젝트 구조 설계, ScriptableObject 설계 문서 3개
- 출력을 자유 텍스트가 아니라 **구조화된 JSON 배열**로 강제:
  `[{ path, changeType: "new", diff, suggestedCommitMessage }]`
- 프롬프트에 "파일별로 분리해서 응답하라"는 지시와 함께, 응답을 파싱 가능한 형식(JSON)으로 강제하는 방법 확정 (예: 함수 호출/구조화 출력 기능이 있다면 활용, 없다면 파싱 실패 시 재시도 로직 추가)

### Refactoring Agent (8단계)
- 입력: Day 6~7에서 만든 분석 리포트(God Class 목록, 중복 코드 블록) + 7단계에서 생성된 코드
- 동일한 구조화 JSON 포맷으로 리팩토링 제안 출력 (`changeType: "modified" | "deleted"` 포함)

### 백엔드
- `GET /api/steps/{id}/file-changes` 구현 — 위 구조화 데이터 저장(`documents/{step_id}.json`에 준하는 구조, 혹은 별도 `file-changes/{step_id}.json`) 및 조회
- 7~8단계의 `progress_pct` 계산 방식을 "승인된 파일 수 / 전체 제안 파일 수"로 분기 처리 (제작계획 4.6절 설계 그대로)

**Day 12 완료 기준**: 7단계에 진입해 Code Generation Agent와 대화하면, 파일 경로/변경 유형/diff/커밋 메시지가 담긴 구조화된 응답이 실제로 생성되고 API로 조회된다.

---

## Day 13 — 커밋 리뷰 화면 실연동 + 실제 GitHub 커밋

> 지금까지 Approve는 로컬 JSON 상태 전환까지만 했다. 이 날 실제 커밋이 나가도록 완성한다.

### 프론트엔드 — 커밋 리뷰 화면 (프로토타입의 mock을 실제 데이터로 교체)
- `FileChangeList` — Day 12의 `GET /api/steps/{id}/file-changes` 결과로 렌더링
- `DiffViewer` — 실제 diff 텍스트 표시
- 체크박스 선택 상태에 따라 "선택된 N개 파일 → N개의 커밋" 카운트 실시간 갱신 (프로토타입 로직 그대로 이식)
- 커밋 메시지 인라인 편집 반영

### 백엔드 — 실제 GitHub 커밋 연동
- `POST /api/repo/{id}/commit-batch` 구현 — 선택된 파일들을 **파일 단위로 순차 커밋** (GitHub Contents API: 파일 생성/수정은 `PUT /repos/{owner}/{repo}/contents/{path}`, 삭제는 `DELETE`)
- OAuth 세션의 access token으로 인증
- 체크 해제되어 이번에 커밋되지 않은 파일은 `pending_changes` 상태로 남아 다음 라운드에 다시 노출
- 문서형 Agent(1~6, 9단계)의 Approve도 이제 로컬 상태 전환에 그치지 않고 **실제로 `docs/{path}` 커밋까지 연결** (Day 10까지 미뤄뒀던 부분)

**Day 13 완료 기준**: 코드 생성 단계에서 커밋 리뷰 화면의 파일을 선택하고 "선택 항목 커밋"을 누르면, 실제 GitHub 저장소에 파일 단위로 여러 커밋이 생성된다. 문서 단계 Approve도 실제 저장소에 `docs/` 파일로 커밋된다.

---

## Day 14 — 전체 E2E 통합 + 최소 에러 처리 마무리

### 통합 점검
- 로그인 → 저장소/Branch 선택 → 분석 → 리포트 Approve → 1~9단계 전체(문서형 6개 Agent + 코드생성/리팩토링 커밋리뷰 + 문서화)를 처음부터 끝까지 수동으로 시연
- 각 Step 전환이 끊기지 않고 이어지는지, 사이드바 진행률이 정확히 갱신되는지 확인

### 최소 에러 처리 보강
- 채팅 API 실패, 파일 커밋 실패 시 사용자에게 보이는 최소한의 에러 메시지 추가 (Day 6에서 분석 실패에 적용했던 것과 같은 수준 — 정교한 분기까지는 아님)
- 구조화 JSON 파싱 실패(Day 12) 시 재시도 또는 사용자 안내 메시지

### 정리
- 코드 전체에 최소한의 주석, README에 지금까지 구현된 기능 범위 업데이트
- `docs/GameForge_Agent.md`, `docs/GameForge_Agent_Dev_Plan.md`의 "이번 계획에서 제외한 것" 목록을 실제 구현 현황에 맞게 갱신 (커밋 리뷰 화면, 실제 GitHub 커밋 연동은 이제 제외 목록에서 빠져야 함)

**Day 14 완료 기준 (= 기능 구현 완성 체크리스트)**: 로그인부터 9단계 전체 승인 및 실제 GitHub 커밋까지, 새로고침 없이 한 번에 시연 가능하다. 저장소에 실제로 문서·코드 커밋 히스토리가 남아있다.

---

## 이번 스프린트(Day 11~14)에서도 아직 하지 않는 것

- Feature Expansion Workflow (기존 프로젝트에 새 기능 추가, 기획서 11번) — 9단계 워크플로우 자체가 완성된 이후의 다음 사이클
- 자동 테스트 스위트 — 수동 확인으로 계속 대체
- 스트리밍 응답(SSE) — 단발 요청/응답 유지
- 정교한 에러 분기 (재시도 정책, 세분화된 에러 코드별 UI) — 최소 수준만
- 다중 사용자 지원 — 1인 사용 기준 설계 유지
