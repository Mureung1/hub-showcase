import { ThemeProvider } from '@emotion/react'

import { GlobalStyle } from './styles/GlobalStyle'
import { gazuaTheme } from './styles/theme'

export const App = () => {
  return (
    <ThemeProvider theme={gazuaTheme}>
      <GlobalStyle />
      <main aria-label="GAZUA app shell" />
    </ThemeProvider>
  )
}
