# Free Photos Search UI Design Skill

## Overview

- **Name:** `free-photos-search-ui`
- **Version:** `1.0.0`
- **Type:** `design-skill`
- **Description:** 검색 페이지 디자인 규칙을 담은 reusable design skill

이 문서는 무료 사진 검색 UI에 적용할 디자인 토큰, 컴포넌트 규칙, 사용 지침을 정리합니다.

## Design Tokens

### Colors

| Token | Value | Usage |
| --- | --- | --- |
| `bg` | `#060606` | 전체 배경 |
| `surface` | `#0f0f0f` | 일반 표면 배경 |
| `cardOverlay` | `rgba(0,0,0,0.55)` | 카드 위 오버레이 |
| `primary` | `#ff5a5f` | 주요 액션 및 강조 |
| `primaryCta` | `#ff3b3f` | CTA 강조 버튼 |
| `text` | `#ffffff` | 기본 텍스트 |
| `muted` | `#b3b3b3` | 보조 텍스트 |
| `border` | `rgba(255,255,255,0.06)` | 약한 경계선 |
| `inputBg` | `rgba(255,255,255,0.06)` | 입력 필드 배경 |
| `searchBg` | `rgba(255,255,255,0.08)` | 검색창 배경 |
| `overlay` | `linear-gradient(180deg, rgba(6,6,6,0.45) 0%, rgba(6,6,6,0.65) 100%)` | 히어로 오버레이 |

### Typography

- **Heading:** `Montserrat, Poppins, Noto Sans KR, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif`
- **Body:** `Noto Sans KR, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif`

### Radius

| Token | Value |
| --- | --- |
| `small` | `6px` |
| `medium` | `12px` |
| `large` | `20px` |
| `pill` | `9999px` |

### Spacing

| Token | Value |
| --- | --- |
| `xxs` | `4px` |
| `xs` | `8px` |
| `sm` | `12px` |
| `md` | `20px` |
| `lg` | `32px` |
| `xl` | `48px` |

### Type Scale

| Token | Value |
| --- | --- |
| `xs` | `12px` |
| `sm` | `14px` |
| `md` | `16px` |
| `lg` | `22px` |
| `xl` | `36px` |
| `xxl` | `56px` |

### Layout

| Token | Value |
| --- | --- |
| `heroMinHeight` | `80vh` |
| `heroMaxWidth` | `1800px` |
| `searchMaxWidth` | `1800px` |
| `searchPadding` | `6px` |
| `searchInputPadding` | `18px 24px` |

### Card

| Token | Value |
| --- | --- |
| `surfaceBg` | `#0b0b0b` |
| `shadow` | `0 20px 40px rgba(0,0,0,0.6)` |
| `padding` | `12px` |

## Component Guidelines

### Hero

- Use `token(color.bg)` as the base background.
- Apply `token(color.overlay)` above background imagery.
- Keep the minimum height at `token(layout.heroMinHeight)`.
- Constrain content with `token(layout.heroMaxWidth)`.
- Center-align hero text.

### Search Bar

- Set width to `100%` and max width to `token(layout.searchMaxWidth)`.
- Use `token(color.searchBg)` for the search container background.
- Apply `token(radius.pill)` for a fully rounded search field.
- Use `0 16px 60px rgba(0,0,0,0.25)` for search bar shadow.

#### Input

- Keep the input background transparent.
- Remove the input border.
- Use `token(color.text)` for input text.
- Use `rgba(255,255,255,0.7)` for placeholder text.
- Set font size to `18px`.

#### Button

- Use `token(color.primary)` as the button background.
- Use `token(color.text)` for button text.
- Apply `token(radius.pill)` for the button radius.

## Usage Rules

- 검색 페이지 전체를 다크 테마로 유지합니다.
- 검색창은 중앙 정렬하고, 넓은 폭과 둥근 모서리를 사용합니다.
- 검색창 뒤 배경 이미지는 불투명도 50%로 처리합니다.
- 헤딩은 산세리프 계열을 사용하고, 본문은 `Noto Sans KR` 기반 산세리프를 사용합니다.
- 버튼은 주색 `#ff5a5f`로 강조합니다.
