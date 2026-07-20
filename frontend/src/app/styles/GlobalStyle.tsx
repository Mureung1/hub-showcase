import { Global, useTheme } from '@emotion/react'

import { globalStyles } from './globalStyles'
import { reset } from './reset'

export const GlobalStyle = () => {
  const theme = useTheme()

  return <Global styles={[reset, globalStyles(theme)]} />
}
