import styled from '@emotion/styled'

export const CardRoot = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  width: 100%;
  padding: ${({ theme }) => theme.space[6]};
  background: ${({ theme }) => theme.components.card.background};
  border: 1px solid ${({ theme }) => theme.components.card.border};
  border-radius: ${({ theme }) => theme.components.card.radius};
`

export const EyebrowLabel = styled.p`
  ${({ theme }) => theme.typography.caption};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.brand};
`

export const TermTitle = styled.h2`
  ${({ theme }) => theme.typography.titleMedium};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const TermDescription = styled.p`
  ${({ theme }) => theme.typography.bodySmall};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const RelatedSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  width: 100%;
  padding-top: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
`

export const SectionLabel = styled.p`
  ${({ theme }) => theme.typography.caption};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.placeholder};
`

export const RelatedRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  width: 100%;
`
