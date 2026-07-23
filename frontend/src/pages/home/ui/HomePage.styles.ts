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
  width: 100%;
  max-width: 760px;
  padding: ${({ theme }) => theme.space[12]} ${({ theme }) => theme.space[8]};
`

export const Title = styled.h1`
  ${({ theme }) => theme.typography.titleMedium};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const Subtitle = styled.p`
  ${({ theme }) => theme.typography.bodyMedium};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: ${({ theme }) => theme.space[2]};
`

export const QuickQuestionsWrapper = styled.div`
  margin-top: ${({ theme }) => theme.space[6]};
`
