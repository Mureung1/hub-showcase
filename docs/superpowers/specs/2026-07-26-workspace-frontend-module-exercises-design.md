# Learning Workspace 프론트엔드 트랙 실습 콘텐츠 설계

## 배경 및 목표

`LearningWorkspace`는 커리큘럼 단계(`GeneratedCurriculumStep`)를 넘나들며 학습하는 화면이지만,
지금은 어떤 단계에 있든 파일 확장자 기반의 고정된 mock 코드 4종(`reactCodeLines` 등,
`workspaceMission.ts`의 `pickCodeLines`) 중 하나만 보여준다. 테스트 케이스
(`createWorkspaceTestCases`, `workspaceInteraction.ts`)도 실제 실행 결과와 무관하게
스크립트로 정해진 통과/실패 패턴만 반환한다. 즉 커리큘럼 단계를 진행해도 실습 코드 내용은
바뀌지 않는다.

목표: **프론트엔드(React) 트랙의 12개 모듈**에 대해, 학습자가 Workspace에서 해당 모듈을
진행할 때 그 모듈의 주제(`topics`)와 실습 아이디어(`practiceIdeas`, `shared/curriculum/frontend.json`)에
실제로 맞는 스타터 코드·실습 설명·힌트를 보고, 실행 버튼으로 진짜 실행해볼 수 있게 한다.

## 범위

- 프론트엔드 트랙(`frontend.json`) 12개 모듈(`fe-01-01` ~ `fe-04-03`) 전체의 실습 콘텐츠 작성 및
  Workspace 연결까지를 다룬다.
- 실습 코드는 기존 코드러너/프리뷰 샌드박스(iframe, `react`/`react/jsx-runtime`/`.css`만 import 허용)
  안에서 실제로 실행 가능해야 한다.
- **범위 밖(후속 작업으로 명시, 이번 구현 없음):**
  - 코드러너 샌드박스에 `react-router-dom`/`zustand`(이미 설치된 의존성) import를 허용하는 확장
  - "테스트와 품질" 모듈에 대한 경량 `assert` 기반 실채점(기존 `vm.runInContext` JS 실행 경로 활용)
  - 다른 4개 트랙(backend/devops/fullstack/software-engineer, 48개 모듈)으로 동일 패턴 확장
  - 테스트 판정 자체를 실제 실행 결과 기반으로 바꾸는 것(현재도 스크립트 기반 유지)

## 1. 아키텍처 / 데이터 흐름

`GeneratedCurriculumStep.id`는 프론트/백엔드 양쪽 모두에서 `moduleId`와 동일하게 설정되어
있고(`backend/modules/curriculum/domain/generatedCurriculumPlan.mjs`,
`src/features/curriculum/model/curriculumGenerator.ts`), 트랙별 `moduleId` 접두사가 겹치지
않는다(`fe-`/`be-`/`do-`/`fs-`/`sw-`). 이를 이용해 최소 변경으로 연결한다.

- **신규 파일** `src/features/learning-workspace/data/frontendModuleExercises.ts`
  - `frontendModuleExercises: Record<string, ModuleExercise>` — key는 `moduleId`.
  - 프론트엔드 전용 데이터이므로 백엔드 에이전트도 참조하는 `shared/curriculum/*.json`은
    건드리지 않는다(`src/features/*/data`는 AGENTS.md 상 feature-owned 데이터 위치).
- **수정** `src/features/learning-workspace/workspaceMission.ts`
  - `createActiveMissionPresentation(mission, activeGeneratedStep)`에서, 기존 로직으로
    `title`/`detail`/`guideTitle`/`guideDetail`/`practiceDetail`/`hint`를 덮어쓴 뒤,
    `frontendModuleExercises[activeGeneratedStep.id]`가 있으면 `fileName`/`codeLines`/
    `practiceDetail`/`hint`/(있으면) `cssCode`를 추가로 덮어쓴다.
  - 매치되는 항목이 없으면(다른 트랙이거나 아직 콘텐츠가 없는 모듈) 지금과 완전히 동일하게
    동작한다 — 크래시 없는 안전한 fallback.
  - `WorkspaceMission` 타입에 `cssCode?: string` 필드를 추가한다(react 모드에서
    `createWorkspaceEditorFiles`가 `styles.css` 파일을 만들 때, 있으면 그 값을, 없으면 지금의
    고정 제네릭 CSS를 그대로 사용).

```ts
type ModuleExercise = {
  fileName: string
  codeLines: string[]
  cssCode?: string
  practiceDetail: string
  hint: string
}
```

## 2. 실행 샌드박스 제약사항

`preview/main.ts`의 `runtimeModules`는 `react`/`react/jsx-runtime`/`react/jsx-dev-runtime`만
제공하고, `backend/modules/code-runner/reactPreviewSource.mjs`의
`assertSupportedReactPreviewImports`도 `react`/`react/*`와 `.css`만 허용한다(`react-dom`도
막혀 있음). 실행 자체는 `new Function`으로 실제 iframe(브라우저) 컨텍스트에서 돌기 때문에
`fetch`, `useState`/`useEffect` 등 브라우저·React 표준 API는 문제없이 동작하지만,
`react-router`/`zustand` 같은 외부 라이브러리는 이번 범위에서 사용할 수 없다.

이 제약 때문에 12개 모듈 중 9개는 그대로 실행 가능한 실습으로, 3개(라우팅/테스트/빌드-배포)는
개념을 대체 표현한 실습으로 설계한다(아래 표에 명시).

## 3. 12개 모듈 콘텐츠 계획

원문(react.dev 등 공식 문서)을 그대로 복사하지 않고, 같은 개념·같은 API를 다루는 새 예제를
직접 작성한다. `frontend.json`에 이미 있는 `resources`(공식 문서 링크)는 그대로 노출되므로
원문이 필요하면 학습자가 그쪽에서 확인할 수 있다.

| moduleId | 파일명 | 다루는 topics | 실습 개요 |
|---|---|---|---|
| fe-01-01 | ProfileCard.jsx | 문서 구조/시맨틱 태그, 접근성 기본 | `header`/`main`/`section`/`article` 등 시맨틱 태그로 프로필 카드를 구성하고 `alt`/`aria-label` 등 접근성 속성을 채워 넣는 실습 |
| fe-01-02 | CardGrid.jsx (+cssCode) | Flexbox, Grid, 반응형 | CSS Grid/Flexbox로 3단 카드 레이아웃을 만들고 미디어 쿼리로 모바일 1단 전환 |
| fe-01-03 | TodoList.jsx | 배열/객체 메서드, 이벤트 처리 | 배열 상태(`useState`)로 To-do 추가/삭제/완료 토글, 배열 메서드(`map`/`filter`) 실습 |
| fe-02-01 | WeatherWidget.jsx | Promise, async/await, fetch, 에러 핸들링 | 공개 API(jsonplaceholder.typicode.com, CORS 허용)를 `fetch`로 호출해 로딩/에러/데이터 3상태를 다루는 위젯 |
| fe-02-02 | Dashboard.jsx | JSX/컴포넌트, props/state, 리스트 렌더링, key | 여러 하위 컴포넌트로 쪼갠 대시보드, `key`를 포함한 리스트 렌더링과 조건부 렌더링 |
| fe-02-03 | SearchableList.jsx | useState/useEffect, 커스텀 훅 | 검색어로 목록을 필터링하는 `useFilteredList` 커스텀 훅을 분리해 재사용하는 실습 |
| fe-03-01 | MiniRouterApp.jsx | 클라이언트 사이드 라우팅 개념 | **대체 실습**: `react-router` 없이 `useState`로 "현재 화면" 상태를 관리하며 다중 화면 전환을 직접 구현 — 코드 상단 주석으로 "실제 프로젝트에서는 React Router 사용" 명시 |
| fe-03-02 | CartContext.jsx | Context API, 서버/클라이언트 상태 분리 | **대체 실습**: `createContext`/`useContext`/`useReducer`(모두 순수 React)로 장바구니 담기/빼기 상태를 여러 컴포넌트에서 공유 — 주석으로 "실제로는 Zustand 등도 많이 사용" 명시 |
| fe-03-03 | UserCard.tsx | 인터페이스, props 타이핑 | `interface`로 props 타입을 선언하고 옵셔널 필드를 다루는 타입 안전 컴포넌트 |
| fe-04-01 | RenderCounter.jsx | memo, useMemo, useCallback | 화면에 렌더링 횟수를 표시하며, `React.memo`/`useMemo` 적용 전후 차이를 직접 확인 |
| fe-04-02 | Calculator.jsx | 단위 테스트, 컴포넌트 테스트 | **대체 실습**: 계산 로직을 컴포넌트에서 분리한 순수 함수로 작성 — "테스트하기 쉬운 구조"를 코드로 보여주되, 실제 자동 채점(Vitest 실행)은 하지 않음(후속 작업) |
| fe-04-03 | ConfigPanel.jsx | 환경 변수 관리 | **대체 실습**: 환경별(dev/prod) mock 설정 객체를 조건부로 다루는 패턴 — 실제 빌드/배포 파이프라인은 다루지 않음(개념만) |

각 모듈의 `practiceDetail`/`hint`는 위 실습 개요를 학습자에게 안내하는 한국어 문장으로
새로 작성한다(기존 템플릿 문장 `"${title}을 실습하면서 ..."` 대신).

## 4. 에러 처리 / Fallback

- `frontendModuleExercises`에 없는 `moduleId`(다른 트랙, 또는 향후 추가되었지만 아직 콘텐츠가
  없는 프론트엔드 모듈)는 지금과 완전히 동일하게 동작한다 — 별도 에러 상태나 로딩 상태를
  추가하지 않는다(정적 데이터라 조회 실패가 있을 수 없음).
- 12개 모두 이번에 작성하므로, 정상 경로에서는 프론트엔드 트랙을 진행하는 한 항상 매치된다.

## 5. 테스트 계획

- `workspaceMission.test.ts`(신규) — `createActiveMissionPresentation`에 대해:
  - `frontendModuleExercises`에 있는 `moduleId`를 가진 스텝이 오면 `fileName`/`codeLines`/
    `practiceDetail`/`hint`가 해당 모듈 콘텐츠로 교체되는지
  - 매치되지 않는 `moduleId`(예: 다른 트랙 접두사)를 가진 스텝이 오면 기존 동작(템플릿 문장,
    `pickCodeLines` 기반 코드)이 유지되는지
- 브라우저 스모크 확인: `/workspace`에서 프론트엔드 트랙 커리큘럼을 활성화한 뒤,
  대표성 있는 몇 개 모듈(특히 `fetch` 쓰는 fe-02-01, `memo` 쓰는 fe-04-01,
  `.tsx`인 fe-03-03)에서 실제로 "실행" 버튼을 눌러 에러 없이 렌더링되는지 확인.
- `npm run lint` / `npx tsc --noEmit` / `npm test` 전체 그린 확인.
