# 기술 스택 및 라이브러리

이 문서는 아맞다 프로젝트에서 사용할 기술 스택과 후보 라이브러리를 정리한다. 버전은 2026-07-09 기준 `package.json` 또는 npm registry 조회 결과를 기준으로 한다.

## 결정 기준

- 현재 설치된 라이브러리와 도입 예정 라이브러리를 구분한다.
- 패키지만 설치하고 실제 코드에 연결하지 않은 항목은 `설치됨, 미연동`으로 표시한다.
- UI 라이브러리는 중복 도입 비용이 크므로 WDS와 Tailwind CSS/shadcn UI 중 장기 기준을 선택한다.
- 상태 관리는 클라이언트 상태와 서버 상태를 분리한다.
- FSD 구조에서는 공통 API 클라이언트, 공통 UI, 환경 설정을 `src/shared`에 둔다.

## 스택 목록

| 이름                        | 버전                                            | 카테고리             | 사용 여부      | 선정 이유                                                                                              | 대체 가능 라이브러리                                     | 메모                                                                                                      |
| --------------------------- | ----------------------------------------------- | -------------------- | -------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| React                       | 19.2.7                                          | UI 라이브러리        | 사용 중        | 컴포넌트 기반 설계로 화면을 재사용하기 쉽고, 생태계가 넓어 협업과 유지보수에 유리하다.                 | Vue, Svelte, Solid                                       | 현재 Vite React 앱의 기본 런타임이다.                                                                     |
| TypeScript                  | 6.0.3                                           | 개발 언어            | 사용 중        | 타입 안정성으로 오류를 초기에 발견하고, 도메인 타입과 API 응답을 명확하게 표현할 수 있다.              | JavaScript                                               | npm 최신은 7.0.2지만 현재 프로젝트는 6.0.3을 사용한다.                                                    |
| Vite                        | 8.1.3                                           | 빌드 툴              | 사용 중        | 빠른 개발 서버와 HMR을 제공하고 설정이 단순하다.                                                       | Webpack, Parcel, Rollup, Next.js                         | npm 최신은 8.1.4다. 현재 버전을 유지해도 무방하다.                                                        |
| Express                     | 5.2.1                                           | API 서버             | 사용 중        | 개발 중 프론트엔드와 함께 실행할 가벼운 API 서버로 적합하다.                                           | Fastify, Hono, NestJS                                    | 현재 `/api/health`와 Vite proxy가 연결되어 있다.                                                          |
| @wanteddev/wds              | 3.11.0                                          | UI 시스템            | 사용 중        | 현재 화면은 WDS 컴포넌트와 전역 스타일을 기반으로 구현되어 있다.                                       | shadcn/ui, MUI, Chakra UI, Ant Design                    | Tailwind CSS/shadcn UI로 전환할 경우 점진 제거 대상이다.                                                  |
| @wanteddev/wds-icon         | 3.11.0                                          | 아이콘               | 사용 중        | WDS와 같은 버전으로 맞춰 UI 일관성을 유지한다.                                                         | lucide-react, React Icons                                | shadcn UI 도입 시 lucide-react와 역할이 겹칠 수 있다.                                                     |
| Tailwind CSS                | 4.3.2                                           | CSS 프레임워크       | 설치됨, 미연동 | 유틸리티 클래스 기반으로 빠르게 스타일링하고, 디자인 토큰을 코드 가까이에서 관리할 수 있다.            | CSS Modules, Emotion, Styled Components, Vanilla Extract | WDS와 병행하면 스타일 기준이 갈라질 수 있으므로 전환 범위를 먼저 정한다.                                  |
| @tailwindcss/vite           | 4.3.2                                           | Tailwind/Vite 연동   | 설치됨, 미연동 | Tailwind CSS v4의 Vite 공식 플러그인으로 설정을 단순화한다.                                            | PostCSS plugin                                           | 아직 `vite.config.ts`에는 연결하지 않았다.                                                                |
| shadcn/ui                   | CLI 4.13.0                                      | UI 컴포넌트 소스     | 설치됨, 미연동 | 컴포넌트를 패키지처럼 숨기지 않고 프로젝트 코드로 가져와 커스터마이징하기 쉽다.                        | WDS, MUI, Chakra UI, Ant Design                          | `shadcn` CLI만 설치했으며 컴포넌트 생성은 별도 작업이다.                                                  |
| class-variance-authority    | 0.7.1                                           | 스타일 variant 유틸  | 설치됨, 미연동 | shadcn UI 컴포넌트의 variant 구성을 명확하게 관리한다.                                                 | tailwind-variants                                        | shadcn 컴포넌트 추가 시 함께 사용할 수 있다.                                                              |
| clsx                        | 2.1.1                                           | className 유틸       | 설치됨, 미연동 | 조건부 className 조합을 간결하게 작성할 수 있다.                                                       | classnames                                               | `tailwind-merge`와 함께 `cn()` 유틸로 묶는 패턴을 쓴다.                                                   |
| tailwind-merge              | 3.6.0                                           | Tailwind class 병합  | 설치됨, 미연동 | 충돌하는 Tailwind 클래스를 안전하게 병합한다.                                                          | 직접 병합                                                | shadcn UI와 Tailwind CSS를 쓴다면 사실상 기본 유틸이다.                                                   |
| lucide-react                | 1.23.0                                          | 아이콘               | 설치됨, 미연동 | shadcn UI 예제와 궁합이 좋고, 아이콘 품질이 안정적이다.                                                | WDS Icon, React Icons                                    | WDS Icon과 중복되므로 UI 기준 확정 후 선택한다.                                                           |
| Zustand                     | 5.0.14                                          | 클라이언트 상태 관리 | 설치됨, 미연동 | 간단한 전역 UI 상태나 사용자 설정을 적은 보일러플레이트로 관리할 수 있다.                              | Redux Toolkit, Jotai, Recoil, Context API                | 서버 데이터 캐시는 TanStack Query에 맡기고, Zustand는 클라이언트 상태로 제한한다.                         |
| TanStack Query              | 5.101.2                                         | 서버 상태 관리       | 설치됨, 미연동 | API 요청, 캐싱, 로딩/에러 상태, refetch를 표준화할 수 있다.                                            | SWR, 직접 fetch, Apollo Client                           | Supabase 또는 Express API 호출이 늘어나는 시점에 연결한다.                                                |
| TanStack Query Devtools     | 5.101.2                                         | 개발 도구            | 설치됨, 미연동 | 쿼리 캐시와 refetch 상태를 개발 중 확인하기 쉽다.                                                      | 브라우저 로그                                            | 프로덕션 번들에 노출되지 않도록 개발 환경에서만 연결한다.                                                 |
| Motion                      | 12.42.2                                         | 애니메이션           | 설치됨, 미연동 | 화면 전환, 버튼 인터랙션, 등장 애니메이션을 선언적으로 구현할 수 있다.                                 | Framer Motion, CSS transition, GSAP                      | Framer Motion은 현재 Motion으로 이어졌으며 신규 코드는 `motion/react` import를 우선 검토한다.             |
| dnd-kit                     | core 6.3.1, sortable 10.0.0, utilities 3.2.2    | 드래그 앤 드롭       | 설치됨, 미연동 | 카테고리 정렬이나 카드 순서 변경이 필요해질 때 접근성과 확장성을 갖춘 드래그 앤 드롭을 구현할 수 있다. | react-beautiful-dnd, react-dnd                           | 실제 정렬/드래그 화면을 만들 때 연결한다.                                                                 |
| pnpm                        | 11.10.0                                         | 패키지 매니저        | 전환 예정      | 설치 속도와 디스크 효율이 좋고, 의존성 구조가 엄격해 장기 유지보수에 유리하다.                         | npm, yarn, bun                                           | 현재 repo는 npm lockfile을 사용한다. 전환 시 `package-lock.json` 제거와 `pnpm-lock.yaml` 생성이 필요하다. |
| Supabase JS                 | 2.110.1                                         | BaaS 클라이언트      | 설치됨, 미연동 | Auth, Postgres, Edge Functions를 프론트엔드에서 일관된 클라이언트로 다룰 수 있다.                      | Firebase, 직접 Express API, Appwrite                     | 제품 계획상 Google OAuth와 사용자별 저장소에 필요하다.                                                    |
| React Router                | 8.2.0                                           | 라우팅               | 설치됨, 미연동 | URL 기반 화면 전환, 딥링크, 인증 보호 라우트가 필요해지면 표준 라우터가 필요하다.                      | TanStack Router, wouter, Next.js App Router              | 현재는 탭 상태 기반 화면이므로 라우트 설계 확정 후 연결한다.                                              |
| Zod                         | 4.4.3                                           | 스키마 검증          | 설치됨, 미연동 | 환경 변수, API 응답, 폼 입력을 런타임에서 검증해 TypeScript의 빈틈을 보완한다.                         | Valibot, Yup, ArkType                                    | `src/shared/config`, `src/shared/api`, 폼 검증에 유용하다.                                                |
| React Hook Form             | 7.81.0                                          | 폼 상태 관리         | 설치됨, 미연동 | 저장/온보딩/편집 폼이 복잡해질 때 렌더링 비용과 검증 코드를 줄일 수 있다.                              | Formik, TanStack Form, 직접 state                        | 폼 설계가 생기면 Zod resolver와 함께 연결한다.                                                            |
| @hookform/resolvers         | 5.4.0                                           | 폼 검증 연동         | 설치됨, 미연동 | React Hook Form과 Zod schema를 연결한다.                                                               | 직접 resolver 작성                                       | 폼 도입 시 사용한다.                                                                                      |
| ESLint                      | 10.6.0                                          | 정적 분석            | 사용 중        | 코드 컨벤션 문서에 ESLint 기준이 있으므로 실제 검사 도구도 맞춰야 한다.                                | Biome, oxlint                                            | `eslint.config.js`와 `npm run lint`로 검사한다.                                                           |
| typescript-eslint           | 8.63.0                                          | TypeScript lint      | 사용 중        | TypeScript 코드의 타입/문법 기반 lint 규칙을 적용한다.                                                 | Biome                                                    | ESLint flat config에 함께 설정되어 있다.                                                                  |
| Prettier                    | 3.9.4                                           | 코드 포맷터          | 사용 중        | 코드 스타일을 자동 정리해 리뷰 비용을 줄인다.                                                          | Biome formatter, dprint                                  | 현재 문서와 코드 포맷 검증에 사용 중이다.                                                                 |
| prettier-plugin-tailwindcss | 0.8.0                                           | Tailwind class 정렬  | 사용 중        | Tailwind class 순서를 자동 정렬해 스타일 diff를 줄인다.                                                | 수동 정렬                                                | `prettier.config.js`에 연결되어 있다.                                                                     |
| Vitest                      | 4.1.10                                          | 테스트 러너          | 사용 중        | Vite 기반 프로젝트와 궁합이 좋고 빠른 단위 테스트 실행이 가능하다.                                     | Jest, Node test runner                                   | 현재 서버와 app public API 테스트에 사용 중이다.                                                          |
| Testing Library             | React 16.3.2, jest-dom 6.9.1, user-event 14.6.1 | 컴포넌트 테스트      | 설치됨, 미연동 | 사용자 관점의 React 컴포넌트 테스트를 작성할 수 있다.                                                  | Playwright component test, Cypress Component Testing     | UI 테스트 작성 시 Vitest와 함께 연결한다.                                                                 |
| jsdom                       | 29.1.1                                          | 브라우저 테스트 환경 | 설치됨, 미연동 | Node 환경에서 DOM 기반 컴포넌트 테스트를 실행한다.                                                     | happy-dom                                                | Vitest 컴포넌트 테스트 환경으로 사용한다.                                                                 |
| Supertest                   | 7.2.2                                           | API 테스트           | 사용 중        | Express API를 실제 HTTP 요청처럼 테스트할 수 있다.                                                     | 직접 fetch, undici                                       | 현재 `/api/health` 테스트에 사용 중이다.                                                                  |
| tsx                         | 4.23.0                                          | TypeScript 실행기    | 사용 중        | Express 서버를 빌드 없이 개발 모드에서 실행할 수 있다.                                                 | ts-node, swc-node, vite-node                             | `npm run dev:server`에서 사용한다.                                                                        |
| concurrently                | 10.0.3                                          | 개발 프로세스 실행   | 사용 중        | Vite와 Express 개발 서버를 한 명령으로 함께 실행한다.                                                  | npm-run-all, Turbo, concurrently 대체 스크립트           | `npm run dev`에서 사용한다.                                                                               |
| Sonner                      | 2.0.7                                           | 토스트 UI            | 설치됨, 미연동 | shadcn UI 생태계와 잘 맞는 토스트 컴포넌트다.                                                          | react-hot-toast, WDS SectionMessage                      | 저장 완료/오류 알림이 필요해질 때 연결한다.                                                               |

## 우선순위 제안

1. `ESLint`, `typescript-eslint`: 설치와 기본 설정을 완료했으므로 규칙 강화는 별도 변경으로 진행한다.
2. `Tailwind CSS`, `shadcn/ui`: 패키지는 설치되어 있으나 WDS를 계속 쓸지, shadcn UI로 전환할지 먼저 결정한 뒤 코드에 연결한다.
3. `Supabase JS`, `TanStack Query`, `Zod`: 인증/저장 API 구현 시 `src/shared` 하위 클라이언트와 스키마부터 연결한다.
4. `Testing Library`, `jsdom`: FSD 리팩터링으로 화면 컴포넌트를 분리할 때 테스트 환경 설정을 추가한다.
5. `Zustand`, `Motion`, `dnd-kit`: 실제 상태 공유, 애니메이션, 드래그 앤 드롭 요구가 생길 때 사용 지점을 만든다.

## 아직 코드에 연결하지 않은 항목

- `pnpm`: 현재 npm 기반 lockfile이 있으므로 별도 전환 작업으로 처리한다. 프로젝트 의존성으로 설치하지 않는다.
- `Tailwind CSS`, `@tailwindcss/vite`: 설치되어 있지만 아직 Vite 설정과 CSS 엔트리에 연결하지 않았다.
- `shadcn/ui`: CLI는 설치되어 있지만 컴포넌트 생성과 `components.json` 초기화는 하지 않았다.
- `React Router`, `TanStack Query`, `Supabase JS`, `Zustand`, `Motion`, `dnd-kit`, `React Hook Form`, `Sonner`: 설치되어 있지만 실제 기능 구현 시 연결한다.

## 참고 자료

- [Tailwind CSS Vite 설치 문서](https://tailwindcss.com/docs)
- [shadcn/ui Vite 설치 문서](https://ui.shadcn.com/docs/installation/vite)
- [TanStack Query React 설치 문서](https://tanstack.com/query/v5/docs/framework/react/installation)
- [Motion for React 문서](https://motion.dev/docs/react)
- [Zustand 문서](https://zustand.docs.pmnd.rs/)
- [dnd-kit 문서](https://dndkit.com/)
- [pnpm 문서](https://pnpm.io/)
- [React Router 문서](https://reactrouter.com/)
