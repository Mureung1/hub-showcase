# AI Agent Challenge 참가자 Workflow·Agent·Skill·Harness 비교 보고서

> 조사일: 2026-07-30
> 조사 범위: 공식 쇼케이스 108개 전수 확인, 그중 11개 프로젝트의 Agent/Skill 설명과 관련 PR 이력 심층 확인
> 비교 대상: 하루 체크아웃(N114_유승혁)

## 0. 먼저 보는 결론

하루 체크아웃에는 **워크플로가 없었던 것이 아니다.**

실제 Git 기록에는 다음 흐름이 남아 있다.

1. 기능을 바로 만들지 않고 설계서를 먼저 작성했다.
2. 테스트를 먼저 만들고 실패·통과를 확인한 기능이 있다.
3. 구현 Agent와 검증 Agent의 역할을 분리했다.
4. 로컬 테스트와 빌드뿐 아니라 실제 Vercel·Render·Supabase·브라우저까지 확인했다.
5. 작업이 끝난 뒤 PR, 회고, showcase와 영상으로 결과를 남겼다.

다만 다른 우수 사례와 비교하면 현재 구조는 **“사람과 Codex가 대화로 운영한 가벼운 워크플로”**에 가깝다. 다음이 아직 약하다.

- Agent와 Skill을 어떤 조건에서 실행했는지 남기는 실행 기록
- 테스트·빌드·브라우저 검증을 한 번에 재현하는 통합 검증 명령
- 작업 목표, 비목표, 완료 기준과 결과를 한 쌍으로 보관하는 작업 패킷
- 실패 원인과 재시도 결과를 다음 작업에 연결하는 실패 기록
- 규칙을 자동으로 확인하는 Hook·CI·Controller
- 만들어 둔 Agent/Skill 파일이 실제 Git에 모두 포함됐는지 확인하는 관리 절차

따라서 현재 상태를 가장 정확하게 표현하면 다음과 같다.

> **반복 가능한 개발 순서는 생겼고 실제 기능 개발과 배포 검증에도 사용했다. 다만 그 순서를 자동으로 강제하고 실행 증거를 일관되게 남기는 하네스까지는 만들지 않았다.**

이건 실패가 아니다. 4주짜리 개인 프로젝트에서 하네스 자동화까지 크게 만드는 것이 항상 좋은 것도 아니다. 이번 보고서의 추천은 복잡한 구조를 복사하는 것이 아니라, 하루 체크아웃에 필요한 최소한만 가져오는 것이다.

---

## 1. 조사한 곳과 링크

### 공식 자료

- [AI Agent Challenge 2026 공식 쇼케이스](https://connect-aiagentchallenge-26-1.github.io/hub/)
- [쇼케이스 작성 가이드](https://connect-aiagentchallenge-26-1.github.io/hub/guide/)
- [공식 hub 저장소](https://github.com/connect-AIAgentChallenge-26-1/hub)
- [공식 쇼케이스 원본 데이터](https://connect-aiagentchallenge-26-1.github.io/hub/data/showcases.json)

공식 쇼케이스는 프로젝트별 고유 주소가 생기지 않는다. 쇼케이스 링크를 연 뒤 이 보고서에 적힌 **프로젝트 제목**이나 **GitHub 사용자명**으로 검색하면 된다.

### 하루 체크아웃

- [배포 서비스](https://haru-checkout-n114.vercel.app)
- [시연 영상](https://youtu.be/CFum9nr6JDk)
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/N114_%EC%9C%A0%EC%8A%B9%ED%98%81)
- [계획·검증 서브에이전트 PR #1254](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1254)
- [기능 개발 절차 Skill PR #1575](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1575)
- [삭제 기능 TDD PR #1701](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1701)
- [TDD와 showcase PR #1851](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1851)
- [게스트 로컬 저장·클라우드 동기화 PR #2071](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2071)
- [Vercel·Render·Gemini 배포 PR #2194](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2194)
- [PWA와 최종 showcase PR #2318](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2318)

---

## 2. 용어부터 정확히 구분하기

### Workflow

작업을 할 때 반복하는 순서다.

예를 들면 다음은 하나의 Workflow다.

> 요구사항 확인 → 현재 코드 확인 → 완료 기준 작성 → 테스트 → 구현 → 로컬 검증 → 실제 브라우저 검증 → PR 기록

반드시 자동화돼 있을 필요는 없다. 사람이 체크리스트를 보며 매번 따라도 Workflow다.

### Agent

특정 역할과 책임을 맡은 AI 작업자다.

예:

- 계획만 만드는 `task-planner`
- 코드는 고치지 않고 결과만 확인하는 `feature-verifier`
- 구현 결과와 독립적으로 PASS/FAIL을 내리는 `requirement-verifier`

Agent가 의미 있으려면 이름보다 다음이 중요하다.

- 무엇을 입력받는가
- 무엇을 해도 되고 하면 안 되는가
- 무엇을 결과로 남기는가
- 무엇을 근거로 완료를 판정하는가

### Skill

반복해서 설명하게 되는 작업 방법을 재사용 가능한 절차로 저장한 것이다.

예:

- 테스트 케이스 승인 → Red → Green 순서
- 새 기능을 만들기 전 화면·데이터·API 흐름 비교
- 브랜치·커밋·PR 작성 규칙
- 디자인 토큰을 적용하는 규칙

좋은 Skill은 “무엇이든 개발해주는 만능 명령”이 아니다. **좁고 반복되는 한 가지 판단이나 절차**를 고정한다.

### Harness

Agent와 Skill이 정해진 규칙을 지키도록 둘러싼 운영 장치 전체다.

다음 중 여러 개가 연결되면 Harness라고 부를 수 있다.

- `AGENTS.md`, `CLAUDE.md` 같은 공통 규칙
- Agent와 Skill 파일
- 작업 상태 파일
- 완료 기준
- 테스트·빌드·린트·브라우저 검증
- 실행 결과 기록
- 실패 기록과 재시도 규칙
- Controller와 Worker 분리
- Git Hook, CI, Merge Guard

중요한 점은 **하네스가 꼭 거대한 프로그램일 필요는 없다는 것**이다. 규칙 문서 + 검증 명령 + 결과 기록만 있어도 가벼운 하네스가 된다.

### Hook

특정 사건이 일어날 때 자동 실행되는 장치다.

예:

- 커밋 전에 비밀값과 테스트를 검사하는 pre-commit Hook
- push 전에 빌드를 확인하는 pre-push Hook
- PR이 열리면 테스트하는 GitHub Actions

Hook은 Workflow를 자동으로 강제하는 한 방법일 뿐이다. 반복 실수가 명확하지 않다면 처음부터 만들 필요는 없다.

---

## 3. “실제로 사용했다”를 판단한 기준

쇼케이스에 Agent나 Skill 이름을 많이 적었다고 실제 Workflow가 강한 것은 아니다. 이번 조사에서는 다음처럼 증거 강도를 구분했다.

| 등급 | 판단 기준 |
|---|---|
| A | 여러 PR에서 반복 사용했고, 실제 파일·테스트·검증 결과·실패 기록이 연결됨 |
| B | Agent/Skill 파일과 실제 적용 PR이 최소 한 번 이상 연결됨 |
| C | 파일 또는 설명은 있으나 반복 사용이나 실행 결과를 확인하기 어려움 |
| D | 쇼케이스에 이름만 있고 역할·입력·출력·사용 근거가 불분명함 |

특히 다음 흔적이 있으면 신뢰도가 높다.

- “Agent를 만들었다”와 “그 Agent가 실제 버그를 잡았다”가 같은 PR에 있음
- 테스트 커밋이 구현 커밋보다 먼저 존재함
- 완료 조건 원문과 PASS/FAIL 결과가 함께 남음
- 브라우저, Network, DB, 배포 URL 같은 실제 환경 결과가 있음
- 실패와 미확인 항목을 숨기지 않고 기록함
- 초기에는 없었다가 반복 문제를 발견한 뒤 Skill을 만들고 다음 작업에서 사용한 흐름이 보임

---

## 4. 한눈에 보는 추천 사례

| 프로젝트 | 가장 볼 만한 점 | 복사 추천도 |
|---|---|---|
| 크로스체크 | 반복해서 설명한 판단만 Skill로 고정, 골든셋 기반 AI 평가 | 매우 높음 |
| 전자 생물 AI 매니저 | 구현자와 검증자 분리, `verify-harness`로 구조 검사 | 매우 높음 |
| albafit | 실제 사용 PR·커밋·이슈까지 연결한 솔직한 Workflow 문서 | 매우 높음 |
| 대외활동 큐레이션 | 계획→개발→검증→올리기의 단순한 하루 사이클 | 매우 높음 |
| 끼니픽 | Skill 수는 적지만 실제 API·브라우저 재검증이 강함 | 높음 |
| FirstPR | 프로젝트 전용 Skill과 실서버 smoke·E2E·배포 gate | 높음 |
| LocalTwin | 작업 패킷, 실행 보고, 실패 기록, 문서까지 자동 검증 | 일부만 추천 |
| 아맞다! | GitHub Issue·Project 상태 기반 작업반장과 독립 리뷰 | 일부만 추천 |
| 답냥이 | 멀티에이전트 과사용을 줄이고 단일 통합자로 전환 | 운영 원칙 추천 |
| OpenSeed | Coordinator·Worker·Worktree·Merge Guard 자동화 | 현재는 과함 |
| 리뷰지기 | Controller가 Worker 완료 선언을 믿지 않는 강한 하네스 | 학습용, 현재는 과함 |

---

## 5. 사례 1 — 크로스체크: “필요해진 순간에만 Skill을 만든다”

### 링크

- 쇼케이스 검색어: `크로스체크 - 가설 기반 인터뷰 분석 도구`
- [배포 서비스](https://interviewanalyzingtool.vercel.app/)
- [시연 영상](https://youtu.be/OJJdIaxHGW8)
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/N089_%EB%B0%95%EC%A7%80%EC%9D%80)
- [4주차 계획과 당시의 솔직한 Agent 상태 PR #1969](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1969)
- [Eval baseline·프롬프트 분리·Skill 실사용 PR #2133](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2133)

### 왜 좋은가

이 참가자는 4주차 계획 PR에서 “이번 주에는 개발을 지원하는 Agent를 실제로 사용하지 않았다”고 적었다. 그 뒤 반복되는 판단을 발견할 때마다 다음 도구를 만들었다.

- `pm_design_system`: 화면 디자인 기준
- `branch-commit-push`: 브랜치와 커밋 규칙
- `pm-interview-analysis`: 인터뷰 근거 판정 기준
- `analysis-quality-eval`: 프롬프트 변경 전후 품질 측정
- `tdd-feature-loop`: Red·Green·Refactor
- `requirement-verifier`: 구현 세션과 독립된 완료 판정

즉, 제출 직전에 Agent 이름을 채운 것이 아니라 **없었다고 인정한 시점 → 반복 문제 발견 → Skill 제작 → 실제 PR에서 사용**의 흐름이 보인다.

### 가장 중요한 설계

AI 분석 품질의 정답을 AI가 만들게 하지 않았다. 사람이 직접 `expected_status`를 붙인 fixture를 골든셋으로 두고, 실제 Gemini 결과와 비교했다.

이 방식은 하루 체크아웃에도 그대로 적용할 수 있다.

예:

- 입력: “날씨가 너무 더워서 매사에 짜증이 난다”
- 사람이 기대한 감정: 짜증
- 사람이 기대한 원인: 더운 날씨
- 사람이 기대한 작은 행동: 시원한 물 마시기
- 실제 Gemini 결과와 비교

### 가져올 것

> 같은 설명을 세 번째 하게 될 때 Skill로 만든다.

처음부터 많은 Skill을 설계하지 말고, 반복 문제를 발견한 다음 좁은 Skill로 고정하는 방식이 하루 체크아웃에 가장 잘 맞는다.

### 가져오지 않을 것

도메인 평가 기준과 프롬프트 파이프라인 전체는 크로스체크에 특화돼 있다. 하루 체크아웃은 작은 fixture 5~10개면 충분하다.

---

## 6. 사례 2 — 전자 생물 AI 매니저: “구현자와 검증자가 다르다”

### 링크

- 쇼케이스 검색어: `전자 생물 AI 매니저`
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/N019_%EA%B9%80%EB%8F%99%EB%AF%BC)
- [하네스 운영 구조 PR #1049](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1049)
- [수직 슬라이스와 TDD Agent Workflow PR #1885](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1885)

### 실제 구조

PR #1049에는 다음 파일과 역할이 구체적으로 나온다.

- `.codex/agents/`: researcher, planner, implementer, verifier, wiki_curator
- `.agents/skills/`: 요청 분석, 계획 작성, 계획 실행, 결과 검증, Wiki 관리
- `scripts/verify-harness.ps1`
- `docs/wiki/`
- `AGENTS.md`
- 하네스 eval 시나리오 5개

`verify-harness.ps1`은 단순히 파일 존재만 보는 것이 아니라 다음을 검사했다.

- Codex 설정
- Agent TOML
- Skill frontmatter
- Wiki 문서의 source path
- Wiki index와 log 구조

그리고 구현 역할과 검증 역할을 분리해 **구현자가 스스로 완료를 승인하지 못하게 했다.**

### 왜 좋은가

“검증 Agent가 있다”에서 끝나지 않고, 검증 Agent가 확인할 구조 자체도 스크립트로 검사한다. PR #1885에서는 TDD Agent와 Skill 파일, 학습 문서, 실제 도메인 테스트가 함께 추가됐다.

### 하루 체크아웃과 닮은 점

하루 체크아웃에도 이미 다음 두 역할이 있다.

- `task-planner`
- `feature-verifier`

또한 `feature-verifier`는 코드를 수정하지 않고 보고서만 반환하도록 제한돼 있다. 방향은 이미 같다.

### 하루 체크아웃에 필요한 보완

전자 생물 프로젝트처럼 Agent를 다섯 명으로 늘릴 필요는 없다. 대신 다음 하나만 가져오면 된다.

> `npm run verify` 또는 `scripts/verify.ps1` 하나로 프런트 테스트, 백엔드 테스트, 빌드를 실행하고 결과를 명확한 종료 코드로 반환한다.

---

## 7. 사례 3 — albafit: “워크플로를 과장하지 않고 실제 사용 흔적을 연결한다”

### 링크

- 쇼케이스 검색어: `albafit`
- [배포 서비스](https://albafit.kr)
- [시연 영상](https://www.youtube.com/watch?v=mN9jOOq1C40)
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/N082_%EB%B0%95%EC%86%8C%EC%9C%A4)
- [AI Workflow 문서화 PR #1937](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1937)
- [튜터가 추천한 체험 모드·멀티턴 버그 PR #2111](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2111)

### Workflow

다음 순서를 문서화했다.

> task-planner → 결정 기록 → TDD/test-writer → feature-verifier → 학습 기록

중요한 점은 Agent 이름만 적지 않고, 각 도구를 실제로 언제 썼는지 PR·커밋·이슈 번호로 연결했다는 것이다.

### 솔직해서 더 믿을 만한 부분

PR #1937에는 다음 내용이 있다.

> 문서화는 했지만 이 순서를 매번 기계적으로 다 밟은 것은 아니다. 작은 작업에서는 계획을 건너뛰기도 했고, 어느 크기부터 task-planner가 필요한지는 아직 감으로 판단한다.

이 문장이 오히려 신뢰도를 높인다. 실제 개발 Workflow는 모든 작업에 똑같은 절차를 강제하는 것이 아니라, 작업 위험도에 맞춰 단계를 줄이기도 한다.

### 제품 판단과 검증이 연결된 PR

PR #2111에서는 다음을 했다.

- 로그인 없는 자유 입력·AI 호출 체험을 정적 가이드 투어로 바꿈
- 비용과 오류 가능성이 큰 AI를 게스트 체험에서 제거
- AI 호출을 DB transaction 밖에서 끝내고 DB 쓰기만 transaction으로 묶음
- 멀티턴 판정 로직을 순수 함수로 분리하고 TDD
- 실제 AI 호출과 브라우저 사용자 흐름까지 확인

이 사례의 강점은 “Agent를 많이 사용했다”가 아니라 **제품 범위를 줄이는 판단, 코드 구조, 테스트, 실제 브라우저 검증이 한 PR에 연결된 것**이다.

### 하루 체크아웃에 가져올 것

- Workflow 문서의 각 단계 옆에 실제 PR·커밋 링크 달기
- “모든 작업에 항상 사용했다”고 과장하지 않기
- Skill이 필요 없는 작은 수정은 바로 수정하고, 개인정보·저장·AI 같은 위험한 작업만 전체 Workflow 적용하기

---

## 8. 사례 4 — 대외활동 큐레이션: “복잡하지 않아도 진짜 Workflow다”

### 링크

- 쇼케이스 검색어: `대외활동 큐레이션`
- [배포 서비스](https://activity-curation.vercel.app)
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/N186_%EC%9D%B4%EC%9E%AC%ED%98%B8)
- [검증 하네스와 실제 버그 발견 PR #1733](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1733)
- [Workflow 완성과 시각화 PR #2407](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2407)

### 단순한 하루 사이클

이 프로젝트의 Workflow는 다음 두 줄로 정리된다.

1. 계획 → Issue → 작은 커밋 → 기능 검증
2. 코드 검토 → 수정·재테스트 → 비밀값 검사 → push → PR

### 실제 사용 증거

PR #1733에서 `test-writer`와 `code-reviewer`를 만들고 실제 코드에 돌렸다. 검증 Agent가 다음 두 버그를 찾았다.

- “재학생 제외” 조건에서 휴학생이 빠진 문제
- 지역 판별 함수가 빈 값에서 실패하는 문제

작성자는 “앞으로도 항상 믿을 수 있는지는 더 써봐야 한다”고 기록했다. 이것도 좋은 태도다. Agent가 한 번 버그를 찾았다고 무조건 신뢰하지 않았다.

### 하루 체크아웃과 가장 가까운 비교 대상

하루 체크아웃의 현재 규모에는 OpenSeed나 리뷰지기보다 이 방식이 더 잘 맞는다.

- Agent 2개 정도
- Skill 2~3개
- 실제로 돌린 테스트
- 실제로 잡은 버그
- PR에 결과 기록

### 가져올 것

`docs/WORKFLOW.md`의 각 단계에 다음 4개를 붙인다.

- 입력
- 실행 순서
- 확인 기준
- 결과물

현재 문서에도 대부분 있지만, 실제 파일·PR 링크가 더 필요하다.

---

## 9. 사례 5 — 끼니픽: “Skill 수보다 실제 데이터와 브라우저 검증”

### 링크

- 쇼케이스 검색어: `끼니픽`
- [배포 서비스](https://hub-pyo3.vercel.app)
- [시연 영상](https://www.youtube.com/watch?v=5hsBXxaPsTY)
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/N179_%ED%91%9C%EC%A0%95%ED%95%9C)
- [핵심 기능 점검 PR #2105](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2105)

### 특징

등록한 전용 도구는 사실상 `design-system` 하나다. 대신 다음 반복이 구체적이다.

> 실제 API 호출 → 이상한 데이터 발견 → 휴리스틱 수정 → 실제 데이터로 다시 확인

UI도 다음처럼 확인했다.

> 코드 수정 → 로컬 서버 → 실제 클릭 → 스크린샷·DOM·Network 확인

### 왜 참고할 만한가

Agent와 Skill 개수는 적지만, 무엇을 성공 근거로 삼았는지가 분명하다. 네가 전용 브라우저로 Vercel·Render·Supabase·Gemini를 확인한 것과 비슷하다.

### 하루 체크아웃에 가져올 것

“Browser Agent를 사용했다”보다 다음처럼 쓴다.

- 빈 입력에서 버튼이 비활성화됨
- 동의 후 실제 Gemini 구조화 결과가 나타남
- 로그인 사용자의 사진이 Supabase Storage에 저장됨
- 새로고침 후 IndexedDB 기록이 유지됨
- 삭제 후 캘린더와 상세 화면에서 기록이 사라짐

도구 이름이 아니라 **관찰한 상태 변화**를 증거로 남기는 것이 중요하다.

---

## 10. 사례 6 — FirstPR: “Skill을 실제 배포 gate까지 연결”

### 링크

- 쇼케이스 검색어: `FirstPR`
- [배포 서비스](https://kimsunho2000.github.io/hub/#/)
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/N034_%EA%B9%80%EC%84%A0%ED%98%B8)
- [디자인·코드·커밋 Skill PR #418](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/418)
- [E2E·실서버·배포 gate PR #2051](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2051)

### 실제 Skill

- `code-convention`
- `security-convention`
- `backend-testing`
- `api-smoke-test`
- `firstpr-ui`
- `explain-work`
- `pr-draft`
- `commit-message`

PR #418에서는 문서만 만든 것이 아니라 `.gitignore`를 조정해 `.claude/skills`가 실제 커밋되도록 했다.

### 검증이 강한 부분

PR #2051에서 다음을 연결했다.

- 실제 GitHub·LLM API를 사용하는 Playwright E2E
- Render 백엔드 배포
- GitHub Pages 프런트 배포
- `render.yaml` 빌드 명령에 테스트 포함
- 테스트 실패 시 배포 차단

GitHub Actions를 직접 수정하기 어려운 제약에서 배포 명령에 테스트 gate를 넣었다.

### 하루 체크아웃에 가져올 것

루트 `package.json`에 통합 검증 명령 하나를 두는 것이 가장 작은 적용이다.

예상 역할:

1. client test
2. server test
3. client build

배포 gate까지 바로 연결할 필요는 없다. 먼저 로컬에서 한 명령으로 재현되는 것부터 만든다.

---

## 11. 사례 7 — LocalTwin: “작업 결과뿐 아니라 과정도 검증한다”

### 링크

- 쇼케이스 검색어: `LocalTwin`
- [배포 서비스](https://localtwin-product.vercel.app/)
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/N187_%EC%A0%95%ED%98%84%EC%9A%B0)
- [개발문서·작업 패킷·하네스 PR #511](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/511)
- [Release verification PR #1648](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1648)

### Harness 구성

- Task packet
- Run report
- Failure log
- Agent 평가 기준
- 문서 링크 검사
- TypeScript·lint·Vitest·build
- API lint·format·pytest
- Git Hook
- CI

작업 전에 범위와 검증 방법을 적고, 작업 뒤 실제 결과와 한계를 기록했다.

### 좋은 점

PR #1648의 release verification은 단순히 “빌드 성공”으로 끝나지 않는다.

- Web test 79개
- API test 119개
- typecheck
- lint
- production build
- 코드 구조 검사
- Task Packet 검사
- Product URL 200
- Catalog API 200
- 공개하면 안 되는 Scene API가 404로 차단되는지 확인

**성공해야 할 것뿐 아니라 실패해야 안전한 것도 검증했다.**

### 하루 체크아웃에 가져올 것

다음 형태의 아주 작은 작업 기록만 가져오면 충분하다.

```text
목표:
비목표:
변경 파일:
자동 확인:
브라우저 확인:
미확인:
다음 작업:
```

### 가져오지 않을 것

문서 포털, 별도 Wiki 구조, 문서 트리 자동 검사, 복잡한 Hook·CI는 현재 프로젝트에는 과하다.

---

## 12. 사례 8 — 아맞다!: “GitHub 상태를 읽고 다음 작업을 이어가는 작업반장”

### 링크

- 쇼케이스 검색어: `아맞다!`
- [배포 서비스](https://hub-ppre1udes-projects.vercel.app)
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/N176_%EC%B5%9C%EC%9E%AC%EC%9B%90)
- [GitHub 중심 작업 관리 PR #941](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/941)
- [최종 기능과 Agent Workflow 문서 PR #2383](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2383)

### 핵심 구조

제품 기준과 실행 상태의 저장 위치를 나눴다.

- 제품 기준: Wiki
- 실행 상태: Issues와 Project
- 코드 계약: 저장소 문서

저장소 전용 `작업반장`은 다음을 처리한다.

1. GitHub Project에서 실행 가능한 Issue 찾기
2. 최신 main에서 브랜치·worktree 준비
3. 테스트·구현·독립 리뷰 진행
4. PR 작성과 리뷰 반영
5. 병합 후 Issue·Project·브랜치 상태 정리

### 강점

세션이 바뀌어도 현재 상태를 GitHub에서 다시 읽고 이어갈 수 있다. “어제 어디까지 했더라?”를 채팅 기억에만 의존하지 않는다.

### 주의할 점

이 프로젝트는 Agent와 검토 도구가 매우 많다. Office Hours, grill-me, CEO·디자인·엔지니어링 plan review, 서브에이전트, CodeRabbit, gstack까지 모두 복사하면 하루 체크아웃보다 하네스 운영이 더 큰 일이 된다.

### 하루 체크아웃에 가져올 것

작업반장 전체가 아니라 다음 한 줄만 가져온다.

> 새 작업을 시작할 때 `docs/backlog.md`, 최근 Git log, 현재 Git status, 직전 검증 기록을 먼저 읽고 다음 미완료 항목 하나를 선택한다.

---

## 13. 사례 9 — 답냥이: “멀티에이전트를 줄이는 것도 발전이다”

### 링크

- 쇼케이스 검색어: `답냥이`
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/Catsmanager)
- [초기 화면·접근성·CI PR #793](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/793)
- [AI 생성·검색 실험 PR #1452](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1452)

### 운영 변화

초기에는 역할별 Agent를 병렬로 두었다. 하지만 여러 Agent가 같은 코드와 문서를 수정하면서 다음 문제가 생겼다.

- 변경 영역 겹침
- 책임 경계 불명확
- 통합 비용 증가

그래서 역할 중심 멀티에이전트에서 작업 중심 방식으로 바꿨다.

- Claude Code 하나를 PM·통합자로 둠
- `CLAUDE.md`, `AGENTS.md`, PRD, MVP 문서를 기준으로 사용
- 산출물이 독립적이고 쓰기 경로가 겹치지 않을 때만 하위 Agent에 위임
- 최종 판단과 통합은 하나의 Agent와 사람이 담당

### 하루 체크아웃에 중요한 교훈

Agent를 더 만드는 것이 무조건 발전은 아니다.

현재 하루 체크아웃은 `task-planner`, `feature-verifier`, 작업 Agent 정도면 충분하다. 새 Agent를 만들기 전에 기존 두 역할이 실제로 반복 사용되고 기록되는지를 먼저 확인하는 것이 낫다.

---

## 14. 사례 10 — OpenSeed: 자동화된 Coordinator·Worker Workflow

### 링크

- 쇼케이스 검색어: `OpenSeed`
- [배포 서비스](https://openseed-fe.vercel.app/)
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/N165_%EC%A7%84%EB%AF%B8%EB%82%98)
- [Vertical Slice Workflow PR #1441](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1441)
- [PR 생성·리뷰 반영 Agent PR #1623](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1623)

### 구조

- Coordinator Agent: PR·CI·리뷰·Merge와 Resource Lock 확인
- Worker Agent: 독립 worktree에서 수직 슬라이스 하나를 TDD로 구현
- Vertical Slice Skill: 계획, Red·Green·Refactor, 리뷰 수정, 실패 복구
- `/merge-approved`: 사람 승인 없이는 merge하지 않음

상태를 `.slice-state/VS-001.yml`, 실패를 `workflow-failures.yml`, 학습을 `implementation-lessons.yml`에 기록했다.

### 좋은 점

사람이 최종 merge 권한을 유지하면서 반복적인 GitHub 상태 확인과 작업 할당을 자동화하려고 했다.

### 비판적으로 볼 점

PR #1441 본문에서도 작성자가 “단계가 너무 복잡해 단순화가 필요하다”고 적었다. 복잡한 자동화는 다음 문제가 있다.

- 하네스 자체를 디버깅해야 함
- 상태 파일과 GitHub 실제 상태가 어긋날 수 있음
- 작은 프로젝트에서 기능보다 운영 코드가 커질 수 있음

### 하루 체크아웃에 적용하지 않을 것

Coordinator, 병렬 Worker, Resource Lock, 자동 merge는 필요 없다. 혼자 작업하는 현재 프로젝트에는 관리 비용이 더 크다.

---

## 15. 사례 11 — 리뷰지기: “Worker의 완료 선언을 믿지 않는다”

### 링크

- 쇼케이스 검색어: `리뷰지기`
- [소스 브랜치](https://github.com/connect-AIAgentChallenge-26-1/hub/tree/N092_%EB%B0%95%EC%B1%84%EB%B9%88)
- [하네스 구조 수정 PR #1326](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1326)
- [Harness Phase 재구성 PR #1752](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1752)

### 구조

- Claude: PRD·아키텍처·Phase 계획·Worker 지시문
- Codex: 하네스 실행·코드·로그
- 공통 규칙: `AGENTS.md`
- Worker: 작업 수행
- Controller: 종료 코드, 변경 경로, 필수 산출물, 인수 기준 확인
- 실패: 현상, 원인 가설, 증거, 조치로 분리해 기록

PR #1752의 실제 변경 파일에는 `HARNESS/phases/` 아래 단계별 prompt가 다수 존재했다.

### 가장 중요한 원칙

> AI가 “완료했습니다”라고 말하는 것은 완료 근거가 아니다. 사람이 정한 계약과 독립 검증을 통과해야 한다.

### 하루 체크아웃에 가져올 것

Controller 프로그램 전체가 아니라 다음 원칙만 가져온다.

- 테스트 출력
- 빌드 출력
- 실제 API 응답
- 브라우저 상태
- DB·Storage 상태

이 중 필요한 근거가 없으면 “통과”가 아니라 “미확인”으로 기록한다.

### 가져오지 않을 것

Phase가 많고 파일 구조가 크다. 현재 하루 체크아웃의 남은 작업에는 과하다.

---

## 16. 사례에서 공통으로 발견한 패턴

### 16.1 잘한 사람은 Agent 수가 아니라 판단 기준이 명확했다

강한 사례는 다음을 구분했다.

- 사람이 결정: 문제, 우선순위, 개인정보 원칙, 범위, 최종 승인
- AI가 수행: 코드 탐색, 계획 초안, 구현, 테스트, 브라우저 조작, 문서 초안
- 자동 판정: 테스트, 빌드, lint, 응답 코드, 파일 구조

### 16.2 Skill은 처음부터 만든 것이 아니라 반복 문제에서 나왔다

가장 설득력 있는 흐름은 크로스체크였다.

1. 같은 판단을 여러 번 설명함
2. 실수가 반복됨
3. 좁은 Skill로 고정
4. 다음 PR에서 실제 사용

### 16.3 구현자와 검증자를 분리했다

여러 프로젝트에서 표현은 달라도 같은 원칙이 보였다.

- requirement-verifier
- feature-verifier
- verifier
- code-reviewer
- Controller

핵심은 “다른 AI 모델”이 아니라 **구현 내용을 그대로 전달받지 않고 완료 조건과 결과만 독립적으로 대조하는 것**이다.

### 16.4 자동 테스트만으로 끝내지 않았다

좋은 사례는 다음을 조합했다.

- 순수 함수 테스트
- API smoke
- 실제 LLM 호출
- 실제 DB
- 브라우저 클릭
- Network·로그
- 배포 URL

### 16.5 실패하거나 안 한 것도 기록했다

신뢰도가 높은 참가자는 다음을 숨기지 않았다.

- Agent를 아직 실제 사용하지 않았음
- 모든 작업에 Workflow를 적용하지 않았음
- 검증 Agent를 계속 믿을 수 있을지 모름
- 자동화가 너무 복잡함
- 실제 환경에서 아직 확인하지 못함

### 16.6 강한 Harness는 상태와 증거를 남겼다

문서 수가 많은 것이 핵심이 아니다.

- 지금 어느 단계인가
- 왜 멈췄는가
- 무엇을 통과했는가
- 무엇은 확인하지 못했는가
- 다음에 어디서 재개하는가

이 정보가 세션 밖 파일이나 GitHub에 남아 있었다.

---

## 17. 하루 체크아웃의 현재 상태 진단

### 17.1 이미 잘한 부분

#### A. 실제 Agent 파일이 있다

- `.claude/agents/task-planner.md`
- `.claude/agents/feature-verifier.md`

두 Agent는 역할과 금지 사항이 분리돼 있다.

- planner는 코드를 쓰지 않는다.
- verifier는 코드를 수정하지 않는다.
- verifier의 결과는 PASS/FAIL/미확인과 근거를 요구한다.

이 정도면 이름만 붙인 Agent가 아니라 최소한의 역할 계약이 있다.

#### B. 실제 Skill 파일이 있다

- `.claude/skills/feature-development/SKILL.md`
- `.claude/skills/write-test/SKILL.md`

`feature-development`는 현재 코드 확인 → 화면·데이터·흐름 설계 → 방법 비교 → 완료 기준 → 승인 → 구현 순서를 정한다.

`write-test`는 케이스 승인 → Red → Green 순서를 정한다.

`.claude/skills/retro/SKILL.md`는 회고·PR·체크아웃 문안 작성을 돕는 개인용 파일이다. 개발 절차와 직접 연결되지 않으므로 프로젝트 Skill 증거에서 제외한다.

#### C. Skill과 실제 작업의 연결 증거가 있다

Git 기록에서 다음이 확인된다.

- `e9610bf`: 삭제 기능 설계서와 `feature-development` Skill 작성
- `e50e9d2`: 삭제 API·화면·서비스·테스트 구현
- `b4adbfe`: `write-test` Skill과 주간 필터 함수·테스트 작성
- `ed19a41`: planner와 verifier Agent 추가
- `eef64c2`: 최종 Workflow 문서화

특히 삭제 기능은 설계 PR #1575와 구현 PR #1701이 분리돼 있어 비교적 강한 증거다.

#### D. 자동 테스트 밖의 실제 환경 검증이 강하다

2026-07-30 최종 확인 기준:

- 프런트엔드 테스트 21개
- 백엔드 테스트 12개
- production build
- Vercel 첫 화면
- Render health
- 기존 로그인 세션 복원
- 실제 Gemini 결과
- Supabase 기록·사진 저장
- 캘린더와 상세 화면
- 검증용 기록 삭제
- IndexedDB 새로고침 유지
- Render 로그
- 브라우저 오류·경고 없음

이 부분은 많은 참가자와 비교해도 약하지 않다.

#### E. 사람이 결정한 범위가 분명하다

하루 체크아웃의 중요한 제품 결정은 Agent가 임의로 정한 것이 아니다.

- 게스트 기록은 브라우저에 저장
- AI 전송은 동의 후 수행
- 로그인 저장과 게스트 저장 분리
- Gemini·Supabase 키를 브라우저에 노출하지 않음
- 상담 대체가 아니라 기다리는 동안 감정 정리를 돕는 도구

이 판단은 쇼케이스의 “사람과 AI 역할 분리”에 적합하다.

### 17.2 약한 부분

#### A. Workflow가 대부분 작업 후반에 정리됐다

`docs/WORKFLOW.md`는 7월 30일에 작성됐다. 실제로 있던 작업 습관을 잘 정리했지만, 4주 동안 매번 이 문서를 보고 실행한 것은 아니다.

따라서 다음처럼 말하는 것이 정확하다.

> 4주 동안 반복된 작업 방식을 마지막에 문서로 정리했다.

다음처럼 말하면 과장이다.

> 처음부터 이 완성된 Workflow를 매일 엄격하게 운영했다.

#### B. Agent 실행 결과가 일관되게 파일로 남지 않았다

`task-planner`가 만든 계획, `feature-verifier`가 만든 검증 보고서가 작업별로 같은 위치와 형식으로 누적되지는 않았다.

Agent 파일은 있지만 “언제 어떤 입력으로 실행했고 무엇을 반환했는가”를 전부 추적하기 어렵다.

#### C. 통합 검증 명령은 만들었지만 수동이다

루트의 `npm run verify`가 다음을 한 번에 실행한다.

- 클라이언트 테스트
- 서버 테스트
- 프로덕션 빌드

같은 로컬 품질 기준을 다시 실행할 수 있게 됐지만, Hook이나 CI가 강제하지는 않는다.

#### D. 일부 중요한 증거가 Git에 포함되지 않았다

현재 untracked 상태:

- `docs/verification-2026-07-29.md`
- `client/src/services/cloudCheckinRepository.js`

`retro` 파일은 개발 Workflow 증거가 아니어서 로컬 Git exclude 대상으로 결정했다. 검증 기록은 실제 배포 근거이므로 Git 포함 대상으로 남는다. `cloudCheckinRepository.js`는 코드 사용 여부를 별도로 확인해야 한다.

이 상태로 다른 사람이 브랜치만 받으면 일부 Workflow 근거를 볼 수 없다.

#### E. 실패 기록이 구조화돼 있지 않다

회고와 진행 문서에 시행착오는 남아 있지만 다음 형식으로 일관되게 연결되지는 않는다.

- 현상
- 최초 가설
- 확인한 증거
- 실제 원인
- 적용한 수정
- 재검증 결과
- 다음 작업에서 막을 규칙

#### F. Hook·CI·Merge gate는 없다

테스트와 빌드는 실제로 실행했지만, 커밋이나 push, 배포 전에 자동으로 강제되지는 않는다.

다만 이것은 현재 프로젝트에서 치명적인 결함은 아니다. 혼자 작업하고 마감 단계인 만큼 지금 복잡한 CI를 추가하는 것은 추천하지 않는다.

---

## 18. 성숙도 비교

0~4 단계로 단순화하면 다음과 같다.

| 단계 | 의미 |
|---|---|
| 0 | 그때그때 채팅으로 요청 |
| 1 | 반복 순서를 문서화 |
| 2 | Agent·Skill·테스트로 반복 가능 |
| 3 | 독립 검증과 실행 증거가 일관되게 저장 |
| 4 | Hook·CI·Controller가 규칙과 상태를 자동 관리 |

### 하루 체크아웃

| 항목 | 현재 단계 | 근거 |
|---|---:|---|
| 계획과 범위 설정 | 2 | planner, backlog, 기능 설계서 |
| TDD | 2 | 삭제 기능, 주간 필터 |
| 독립 검증 | 2~3 | verifier 역할과 실제 배포 브라우저 검증은 있으나 결과 저장 형식이 일정하지 않음 |
| Skill 관리 | 2 | 개발과 연결된 두 Skill과 적용 커밋이 있으나 반복 횟수 기록은 부족 |
| 실행 기록 | 2 | progress·verification 문서가 있으나 작업별 형식이 일정하지 않음 |
| 자동 Harness | 2 | 통합 `npm run verify`는 있으나 Hook·CI·상태 Controller는 없음 |

### 종합

> **Workflow 성숙도 2단계: 실제로 반복 가능한 가벼운 Workflow는 있다. 3단계로 가려면 독립 검증 결과와 실행 기록을 정해진 형식으로 Git에 남겨야 한다.**

리뷰지기·OpenSeed·LocalTwin은 3~4단계를 시도했다. 하지만 그 복잡도를 그대로 따라갈 필요는 없다.

---

## 19. 하루 체크아웃에 가장 맞는 조합

다른 사람 한 명을 그대로 복사하지 말고 다음을 조합하는 것이 좋다.

### 크로스체크에서

- 반복해서 설명한 판단만 Skill로 만든다.
- AI 결과는 사람이 만든 작은 fixture와 비교한다.

### 전자 생물 AI 매니저에서

- 구현자와 검증자를 분리한다.
- 통합 검증 명령 하나를 만든다.

### albafit에서

- Workflow 단계마다 실제 PR·커밋·이슈 링크를 단다.
- 모든 작업에서 다 지켰다고 과장하지 않는다.

### 대외활동 큐레이션에서

- 계획 → 개발 → 검증 → 올리기의 단순한 하루 사이클을 유지한다.

### 끼니픽에서

- Agent 이름보다 실제 API·브라우저 상태 변화를 기록한다.

### LocalTwin에서

- 작은 작업 패킷과 검증 결과 형식만 가져온다.

### 답냥이에서

- Agent를 늘리지 않고 단일 통합자와 비중첩 작업만 유지한다.

---

## 20. 추천하는 최소 개선안

새로운 대형 기능을 만들지 않고 Workflow만 정리한다면 아래 순서가 적절하다.

### 1순위 — 현재 untracked 파일 결정

각 파일을 확인해 다음 중 하나로 명확히 결정한다.

- 프로젝트의 실제 근거면 Git에 포함
- 임시·중복 파일이면 제외 이유를 기록하고 삭제 또는 ignore

다음 두 파일은 성격을 구분해 처리한다.

- `.claude/skills/retro/SKILL.md`: 개인 글쓰기 보조 파일이므로 로컬 exclude
- `docs/verification-2026-07-29.md`: 실제 배포 검증 근거이므로 Git 포함

### 2순위 — 통합 검증 명령

한 명령으로 다음을 실행하게 한다.

1. frontend test
2. backend test
3. production build

이것만 있어도 “테스트를 했다”에서 “누구나 같은 절차를 다시 실행할 수 있다”로 바뀐다.

### 3순위 — 작업별 실행 기록

`docs/runs/` 또는 `docs/verification/` 아래 다음 형식으로 저장한다.

```markdown
# 작업명

## 목표

## 비목표

## 사용한 Agent·Skill

## 자동 검증

## 브라우저·API·DB 검증

## 실패와 수정

## 미확인

## 관련 PR·커밋
```

### 4순위 — Workflow 문서에 실제 근거 링크

`docs/WORKFLOW.md`의 각 단계에 실제 PR을 연결한다.

- Agent 추가: #1254
- 기능 개발 Skill: #1575
- 삭제 TDD: #1701
- 추가 TDD: #1851
- IndexedDB·Supabase: #2071
- 배포: #2194
- PWA·showcase: #2318

### 5순위 — AI 평가 fixture

감정 정리 예시 5~10개에 사람이 기대한 결과를 적는다.

목적은 Gemini 답이 완전히 같은 문장인지 보는 것이 아니다.

- 필수 키가 있는가
- 원인이 입력과 모순되지 않는가
- 작은 행동이 위험하거나 과도하지 않은가
- 감정 표현이 입력 맥락과 크게 어긋나지 않는가

### 지금 하지 않을 것

- Coordinator·Worker 자동 할당
- 병렬 Agent 3개
- Resource Lock
- 자동 merge
- HMAC 이벤트 저널
- 큰 Wiki 시스템
- 복잡한 pre-commit Hook
- Agent 수 늘리기

현재 프로젝트 규모에서는 과하다.

---

## 21. 발표나 문서에서 정직하게 설명하는 문장

### Workflow 설명

> 처음부터 완성된 Workflow를 가지고 시작한 것은 아닙니다. 기능을 만들면서 계획 없이 바로 코드를 수정하거나 검증 근거가 흩어지는 문제를 겪었고, 반복해서 사용한 순서를 마지막에 정리했습니다. 현재는 요구사항과 기존 코드를 확인하고, 위험한 기능은 설계서와 테스트를 먼저 작성한 뒤 구현하며, 자동 테스트와 실제 브라우저·서버 로그를 함께 확인하는 흐름으로 작업합니다.

### Agent 설명

> 계획을 만드는 task-planner와 구현 결과만 확인하는 feature-verifier를 분리했습니다. 구현 Agent가 스스로 완료했다고 말하는 것만 믿지 않고, 테스트 결과와 API 응답, 실제 배포 화면을 근거로 통과 여부를 판단했습니다.

### Skill 설명

> Skill을 많이 만드는 데 집중하지 않고, 실제로 반복된 두 작업을 먼저 절차로 만들었습니다. feature-development는 새 기능을 만들기 전에 화면·데이터·API 흐름과 완료 기준을 정하고, write-test는 테스트 케이스 승인 후 Red와 Green 순서를 지키게 합니다.

### Harness 설명

> 완전히 자동화된 하네스까지 만들지는 않았습니다. 현재는 CLAUDE.md, Agent·Skill 파일과 `npm run verify`가 연결된 가벼운 하네스입니다. 테스트와 빌드는 한 명령으로 재현하고, 실제 브라우저·API·DB 검증은 수동으로 확인합니다.

### 사람이 한 일과 AI가 한 일

> 서비스의 문제, 개인정보 처리 원칙, AI 전송 동의와 저장 방식은 제가 결정했습니다. Agent는 기존 코드를 읽고 작업을 나누거나 코드와 테스트 초안을 만들고, 배포 화면과 로그를 확인했습니다. 최종 적용 여부와 완료 판단은 실제 실행 결과를 보고 제가 결정했습니다.

---

## 22. 최종 판단

다른 참가자를 본 뒤 하루 체크아웃을 낮게 평가할 필요는 없다.

하루 체크아웃은 다음 면에서 충분히 실제적이다.

- 민감한 감정 기록을 다루는 제품 원칙
- 게스트 IndexedDB와 로그인 Supabase 분리
- AI 전송 동의
- 설계 후 TDD를 적용한 기능
- FE·BE·DB·AI 실제 배포
- 브라우저와 서버 로그를 통한 통합 검증
- 동작하는 데모와 영상

부족한 것은 주로 제품 기능이 아니라 **개발 과정을 재현하고 증명하는 운영 층**이다.

가장 적절한 다음 단계는 Agent를 더 만드는 것이 아니다.

1. 이미 만든 Agent와 Skill의 실제 사용 근거를 연결한다.
2. 검증 명령을 하나로 묶는다.
3. 작업별 목표와 결과를 같은 형식으로 남긴다.
4. 실제 검증 문서를 Git에 포함하고 개인 글쓰기 보조 파일은 증거에서 제외한다.

이 네 가지를 하면 하루 체크아웃은 복잡한 자동화 없이도 “Agent와 대화하며 우연히 완성한 프로젝트”에서 “사람의 판단과 Agent의 실행을 구분하고, 같은 방식으로 다시 작업할 수 있는 프로젝트”로 한 단계 올라간다.
