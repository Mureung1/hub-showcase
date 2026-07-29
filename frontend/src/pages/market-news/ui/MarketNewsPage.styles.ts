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
  padding: ${({ theme }) => theme.space[8]} ${({ theme }) => theme.space[8]}
    ${({ theme }) => theme.space[12]};
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

export const MetaText = styled.p`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
`

export const LoadingState = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const DetailEyebrow = styled.p`
  ${({ theme }) => theme.typography.caption};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.brand};
`

export const DetailTitle = styled.h2`
  ${({ theme }) => theme.typography.bodyMedium};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const DetailBody = styled.p`
  ${({ theme }) => theme.typography.bodySmall};
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const DetailMeta = styled.p`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
`

export const DetailLink = styled.a`
  ${({ theme }) => theme.typography.labelMedium};
  color: ${({ theme }) => theme.colors.text.brand};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`
