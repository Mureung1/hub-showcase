import { ThemeProvider } from '@emotion/react'
import { BrowserRouter } from 'react-router-dom'

import { AppRoutes } from './router'
import { GlobalStyle } from './styles/GlobalStyle'
import { gazuaTheme } from './styles/theme'

export const App = () => {
  return (
    <ThemeProvider theme={gazuaTheme}>
      <GlobalStyle />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  )
}
