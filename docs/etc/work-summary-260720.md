# 작업 요약 — 2026-07-20 (팀원 공유용)

3주차 시작(260720) 세션에서 한 작업을 팀원이 한눈에 볼 수 있게 정리한 문서다. 크게 **① Brain Dump에 실제 LLM 연동**과 **② AI 협업 하네스(문서 시스템) 구축** 두 가지다.

---

## ① Brain Dump — 실제 LLM 연동 (Feat-2 진행)

지금까지 화면은 mock 데이터(하드코딩된 할 일 한 줄)로만 흐름이 연결돼 있었다. 이번에 실제로 **입력한 텍스트를 LLM이 마이크로 스텝으로 쪼개는** 부분을 붙였다.

- **AI 모델**: Solar (Upstage). OpenAI 호환 API라 `@ai-sdk/openai-compatible` provider로 연결. base URL `https://api.upstage.ai/v1`, 모델 `solar-pro2`.
- **추가한 패키지**: `ai`, `@ai-sdk/openai-compatible`, `zod` (버전은 `^` 없이 정확히 고정).
- **새 파일**
  - `app/lib/solar.js` — Solar provider 설정
  - `app/api/brain-dump/route.js` — 텍스트를 받아 `generateObject` + zod 스키마로 마이크로 스텝 배열을 반환하는 API
- **수정한 파일**
  - `app/page.js`, `app/components/BrainDumpInput.js` — 제출 시 실제 API 호출, 로딩("쪼개는 중...")·에러 상태 추가, 하드코딩 `task` 제거
- **아직 남은 것**: 실제 `UPSTAGE_API_KEY` 값 입력(개인 발급 필요), Notion 저장, `category` 필드 추가. (자세한 준비물은 [prerequisites.md](../prerequisites.md))

> ⚠️ 현재 "나 지금 힘들어" 버튼은 여전히 고정 화면으로 직행한다 — 진짜 Agent 루프(Feat-4)는 설계만 끝났고 구현 전이다.

---

## ② AI 협업 하네스 — 문서 시스템 구축

"Claude/GPT가 작업하고, 서로 검증하고, 진행 상태가 문서로 남는" 체계를 만들었다. 목적은 결과물만 보고 넘기지 않고 **누가 봐도 구조와 진행을 이해할 수 있게** 하는 것.

### 작업 지시·진행 관리

| 문서 | 역할 |
|---|---|
| [instructions.md](../instructions.md) | Agent 작업 절차서. 문서 지도 + 시작/종료 절차. 새 세션에서 `instructions.md 절차에 따라 T0X 진행해줘`로 지시 |
| [backlog.md](../backlog.md) | 남은 개발을 **T01~T11**로 상세 분해 (선행조건·상태 포함) |
| [checklist.md](../checklist.md) | **C01~C11** 검증 완료조건 (Task별 acceptance criteria). ※ 기존 일일 기록 `checklist.md`는 [daily-log.md](../daily-log.md)로 이름 변경됨 |
| [skills.md](../skills.md) | **S1~S5** 스킬 계약 (입력·출력·제약의 단일 진실 소스) |
| [prerequisites.md](../prerequisites.md) | 사용자가 준비할 API 키·Notion 토큰 등 |

### 설계 문서 (`docs/etc/`)

| 문서 | 내용 |
|---|---|
| [agent-design.md](agent-design.md) | "나 지금 힘들어" Agent 루프 설계(**동결**). tool 9개, 이유 칩, 거절→재판단 시간 게이트, AgentLog, 개인화 방식 |
| [component-tree.md](component-tree.md) | 현재 화면·컴포넌트 구조와 mock 지점 |
| [commit-rules.md](commit-rules.md) | 커밋 컨벤션·이슈 연동·커밋 분리·**upstream 금지** 규칙 |

### 상호 검증·보고 시스템 (`docs/report/`)

- [report_claude.md](../report/report_claude.md) (구현), [report_gpt.md](../report/report_gpt.md) (리뷰) — 둘 다 **append-only**. `cat >>`로만 추가하고 기존 내용은 고치지 않는다.
- [review.md](../report/review.md) — 교차 점검 절차. 리뷰어는 `- 확인: [ ]` 미체크 항목부터 점검하고, 그 한 줄만 `[x]`로 바꾼다.

### 규칙 문서 (저장소 루트)

- [AGENTS.md](../../AGENTS.md) — 모든 코딩 agent 공통 규칙 (기술 스택 고정, 진실 소스 우선순위, 검증·보고, 커밋·이슈).
- [CLAUDE.md](../../CLAUDE.md) — Claude Code 전용. AGENTS.md를 참조하고 현재 구현 상태·안전 원칙만 담음.

### 검증 하네스

- `scripts/verify.sh` + `npm run verify` = **lint + build**. 작업 시작/종료 시 돌려 baseline이 green인지 확인. 테스트가 생기면 이 스크립트에 단계 추가.
- 원칙: **문서에 적혀 있다는 이유로 체크리스트를 체크하지 않는다** — 실제 통과한 것만 체크.

---

## 커밋·협업 규칙 (팀원 필독)

[commit-rules.md](commit-rules.md)에 정리했다. 핵심:

1. **upstream(팀 원본 `connect-AIAgentChallenge-26-1/hub`) push 절대 금지.** push는 `origin`(개인 포크 `imjyong/hub`)으로만. 반드시 현재 위치 `team/hub`에서만 작업.
2. 커밋 형식: `<타입>: <요약> (#이슈번호)` (이모지 없음) — 예: `feat: Brain Dump 분할 API 연결 (#12)`
3. 이슈 먼저 등록 → 커밋에 번호 참조, 닫을 땐 `Closes #N`.
4. 파일 단위가 아니라 **기능 단위**로 커밋 분리.

---

## 다음 단계

[backlog.md](../backlog.md)의 **T01(Notion 연동)**부터. 새 세션에서 `docs/instructions.md 절차에 따라 T01 진행해줘`로 시작하면 이 하네스가 돌아간다.
