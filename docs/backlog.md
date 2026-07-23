# 백로그 (Task 구현 순서·선행조건·상태)

남은 개발(Feat-2 잔여 ~ Feat-5)을 구현 단위(T01~T12)로 나눈 것. 각 Task는 선행조건이 `완료`일 때만 착수한다. 상태는 `대기` | `진행중` | `완료` | `BLOCKED(사유)`.

작업 절차는 [instructions.md](instructions.md)를 따른다. 완료조건은 [checklist.md](checklist.md)의 C 섹션, 계약은 [skills.md](skills.md)의 S 섹션에 있다.

## 상태 한눈에

| Task | 내용 | Feat | 선행 | 완료조건 | 계약 | 상태 |
|---|---|---|---|---|---|---|
| T01 | Notion 연동 기반 (토큰·DB 연결, `lib/notion.js`) | 2 | — | C01 | S3 | 대기 |
| T02 | Brain Dump 스키마에 `category` 추가 + Notion 저장 | 2 | T01 | C02 | S1, S3 | 대기 |
| T03 | One-Focus View를 실제 마이크로스텝 순회로 연결 | 3 | T02 | C03 | — | 대기 |
| T04 | Full Screen Timer 지속성 (새로고침 내구성) | 3 | T03 | C04 | — | 대기 |
| T05 | AgentLog Notion DB 생성 + 기록/조회 `lib` | 4 | T01 | C05 | S3 | 대기 |
| T06 | "힘들어" 루프 API route (tool 판단·reason·cold start) | 4 | T05 | C06 | S2 | 대기 |
| T07 | 거절→재판단 시간 게이트 | 4 | T06 | C07 | S2 | 대기 |
| T08 | 이유 칩 + 제안/수락/거절 UI | 4 | T06 | C08 | S2 | 대기 |
| T09 | outcome 기록 (완료 즉시 + 다음 방문 일괄) | 4 | T05, T08 | C09 | S4 | 대기 |
| T10 | 개인화 (최근 로그를 판단 프롬프트에 주입) | 4 | T06, T09 | C10 | S2, S3 | 대기 |
| T11 | Agent 평가 — 정답 세트 + Precision/Recall 스크립트 | 5 | T10 | C11 | S5 | 대기 |
| T12 | 화면 디자인을 기획 화면 흐름에 맞게 보완 (물 차오르는 타이머 포함) | 3 | — | C12 | — | 완료 |

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
- 지금 하드코딩 `task` 대신 저장된 마이크로스텝을 순서대로 순회, 완료 시 다음 스텝으로.
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
