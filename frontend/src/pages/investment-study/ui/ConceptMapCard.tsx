import { Fragment } from 'react'

import type { StudyTerm } from '../model/types'
import { CardRoot, ChainRow, HelperText, SectionLabel } from './ConceptMapCard.styles'
import { ConnectorLine } from './TermChip.styles'
import { TermChip } from './TermChip'

interface ConceptMapCardProps {
  terms: StudyTerm[]
  activeTermId: string
  onSelectTerm: (termId: string) => void
}

export const ConceptMapCard = ({ terms, activeTermId, onSelectTerm }: ConceptMapCardProps) => (
  <CardRoot>
    <SectionLabel>개념 연결 지도</SectionLabel>
    <ChainRow>
      {terms.map((term, index) => (
        <Fragment key={term.id}>
          <TermChip isActive={term.id === activeTermId} onClick={() => onSelectTerm(term.id)}>
            {term.label}
          </TermChip>
          {index < terms.length - 1 && <ConnectorLine />}
        </Fragment>
      ))}
    </ChainRow>
    <HelperText>용어를 누르면 아래 설명이 바뀌어요. 개념이 이어지는 순서대로 따라가 보세요.</HelperText>
  </CardRoot>
)
