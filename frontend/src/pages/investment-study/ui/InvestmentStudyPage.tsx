import { useMemo, useState } from 'react'

import { CONCEPT_MAP_ORDER, STUDY_TERMS } from '../model/mockTerms'
import { ConceptMapCard } from './ConceptMapCard'
import { ContentWrapper, HeaderBlock, PageRoot, ScrollArea, Subtitle, Title } from './InvestmentStudyPage.styles'
import { TermDetailCard } from './TermDetailCard'

const CONCEPT_MAP_TERMS = CONCEPT_MAP_ORDER.map((id) => STUDY_TERMS[id])

export default function InvestmentStudyPage() {
  const [activeTermId, setActiveTermId] = useState(CONCEPT_MAP_ORDER[0])

  const activeTerm = STUDY_TERMS[activeTermId]
  const relatedTerms = useMemo(
    () => activeTerm.relatedTermIds.map((id) => STUDY_TERMS[id]),
    [activeTerm],
  )

  return (
    <PageRoot>
      <ScrollArea>
        <ContentWrapper>
          <HeaderBlock>
            <Title>투자 공부</Title>
            <Subtitle>어려운 투자 용어를 연결해서 쉽게 이해해보세요.</Subtitle>
          </HeaderBlock>

          <ConceptMapCard terms={CONCEPT_MAP_TERMS} activeTermId={activeTermId} onSelectTerm={setActiveTermId} />

          <TermDetailCard term={activeTerm} relatedTerms={relatedTerms} onSelectTerm={setActiveTermId} />
        </ContentWrapper>
      </ScrollArea>
    </PageRoot>
  )
}
