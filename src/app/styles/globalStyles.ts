import { css } from '@emotion/react'

export const globalStyles = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
    background: #f6f7f9;
  }

  body {
    min-width: 320px;
    margin: 0;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }
`
