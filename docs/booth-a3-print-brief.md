# 부스 전시 A3 인쇄물 제작 브리프

이 문서는 부스 전시용 A3 인쇄 자료 2종을 다른 Codex 세션에서 이어서 제작하기 위한 구조화 브리프다.

목표는 복잡한 프로젝트 정보를 긴 글로 설명하지 않고, 방문자가 10초 안에 "무엇을 만들었는지"와 "AI Agent Workflow를 어떻게 썼는지" 이해하게 만드는 것이다.

## 제작 대상

| 파일 | 목적 | 추천 출력 |
|---|---|---|
| `booth-project-result-a3` | 기획 주제와 프로젝트 결과물 설명 | A3 landscape PDF/PNG |
| `booth-ai-agent-workflow-a3` | AI Agent Workflow와 하네스 구조 설명 | A3 landscape PDF/PNG |

추천 규격:

- 크기: A3 landscape, 420mm x 297mm
- 여백: 상하좌우 12~16mm
- 스타일: 흰색 배경, 파란색 포인트, XP pixel accent 소량
- 텍스트: 문장보다 짧은 label, chip, 흐름 화살표 중심
- QR/링크 영역: 데모 영상, GitHub PR, 실행 화면 중 1~2개만

## 공통 디자인 방향

- 제목은 크고 짧게 쓴다.
- 본문 설명은 카드 1개당 2줄 이내로 제한한다.
- 선과 화살표로 흐름을 보여준다.
- 실제 UI를 연상시키는 작은 XP window, taskbar, QuestRunner, Journal, Pixel TV 아이콘을 도형으로 표현한다.
- "AI가 다 했다"가 아니라 "사람이 방향을 정하고 Agent가 조사/계획/구현/검증을 반복했다"는 구조를 드러낸다.

색상 후보:

| 용도 | 색 |
|---|---|
| Primary blue | `#3357B8` |
| Light blue | `#E8F0FF` |
| Ink | `#0E2841` |
| Muted text | `#5B6472` |
| Divider | `#CFD2D9` |
| Success green | `#196B24` |

## A3 1: 기획 주제 설명 / 프로젝트 결과물

### 핵심 메시지

> "할 일 목록을 전자 생물 매니저와 함께 수행하는 퀘스트형 성장 경험으로 바꿨다."

### 추천 제목

전자 생물 AI 매니저

### 추천 부제

목표 관리가 게임처럼 이어지는 XP 데스크톱형 퀘스트 서비스

### 한 줄 설명

사용자는 프로필과 목표를 설정하고, 전자 생물 매니저가 제안한 오늘의 퀘스트를 수행한다. 완료하면 EXP와 기록이 쌓이고, 실패하면 이유를 남긴 뒤 더 작은 복구 퀘스트로 다시 이어간다.

### 시각 구조

추천 레이아웃: 3단 가로 흐름

```text
[문제]              [사용자 흐름]                         [결과/확장]
할 일 목록의 부담    매니저 선택 -> 프로필 -> 퀘스트          기록 노트
실패 후 단절        완료/실패 -> 복구 -> 성장                EXP/Stage
동기 유지 어려움     Pixel TV / Animation                    AI Manager
```

### 메인 다이어그램

가운데에 큰 flow를 둔다.

```text
프로필 설정
   ↓
오늘의 퀘스트
   ↓
QuestRunner.exe [RUN]
   ↓
완료 / 실패 이유
   ↓
복구 퀘스트
   ↓
기록 노트 + 매니저 성장
```

각 단계는 작은 XP 창 모양 카드로 표현한다. `QuestRunner.exe`에는 `[RUN]` 버튼을 넣는다.

### 카드 문구

문제 카드:

- 실패가 쌓이면 할 일 목록은 부담이 된다.
- 실패 이유와 회복 과정을 다음 행동으로 연결하기 어렵다.

해결 카드:

- 할 일을 오늘의 퀘스트로 쪼갠다.
- 실패를 삭제하지 않고 복구 데이터로 사용한다.
- 캐릭터 성장과 기록 보상으로 지속 사용 동기를 만든다.

결과 카드:

- React XP Desktop MVP
- Hono + Supabase Quest Event 저장/조회
- Canvas sprite animation
- Pixel TV / Projection prototype
- LLM Manager API fallback 구조

### 데모 장면 추천

작은 screenshot placeholder 3개:

1. XP desktop home
2. QuestRunner.exe + 기록 노트
3. Pixel TV 또는 매니저 animation

QR 영역:

- Demo video URL
- GitHub PR 또는 repository

### 참고 파일

- `showcase/showcase.json`
- `docs/product-plan.md`
- `docs/mvp-functional-spec.md`
- `docs/user-flow-wireframes.md`
- `docs/status.md`
- `src/App.tsx`
- `src/components/*`
- `src/hooks/useQuestFlow.ts`
- `src/layers/storage/questLogApi.ts`
- `server/routes/questEvents.ts`

## A3 2: AI Agent Workflow / 하네스 구조

### 핵심 메시지

> "기능 구현뿐 아니라, Agent가 요구사항 분석부터 검증과 문서화까지 반복할 수 있는 개발 workflow를 함께 설계했다."

### 추천 제목

AI Agent Workflow

### 추천 부제

사람 개발자와 Agent가 같은 문서, 같은 검증 기준으로 일하는 구조

### 한 줄 설명

요구사항은 `analyze-request`로 조사하고, `create-plan`으로 파일 범위와 검증 방법을 나눈 뒤, implementer가 승인된 범위만 수정한다. 구현 후 verifier가 typecheck, build, harness, 수동 시나리오를 분리해 점검하고, 결과는 status/tasks/wiki/learning 문서에 축적한다.

### 메인 다이어그램

가운데에 큰 순환 구조를 둔다.

```text
User Goal
   ↓
analyze-request
   ↓
create-plan
   ↓
implementer
   ↓
verifier
   ↓
learning / wiki / status
   ↺
next task
```

각 노드 옆에는 실제 산출물을 작게 붙인다.

| 단계 | 산출물 |
|---|---|
| analyze-request | Done/Partial/Todo 감사 |
| create-plan | 수정 파일, 건드리지 않을 파일, 검증 방법 |
| implementer | React/Hono/domain/test 코드 |
| verifier | `npm test`, `typecheck`, `build`, `verify-harness` |
| learning/wiki | `docs/status.md`, `docs/tasks.md`, `docs/learning/`, `docs/wiki/` |

### 하네스 구조 줄기

포스터 오른쪽에는 아래 6개 줄기를 작은 lane으로 보여준다.

```text
A  App Flow / Reset / Component Consistency
C  LLM Manager API
1  State Machine / Interaction
B  Asset Runtime / Placement / Review Tool
2  Sound / Game Feel
3  Pixel TV / World Theme
```

각 줄기에는 "현재 담당하는 문제"를 한 줄만 붙인다.

| 줄기 | 한 줄 설명 |
|---|---|
| A | 화면 flow와 reset/localStorage 일관성 |
| C | LLM route, schema, fallback, rate limit |
| 1 | Lumi roaming state machine과 interaction loop |
| B | sprite placement, pivot, runtime/review sync |
| 2 | sound policy, effect, music player |
| 3 | Pixel TV, projection, photo, world theme |

### 검증 루프 강조

하단에 작은 verification strip을 둔다.

```text
Spec -> RED -> GREEN -> Refactor -> Typecheck -> Build -> Harness -> Browser Check
```

짧은 문구:

- 구현자가 스스로 완료 판단하지 않는다.
- 자동 검증과 수동 검증을 분리한다.
- stale 문서와 미구현 기능을 Done으로 표시하지 않는다.

### 참고 파일

- `AGENTS.md`
- `.codex/agents/*`
- `.agents/skills/*`
- `docs/handoff-2026-07-30.md`
- `docs/agent-usage-guide.md`
- `docs/tdd-workflow-agent.md`
- `docs/verification-agent.md`
- `docs/project-knowledge-map.md`
- `scripts/verify-harness.ps1`
- `docs/status.md`
- `docs/tasks.md`
- `docs/learning/README.md`

## A3 제작 세션용 프롬프트

아래 프롬프트를 다른 Codex 세션 첫 메시지로 붙여넣는다.

```text
이 저장소는 D:\2026.1\AIAgentChallenge\hub 입니다.

목표:
부스 전시용 A3 인쇄 자료 2장을 제작해 주세요.
1. 기획 주제 설명 / 프로젝트 결과물 A3
2. AI Agent Workflow / 하네스 구조 A3

먼저 파일을 수정하지 말고 다음 문서를 읽어 주세요.
- AGENTS.md
- docs/booth-a3-print-brief.md
- docs/status.md
- docs/tasks.md
- docs/handoff-2026-07-30.md
- showcase/showcase.json

출력물:
- outputs/booth-project-result-a3.pdf
- outputs/booth-project-result-a3.png
- outputs/booth-ai-agent-workflow-a3.pdf
- outputs/booth-ai-agent-workflow-a3.png
- 가능하면 편집 가능한 원본도 함께 생성

디자인 조건:
- A3 landscape, white + clean blue theme
- 텍스트를 길게 나열하지 말고 도형, 흐름, 아이콘, 카드 중심으로 구성
- 방문자가 10초 안에 핵심을 이해할 수 있어야 함
- 제목은 크게, 본문은 카드당 2줄 이내
- 복잡한 구현 파일명은 작은 footnote나 source strip으로만 표시
- QR placeholder 또는 link placeholder를 둬도 됨

포스터 1 내용:
- 전자 생물 AI 매니저 서비스 소개
- 할 일 목록의 부담, 실패 후 단절 문제
- 프로필 설정 -> 오늘의 퀘스트 -> QuestRunner.exe [RUN] -> 완료/실패 -> 복구 -> 기록 노트 + 성장 flow
- React XP Desktop, Hono/Supabase Quest Event, Canvas sprite animation, Pixel TV prototype 성과

포스터 2 내용:
- AI Agent Workflow 구조
- analyze-request -> create-plan -> implementer -> verifier -> learning/wiki/status 순환
- TDD workflow: Spec -> RED -> GREEN -> Refactor
- verify-harness, typecheck, build, browser manual check
- A/C/1/B/2/3 작업 줄기

주의:
- 실제 Supabase/OpenAI key는 읽거나 쓰지 마세요.
- public/assets/fx 대형 사운드 에셋은 stage하지 마세요.
- .codex-ppt-build와 outputs/*.inspect.ndjson은 기본적으로 커밋하지 마세요.
- 아직 구현되지 않은 기능은 완료처럼 쓰지 말고 prototype/fallback/backlog로 구분하세요.

작업 순서:
1. 먼저 디자인 구조를 간단히 요약
2. A3 파일 생성
3. PNG preview 렌더링
4. 텍스트 겹침, 잘림, 대비를 검수
5. 최종 파일 경로와 사용한 근거 문서를 보고
```

## PR/부스 설명에 쓸 짧은 문구

프로젝트 결과물:

```text
전자 생물 AI 매니저는 목표 관리를 XP 데스크톱형 퀘스트 경험으로 바꾼 서비스입니다. 사용자는 전자 생물 매니저가 제안한 오늘의 퀘스트를 수행하고, 실패하면 이유를 남긴 뒤 더 작은 복구 퀘스트로 다시 이어갑니다. 완료/실패/복구 이벤트는 Hono API와 Supabase에 저장되고, 기록 노트와 매니저 상태에 다시 반영됩니다.
```

AI Agent Workflow:

```text
이 프로젝트는 기능 구현뿐 아니라 Agent Workflow 자체를 함께 설계했습니다. 요구사항을 조사하는 analyze-request, 파일 단위 계획을 만드는 create-plan, 구현자와 검증자를 분리하는 verifier, TDD workflow와 학습/Wiki 정리 skill을 사용해 작업을 반복했습니다. 덕분에 React 화면, Hono API, Supabase, sprite asset, 문서 상태를 같은 기준으로 점검할 수 있었습니다.
```

