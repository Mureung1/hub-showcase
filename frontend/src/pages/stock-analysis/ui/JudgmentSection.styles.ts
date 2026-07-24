import styled from '@emotion/styled'

export const SectionRoot = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  width: 100%;
`

export const SectionTitle = styled.h2`
  ${({ theme }) => theme.typography.labelLarge};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ParagraphGroup = styled.div`
  display: flex;
  flex-direction: column;
`

export const JudgmentParagraph = styled.p`
  ${({ theme }) => theme.typography.bodyLarge};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const BadgeRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]};
`
