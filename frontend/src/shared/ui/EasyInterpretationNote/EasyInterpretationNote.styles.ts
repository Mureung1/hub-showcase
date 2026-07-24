import styled from '@emotion/styled'

export const NoteBox = styled.div`
  width: 100%;
  padding: ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[4]};
  background: ${({ theme }) => theme.colors.ai.primaryWeak};
  border-radius: ${({ theme }) => theme.radius.md};
`

export const NoteText = styled.p`
  ${({ theme }) => theme.typography.labelMedium};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const NoteLabel = styled.span`
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.ai.primary};
`
