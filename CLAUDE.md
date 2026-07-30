# CLAUDE.md

이 문서는 Claude Code가 잔소리봇 저장소에서 작업할 때 가장 먼저 따라야 하는
프로젝트 운영 가이드다. 사용자 소개는 `README.md`, 현재 구현·검증·백로그
상태는 `docs/checklist.md` 상단 대시보드를 기준으로 한다.

## 1. 프로젝트 목적

**잔소리봇**은 회피 이유를 파악하고, 지금 바로 시작할 수 있는 첫 행동을
제안하는 AI 학업 실행 도우미다.

핵심 제품 원칙:

- 사용자를 비난하거나 단순히 반복 알림을 보내는 서비스가 아니다.
- 막막함, 하기 싫음, 다른 유혹, 완벽주의 등 시작을 막는 이유를 먼저 확인한다.
- 긴 계획보다 지금 실행할 수 있는 마이크로태스크 하나를 제안한다.
- 개입은 Lv1~Lv4로 강해지지만 따뜻한 동행자 톤을 유지한다.
- Focus, Completion, History까지 같은 행동과 완료 기록을 일관되게 전달한다.

현재 제품 흐름:

```text
Landing → Register → Home → Nudge → Focus → Completion → History
```

## 2. 현재 구현 상태를 판단하는 기준

기능 상태를 추측하지 않는다. 다음 순서로 확인한다.

1. `docs/checklist.md` 상단 **현재 상태 대시보드**
2. 실제 컴포넌트·서버 라우트·Prisma schema
3. 해당 테스트
4. README와 기획 문서

상태 용어:

- **완료**: 코드에 실제 실행 경로가 있다.
- **검증 완료**: 자동 테스트 또는 기록된 실제 환경 검증 근거가 있다.
- **백로그**: 필요성과 범위가 확인됐지만 구현 또는 검증이 끝나지 않았다.
- **미구현 아이디어**: 장기 후보이며 현재 제품 기능처럼 설명하지 않는다.

주요 백로그를 현재 기능으로 오해하지 말 것:

- Task별 `nextNudgeAt` 서버 영속화
- 외부 Cron 기반 서버 알림 스케줄러
- 피드백 기반 자동 개인화
- Android Chrome Web Push 실기기 검증
- 다중 사용자·인증·사용자별 Push 구독
- 정식 Pomodoro, 외부 캘린더, 시간대별 Journey 테마

## 3. 기술 스택과 구조

### Frontend

- React 19 + Vite
- React Router
- JavaScript/JSX와 TypeScript 혼용
- 컴포넌트별 순수 CSS
- `src/lib/api.js`의 `apiFetch`를 통한 동일 오리진 `/api` 호출

### Backend

- Express + TypeScript
- 로컬: `server/src/index.ts`
- Vercel: `api/index.js`가 빌드된 Express 앱을 serverless 함수로 노출
- API:
  - `/api/tasks`
  - `/api/history`
  - `/api/microtasks/lv2`
  - `/api/microtasks/lv3`
  - `/api/push-subscriptions`
  - `/api/health`

### Database

- Supabase PostgreSQL + Prisma
- `DATABASE_URL`: 서버리스용 pooled connection
- `DIRECT_URL`: migration용 direct connection
- Prisma Client는 `server/src/db/client.ts` 싱글톤을 사용한다.
- 현재 모델:
  - `Task`
  - `AvoidanceReason`
  - `TaskEvent`
  - `AppState`
  - `PushSubscription`
  - `Feedback`

`AppState.streak` row는 하위 호환을 위해 남아 있지만 현재 streak 계산에는
사용하지 않는다. streak는 Asia/Seoul 기준 `done` 이벤트 날짜로 계산한다.

### 주요 디렉터리

```text
src/
  components/       React 화면·컴포넌트와 RTL 테스트
  lib/              프런트 순수 함수, API·세션 유틸
  assets/           Shared Journey 배경·캐릭터·UI 이미지
server/
  src/routes/       Express API와 Supertest
  src/lib/          scoring, Gemini, Push 등 서버 로직
  prisma/           schema와 migration
api/index.js        Vercel serverless 진입점
e2e/                Playwright 사용자 흐름
public/             manifest, Service Worker, 정적 아이콘
docs/               기획·현재 상태·디자인·워크플로우
.claude/agents/     Claude Agent 정의
.claude/skills/     프로젝트 Skill 정의
showcase/           챌린지 메타데이터와 대표 화면
```

## 4. 실행 명령

루트 `package.json`의 npm workspace가 `server/`를 함께 관리한다.

```bash
npm install             # 루트와 server workspace 의존성 설치
npm run dev             # Vite 프런트만 실행
npm run dev:server      # Express 서버만 실행
npm run dev:all         # 프런트와 Express를 함께 실행
npm run build           # Vite 프로덕션 빌드
npm run build:server    # Express TypeScript 빌드
npm run preview         # Vite 빌드 로컬 미리보기
npm run typecheck       # 루트 TypeScript/checkJs 검사
npm run lint            # oxlint
npm test                # 프런트 Vitest
npm run test:server     # 서버 Vitest
npm run test:all        # 프런트와 서버 Vitest
npm run test:e2e        # Playwright E2E
```

환경변수:

- 프런트 `.env`
  - `VITE_API_BASE_URL`
  - `VITE_VAPID_PUBLIC_KEY`
  - `VITE_NUDGE_MODE`
- 서버 `server/.env`
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `PORT`
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`

비밀키와 실제 DB URL을 문서, 코드, 로그, 커밋에 넣지 않는다.

## 5. 테스트 전략

고정 테스트 개수를 문서에 기록하지 않는다. 테스트 수보다 검증 범위와 실패
조건을 기록한다.

### Vitest

- `src/lib/**`, `server/src/lib/**`의 순수 함수와 상태 변환
- happy path, 경계값, 실제 버그 회귀를 포함한다.
- 날짜 함수는 내부에서 현재 시각을 만들지 말고 `now`를 주입한다.
- KST 계산은 OS timezone이 아니라 UTC timestamp + offset/day ordinal을 쓴다.

### React Testing Library

- 컴포넌트 렌더링, 조건부 UI, 접근성 이름, 사용자 상호작용
- 중복 제출·중복 완료·늦은 응답처럼 화면 상태와 비동기 흐름이 얽힌 회귀
- 구현 세부 DOM보다 사용자가 보는 역할·이름·동작을 우선 검증한다.

### Supertest

- Express 입력 검증, 응답 코드·body, transaction, 멱등성, DB 결과
- 테스트용 Supabase가 확인된 경우에만 DB 테스트를 실행한다.
- `DATABASE_URL`이 없으면 관련 suite를 skip하고, 값이 있지만 test 식별자가
  없으면 실행을 중단한다.
- 개발·Production DB를 테스트 데이터로 수정하지 않는다.

### Playwright

현재 자동화:

- Landing smoke
- Register 제목·D-day 빈 값 검증
- 할 일 생성 → Home → Focus 완료 → History

아직 자동화하지 않은 범위:

- Register 새로고침
- Focus sessionStorage 복구 E2E
- API 실패 UI E2E

Playwright fixture도 Task를 생성·삭제하므로 격리된 테스트 DB를 사용한다.

### 변경별 최소 검증

- 순수 함수: 해당 Vitest + 전체 프런트/서버 관련 suite
- React UI: RTL + typecheck + lint + build
- Express/Prisma: Supertest + server typecheck/build, 단 DB 격리 확인 후
- 핵심 사용자 흐름: Playwright 검토
- Service Worker/Web Push: mock 테스트만으로 실환경 검증을 대체하지 않는다.

## 6. Gemini와 rule-based fallback

- Gemini 호출은 서버에서만 수행한다. API key를 프런트에 노출하지 않는다.
- Lv2와 Lv3는 각각 `/api/microtasks/lv2`, `/api/microtasks/lv3`를 사용한다.
- 서버는 provider response, structured output, microTask 형식과 품질을 검증한다.
- API 오류, timeout, 응답 형식 오류, 빈 응답, 품질 검사 실패는 가능한 경우
  `source: "rule_based"`와 안전한 마이크로태스크를 `200`으로 반환한다.
- `configuration_missing`은 배포 설정 오류이므로 정상 fallback으로 숨기지 않는다.
- 외부 클라이언트에는 안정적인 오류 계약을 유지하고, 세부 validation stage/rule은
  길이 제한·개행 제거·payload 비노출 원칙으로 내부 로그에만 남긴다.
- 서버가 반환한 `microTask`와 `source`를 프런트에서 다시 계산하거나 바꾸지 않는다.
- 모달에 표시한 최종 행동은 Focus, done event, History까지 동일해야 한다.
- 늦은 Gemini 응답이 이미 확정된 fallback·메시지·Focus session을 덮지 않게 한다.
- memory evidence는 실제 과거 완료 근거가 검증된 경우에만 저장한다.

## 7. Focus와 완료 계약

- `entryMode`: direct 또는 intervention 진입 방식
- `entryLevel`: 개입으로 시작한 경우의 개입 레벨. direct는 `null`
- `journeyLevel`: Focus에 표시할 캐릭터·배경 레벨
- `microTask`, `generationSource`, `memoryEvidence`: 제안 행동의 출처와 근거
- 시작 시점의 `journeyLevel`은 Focus 중 Task level이 변해도 유지한다.
- Focus session은 `sessionStorage`에 저장하며 유효성·최대 수명을 검사한다.
- 완료 요청은 중복 호출을 막고 첫 번째 결과만 기록한다.
- 멈추기는 일시정지가 아니라 Focus session 종료 후 Home 복귀다.
- 600초 미만 멈추기는 level/skipCount를 유지한다.
- 600초 이상 멈추기는 표시 레벨을 정확히 한 단계 완화한다.
- stopped는 Task를 active로 유지하고 날짜 기반 streak에 영향을 주지 않는다.

완료·멈추기·세션 복구 코드는 고위험 영역이다. 관련 불변식을 바꾸는 작업은
요청 범위를 넓혀 추측하지 말고 기존 테스트와 API 계약부터 확인한다.

## 8. Web Push와 알림

현재 구현은 실제 Web Push다.

```text
PushSubscription 생성
→ DB 저장
→ 프런트 타이머가 notification_sent 요청
→ 서버 level_up 기록
→ VAPID 발송
→ Service Worker 수신
→ OS 알림
```

구현된 범위:

- Notification 권한과 PushSubscription 상태를 별도로 관리
- permission은 granted지만 subscription이 없으면 재구독 가능
- Push 구독 저장·삭제 API
- 모든 저장 구독에 레벨 상승 Push 브로드캐스트
- 404/410 만료 구독 자동 삭제
- 발송 실패 분류 로그
- Service Worker Push 표시, 알림 클릭, 오프라인 폴백
- Desktop Chrome·Edge, iPhone 홈 화면 PWA 수신 검증

현재 한계:

- 다음 알림 시각은 `HomePage`의 클라이언트 timer가 계산한다.
- `nextNudgeAt`은 DB에 영속화되지 않는다.
- 앱이 닫힌 상태에서 예약 시각을 판단하는 서버 scheduler/Cron은 없다.
- Android Chrome 실기기 검증은 남아 있다.

따라서 “앱 종료 후에도 서버가 예약 알림을 계속 생성한다”고 설명하지 않는다.
Vercel serverless 내부에 `setInterval` 기반 scheduler를 만들지 않는다.

## 9. Shared Journey와 디자인

디자인 철학:

- Calm, Premium, Warm, Clear
- 캐릭터는 장식이 아니라 함께 걷는 동행자
- 레벨이 강해져도 비난·공포·게임 보상 화면처럼 만들지 않는다.
- 기존 디자인 토큰과 실제 에셋을 우선 사용한다.

현재 레벨 색:

- Lv1: 민트 `--level-1`
- Lv2: 보라 `--level-2`
- Lv3: 코랄·더스티 로즈 `--level-3`
- Lv4: 부드러운 적색 `--level-4`

현재 Journey 배경:

- Lv0 `journey_lv0_clear.png`
- Lv1 `journey_lv1_partly_cloudy.png`
- Lv2 `journey_lv2_cloudy.png`
- Lv3 `journey_lv3_rain.png`
- Lv4 `journey_lv4_storm.png`

화면별 역할:

- Landing: 서비스 가치와 사용 흐름
- Home: Stats, Journey Hero, 상태별 Task
- Register: 낮은 마찰의 단일 Form과 안내 캐릭터
- Nudge Modal: Lv1~Lv4 캐릭터와 개입
- Focus: 레벨별 Walking 캐릭터·Journey 배경
- Completion: 성공 캐릭터와 제한적인 sparkles
- History: compact Insight와 기록

스타일 작업 전 `.claude/skills/nagging-bot-design/SKILL.md`, 실제 CSS와
`src/assets`를 함께 확인한다. Skill이 현재 코드와 충돌하면 실제 구현과
사용자의 최신 확정 사항을 우선하고, 임의로 과거 규칙을 되살리지 않는다.

기본 UI 규칙:

- CSS-in-JS, Tailwind, 새 UI 라이브러리를 임의로 추가하지 않는다.
- 컴포넌트 옆 전용 CSS와 `src/index.css` 토큰을 재사용한다.
- 새 전역 token은 명시적 요청 없이 추가하지 않는다.
- 장식 이미지는 `alt=""`, 정보는 텍스트로도 전달한다.
- 키보드 `focus-visible`, 충분한 대비, 최소 44px 터치 영역을 유지한다.
- 자동 애니메이션은 `prefers-reduced-motion`을 지원한다.
- 데스크톱뿐 아니라 1440/768/390px를 기본 반응형 검토 대상으로 삼는다.

## 10. API·데이터 규칙

- 프런트는 직접 `fetch`를 흩어 쓰지 말고 기존 API helper 패턴을 따른다.
- 성공 응답은 현재 라우트 계약의 `{ data: ... }`와 추가 메타데이터를 유지한다.
- 오류는 `{ error: { code, message } }`와 적절한 HTTP status를 사용한다.
- 입력 검증을 완화하거나 문자열을 숫자로 암묵 변환하지 않는다.
- 날짜·시간은 API/DB에서 완전한 UTC ISO datetime을 사용한다.
- KST 날짜 통계는 day ordinal 방식으로 계산한다.
- Prisma migration 없이 schema를 바꾸지 않는다.
- 개발 DB를 직접 수정하거나 SQL로 보정하지 않는다.
- 애플리케이션 데이터 변경은 정상 API 경로를 사용한다.

고위험 데이터 흐름:

- done 중복 요청과 완료 이벤트 멱등성
- stopped 중복 요청
- Task 삭제와 notification event 경합
- memoryEvidence의 클라이언트 위조
- Push 중복 발송·만료 구독
- 늦은 비동기 응답의 상태 역전

## 11. Git과 배포 워크플로우

기본 흐름:

```text
work
→ Vercel Preview
→ 브라우저·테스트 검증
→ main 병합
→ Vercel Production
```

- `work`는 Preview 검증용 통합 브랜치다.
- Preview는 `VITE_NUDGE_MODE=demo`로 짧은 간격을 수동 검증한다.
- Production은 실제 분 단위 간격을 사용한다.
- 클라이언트 요청값으로 demo/production 모드를 선택하게 만들지 않는다.
- Preview에서 확인한 commit SHA와 실제 배포 bundle이 일치하는지 확인한다.
- main 병합 전에 typecheck, lint, 관련 테스트, production build를 확인한다.
- Preview URL을 README의 대표 Production 주소로 쓰지 않는다.
- 커밋은 Conventional Commits 형식을 사용한다.
  - `feat: ...`
  - `fix: ...`
  - `test: ...`
  - `docs: ...`
  - `chore: ...`
  - `refactor: ...`

Claude Code는 사용자의 명시적 요청 없이 다음을 수행하지 않는다.

- branch 생성·전환
- `git add`, commit, push
- merge, rebase, reset, restore, clean
- PR 생성·병합

작업 트리에 기존 변경이 있으면 사용자 소유로 간주하고, 관련 없는 변경을
수정·포맷·되돌리지 않는다.

## 12. Agent와 Skill

### Agents

- **feature-slice**: 요구를 하루 안에 끝낼 수 있는 GitHub Issue와 검증 가능한
  완료 조건으로 분해한다. 코드를 작성하지 않는다.
- **feature-verify**: Issue 완료 조건을 실제 코드·테스트·브라우저/API 결과로
  확인한다. 파일을 수정하지 않는다.
- **code-review**: 병합 전 코드 구조, 예외 처리, 테스트 누락, 데이터·보안
  위험을 검토한다. 승인 없이 수정하지 않는다.

### Skills

- **simple-tdd**: 순수 함수에서 스펙 승인 → Red → Green → Refactor 순서를
  지킨다. UI나 DB 라우트 테스트 절차를 대체하지 않는다.
- **test-writer**: Vitest/Supertest 테스트 분류, 응답 계약, DB 가드와 teardown
  규칙을 제공한다.
- **nagging-bot-design**: 브랜드 토큰, Shared Journey, 캐릭터, 반응형,
  접근성 기준을 제공한다. 실제 UI와 충돌하는 과거 규칙은 재검증한다.

Agent는 “무엇을 수행할지”, Skill은 “어떤 절차와 기준으로 수행할지”를
정의한다. 사용자가 Agent나 Skill을 지정하면 해당 문서를 먼저 읽는다.

## 13. AI 도구 역할

- **사용자**: 문제, 우선순위, 범위, 제품 정책과 최종 판단을 결정한다.
- **Claude Code**: 초기 기능 구현, Agent/Skill 실행, 테스트와 수정, 반복 개발을
  지원한다.
- **OpenAI Codex**: 저장소 분석, 설계·UI/UX 검토, 구현 계획, 기능 구현 보조,
  코드·문서 감사와 교차 검증을 지원한다.
- **Gemini**: 제품 런타임에서 마이크로태스크를 생성한다.

도구 역할을 경쟁 관계나 고정 소유권으로 설명하지 않는다. Claude Code와
Codex 결과가 다르면 실제 파일, 테스트, 데이터 흐름과 사용자 판단으로
결정한다. AI의 완료 보고서는 증거가 아니라 검증 대상이다.

## 14. 새 작업의 필수 절차

1. 요청 범위와 변경 금지 항목을 적는다.
2. 관련 코드·테스트·문서를 먼저 읽는다.
3. 현재 데이터 흐름과 기존 불변식을 설명한다.
4. 필요한 경우 구현 계획과 완료 조건을 먼저 제시하고 승인을 기다린다.
5. 한 이슈 범위만 최소 변경한다.
6. 정상·경계·회귀 테스트를 추가하거나 기존 테스트로 근거를 남긴다.
7. typecheck, lint, build와 위험에 맞는 테스트를 실행한다.
8. DB 접근 테스트는 격리를 확인한 뒤에만 실행한다.
9. 실제 브라우저가 필요한 UI·PWA·Push는 mock만으로 완료 처리하지 않는다.
10. 변경 파일, 실행한 검증, 생략한 검증과 이유, 남은 위험을 보고한다.

## 15. 금지 사항

- 요청 범위 밖 리팩터링·기능·문구 변경
- 근거 없는 validation, fallback, 데이터 필드 추가
- 기존 제품 동작을 “더 좋아 보인다”는 이유만으로 변경
- `any` 추가 또는 타입 오류 무시
- 새 라이브러리·공통 추상화의 선제 도입
- 개발·Production DB 직접 수정
- 테스트 DB 확인 없는 server/E2E 실행
- 외부 provider 전체 payload나 민감 정보 로그
- 이미지 임의 생성·재압축·변형
- Service Worker·Push·완료 멱등성의 무관한 정리
- 사용자의 요청 없는 Git 변경

## 16. 참고 문서

- `README.md`: 프로젝트 소개와 실행 요약
- `docs/checklist.md`: 현재 상태 대시보드와 개발 기록
- `docs/plan.md`: 문제 정의와 초기 기획
- `docs/wireframe.md`: 화면·전환 문서
- `docs/design-concept.md`: Shared Journey 철학
- `docs/design-research.md`: 디자인 결정 과정
- `docs/workflow.md`: AI Agent 협업 방식
- `.claude/agents/`: Agent 정의
- `.claude/skills/`: Skill 정의
- `AGENTS.md`: 저장소 공통 안전·작업 규칙
