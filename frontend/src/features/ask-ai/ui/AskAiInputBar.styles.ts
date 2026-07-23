import styled from '@emotion/styled'

export const InputBarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  width: 100%;
  padding: ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[8]} ${({ theme }) => theme.space[3]};
  background: ${({ theme }) => theme.colors.background.elevated};
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
`

export const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  width: 100%;
  max-width: 708px;
`

export const StyledInputWrapper = styled.div`
  flex: 1;
  min-width: 0;
`

export const Disclaimer = styled.p`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
  text-align: center;
`
