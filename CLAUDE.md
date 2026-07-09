# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드다.

## 프로젝트

**잔소리봇 (Nagging-bot)** — "AI Agent Challenge" 프로젝트. 대학생은 할 일을 시작하지 못하고 미루는 이유가 저마다 다르다 — 뭐부터 해야 할지 몰라서, 하기 싫어서, 놀고 싶어서 등. 하지만 기존 리마인더 앱은 "시간 됐어요" 같은 획일적 알림만 보낼 뿐, 사용자가 *왜* 못 시작하는지에 맞춘 해법을 제시하지 못해 같은 회피가 반복된다.

핵심 아이디어는 **회피 이유에 맞춘 맞춤 개입**이다: 에이전트가 사용자가 시작하지 못하는 이유를 파악하고, 그에 맞는 첫 행동(마이크로태스크)을 제안해 실제로 시작하도록 돕는다. 단순한 "리마인더 + AI + 캐릭터"가 아니라, 회피 이유를 진단하고 그에 맞게 반응하는 것이 차별점이며, 챗봇형 UI로 넛지를 전달하는 것 자체가 핵심은 아니다.

저장소는 현재 스캐폴드 단계다: Vite + React 기반 랜딩/소개 페이지(`src/components/ProjectIntro.jsx`)가 컨셉(문제 정의, 서비스 흐름 타임라인, 기능 그룹)을 보여준다. 백엔드, 에이전트 로직, 데이터 영속화는 아직 없다.

참고 문서: [@docs/plan.md](docs/plan.md) (기획서), [@docs/checklist.md](docs/checklist.md) (작업 분해).

## 핵심 기능

- ① 첫 행동(마이크로태스크) 제안 — "무엇부터 시작할지"를 해결
- ② 회피 원인 기반 맞춤 개입 — "왜 시작하지 못하는지"를 해결
- 두 기능이 함께 동작해야 사용자가 실제로 첫 행동을 시작함 — 하나만으로는 불충분.

## 기술 스택

- 프런트엔드: Vite + React (구현됨)
- 백엔드: Express — **아직 미착수**. 관련 코드를 이미 있는 것처럼 작성하지 말 것.
- 라우팅 라이브러리, 폴더 구조, PWA manifest 등 세부 결정은 **추후 결정** — 지금 임의로 확정하지 말 것.

## 명령어

```
npm run dev       # Vite 개발 서버 실행
npm run build     # 프로덕션 빌드
npm run preview   # 로컬에서 프로덕션 빌드 미리보기
npm run lint      # oxlint 실행
```

이 저장소에는 아직 구성된 테스트 스위트가 없다.

## 아키텍처

- 엔트리 포인트: `src/main.jsx`가 `<App />`(`src/App.jsx`)을 `index.html`의 `#root`에 마운트한다.
- `App.jsx`는 현재 `ProjectIntro`(프로젝트 소개 페이지)만 렌더링한다. 온보딩, 체크인, 넛지, 대시보드 등 실제 기능이 추가되면 `App.jsx`는 단일 정적 페이지가 아니라 실제 라우터/레이아웃으로 확장될 예정이다.
- `ProjectIntro.jsx`는 콘텐츠-as-데이터 패턴을 따른다: 페이지 카피는 파일 상단의 평범한 배열/객체(`PROBLEM_CARDS`, `TIMELINE_ITEMS`, `FEATURE_GROUPS`)에 두고, 아래 JSX는 그것을 매핑만 한다. 앞으로 추가할 섹션도 반복되는 JSX 블록을 하드코딩하는 대신 이 패턴을 따를 것.
- 아이콘은 손으로 작성한 인라인 SVG 컴포넌트다(아이콘 라이브러리 의존성 없음) — 새 아이콘도 이 방식(viewBox 24x24, stroke 기반, `aria-hidden`/`focusable="false"`)과 일관되게 유지할 것.
- 스타일링은 컴포넌트별 순수 CSS(`ComponentName.css`를 `ComponentName.jsx` 옆에 두고 직접 import)다 — CSS-in-JS나 Tailwind는 쓰지 않는다.
- 린팅은 ESLint가 아니라 `oxlint`를 사용한다 — 설정은 `.oxlintrc.json`, `react`/`oxc` 플러그인 활성화(`react/rules-of-hooks`는 error).

## 하지 말 것

**(컨벤션)**
- `any` 타입 금지
- 외부 UI 라이브러리 금지 — 별도 합의 전까지

**(설계)**
- `subjects`(과목) 테이블을 두지 않는다 — plan.md 문제 정의에 근거 없음
- 체크인은 날짜 단위 기록이 아니라 할일별 이벤트 로그(`task_events`) 구조로 설계한다 — "매일 체크인"이 아니라 "세션 재개용 재트리거"임에 유의
