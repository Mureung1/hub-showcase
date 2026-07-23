import { Badge } from '@/shared/ui/Badge'

import type { JudgmentSummary } from '../model/types'
import { BadgeRow, JudgmentParagraph, ParagraphGroup, SectionRoot, SectionTitle } from './JudgmentSection.styles'

interface JudgmentSectionProps {
  judgment: JudgmentSummary
}

export const JudgmentSection = ({ judgment }: JudgmentSectionProps) => (
  <SectionRoot>
    <SectionTitle>{judgment.title}</SectionTitle>
    <ParagraphGroup>
      {judgment.paragraphs.map((paragraph) => (
        <JudgmentParagraph key={paragraph}>{paragraph}</JudgmentParagraph>
      ))}
    </ParagraphGroup>
    <BadgeRow>
      <Badge tone="rise">긍정 요인 {judgment.positiveFactorCount}개</Badge>
      <Badge tone="fall">위험 요인 {judgment.riskFactorCount}개</Badge>
    </BadgeRow>
  </SectionRoot>
)
