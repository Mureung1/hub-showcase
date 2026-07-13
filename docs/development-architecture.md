# 개발 아키텍처

프론트엔드는 Feature-Sliced Design(FSD)을 현재 제품 범위까지 적용한다. slice 디렉터리는 기능 이름을 유지하고, TypeScript/TSX/CSS 파일명은 `snake_case`를 사용한다. 모든 public API는 named export다.

## 현재 구조

```text
src/
  app/
    app.tsx
    authenticated_workspace.tsx
    model/
      workspace_seed.ts
    styles/
      authenticated_workspace.css
      global.css
  pages/
    home/
      index.ts
      ui/
        home_page.tsx
        home_page.css
    landing/
      index.ts
      ui/
        landing_page.tsx
        landing_page.css
        onboarding_motion_preview.tsx
    library/
      index.ts
      ui/
        library_page.tsx
        library_page.css
    login/
      index.ts
      ui/
        login_page.tsx
        login_page.css
    save/
      index.ts
      ui/
        save_page.tsx
        save_page.css
  widgets/
    app-navigation/
      index.ts
      ui/
        app_navigation.tsx
        app_navigation.css
  entities/
    insight/
      index.ts
      model/
        insight.ts
      ui/
        insight_grid.tsx
        insight_grid.css
  shared/
    config/
      design-system/
        index.ts
        tokens.ts
        apply_design_tokens.ts
    ui/
      index.ts
      button/
      category-filter/
      chip/
      design-system-provider/
      empty-state/
      inline-label/
      loading-state/
      navigation-bar/
      status-message/
      text-field/
  main.tsx
```

테스트는 대상 파일 가까이에 둔다. 위 트리는 제품 런타임 경계를 중심으로 표시하며 테스트 파일은 생략했다.

## 레이어 책임

| 레이어     | 책임                                                               |
| ---------- | ------------------------------------------------------------------ |
| `app`      | 앱 진입 상태, provider/token 조합, authenticated shell, 전역 reset |
| `pages`    | 라우트 또는 주요 화면 단위 조합                                    |
| `widgets`  | 여러 화면에서 독립적으로 배치되는 큰 UI 블록                       |
| `entities` | 도메인 타입, 도메인 연산, 도메인 표시 UI                           |
| `shared`   | 비즈니스 규칙이 없는 config, UI adapter, 범용 도구                 |

현재 도메인 모델과 목록 UI는 `entities/insight`, 고정 앱 내비게이션은 `widgets/app-navigation`, 런타임 토큰은 `shared/config/design-system`, 공통 UI 경계는 `shared/ui`가 소유한다.

## import 경계

- 외부 사용자는 slice의 `index.ts` public API만 import한다.
- `app`은 `pages`, `widgets`, `entities`, `shared`를 조합할 수 있다.
- `pages`와 `widgets`는 `entities`와 `shared`의 public API만 사용한다.
- `entities`는 `shared`만 import할 수 있다. 같은 entity 내부 구현은 상대 경로를 사용한다.
- `shared`는 상위 레이어를 import하지 않는다.
- 같은 레이어의 다른 slice 내부 경로를 직접 import하지 않는다.
- alias는 `@/*`만 사용한다.
- 화면과 domain UI는 외부 UI 패키지를 직접 import하지 않고 `@/shared/ui` adapter를 사용한다.
- `export default`를 사용하지 않는다.

`src/main.tsx`는 token injector를 실행하고 `DesignSystemProvider`로 `App`을 감싸는 bootstrap만 담당한다. `tokens.ts`가 값의 단일 원천이며 `apply_design_tokens.ts`만 DOM에 CSS custom property를 주입한다.

## 스타일 경계

- `global.css`에는 reset, 전역 typography 기반, focus, visually-hidden 같은 접근성 utility만 둔다.
- 화면·widget·entity 스타일은 각 `ui` 디렉터리의 `snake_case.css`에 colocate한다.
- 제품 CSS는 주입된 design token 변수만 사용하며 raw 색상과 화면 전역 selector를 추가하지 않는다.
- 공통 UI의 vendor DOM 보정은 해당 `shared/ui` adapter CSS가 소유한다.

## 서버와 저장 경계

Express 서버는 FSD 대상이 아니므로 `server/`에 둔다. 현재 로컬 우선 MVP는 `/api/health`를 개발 환경 확인에만 사용한다.

- 인사이트 타입과 저장 인터페이스는 `entities/insight`가 소유한다.
- page와 widget은 `localStorage`를 직접 호출하지 않는다.
- 저장 payload는 `schemaVersion`을 포함하고 유효하지 않은 데이터는 읽을 때 격리한다.
- 원격 저장을 도입할 때도 같은 domain interface 뒤에 adapter를 추가한다.

## 활성 제품 문서

- 로그인 전 흐름과 문구는 `docs/onboarding.md`를 따른다.
- `꺼내보기` 경험은 `docs/retrieve.md`를 따른다.
- 현재 범위와 우선순위는 `docs/backlog.md`와 `docs/checklist.md`를 따른다.
- 디자인 런타임 계약은 루트 `DESIGN.md`를 따른다.
