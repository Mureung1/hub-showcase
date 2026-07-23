import styled from '@emotion/styled'

export const CardList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  background: ${({ theme }) => theme.components.card.background};
  border: 1px solid ${({ theme }) => theme.components.card.border};
  border-radius: ${({ theme }) => theme.components.card.radius};
  box-shadow: ${({ theme }) => theme.shadow.card};
  overflow: hidden;
`

export const QuestionRow = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  width: 100%;
  padding: ${({ theme }) => theme.components.listRow.padding};
  border: none;
  border-top: 1px solid ${({ theme }) => theme.components.listRow.divider};
  background: transparent;
  cursor: pointer;
  text-align: left;

  &:first-of-type {
    border-top: none;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.fill.neutralHover};
  }
`

export const QuestionIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.icon.brand};
`

export const QuestionTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`

export const QuestionTitle = styled.span`
  ${({ theme }) => theme.typography.bodySmall};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const QuestionDescription = styled.span`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const QuestionChevron = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.icon.tertiary};
`
