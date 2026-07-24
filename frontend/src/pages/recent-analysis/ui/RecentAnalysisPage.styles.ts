import styled from '@emotion/styled'

export const PageRoot = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`

export const ScrollArea = styled.div`
  display: flex;
  justify-content: center;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

export const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[6]};
  width: 100%;
  max-width: ${({ theme }) => theme.size.content.maxWidth};
  padding: ${({ theme }) => theme.space[8]} ${({ theme }) => theme.space[8]} ${({ theme }) => theme.space[12]};
`

export const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  width: 100%;
`

export const Title = styled.h1`
  ${({ theme }) => theme.typography.titleMedium};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const Subtitle = styled.p`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
`

export const EmptyState = styled.p`
  ${({ theme }) => theme.typography.bodySmall};
  color: ${({ theme }) => theme.colors.text.placeholder};
  width: 100%;
  text-align: center;
  padding: ${({ theme }) => theme.space[10]} 0;
`
