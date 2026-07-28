import styled from '@emotion/styled'

export const RouteFallbackRoot = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 320px;
  padding: ${({ theme }) => theme.space[8]};
`
