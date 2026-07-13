# White Canvas 디자인 시스템 개편 설계

## 문서 상태

- 관련 이슈: GitHub #26
- 대상 브랜치: `feat/26-design-system-refactor`
- 상태: 구현 전 승인 설계

## 목적

온보딩, 로그인, 로그인 후 작업 공간이 서로 다른 제품처럼 보이는 문제를 해소하고, 전체 화면을 하나의 White Canvas 시각 언어로 통합한다.

이번 개편은 흰 캔버스, 높은 명도 대비, 얇은 경계, 절제된 곡률, 큰 산세리프 타이포그래피를 기본으로 한다. 짙은 차콜 CTA, 전기적인 파랑 포인트, 시그널 그린 상태색을 사용하며, 마케팅 문장에는 색상 인라인 라벨을 제한적으로 사용해 브랜드의 고유한 리듬을 만든다.

인증 진입 흐름, 저장 데이터, 검색과 필터 동작, 인사이트 데이터 모델의 의미는 바꾸지 않는다.

## 해결할 문제

- 온보딩의 아이보리·편집 지면 계열 표현과 로그인 후 작업 공간의 흰색·파랑 UI가 일관되지 않다.
- 색상, radius, 간격, 모션 규칙이 CSS 파일과 외부 UI 라이브러리 사용부에 분산돼 있다.
- 화면 컴포넌트가 외부 UI 라이브러리를 직접 import해 제품 디자인 언어와 라이브러리 구현이 강하게 결합돼 있다.
- `App.tsx`에 화면, 도메인 타입, 상태, 내비게이션, 외부 컴포넌트 사용이 집중돼 있다.
- 파일명과 심볼 이름에 코드 컨벤션 위반 또는 의미 충돌이 있다.

## 확정 방향

1. **하나의 흰 캔버스**: 온보딩부터 작업 공간까지 같은 배경, 경계, 타이포그래피, 상태 표현을 사용한다.
2. **강한 행동 위계**: 화면당 핵심 CTA는 짙은 차콜로 표현하고, 파랑은 링크·포커스·강조 흐름에 사용한다.
3. **색은 역할로만 사용**: 그린은 성공과 연결, 파랑은 정보와 강조, 앰버는 주의, 코럴은 오류 또는 제한된 편집 강조에 사용한다.
4. **평평한 표면**: 기본 표면에는 그림자를 사용하지 않고 1px 경계와 명도 차이로 계층을 만든다.
5. **라벨은 문장 부호**: 다채로운 인라인 라벨은 마케팅·편집 문장에만 사용하고 제품 제어 요소와 분류 체계에는 사용하지 않는다.
6. **모션은 한 장면**: 온보딩의 핵심 연결 장면 한 곳에만 GSAP을 사용하고 나머지는 짧은 CSS transition으로 처리한다.
7. **제품 소유의 UI 경계**: 외부 UI 라이브러리의 동작과 접근성은 유지하되 화면에서는 `shared/ui` 어댑터만 사용한다.

## 시각 시스템

### 색상

#### 중립색

| 역할       | 토큰 키          | 값        | 사용처                         |
| ---------- | ---------------- | --------- | ------------------------------ |
| 캔버스     | `color.canvas`   | `#FFFFFF` | 전체 페이지 배경               |
| 잉크       | `color.ink`      | `#151619` | 제목과 본문                    |
| 차콜       | `color.charcoal` | `#25272D` | Primary CTA, 강한 선택 상태    |
| 그래파이트 | `color.graphite` | `#363940` | 보조 제목, Secondary hover     |
| 스모크     | `color.smoke`    | `#7F8491` | 설명과 메타 정보               |
| 퓨터       | `color.pewter`   | `#B0B3BB` | 비활성 아이콘과 placeholder    |
| 포그       | `color.fog`      | `#C8CAD0` | 강한 경계와 disabled 경계      |
| 애시       | `color.ash`      | `#E1E2E5` | 기본 1px 경계                  |
| 미스트     | `color.mist`     | `#F3F3F5` | 보조 표면, skeleton, 입력 배경 |

#### 브랜드와 상태색

| 역할          | 토큰 키              | 값        | 사용처                          |
| ------------- | -------------------- | --------- | ------------------------------- |
| 일렉트릭 블루 | `color.electricBlue` | `#0560FD` | 링크, 포커스, 정보 강조         |
| 라이트 블루   | `color.lightBlue`    | `#3A8DFF` | 그라데이션 중간점               |
| 페일 블루     | `color.paleBlue`     | `#C3D9FF` | 그라데이션 끝점, 약한 정보 배경 |
| 시그널 그린   | `color.signalGreen`  | `#059669` | 성공, 연결 완료, 브랜드 마크    |
| 앰버          | `color.amber`        | `#F59E0B` | 주의와 제한된 인라인 라벨       |
| 코럴          | `color.coral`        | `#F04438` | 오류와 제한된 인라인 라벨       |
| 오류 잉크     | `color.errorInk`     | `#D92D20` | 오류 텍스트와 경계              |

대표 그라데이션은 `gradient.electricBlue`로 관리하며 값은 `linear-gradient(90deg, #0560FD 0%, #3A8DFF 50%, #C3D9FF 100%)`이다. 큰 배경 장식으로 반복하지 않고 Hero의 한정된 강조선이나 브랜드 그래픽에만 사용한다.

### 타이포그래피

- 기본 글꼴은 `Pretendard`, 시스템 산세리프 fallback 순서로 통일한다.
- 숫자 정렬이 필요한 메타 정보에는 `font-variant-numeric: tabular-nums`를 적용한다.
- Hero Display는 `clamp(48px, 6vw, 80px)`, line-height `0.98`, weight `700`을 기준으로 한다.
- Screen Title은 32px/40px, weight 700을 기준으로 한다.
- Section Title은 24px/32px, weight 700을 기준으로 한다.
- Card Title은 17px/24px, weight 700을 기준으로 한다.
- Body는 16px/26px, weight 400을 기준으로 한다.
- Label은 14px/20px, weight 600을 기준으로 한다.
- Meta는 13px/18px, weight 400을 기준으로 한다.
- 장문의 중앙 정렬과 긴 대문자 문장을 피하고, 한국어 본문은 16px 미만으로 줄이지 않는다.

### 표면, 경계, 곡률

| 역할             | 값                             |
| ---------------- | ------------------------------ |
| 기본 경계        | `1px solid color.ash`          |
| 강조 경계        | `1px solid color.fog`          |
| 버튼 radius      | `8px`                          |
| 입력 radius      | `12px`                         |
| 카드 radius      | `16px`                         |
| 작은 라벨 radius | `0.16em`                       |
| 포커스 링        | `0 0 0 2px color.electricBlue` |
| 기본 그림자      | 사용하지 않음                  |

모달처럼 문서 흐름 위에 실제로 떠야 하는 요소만 최소한의 elevation을 별도 정의할 수 있다. 카드와 버튼의 hover를 그림자 상승으로 표현하지 않는다.

### 간격과 레이아웃

- 4px 단위를 기본으로 하고 `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80` 스케일을 사용한다.
- 본문 컨테이너 최대 너비는 1200px이다.
- 주요 섹션 간격은 데스크톱 80px, 태블릿 64px, 모바일 48px을 기준으로 한다.
- 카드 내부 여백은 24px을 기본으로 하고 모바일에서 20px까지 줄일 수 있다.
- 동일 위계의 요소는 같은 좌우 정렬선에 맞춘다.

## Signature Inline Label

Signature Inline Label은 문장 속 핵심 단어에 작은 색면과 선택적 이모지를 붙이는 브랜드 표현이다.

### 사용 규칙

- Hero 문장에는 최대 2개, 섹션 제목에는 최대 1개만 사용한다.
- 파랑과 그린을 기본 조합으로 사용하고 앰버와 코럴은 보조 조합으로 제한한다.
- 흰색 텍스트, `0.16em` radius, 글자 크기에 비례한 촘촘한 좌우 padding을 사용한다.
- 인라인 흐름을 유지하고 작은 화면에서는 단어 단위로 자연스럽게 줄바꿈한다.
- 이모지는 장식으로만 취급해 스크린 리더에서 중복 낭독되지 않게 한다.
- 라벨이 제거돼도 문장의 의미와 문법이 완전해야 한다.

### 금지 규칙

- 버튼, 필터, 카테고리, 상태 배지, 입력 label에는 사용하지 않는다.
- 한 문장 전체를 라벨로 감싸지 않는다.
- 사용자 데이터나 중요한 상태를 색상 라벨만으로 전달하지 않는다.
- 의미 없이 네 가지 색을 동시에 사용하지 않는다.

## 화면별 적용

### 온보딩

- 첫 viewport에 브랜드, 가치 제안, 짧은 설명, Primary CTA, 핵심 연결 장면의 초기 또는 최종 상태가 함께 보인다.
- 배경은 흰색, 본문은 잉크색, CTA는 차콜로 구성한다.
- Hero 가치 제안에는 Signature Inline Label을 최대 2개 사용한다.
- 기존 섹션의 정보 구조는 유지하되 장식성 격자, 종이 질감, 오프셋 그림자, 원색 대면적을 제거한다.
- 문제, 저장, 연결, 최종 CTA 섹션은 일반 문서 흐름으로 구성한다.

### 로그인

- 온보딩과 동일한 캔버스, 타이포그래피, 입력, 버튼 규칙을 사용한다.
- 로그인 폼은 화면의 주된 행동으로 분명하게 보이되 과도한 카드 중첩을 사용하지 않는다.
- 오류는 코럴 계열 테두리, 텍스트, 아이콘과 복구 행동을 함께 제공한다.
- 인증 로직과 약관의 의미는 변경하지 않는다.

### 로그인 후 작업 공간

- 홈, 보관함, 저장 화면은 같은 1200px 정렬선과 내비게이션 규칙을 공유한다.
- 검색·꺼내보기 입력은 가장 중요한 작업 영역으로 유지한다.
- 선택된 탭과 필터는 색상뿐 아니라 텍스트 weight, 경계, `aria-current` 또는 `aria-pressed`로 표현한다.
- 인사이트 카드는 흰색 표면, 1px 경계, 16px radius를 사용하며 기본 그림자를 제거한다.
- 제품 안의 필터와 카테고리는 Signature Inline Label을 사용하지 않는다.
- 빈 상태는 이유와 다음 행동 하나를 함께 제공한다.

## 디자인 토큰 구조

### 단일 런타임 원천

디자인 토큰은 CSS 파일이 아니라 TypeScript 모듈을 단일 런타임 원천으로 사용한다.

```text
src/shared/config/design-system/
  index.ts
  tokens.ts
  tokens.test.ts
  apply_design_tokens.ts
  apply_design_tokens.test.ts
```

- `tokens.ts`는 토큰 타입과 값만 포함하며 DOM이나 브라우저 전역 객체에 접근하지 않는다.
- 토큰 객체는 `as const satisfies DesignTokens`로 값의 리터럴 타입과 구조 검증을 함께 유지한다.
- `apply_design_tokens.ts`는 토큰을 CSS custom property로 변환해 문서 루트에 적용하는 부수 효과만 담당한다.
- `main.tsx`는 React 렌더링 전에 `applyDesignTokens()`를 한 번 호출한다.
- CSS 파일에는 신규 hex, spacing, radius 원시값을 직접 추가하지 않고 주입된 custom property를 소비한다.
- 테스트에서는 토큰 구조와 CSS custom property 매핑을 별도로 검증한다.
- `DESIGN.md`는 토큰의 의미와 사용 규칙을 설명하고, 실제 런타임 값의 원천은 `tokens.ts`로 유지한다.

`tokens.ts`와 적용 모듈을 분리해 순수 데이터, 타입 안정성, DOM 부수 효과, 테스트 경계를 명확하게 유지한다.

## 외부 UI 라이브러리 경계

외부 UI 라이브러리의 키보드 동작, ARIA 처리, 기본 상호작용은 재사용하되 제품 화면이 해당 패키지에 직접 의존하지 않게 한다.

```text
src/shared/ui/
  button/
    button.tsx
    button.test.tsx
    index.ts
  text-field/
    text_field.tsx
    text_field.test.tsx
    index.ts
  category-filter/
    category_filter.tsx
    category_filter.test.tsx
    index.ts
  navigation-bar/
    navigation_bar.tsx
    navigation_bar.test.tsx
    index.ts
  index.ts
```

- 외부 패키지 import는 `shared/ui` 어댑터와 앱 최상위 provider 경계 안에서만 허용한다.
- 페이지와 위젯은 `@/shared/ui`의 공개 API만 사용한다.
- 어댑터는 제품 용어, variant, size, 상태 표현을 고정하고 외부 패키지의 범용 API를 그대로 노출하지 않는다.
- 범용 `NavigationBar` 어댑터는 외부 내비게이션 동작을 감싸고, 제품용 `AppNavigation` 위젯은 탭 구성과 제품 문구를 소유한다.
- 기존 컴포넌트를 한 번에 복제하지 않고 이번 화면에서 실제로 사용하는 최소 집합부터 감싼다.
- 외부 패키지를 제거하는 작업은 이번 범위가 아니다.

## FSD 구조와 책임

`docs/development-architecture.md`의 점진적 FSD 도입 기준에 따라 변경되는 화면만 분리한다.

```text
src/
  app/
    app.tsx
    app.test.tsx
    index.ts
    styles/global.css
  pages/
    landing/
      index.ts
      ui/
        landing_page.tsx
        landing_page.test.tsx
        onboarding_motion_preview.tsx
        onboarding_motion_preview.test.tsx
        landing_page.css
    login/
      index.ts
      ui/login_page.tsx
    home/
      index.ts
      ui/home_page.tsx
    library/
      index.ts
      ui/library_page.tsx
    save/
      index.ts
      ui/save_page.tsx
  widgets/
    app-navigation/
      index.ts
      ui/app_navigation.tsx
  shared/
    config/design-system/
    ui/
```

- `app.tsx`는 인증 진입 상태와 페이지 조합만 담당한다.
- 페이지는 화면 단위 상태 조합과 레이아웃을 담당한다.
- 재사용되는 하단 또는 전역 내비게이션은 widget으로 분리한다.
- 도메인 로직을 필요 이상으로 `shared`에 올리지 않는다.
- 같은 slice 밖에서는 공개 `index.ts`만 import한다.
- 이번 변경과 무관한 파일은 이름 정리를 이유로 이동하지 않는다.

## 코드 네이밍 규칙

변경되는 TypeScript와 TSX 파일은 저장소 컨벤션이 참조하는 Google TypeScript Style Guide를 기준으로 정리한다.

- TypeScript와 TSX 파일명: `snake_case`
- FSD slice 디렉터리명: `kebab-case`
- React 컴포넌트, 타입, 인터페이스: `UpperCamelCase`
- 함수, 변수, property: `lowerCamelCase`
- 실제 전역 상수: `CONSTANT_CASE`
- export: named export만 사용

현재 의미가 모호하거나 충돌하는 이름은 다음처럼 정리한다.

| 기존 이름             | 변경 이름                      | 이유                           |
| --------------------- | ------------------------------ | ------------------------------ |
| 로컬 `Category`       | `InsightCategory`              | 외부 컴포넌트 이름과 충돌 제거 |
| `Tab`                 | `WorkspaceTab`                 | 사용 문맥 명시                 |
| `BottomNav`           | `AppNavigation`                | 위치가 아닌 제품 역할 표현     |
| `HomeBoard`           | `HomePage`                     | 화면 책임 명시                 |
| `App.tsx` 기본 export | `app.tsx`의 named `App` export | 파일명과 export 컨벤션 통일    |

약어와 축약어보다 도메인 의미가 드러나는 이름을 우선한다. 화면을 분리하면서 새로 만드는 `Props` 타입도 컴포넌트 이름을 포함한다.

## 모션 설계

### 온보딩의 단일 GSAP 장면

- GSAP은 저장 카드가 현재 상황을 기준으로 하나의 작업 묶음으로 연결되는 온보딩 장면 한 곳에만 사용한다.
- 데스크톱 pin 구간은 화면 높이의 약 90~110% 범위에서 구현 후 조정한다.
- 콘텐츠는 애니메이션 이전에도 읽을 수 있는 static-first 구조로 만들고 CTA는 timeline과 무관하게 항상 보이고 작동해야 한다.
- 카드 이동 외의 텍스트 진입은 최대 12px fade-up, 180~220ms를 기준으로 한다.
- 회전, bounce, 반복 pulse, 과도한 hover lift를 사용하지 않는다.
- 모바일에서는 pin을 사용하지 않고 최종 정적 배치 또는 짧은 비고정 전환을 사용한다.
- `prefers-reduced-motion: reduce` 또는 GSAP 초기화 실패 시 최종 상태를 즉시 표시한다.

### 일반 상호작용

- 버튼, 링크, 입력, 카드의 상태 전환은 CSS transition 150~200ms `ease-out`을 사용한다.
- 로딩 shimmer는 반복 자극이 되지 않게 최소화하고, 기본적으로 미스트 색상의 정적 skeleton을 사용한다.
- 애니메이션은 상태를 보조할 뿐 상태의 유일한 표현이 되지 않는다.

## 상태 패턴

### Loading

- 레이아웃과 유사한 미스트 skeleton으로 구조를 유지한다.
- 버튼에서 진행 중일 때 label과 접근 가능한 상태 설명을 제공한다.
- 긴 반복 shimmer나 전체 화면 pulse를 사용하지 않는다.

### Empty

- 비어 있는 이유를 한 문장으로 설명한다.
- 사용자가 이어서 할 수 있는 행동을 하나만 Primary 또는 Secondary action으로 제공한다.

### Error

- 색상뿐 아니라 오류 텍스트, 아이콘, 복구 행동을 함께 제공한다.
- 작은 오류 잉크 경계와 관련 필드 또는 영역의 설명을 연결한다.
- 사용자 입력을 가능한 한 보존한다.

### Success

- 시그널 그린의 작은 확인 표시 또는 경계와 짧은 완료 문구를 사용한다.
- 성공을 축하하기 위한 큰 면적의 그린 배경이나 반복 애니메이션은 사용하지 않는다.

## 반응형과 접근성

### Breakpoint 원칙

| 구간        | 레이아웃                                                        |
| ----------- | --------------------------------------------------------------- |
| 1200px 이상 | 최대 너비 1200px, Hero 2열, 카드 3열                            |
| 768~1199px  | Hero 1열, 카드 2열, 주요 섹션 간격 64px                         |
| 767px 이하  | 카드 1열, CTA 전체 너비 허용, 인라인 라벨 자연 줄바꿈, pin 제거 |

### 접근성 기준

- 모든 동작 영역은 최소 44×44px을 확보한다.
- 키보드 포커스에는 2px 일렉트릭 블루 링을 표시한다.
- 일반 본문 대비는 WCAG AA 4.5:1 이상을 목표로 한다.
- 입력은 항상 눈에 보이는 label과 오류 연결을 제공한다.
- 현재 탭과 필터는 색상 이외의 시각 단서와 ARIA 상태를 함께 제공한다.
- 장식 이모지와 모션 레이어는 적절히 `aria-hidden` 처리한다.
- CSS fallback과 정적 콘텐츠를 먼저 배치해 JavaScript 실패 시에도 핵심 정보와 CTA를 유지한다.

## 데이터 흐름과 동작 보존

- 인증 진입 상태 `onboarding → login → workspace`는 유지한다.
- 검색어, 활성 카테고리, 활성 탭, 저장 데이터의 현재 소유권과 의미를 유지한다.
- UI 분리 과정에서 callback과 명시적 props로 상태를 전달하되 새로운 전역 상태 도구를 도입하지 않는다.
- 검색 알고리즘, 저장 payload, API, 인증 구현은 변경하지 않는다.
- UI 어댑터는 이벤트와 접근성 계약을 유지하고 스타일 책임만 제품 경계로 가져온다.

## 테스트와 검증

### 자동 검증

- `tokens.ts`가 필수 색상, 간격, 곡률, 타이포그래피, 모션 값을 제공하는지 단위 테스트한다.
- `applyDesignTokens()`가 기대한 CSS custom property를 문서 루트에 적용하는지 검증한다.
- `shared/ui` 어댑터가 클릭, 입력, 선택, 키보드와 ARIA 계약을 보존하는지 검증한다.
- 기존 온보딩 → 로그인 → 작업 공간 흐름 회귀 테스트를 유지한다.
- 검색, 카테고리 필터, 탭 전환, 저장 흐름의 대표 행동을 검증한다.
- reduced motion 환경에서 최종 연결 장면과 CTA가 보이는지 검증한다.
- timeline의 개별 transform 수치나 프레임을 단위 테스트에 고정하지 않는다.

### 정적 검증

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run format:check`
- 변경 파일에 대한 `git diff --check`

### 브라우저 시각 검증

- 1440px: 온보딩 첫 viewport, 단일 pin 시작과 종료, 작업 공간 3열 그리드
- 1024px: Hero 1열 전환, 작업 공간 2열 그리드, 내비게이션 밀도
- 390px: 인라인 라벨 줄바꿈, 전체 너비 CTA, 카드 1열, pin 없는 연결 장면
- 키보드만으로 로그인, 탭, 필터, 검색, 저장의 대표 경로 확인
- reduced motion 환경과 일반 환경 비교
- loading, empty, error, success 상태의 텍스트·아이콘·행동 확인
- 구현 전후 주요 화면 screenshot 비교

## 구현 순서의 경계

세부 작업 순서는 별도 구현 계획에서 확정하되 다음 의존 관계를 지킨다.

1. 토큰 타입과 값, CSS 변수 적용 경계를 먼저 만든다.
2. `shared/ui`의 최소 어댑터를 만든다.
3. 앱 조합과 변경 대상 화면을 FSD 기준으로 분리한다.
4. 정적 White Canvas 화면을 완성한다.
5. 온보딩의 단일 GSAP 장면을 연결한다.
6. 자동 검증과 반응형 브라우저 QA를 수행한다.
7. `DESIGN.md`를 최종 구현과 일치하도록 갱신한다.

## 비목표

- 외부 UI 라이브러리 자체를 제거하거나 포크하지 않는다.
- 데이터 모델, 저장소 형식, 검색 알고리즘, API, 인증 방식을 변경하지 않는다.
- 새로운 전역 상태 관리 도구를 도입하지 않는다.
- 전체 페이지에 반복 pin, 가로 스크롤, 스크롤 스냅을 추가하지 않는다.
- 제품 제어 요소를 다채로운 인라인 라벨 스타일로 바꾸지 않는다.
- 3D 캐릭터, 큰 장식 그림자, 유리 효과, 과도한 그라데이션을 추가하지 않는다.
- 이번 변경과 무관한 파일을 일괄 rename하지 않는다.

## 완료 기준

- 온보딩, 로그인, 작업 공간이 동일한 White Canvas 토큰과 컴포넌트 규칙을 사용한다.
- 토큰 값은 `tokens.ts`에 있고 CSS는 주입된 custom property만 소비한다.
- 페이지는 외부 UI 라이브러리를 직접 import하지 않는다.
- 변경 대상 파일과 심볼이 확정된 네이밍 규칙을 따른다.
- Signature Inline Label이 마케팅 문장에만 제한적으로 사용된다.
- 단일 온보딩 모션이 reduced motion과 실패 대체를 제공한다.
- 데스크톱, 태블릿, 모바일에서 핵심 흐름과 접근성이 검증된다.
- `DESIGN.md`와 구현된 토큰·컴포넌트 규칙이 일치한다.
