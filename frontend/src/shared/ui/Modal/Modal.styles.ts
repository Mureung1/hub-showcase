import styled from '@emotion/styled'

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[6]};
  background: ${({ theme }) => theme.colors.background.dimmed};
`

export const ModalDialog = styled.div`
  display: flex;
  flex-direction: column;
  width: min(100%, 560px);
  max-height: min(720px, calc(100vh - 48px));
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.components.card.border};
  border-radius: ${({ theme }) => theme.components.card.radius};
  background: ${({ theme }) => theme.colors.background.floating};
  box-shadow: ${({ theme }) => theme.shadow.overlay};
`

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => theme.space[5]} ${({ theme }) => theme.space[5]}
    ${({ theme }) => theme.space[3]};
`

export const ModalTitle = styled.h2`
  ${({ theme }) => theme.typography.bodyMedium};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ModalCloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.size.icon.lg};
  height: ${({ theme }) => theme.size.icon.lg};
  flex-shrink: 0;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.icon.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.fill.neutralHover};
    color: ${({ theme }) => theme.colors.icon.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.border.focus};
    outline-offset: 2px;
  }
`

export const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  padding: 0 ${({ theme }) => theme.space[5]} ${({ theme }) => theme.space[5]};
  overflow-y: auto;
`
