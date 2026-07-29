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
  max-width: ${({ theme }) => theme.size.content.maxWidth};
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

export const ChatTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  width: 100%;
  margin-top: ${({ theme }) => theme.space[6]};
`

export const ChatMessageRow = styled.div<{ role: 'assistant' | 'user' }>`
  display: flex;
  justify-content: ${({ role }) => (role === 'user' ? 'flex-end' : 'flex-start')};
`

export const ChatBubble = styled.div<{ role: 'assistant' | 'user' }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  width: min(100%, 680px);
  padding: ${({ theme }) => theme.space[4]};
  border: 1px solid
    ${({ theme, role }) =>
      role === 'user' ? theme.colors.border.brand : theme.components.card.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, role }) =>
    role === 'user' ? theme.colors.fill.brandWeak : theme.components.card.background};
`

export const ChatAuthor = styled.span`
  ${({ theme }) => theme.typography.caption};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ChatText = styled.p`
  ${({ theme }) => theme.typography.bodySmall};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const LoadingBubble = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  border: 1px solid ${({ theme }) => theme.components.card.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.components.card.background};
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.tertiary};
`
