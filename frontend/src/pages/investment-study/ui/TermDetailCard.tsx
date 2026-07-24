import { EasyInterpretationNote } from '@/shared/ui/EasyInterpretationNote'

import type { StudyTerm } from '../model/types'
import { CardRoot, EyebrowLabel, RelatedRow, RelatedSection, SectionLabel, TermDescription, TermTitle } from './TermDetailCard.styles'
import { TermChip } from './TermChip'

interface TermDetailCardProps {
  term: StudyTerm
  relatedTerms: StudyTerm[]
  onSelectTerm: (termId: string) => void
}

export const TermDetailCard = ({ term, relatedTerms, onSelectTerm }: TermDetailCardProps) => (
  <CardRoot>
    <EyebrowLabel>지금 배우는 용어</EyebrowLabel>
    <TermTitle>{term.label}</TermTitle>
    <TermDescription>{term.description}</TermDescription>
    <EasyInterpretationNote label="쉽게 말하면">{term.easyExplanation}</EasyInterpretationNote>

    <RelatedSection>
      <SectionLabel>이어서 공부하면 좋은 개념</SectionLabel>
      <RelatedRow>
        {relatedTerms.map((relatedTerm) => (
          <TermChip key={relatedTerm.id} onClick={() => onSelectTerm(relatedTerm.id)}>
            {relatedTerm.label} →
          </TermChip>
        ))}
      </RelatedRow>
    </RelatedSection>
  </CardRoot>
)
