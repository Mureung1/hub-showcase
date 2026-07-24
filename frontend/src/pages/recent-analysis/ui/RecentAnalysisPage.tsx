import { useMemo, useState } from 'react'

import { FilterChipRow } from '@/shared/ui/FilterChipRow'

import { CATEGORY_FILTERS, MOCK_RECENT_ANALYSES } from '../model/mockRecentAnalyses'
import type { AnalysisCategoryFilter } from '../model/types'
import { RecentAnalysisList } from './RecentAnalysisList'
import { ContentWrapper, EmptyState, HeaderBlock, PageRoot, ScrollArea, Subtitle, Title } from './RecentAnalysisPage.styles'

export default function RecentAnalysisPage() {
  const [activeFilter, setActiveFilter] = useState<AnalysisCategoryFilter>('all')

  const filteredItems = useMemo(
    () =>
      activeFilter === 'all'
        ? MOCK_RECENT_ANALYSES
        : MOCK_RECENT_ANALYSES.filter((item) => item.category === activeFilter),
    [activeFilter],
  )

  return (
    <PageRoot>
      <ScrollArea>
        <ContentWrapper>
          <HeaderBlock>
            <Title>최근 분석</Title>
            <Subtitle>저장한 분석을 주제별로 자동 정리했어요.</Subtitle>
          </HeaderBlock>

          <FilterChipRow options={CATEGORY_FILTERS} activeFilter={activeFilter} onSelectFilter={setActiveFilter} />

          {filteredItems.length > 0 ? (
            <RecentAnalysisList items={filteredItems} />
          ) : (
            <EmptyState>해당 주제의 분석이 아직 없어요.</EmptyState>
          )}
        </ContentWrapper>
      </ScrollArea>
    </PageRoot>
  )
}
