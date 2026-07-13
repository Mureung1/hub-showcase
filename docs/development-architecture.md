# 개발 아키텍처

이 프로젝트는 Feature-Sliced Design(FSD)을 점진적으로 도입한다. 현재 단계에서는 프론트엔드에 `app`, `pages`, `shared` 초기 레이어만 사용하고, 기능이 커질 때 `entities`, `features`, `widgets`를 추가한다.

## 현재 구조

```text
src/
  app/
    App.tsx
    App.test.tsx
    README.md
    index.ts
    styles/
      global.css
  pages/
    README.md
    landing/
      index.ts
      ui/
        LandingPage.tsx
        LandingPage.test.tsx
        OnboardingMotionPreview.tsx
        OnboardingMotionPreview.test.tsx
        landing-page.css
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

| 성격                           | 위치 예시                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| 앱 셸, provider, 전역 조합     | `src/app`                                                                               |
| 화면 단위                      | `src/pages/home`, `src/pages/library`, `src/pages/save`                                 |
| 하단 내비게이션 같은 화면 블록 | `src/widgets/bottom-navigation`                                                         |
| 저장, 수정, 검색 기능          | `src/features/insight-save`, `src/features/insight-edit`, `src/features/insight-search` |
| 인사이트, 카테고리 모델        | `src/entities/insight`, `src/entities/category`                                         |
| 공통 UI, API 클라이언트, 설정  | `src/shared/ui`, `src/shared/api`, `src/shared/config`                                  |

`auth`와 `profile` slice는 원격 계정 기능을 도입할 때 추가한다. 현재 로컬 우선 MVP의 선행 구조로 만들지 않는다.

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

현재 로컬 우선 MVP는 `server/`를 인사이트 저장 경로로 사용하지 않는다. `/api/health`는 기존 개발 환경 확인용으로 유지하며, 메타데이터 수집 API나 인증 API를 MVP 선행 작업으로 확장하지 않는다.

## 현재 MVP 저장 경계

- 도메인 타입과 저장 인터페이스는 `src/entities/insight`에 둔다.
- 브라우저 `localStorage` 어댑터는 인사이트 slice 내부 또는 해당 slice가 소유하는 하위 모듈에 둔다.
- 저장 payload에는 `schemaVersion`을 포함하고, 읽을 때 유효하지 않은 데이터는 안전하게 격리한다.
- 페이지와 feature는 `localStorage`를 직접 호출하지 않고 저장 인터페이스를 통해 접근한다.
- 계정·원격 저장 가치가 검증되면 같은 인터페이스에 Supabase 어댑터를 추가한다.

## 기술 스택

현재 사용 중인 라이브러리와 도입 예정 라이브러리는 `docs/tech-stack.md`를 기준으로 관리한다.

## 제품 흐름 문서

기존 로그인 전 서비스 온보딩은 `docs/onboarding.md`의 동작과 문구를 보존한다. 현재 활성 MVP의 새 구현 작업은 아니며, 로그인 후 개인화 온보딩도 범위에 포함하지 않는다.

`꺼내보기`는 `docs/retrieve.md`를 기준으로 기획하고 구현한다. 보관함 검색과 내부 검색 유틸 일부를 공유할 수 있지만, 화면 경험은 유사도 기반 작업팩으로 분리한다.

현재 MVP의 활성 범위와 의존성은 `docs/backlog.md`와 `docs/checklist.md`를 기준으로 판단한다. 기존 기능별 상세 계획은 유지하되, 활성 수직 슬라이스와 충돌하는 부분을 그대로 실행하지 않는다.
