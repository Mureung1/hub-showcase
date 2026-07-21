import { css } from '@emotion/react'

/**
 * 브라우저 기본 스타일을 무력화하는 순수 리셋이다.
 * 테마 토큰에 의존하지 않으며, 색상·폰트 등 GAZUA 고유 값은 globalStyles에서 적용한다.
 */
export const reset = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    min-height: 100%;
  }

  body {
    margin: 0;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p {
    margin: 0;
  }

  ul,
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  button {
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
  }

  input,
  textarea {
    color: inherit;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  img,
  picture,
  video,
  canvas,
  svg {
    display: block;
    max-width: 100%;
  }

  table {
    border-spacing: 0;
    border-collapse: collapse;
  }
`
