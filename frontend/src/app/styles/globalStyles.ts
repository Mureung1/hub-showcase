import { css, type Theme } from '@emotion/react'

/**
 * 테마 토큰에 의존하는 GAZUA 전역 기본 스타일이다.
 * 브라우저 기본값 무력화는 reset에서 담당한다.
 */
export const globalStyles = (theme: Theme) => css`
  html {
    font-family: ${theme.fontFamily.sans};
    color: ${theme.colors.text.primary};
    background: ${theme.colors.background.base};

    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background: ${theme.colors.background.base};

    ${theme.typography.bodyMedium};
  }

  input::placeholder,
  textarea::placeholder {
    color: ${theme.colors.text.placeholder};
  }

  /*
   * 주가, 수익률, 금액처럼 자릿수가 변경되는 숫자에 사용한다.
   * 숫자의 폭을 일정하게 유지하여 레이아웃 흔들림을 줄인다.
   */
  .numeric {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
  }

  /*
   * 키보드 사용자에게만 포커스를 명확하게 표시한다.
   */
  :focus:not(:focus-visible) {
    outline: none;
  }

  :focus-visible {
    outline: 2px solid ${theme.colors.border.focus};
    outline-offset: 2px;
  }

  /*
   * 사용자가 모션 감소 옵션을 활성화한 경우 애니메이션을 최소화한다.
   */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`
