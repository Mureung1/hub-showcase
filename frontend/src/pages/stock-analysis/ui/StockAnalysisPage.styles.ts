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

export const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: ${({ theme }) => theme.colors.border.default};
`

export const FollowUpButtonWrapper = styled.div`
  width: 100%;
  display: flex;
`

export const MetaText = styled.p`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
`

export const Disclaimer = styled.p`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
`
