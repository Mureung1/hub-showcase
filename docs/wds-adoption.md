# 외부 UI 패키지 도입 경계

`@wanteddev/wds`는 공통 컴포넌트의 동작을 구현하는 내부 의존성이다. 화면 구조, 색상, radius, spacing의 제품 계약은 루트 `DESIGN.md`와 `designTokens`가 결정한다.

## 허용되는 import

외부 UI 패키지의 직접 import는 `src/shared/ui` 안의 다음 두 경계에서만 허용한다.

1. `design-system-provider`: 전역 stylesheet와 provider를 한 번 연결한다.
2. component adapter: 외부 컴포넌트를 아맞다의 작은 props 계약과 token CSS로 감싼다.

```text
src/shared/ui/
  design-system-provider/
  button/
  chip/
  navigation-bar/
  text-field/
  ...
```

`src/app`, `src/pages`, `src/widgets`, `src/features`, `src/entities`에서 `@wanteddev/wds` 또는 `@wanteddev/wds-icon`을 직접 import하는 것은 금지한다. 화면은 `@/shared/ui` public API만 사용한다.

## adapter 계약

- 제품에서 필요한 props만 공개하고 vendor 전용 props는 노출하지 않는다.
- class name과 ref를 전달하되 기본 시각 계약은 adapter CSS가 소유한다.
- Button 8px, Input 12px, Card 16px radius와 1px Ash 경계는 제품 token으로 덮어쓴다.
- focus, disabled, invalid, loading, selected 상태를 semantic attribute와 함께 전달한다.
- screen CSS가 vendor DOM 구조나 `wds-component` selector를 직접 다루지 않는다.
- named export와 각 adapter의 `index.ts` public API를 사용한다.

## token 우선순위

1. `tokens.ts`가 값을 정의한다.
2. `apply_design_tokens.ts`가 CSS custom property를 DOM에 주입한다.
3. adapter CSS가 제품 변수를 소비해 외부 컴포넌트의 기본 시각을 교정한다.
4. screen CSS는 adapter의 public class만 배치하고 vendor 색상이나 theme 값을 재정의하지 않는다.

패키지 버전과 registry 인증 정보는 설치/CI 설정에서 관리한다. 인증 token은 저장소에 커밋하지 않는다.
