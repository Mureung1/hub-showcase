# 백로그 (Task 구현 순서·선행조건·상태)

남은 개발(Feat-2 잔여 ~ Feat-5)을 구현 단위(T01~T19)로 나눈 것. 각 Task는 선행조건이 `완료`일 때만 착수한다. 상태는 `대기` | `진행중` | `완료` | `BLOCKED(사유)`.

작업 절차는 [instructions.md](instructions.md)를 따른다. 완료조건은 [checklist.md](checklist.md)의 C 섹션, 계약은 [skills.md](skills.md)의 S 섹션에 있다.

## 상태 한눈에

| Task | 내용 | Feat | 선행 | 완료조건 | 계약 | 상태 |
|---|---|---|---|---|---|---|
| T01 | Notion 연동 기반 (토큰·DB 연결, `lib/notion.js`) | 2 | — | C01 | S3 | 완료 |
| T02 | Brain Dump 스키마에 `category` 추가 + Notion 저장 | 2 | T01 | C02 | S1, S3 | 완료 |
| T03 | One-Focus View를 실제 마이크로스텝 순회로 연결 | 3 | T02 | C03 | — | 완료 |
| T04 | Full Screen Timer 지속성 (새로고침 내구성) | 3 | T03 | C04 | — | 대기 |
| T05 | AgentLog Notion DB 생성 + 기록/조회 `lib` | 4 | T01 | C05 | S3 | 완료 |
| T06 | "힘들어" 루프 API route (tool 판단·reason·cold start) | 4 | T05 | C06 | S2 | 완료 |
| T07 | 거절→재판단 시간 게이트 | 4 | T06 | C07 | S2 | 완료 |
| T08 | 이유 칩 + 제안/수락/거절 UI | 4 | T06 | C08 | S2 | 대기 |
| T09 | outcome 기록 (완료 즉시 + 다음 방문 일괄) | 4 | T05, T08 | C09 | S4 | 대기 |
| T10 | 개인화 (최근 로그를 판단 프롬프트에 주입) | 4 | T06, T09 | C10 | S2, S3 | 대기 |
| T11 | Agent 평가 — 정답 세트 + Precision/Recall 스크립트 | 5 | T10 | C11 | S5 | 대기 |
| T12 | 화면 디자인을 기획 화면 흐름에 맞게 보완 (물 차오르는 타이머 포함) | 3 | — | C12 | — | 완료 |
| T13 | Solar 외 모델(GPT-4o-mini/Claude Haiku/Gemini Flash) 성능 비교·결정 | 2 | — | C13 | S1 | 대기 |
| T14 | Brain Dump 일정 확인 멀티턴 (기한 미정 항목 최대 2턴 질문 후 확정) | 2 | T02 | C14 | S1 | 대기 |
| T15 | 타이머 종료 시 완료 확인 + Agent 판단 연장 | 3 | T04 | C15 | S6 | 대기 |
| T16 | Brain Dump 음성 입력 | 2 | — | C16 | — | 대기 |
| T17 | 마이크로스텝 검토·삭제 화면 | 3 | T02 | C17 | — | 대기 |
| T18 | Zero-Input 온보딩 화면 | 2 | T01 | C18 | — | 대기 |
| T19 | 오늘 마감까지 남은 시간 표시 + 연장 버튼 (이슈 #41) | 4 | T03 | C19 | — | 대기 |

## Task 상세

### T01 — Notion 연동 기반
- Zero-Input 온보딩(템플릿 복사 → 토큰/DB ID 붙여넣기) 경로 확보, `app/lib/notion.js`에 Notion 클라이언트와 공통 read/write 헬퍼.
- 선행: 없음. 사용자 준비물(Notion 토큰·DB ID)은 [prerequisites.md](prerequisites.md) 참고.
- 종료: C01 전부 통과.

### T02 — Brain Dump category 확장 + 저장
- `brainDumpSchema`에 `category`(고정 셋 7개, `z.enum`) 추가. 분할 결과를 Notion에 저장.
- 선행: T01.
- 종료: C02. 계약 S1(분할 I/O)·S3(저장).

### T03 — One-Focus View 실데이터 연결
- 지금 하드코딩 `task` 대신 저장된 마이크로스텝을 순서대로 순회, 완료 시 다음 스텝으로. 노션에서 읽어올 때 `scheduledDate`가 오늘(또는 그 이전)인 스텝만 필터링(`postpone_task`로 미뤄진 스텝은 오늘 목록에 다시 안 보임).
- Notion Steps DB에 `Done`(체크박스) 속성 추가. 완료 시 `Done=true`로 갱신해서 영구적으로 남긴다(지금까지 설계엔 완료를 Notion에 기록할 방법이 없었음).
- 알려진 제약(T01에서 발견): `app/lib/notion.js`의 `queryDatabase()`는 Notion 페이지네이션(응답 1건당 최대 100행)을 처리하지 않는다. 하루 마이크로스텝이 100개를 넘을 일은 없지만, 여러 날짜를 누적 조회하게 되면 `has_more`/`next_cursor` 처리가 필요할 수 있다.
- 선행: T02.
- 종료: C03.

### T04 — Timer 지속성
- `FocusTimer`의 `startedAt`이 새로고침 시 사라지는 문제 해결(localStorage 또는 URL). `agent-design.md`·`component-tree.md`에 적힌 known issue.
- 선행: T03.
- 종료: C04.

### T05 — AgentLog DB + 기록 lib
- `agent-design.md`의 AgentLog flat DB(Select/Text/Checkbox) 생성, 기록/최근 N개 조회 헬퍼.
- 선행: T01.
- 종료: C05. 계약 S3.

### T06 — "힘들어" 루프 API route
- reason_chip + 현재 스텝 + 남은 스텝 + 최근 로그를 받아 tool 하나와 reason을 판단·반환. cold start prior 프롬프트 포함.
- 선행: T05.
- 종료: C06. 계약 S2.

### T07 — 거절→재판단 시간 게이트
- `remainingTimeToday > remainingWorkload`일 때만 재제안 허용, 아니면 마지막 제안 확정 또는 `postpone_task`/`end_session` 수렴.
- 선행: T06.
- 종료: C07. 계약 S2.

### T08 — 이유 칩 + 수락/거절 UI
- `onStruggle`을 고정 `RestSuggestion` 대신 이유 칩 → 제안 카드(reason 노출) → 수락/거절 플로우로 교체.
- 선행: T06.
- 종료: C08.

### T09 — outcome 기록
- 완료 도달 시 해당 pending 로그를 `done`으로, 다음 방문 시 이전 날짜 pending을 일괄 `not_done`으로.
- 선행: T05, T08.
- 종료: C09. 계약 S4.

### T10 — 개인화
- 판단 호출 시 최근 로그(전체 + 같은 category)를 프롬프트에 주입, 반복 거절 tool/category를 피하도록.
- Notion Steps DB에 `ActualMinutes`·`StartedAt`·`CompletedAt`·`PostponeCount` 속성 추가, 스텝 진행에 따라 채워서 행동 패턴(예상 대비 실제 소요 시간, 미룬 횟수 등)을 판단 프롬프트에 참고 정보로 포함.
- 선행: T06, T09.
- 종료: C10. 계약 S2·S3.

### T11 — Agent 평가
- "이 상황이면 개입했어야 한다" 정답 세트 작성 + AgentLog 기반 Precision/Recall 계산 스크립트.
- 선행: T10.
- 종료: C11. 계약 S5.

### T12 — 화면 디자인 보완
- 타이머 화면에 물이 차오르는 시각 효과 추가, 화면 색감·구성요소를 원래 화면 흐름(`docs/images/screen-flow.png`) 디자인에 맞춰 보완.
- 선행: 없음.
- 종료: C12.

### T13 — 모델 비교·결정
- Solar(Upstage) 외 GPT-4o-mini/Claude Haiku/Gemini Flash로 동일 입력을 분할해보고 한국어 품질·estimatedMinutes 합리성을 비교, 어떤 모델을 쓸지 결정.
- 선행: 없음. 단 **T06(힘들어 루프 판단 API) 착수 전에 끝내는 것을 권장** — S2도 같은 모델을 쓰게 되므로 판단 품질에 더 민감함. 표 순서(맨 아래)는 Task 생성 순서일 뿐 실행 순서 아님.
- 종료: C13. 계약 S1.

### T14 — Brain Dump 일정 확인 멀티턴
- 사용자가 입력한 할 일에 기한이 없으면, 최대 2턴까지 되물어서(예: "이거 언제까지 하면 돼?") `scheduledDate`나 우선순위를 확정한다. 3턴 이상 넘어가면 피로도가 올라가므로 질문 횟수를 2번으로 제한한다.
- 선행: T02(Brain Dump 저장), scheduledDate 필드 설계(완료, `docs/skills.md` S1).
- 종료: C14. 계약 S1(확장).

### T15 — 타이머 종료 시 완료 확인 + Agent 판단 연장
- `FocusTimer`가 0이 되면 "이 스텝 다 끝났어?" 확인 화면을 보여준다. "아니오"면 Agent(Solar)가 현재 스텝 정보(원래 예상 시간, 이미 연장한 횟수 등)를 보고 몇 분 더 줄지 직접 판단해서 반환하고, 그 시간만큼 타이머를 재시작한다. `suggest_break`과 같은 패턴(고정 계단이 아니라 모델이 상황을 보고 분 단위를 직접 정함).
- `docs/etc/agent-design.md`(Feat-4 동결 설계)는 건드리지 않는다. 타이머 종료는 "힘들어" 버튼과 트리거가 다르므로 S2를 재사용하지 않고 별도 계약(S6)으로 분리한다.
- 선행: T04(Full Screen Timer 지속성).
- 종료: C15. 계약 S6.

### T16 — Brain Dump 음성 입력
- 입력창에 마이크 버튼을 추가해서, 타이핑 대신 음성으로 말하면 텍스트로 변환되어 입력창에 채워지게 한다. 캐릭터가 음성으로 답할 필요는 없음(입력 방식만 음성 추가, 출력은 그대로 텍스트/화면).
- 선행: 없음.
- 종료: C16.

### T17 — 마이크로스텝 검토·삭제 화면
- Brain Dump로 쪼갠 결과를 바로 저장하지 않고, 전체 목록을 보여주고 필요 없는 항목은 삭제할 수 있는 화면을 추가한다. 각 항목에 카테고리 태그와 전체 예상 시간 합계를 표시하고, "전부 다시 쪼개기" 버튼도 넣는다. 사용자가 확정한 목록만 그 시점에 Notion에 저장하도록 저장 시점을 뒤로 미룬다(구조 변경). CompleteScreen도 마지막 항목 텍스트 대신 전체 완료 개수를 보여주도록 함께 개선.
- 기존 디자인(`docs/prototype/`) 기반으로 HTML 프로토타입 먼저 만들고 화면 작업.
- 선행: T02.
- 종료: C17.

### T18 — Zero-Input 온보딩 화면
- 노션 템플릿을 "웹에 공유 + 복제 허용"으로 공개하고, 앱 안에 "템플릿 복제 → 토큰/DB ID 붙여넣기" 순서를 안내하는 온보딩 화면을 추가한다.
- 기존 디자인 기반으로 HTML 프로토타입 먼저 만들고 화면 작업.
- 선행: T01.
- 종료: C18.

### T19 — 오늘 마감까지 남은 시간 표시 + 연장 버튼
- One-Focus View(또는 타이머 화면)에 "오늘 마감(자정)까지 남은 시간"을 현재 시각과 함께 보여주고, 옆에 간단한 연장 버튼을 둬서 누르면 마감 시각이 뒤로 밀리게 한다. T07의 `remainingTimeMinutes`가 "자정 고정"이라는 가정의 한계를 사용자가 직접 보완할 수 있게 하는 목적.
- 순수 화면/클라이언트 상태 작업이라 별도 S 계약은 생략.
- 선행: T03(화면이 있어야 붙일 수 있음).
- 종료: C19.
