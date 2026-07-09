# CLAUDE.md

## Role

이 저장소에서 Claude Code는 기획 검토자, 구현 보조자, 코드 리뷰어 역할을 한다.

## Project summary

프로젝트명은 `MBTI 기반 공부법 및 스트레스 관리 웹앱`이다.

MBTI는 사람을 고정적으로 분류하는 도구가 아니라 학습 선호를 탐색하는 출발점으로만 사용한다. 실제 추천은 공부 성향 설문과 스트레스 반응 설문을 함께 반영한다.

## Before editing

코드나 문서를 수정하기 전에 반드시 다음을 보고한다.

1. 현재 작업 경로
2. 현재 브랜치
3. `git status`
4. 읽은 문서
5. 수정할 파일 목록
6. 새로 만들 파일 목록
7. 완료 기준

## Planning rules

기획은 다음 순서로 정리한다.

1. 문제 정의
2. 핵심 기능 2~3개
3. User Flow
4. IA
5. 와이어프레임
6. MVP 범위
7. 제외 기능
8. 리스크와 대응

## Coding rules

- 현재 저장소 구조를 유지한다.
- Vite + React 구조라면 그대로 둔다.
- 새 프레임워크를 도입하지 않는다.
- 외부 라이브러리는 확인 전 추가하지 않는다.
- 로직은 작게 분리한다.
- 추천 로직은 MBTI 유형명만으로 결정하지 않는다.
- localStorage 기반 MVP를 유지한다.
- 회원가입, AI API, 성적 예측, 커뮤니티, 캘린더/알림을 추가하지 않는다.

## Review rules

검토할 때는 다음을 확인한다.

- 주제가 흐트러지지 않았는가
- MBTI 과신 표현이 없는가
- 스트레스 진단처럼 보이지 않는가
- 스트레스 기능이 치료나 위험군 판정처럼 보이지 않는가
- 성적 예측 기능이 들어가지 않았는가
- 결과가 오늘 바로 실행 가능한가
- README, plan, checklist가 서로 모순되지 않는가
- build/lint가 통과했는가

## PR rules

PR 전에는 다음을 확인한다.

- `git status`
- 변경 파일 목록
- `npm run build`
- `npm run lint` 가능 여부
- README 링크 정상 여부
- docs/plan.md와 docs/checklist.md 정상 여부
- node_modules, .DS_Store, 임시파일 제외 여부

## Hard rules

- MBTI를 사람을 고정 판단하는 도구처럼 표현하지 않는다.
- 스트레스 기능을 진단, 치료, 위험군 판정처럼 표현하지 않는다.
- 정신건강 진단이나 성적 예측 기능을 추가하지 않는다.
- 공부 인증류 기능, 비교/랭킹 기능, 경쟁 유도 기능을 추가하지 않는다.
- 사용자를 유형별로 줄 세우거나 우열을 암시하지 않는다.
- force push는 사용자 명시 허가 없이 사용하지 않는다.

## Design system

- 디자인 기준 문서는 `docs/design.md`다. 화면·컴포넌트·스타일을 만들거나 고칠 때 먼저 읽는다.
- 색/크기/여백/라운드는 `docs/design.md`의 CSS 토큰(`--primary`, `--accent`, `--tint-*`, `--r-*` 등)을 사용하고 임의 값 하드코딩을 피한다.
- 의미 규칙: 블루(`--primary`) = 학습·집중, 그린/민트(`--accent`, `--tint-green`) = 회복·완료.
- 결과/스트레스 화면에 비교·랭킹·진단·경고색(위험군 톤)을 쓰지 않는다. 점수 막대에는 "평가가 아닌 추천 신호" 맥락을 함께 둔다.
- 산출물은 `docs/design.md` §9 "의도 일치 자기점검 체크리스트"로 점검한 뒤 마무리한다.
- 현재 프로토타입 스타일은 `src/ProjectIntro.jsx`의 인라인 `<style>` 블록에 토큰으로 정의되어 있다(`index.css`/`App.css`의 옛 포트폴리오 스타일은 이 화면에서 사용되지 않음).

## Dev environment (결정 완료 · 설치는 2주차/승인까지 보류)

개발은 2주차에 본격화한다. 아래는 미리 정한 개발환경 맥락이며, 실제 의존성 설치와 서버 스캐폴딩은 사용자 승인 전까지 하지 않는다.

### 기본 스택

- 프론트엔드: React + Vite + JavaScript (현재 구조 유지, Next.js 전환 금지).
- 백엔드(2주차 이후, 필요 시): Node.js + Express.
- ⚠️ MVP는 여전히 **localStorage 기반**이다. Express는 MVP 범위 밖이며, 저장·공유가 실제로 필요한 기능이 생길 때만 도입한다. 그전까지 서버 코드는 만들지 않는다.

### 목표 디렉터리 구조 (2주차 적용 예정, 지금 이동 X)

```text
hub/
├─ client/        # React + Vite 프론트 (현재 src/, index.html, vite.config.js 이전 대상)
│  ├─ src/
│  │  ├─ components/   # 화면 단위 컴포넌트
│  │  ├─ data/         # questions.js 등 설문·추천 데이터
│  │  ├─ lib/          # scoring / recommendations / storage
│  │  └─ styles/       # design.md 토큰 CSS
│  └─ ...
├─ server/        # Express API (도입 시점에만 생성)
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ controllers/
│  │  └─ index.js
│  └─ ...
└─ docs/          # plan, checklist, context, design 등
```

- 현재는 루트에 Vite 프론트가 있다. 위 구조로의 이동은 2주차에 별도 작업으로 진행하고, 이번에는 문서 결정만 남긴다.

### 라이브러리 후보 (승인 후 설치)

- 프론트: `react-router-dom`(화면 라우팅 필요 시), 기존 `eslint`/`@vitejs/plugin-react` 유지.
- 백엔드(도입 시): `express`, `cors`, `dotenv`, 개발용 `nodemon`. 입력 검증이 필요하면 `zod` 검토.
- 외부 UI 라이브러리·AI API·상태관리 라이브러리는 승인 없이 추가하지 않는다.

### 코드 컨벤션

- 언어: JavaScript (MVP는 TypeScript 미도입).
- 포맷: 2-space 들여쓰기, 세미콜론 사용, 큰따옴표. ESLint flat config(`eslint.config.js`) 기준을 따른다.
- 네이밍: 컴포넌트 파일·함수 PascalCase, 일반 함수/변수 camelCase, 상수 UPPER_SNAKE_CASE.
- 로직은 작게 분리한다(scoring/recommendations/storage 경계 유지). 추천은 규칙 기반을 유지한다.

### 커밋 로그 규칙

- Conventional Commits: `feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`.
- 제목은 한국어 허용, 명령형 요약. 예: `feat: 결과 화면 디자인 시스템 적용`.
- 커밋 푸터에 공동 저자 표기를 남긴다: `Co-Authored-By: Claude ...`.
- 브랜치는 `work` 기준. amend/rebase/force push는 사용자 명시 허가 없이 사용하지 않는다.

### 개발 전 확정 사항

- 포트: 프론트 Vite `5173`, (도입 시) 서버 `3001`.
- API 경계: 서버 도입 시 `/api` 프리픽스. 프론트→서버 호출은 도입 후에만.
- 환경변수: `.env` 사용, 프론트 노출 값은 `VITE_` 프리픽스. `.env`는 커밋하지 않는다.
- 데이터 소유권: MVP 단계에서 결과·기록의 원천은 localStorage다. 서버는 도입 후 보조 저장소로만 검토한다.
- CORS: 서버 도입 시 개발 origin만 허용.
