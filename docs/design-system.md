# 디자인 시스템

GAZUA 프런트엔드는 Emotion 기반 디자인 토큰 시스템을 사용한다. 모든 시각 값(색상, 간격, 타이포그래피
등)은 [`frontend/src/app/styles/theme.ts`](../frontend/src/app/styles/theme.ts)에 정의되어 있고,
컴포넌트는 이 토큰을 통해서만 값을 가져온다. 하드코딩된 hex 색상이나 임의의 px 값을 컴포넌트에 직접
쓰지 않는다.

값 자체는 이 문서에 복제하지 않는다. 토큰 값은 `theme.ts`가 바뀌면 같이 바뀌므로, 정확한 값은 항상
코드에서 확인한다. 이 문서는 토큰의 "그룹과 역할"을 설명한다.

Agent가 UI를 생성·수정할 때 따르는 절차는 [design-skill.md](./design-skill.md)를 참고한다.

## 소스 파일

- [`frontend/src/app/styles/theme.ts`](../frontend/src/app/styles/theme.ts) — palette, semanticColors,
  space, radius, shadow, font, typography, size, breakpoint, motion, zIndex, componentTokens,
  `gazuaTheme`, Emotion `Theme` 타입 확장
- [`frontend/src/app/styles/reset.ts`](../frontend/src/app/styles/reset.ts) — 테마에 의존하지 않는
  순수 브라우저 리셋
- [`frontend/src/app/styles/globalStyles.ts`](../frontend/src/app/styles/globalStyles.ts) — 테마에
  의존하는 GAZUA 전역 베이스 스타일(폰트, 배경, focus-visible, `.numeric`, reduced-motion)
- [`frontend/src/app/styles/GlobalStyle.tsx`](../frontend/src/app/styles/GlobalStyle.tsx) —
  `<Global styles={[reset, globalStyles(theme)]} />`를 마운트하는 컴포넌트
- [`frontend/src/app/App.tsx`](../frontend/src/app/App.tsx) — `ThemeProvider`로 `gazuaTheme`을
  주입하는 지점

## 1. 디자인 원칙

- **semantic 토큰 우선.** `theme.palette.*`(원시 색상값)를 컴포넌트에서 직접 쓰지 않고,
  `theme.colors.*`(semantic 토큰)로 색상의 "역할"을 참조한다.
- **그림자보다 테두리·배경 차이.** 토스 스타일처럼 그림자를 강하게 쓰지 않는다
  (`theme.shadow` 참고).
- **장식적 애니메이션 최소화.** 금융 서비스에서는 상태 전환을 명확히 보여주는 데 집중한다
  (`theme.motion` 참고).
- **market 색상은 status 색상과 별개 축이다.** 국내 증시 기준 상승은 `theme.colors.market.rise`
  (빨강), 하락은 `theme.colors.market.fall`(파랑)이다. 일반적인 `theme.colors.status.success`
  (초록)/`status.danger`(빨강)와 혼용하지 않는다.

## 2. 컬러 토큰

`theme.colors.*` 아래 semantic 그룹으로 구성된다.

| 그룹 | 접근 경로 | 용도 |
|---|---|---|
| background | `theme.colors.background.*` | 캔버스, 표면, 브랜드 약조, dimmed 배경 |
| fill | `theme.colors.fill.*` | 버튼/인터랙션 표면의 배경 (hover/pressed 포함) |
| text | `theme.colors.text.*` | 본문, placeholder, 비활성, 브랜드, 상태 텍스트 |
| icon | `theme.colors.icon.*` | 아이콘 색상 |
| border | `theme.colors.border.*` | 테두리, 포커스 링 |
| status | `theme.colors.status.*` | 성공/경고/위험/정보 상태 |
| market | `theme.colors.market.*` | 시세 상승/하락/보합 (국내 증시 관례, status와 별개) |
| ai | `theme.colors.ai.*` | AI 분석 상태(분석 중/완료/주의) |
| chart | `theme.colors.chart.*` | 차트 격자, 축, 툴팁, 시리즈 색상 |

## 3. 타이포그래피

`theme.typography.*`에 `displayLarge`부터 `caption`까지 fontSize/lineHeight/fontWeight/letterSpacing
세트가 정의되어 있다. Emotion에서 스프레드로 바로 사용한다.

```tsx
const Label = styled.span`
  ${({ theme }) => theme.typography.labelMedium};
`
```

## 4. 간격 (Spacing)

`theme.space[0|1|2|3|4|5|6|8|10|12|16|20]` — 4px 단위 간격 체계다.

## 5. Radius

`theme.radius.{none,xs,sm,md,lg,xl,round}`

## 6. Shadow

`theme.shadow.{none,card,floating,overlay}` — 그림자는 강하게 쓰지 않는다(1번 디자인 원칙 참고).

## 7. 컴포넌트 상태

hover/pressed/disabled 같은 상호작용 상태는 `theme.colors.fill.*`에 이미 반영되어 있다(예:
`brand`/`brandHover`/`brandPressed`, `neutral`/`neutralHover`/`neutralPressed`, `disabled`). 새
컴포넌트를 만들 때 상태별 색상을 새로 정의하지 않고 이 값을 재사용한다. 반복되는 컴포넌트 자체의
치수/패딩/radius 조합(버튼, 인풋, 카드, 리스트 행, 사이드바, 바텀시트, 뱃지)은
`theme.components.*`(`componentTokens`)에 있다.

## 8. 반응형 기준

`theme.breakpoint.{mobile,tablet,desktop,wide}` 값이 정의되어 있다.

TODO: 실제 레이아웃이 각 breakpoint에서 어떻게 바뀌어야 하는지(그리드 컬럼 수, 사이드바 접힘 기준
등) 구체적인 규칙은 아직 없다. 화면을 구현하면서 채운다.

## 9. 접근성 기준

- **키보드 포커스만 강조.** `:focus-visible`에 `theme.colors.border.focus` 아웃라인을 적용하고,
  마우스 포커스(`:focus:not(:focus-visible)`)는 아웃라인을 제거한다(`globalStyles.ts`).
- **모션 감소 지원.** `prefers-reduced-motion: reduce`일 때 애니메이션/트랜지션 지속 시간을
  0.01ms로 낮춘다(`globalStyles.ts`).
- **숫자 자릿수 흔들림 방지.** 금액·수익률처럼 자릿수가 바뀌는 숫자에는 `.numeric` 클래스를 붙인다
  (`font-variant-numeric: tabular-nums`).

TODO: 색 대비(WCAG) 검증, 스크린 리더 대응 등 더 폭넓은 접근성 기준은 아직 문서화되지 않았다.

## 10. Emotion 연동 방법

`jsxImportSource`가 `@emotion/react`로 설정되어 있어 모든 `.tsx`에서 `css` prop을 바로 쓸 수 있다.
`theme` 타입은 `theme.ts`의 모듈 확장으로 자동완성된다.

```tsx
// frontend/src/shared/ui/Card.tsx
import styled from '@emotion/styled'

export const Card = styled.div`
  padding: ${({ theme }) => theme.components.card.padding};
  background: ${({ theme }) => theme.components.card.background};
  border: 1px solid ${({ theme }) => theme.components.card.border};
  border-radius: ${({ theme }) => theme.components.card.radius};
  box-shadow: ${({ theme }) => theme.components.card.shadow};
`
```

지양 / 권장 대조:

```tsx
// 지양 — 하드코딩, palette 직접 참조
const Bad = styled.div`
  color: #3182f6;
  padding: 16px;
  border-radius: 12px;
`

// 권장 — semantic 토큰 + spacing/radius 토큰
const Good = styled.div`
  color: ${({ theme }) => theme.colors.text.brand};
  padding: ${({ theme }) => theme.space[4]};
  border-radius: ${({ theme }) => theme.radius.md};
`
```
