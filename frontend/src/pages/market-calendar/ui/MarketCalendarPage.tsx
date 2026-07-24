import { useState } from 'react'

import { FilterChipRow } from '@/shared/ui/FilterChipRow'

import { MOCK_CALENDAR_EVENTS, PERIOD_FILTERS } from '../model/mockCalendarEvents'
import type { CalendarPeriod } from '../model/types'
import { CalendarEventList } from './CalendarEventList'
import { ContentWrapper, HeaderBlock, PageRoot, ScrollArea, Subtitle, Title } from './MarketCalendarPage.styles'

export default function MarketCalendarPage() {
  const [activePeriod, setActivePeriod] = useState<CalendarPeriod>('week')

  return (
    <PageRoot>
      <ScrollArea>
        <ContentWrapper>
          <HeaderBlock>
            <Title>증시 캘린더</Title>
            <Subtitle>증시에 영향을 줄 수 있는 일정을 기간별로 모아봤어요.</Subtitle>
          </HeaderBlock>

          <FilterChipRow options={PERIOD_FILTERS} activeFilter={activePeriod} onSelectFilter={setActivePeriod} />

          <CalendarEventList events={MOCK_CALENDAR_EVENTS} />
        </ContentWrapper>
      </ScrollArea>
    </PageRoot>
  )
}
