# 개발 아키텍처

이 프로젝트는 Feature-Sliced Design(FSD)을 점진적으로 도입한다. 현재 단계에서는 프론트엔드에 `app`, `pages`, `shared` 초기 레이어만 사용하고, 기능이 커질 때 `entities`, `features`, `widgets`를 추가한다.

## 현재 구조

```text
src/
  app/
    App.tsx
    App.test.tsx
    index.ts
    styles/
      global.css
  pages/
    README.md
  shared/
    README.md
  main.tsx
  vite-env.d.ts
server/
  app.ts
  app.test.ts
  index.ts
```

## FSD 레이어 기준

- `src/app`: 앱 진입점, 전역 provider 연결, 전역 스타일, 앱 전체 조합을 둔다.
- `src/pages`: 라우트나 주요 화면 단위 slice를 둔다. 현재 탭 화면은 다음 리팩터링에서 `home`, `library`, `save` page slice로 분리한다.
- `src/shared`: 비즈니스 로직이 없는 공통 코드만 둔다. 예: 공통 UI, API 클라이언트, 환경 설정, 범용 라이브러리.
- `src/entities`, `src/features`, `src/widgets`: 아직 만들지 않는다. 도메인 모델이나 재사용 기능이 실제로 생길 때 추가한다.

구현 계획 문서에서는 실제 MVP 기능을 붙이는 시점의 목표 구조를 기준으로 `entities`, `features`, `widgets`를 사용한다.

| 성격                         | 위치 예시                                                   |
| ---------------------------- | ----------------------------------------------------------- |
| 앱 셸, provider, 전역 조합    | `src/app`                                                   |
| 화면 단위                     | `src/pages/home`, `src/pages/library`, `src/pages/save`     |
| 하단 내비게이션 같은 화면 블록 | `src/widgets/bottom-navigation`                             |
| 인증, 저장, 수정, 온보딩 기능 | `src/features/auth`, `src/features/insight-save`            |
| 인사이트, 카테고리, 프로필 모델 | `src/entities/insight`, `src/entities/category`, `src/entities/profile` |
| 공통 UI, API 클라이언트, 설정 | `src/shared/ui`, `src/shared/api`, `src/shared/config`      |

## Import 규칙

- 외부 코드는 각 레이어나 slice의 public API인 `index.ts`를 통해 import한다.
- 새 slice를 만들 때는 `index.ts`를 함께 만들고, 외부에 공개할 컴포넌트/함수/타입만 export한다.
- `src/main.tsx`는 `@/app`만 import해서 앱을 부트스트랩한다.
- TypeScript/Vite alias는 `@/*`만 사용한다.
- 같은 레이어의 slice끼리 직접 import하지 않는다.
- 상위 레이어는 하위 레이어를 import할 수 있지만, 하위 레이어가 상위 레이어를 import하면 안 된다.
- 앱 루트는 `src/app/App.tsx`와 `@/app`을 기준으로 관리한다.

## 서버 구조

Express 서버는 FSD 대상이 아니므로 `server/`에 별도로 둔다. 프론트엔드에서 서버 API를 호출하는 공통 클라이언트가 필요해지면 `src/shared/api`에 둔다.

## 기술 스택

현재 사용 중인 라이브러리와 도입 예정 라이브러리는 `docs/tech-stack.md`를 기준으로 관리한다.

## 제품 흐름 문서

로그인 전 서비스 온보딩은 `docs/onboarding.md`를 기준으로 기획하고 구현한다. 로그인 후 개인화 온보딩과 구분해서 관리한다.

`꺼내보기`는 `docs/retrieve.md`를 기준으로 기획하고 구현한다. 보관함 검색과 내부 검색 유틸 일부를 공유할 수 있지만, 화면 경험은 유사도 기반 작업팩으로 분리한다.
