import styled from '@emotion/styled'

export const LayoutRoot = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background.canvas};
`

export const MainContent = styled.main`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  background: ${({ theme }) => theme.colors.background.base};
`
