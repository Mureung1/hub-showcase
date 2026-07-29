import { css } from '@emotion/react'
import styled from '@emotion/styled'

export const ListRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  background: ${({ theme }) => theme.components.card.background};
  border: 1px solid ${({ theme }) => theme.components.card.border};
  border-radius: ${({ theme }) => theme.components.card.radius};
  overflow: hidden;
`

export const ItemRow = styled.button<{ isSelected?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]};
  width: 100%;
  padding: ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[5]};
  border: none;
  border-top: 1px solid ${({ theme }) => theme.components.listRow.divider};
  background: transparent;
  cursor: pointer;
  text-align: left;

  ${({ theme, isSelected }) =>
    isSelected &&
    css`
      background: ${theme.colors.fill.brandWeak};
    `}

  &:first-of-type {
    border-top: none;
  }

  &:hover {
    background: ${({ theme, isSelected }) =>
      isSelected ? theme.colors.fill.brandWeak : theme.colors.fill.neutralHover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.border.focus};
    outline-offset: -2px;
  }
`

export const TimeLabel = styled.span`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
  flex-shrink: 0;
  width: 76px;
`

export const ItemBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  flex: 1;
  min-width: 0;
`

export const ItemTitle = styled.p`
  ${({ theme }) => theme.typography.labelMedium};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ItemDescription = styled.p`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
`
