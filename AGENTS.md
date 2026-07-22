# AGENTS.md — 콕 프로젝트 범용 작업 규칙

모든 코딩 agent(Claude Code, GPT/Codex 등)가 이 저장소에서 작업할 때 따르는 공통 규칙이다. Claude 전용 사항은 [CLAUDE.md](CLAUDE.md)에 있다.

## 프로젝트

**콕** — 할 일을 25분 이내 마이크로 스텝으로 쪼개고, 지금 할 일 하나에만 집중하도록 돕는 ADHD 사용자용 웹 서비스. 핵심 차별화는 "나 지금 힘들어" Agent 루프(Feat-4)다.

## 기술 스택 (고정)

- **Frontend**: Next.js (App Router), SPA. 라우트 최소.
- **언어**: JavaScript (TypeScript 아직 안 씀 — 임의로 .ts로 바꾸지 않는다).
- **Backend**: 별도 서버 없이 Next.js API Routes.
- **AI**: Vercel AI SDK (`generateObject`, tool calling). 모델은 Solar(Upstage), OpenAI 호환이라 `@ai-sdk/openai-compatible`로 연결.
- **DB**: 별도 DB 없음. Notion을 데이터 저장소로 사용.
- **배포**: Vercel.
- **패키지**: npm. **버전은 `^` 없이 정확히 고정**한다(`package.json`).

## Source of Truth 우선순위

CLAUDE.md 안전 원칙 > [docs/dev-plan.md](docs/dev-plan.md) > [docs/skills.md](docs/skills.md) > [docs/checklist.md](docs/checklist.md) > [docs/backlog.md](docs/backlog.md) > 코드·테스트 결과.

계약(입력·출력·제약)의 진실 소스는 코드가 아니라 `docs/skills.md`다. 계약을 바꾸려면 skills.md를 먼저 고치고 같은 변경에서 코드·checklist를 동기화한다.

## 작업 절차

[docs/instructions.md](docs/instructions.md)를 따른다. 요약: 리뷰 피드백 반영 → 선행조건 확인 → 완료조건·계약 로드 → `npm run verify` baseline 확인 → 구현 → verify 재실행 → backlog/spec 갱신 → 보고서 append.

## 검증·보고

- 작업 시작/종료 시 `npm run verify`(lint + build; 테스트가 생기면 확장)를 돌린다. **문서에 적혀 있다는 이유로 checklist를 체크하지 않는다** — 실제 통과한 것만 체크.
- 구현 세션은 [docs/report/report_claude.md](docs/report/report_claude.md)에, 리뷰 세션은 [docs/report/report_gpt.md](docs/report/report_gpt.md)에 **append-only**로 보고한다(파일을 읽지 말고 `cat >>`로 추가). 점검 절차는 [docs/report/review.md](docs/report/review.md).
- 보고서 본문은 수정·삭제 금지. 유일한 예외는 review.md 절차에 따른 `- 확인: [ ]` → `[x]` 한 줄 전환.

## 커밋·이슈

[docs/etc/commit-rules.md](docs/etc/commit-rules.md)를 반드시 따른다. 요약: `<타입>: <요약> (#이슈번호)` 형식(**이모지 금지**), 이슈 먼저 등록 후 커밋에 번호 참조(닫을 땐 `Closes #N`), 기능 단위로 커밋 분리, 한국어 요약. 커밋/푸시는 사용자가 요청할 때만 한다.

## 안전

- **`upstream`(connect-AIAgentChallenge-26-1/hub, 팀 원본)으로 절대 push하지 않는다.** push는 `origin`(개인 포크)으로만. 자세한 규칙은 [docs/etc/commit-rules.md](docs/etc/commit-rules.md) 0절.
- **반드시 현재 저장소 위치(`team/hub`)에서만 작업한다.** 이 디렉터리 밖의 파일을 만들거나 고치지 않는다.
- 비밀 키는 `.env.local`(gitignore됨)에만. 코드·문서·커밋에 키 값을 넣지 않는다.
- 우회 불가한 외부 자격증명이 없으면 구현하지 말고 `BLOCKED`로 보고([docs/prerequisites.md](docs/prerequisites.md) 확인).
