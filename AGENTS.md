# AGENTS.md

## 1. 프로젝트 개요

- GAZUA는 React 기반 트레이딩 서비스다.
- 변경은 요청 범위 안에서 작게 유지하고 기존 사용자 변경을 보존한다.

## 2. 기술 스택

- React, TypeScript, Vite, pnpm
- Emotion, React Router
- TanStack Query, Zustand, Axios, Zod
- Lucide React
- Vitest, Testing Library
- ESLint, Prettier

## 3. 프로젝트 구조와 아키텍처

- 루트는 pnpm workspace 기반 모노레포다.
- 프론트엔드 앱과 프로토타입은 `frontend/`에 둔다.
- 백엔드 작업 영역은 `backend/`에 두며 현재는 빈 골격만 유지한다.
- 프론트엔드 소스는 `frontend/src` 아래에서 관리한다.
- Feature-Sliced Design을 따른다.
- 의존성 방향은 `app → pages → widgets → features → entities → shared`다.
- 하위 레이어는 상위 레이어를 import하지 않는다.
- 다른 Slice는 최상위 `index.ts` Public API로만 import한다.
- Barrel Export는 Slice 최상위 `index.ts`에서만 사용한다.
- Segment는 필요에 따라 `ui`, `api`, `model`, `lib`, `config`로 나눈다.
- 서버 상태는 TanStack Query, 전역 UI 상태는 Zustand, 지역 상태는 `useState`로 관리한다.
- TanStack Query 데이터를 Zustand에 복사하지 않는다.
- 실시간 틱은 Query Cache에 계속 기록하지 않는다.

## 4. 코드 컨벤션

- 컴포넌트는 `PascalCase`를 사용한다.
- 일반 컴포넌트는 Arrow Function과 Named Export를 사용한다.
- 페이지 컴포넌트만 함수 선언문과 Default Export를 사용한다.
- Props는 `interface 컴포넌트명Props`로 선언하고 `React.FC`는 사용하지 않는다.
- Union Type과 함수 타입은 `type`을 사용한다.
- Props 이벤트는 `on*`, 내부 핸들러는 `handle*`로 작성한다.
- Boolean은 `is`, `has`, `can`, `should`로 시작한다.
- Hook은 `use`로 시작한다. Query/Mutation Hook은 각각 `Query`, `Mutation`으로 끝낸다.
- Widget 컴포넌트는 `Widget` 접미사를 사용한다.
- 상수는 `UPPER_SNAKE_CASE`를 사용하고 시간 값은 단위를 이름에 포함한다.
- API 타입은 `RequestBody`, `ResponseBody`, `PathParams`, `QueryParams` 접미사를 사용한다.
- API 함수는 `export async function`과 동작 중심 이름을 사용한다.
- Query Key는 Slice의 `api/_keys.ts`에서 관리한다.
- `any` 대신 `unknown`과 Zod 검증을 사용한다.
- 단순 상태는 `enum`보다 Union Type을 우선한다.
- 타입 전용 import는 `import type`을 사용한다.
- Zod Schema는 `camelCase`와 `Schema` 접미사를 사용한다.
- 정밀한 금융 값은 API 경계에서 `string`으로 유지한다.
- 아이콘은 가능한 경우 Lucide React를 사용한다.
- ESLint와 Prettier 결과를 수동 스타일보다 우선한다.

## 5. 커밋 컨벤션

형식은 `Type: 변경 내용`이다.

- `Feat`: 새로운 기능
- `Fix`: 버그 수정
- `!HOTFIX`: 치명적 버그 긴급 수정
- `Design`: UI 디자인 변경
- `Style`: 로직 없는 포맷 변경
- `Refactor`: 리팩터링
- `Comment`: 주석 변경
- `Docs`: 문서 변경
- `Test`: 테스트 추가 및 리팩터링
- `Rename`: 파일 또는 폴더명 변경
- `Remove`: 파일 또는 폴더 삭제
- `Chore`: 패키지, 빌드 등 기타 작업

## 6. 실행 및 검증 명령어

루트에서 실행한다. 현재 루트 스크립트는 `@gazua/frontend` 패키지로 위임된다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

PowerShell 실행 정책으로 `pnpm`이 차단되면 `pnpm.cmd`를 사용한다.

## 7. 작업 방식

1. 변경 전 관련 코드, 설정, 테스트를 읽는다.
2. 대상 FSD 레이어와 Slice를 결정한다.
3. 기존 패턴을 우선하고 불필요한 추상화와 리팩터링을 피한다.
4. 사용자 변경과 관련 없는 파일을 되돌리거나 수정하지 않는다.
5. 위험도에 맞는 테스트를 추가하고 필수 검증 명령을 실행한다.
6. 컨벤션 예외가 필요하면 적용 전에 기술적 이유와 영향을 설명한다.
7. 구조나 공통 규칙이 바뀌면 README와 AGENTS.md를 함께 갱신한다.
