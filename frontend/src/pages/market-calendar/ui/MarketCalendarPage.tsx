import { useState } from 'react'

import { useMarketCalendar, type MarketCalendarEvent as ServerMarketCalendarEvent } from '@/entities/market'
import { FilterChipRow } from '@/shared/ui/FilterChipRow'

import { PERIOD_FILTERS } from '../model/mockCalendarEvents'
import type { CalendarEvent, CalendarPeriod, ImpactLevel } from '../model/types'
import { CalendarEventList } from './CalendarEventList'
import { ContentWrapper, HeaderBlock, MetaText, PageRoot, ScrollArea, Subtitle, Title } from './MarketCalendarPage.styles'

export default function MarketCalendarPage() {
  const [activePeriod, setActivePeriod] = useState<CalendarPeriod>('week')
  const marketCalendarQuery = useMarketCalendar(getCalendarRange(activePeriod))
  const events = marketCalendarQuery.data?.data.map(mapServerCalendarEventToViewEvent) ?? []
  const meta = marketCalendarQuery.data?.meta

  return (
    <PageRoot>
      <ScrollArea>
        <ContentWrapper>
          <HeaderBlock>
            <Title>Market Calendar</Title>
            <Subtitle>Economic releases, disclosures, and market sessions in one timeline.</Subtitle>
          </HeaderBlock>

          <FilterChipRow options={PERIOD_FILTERS} activeFilter={activePeriod} onSelectFilter={setActivePeriod} />

          {marketCalendarQuery.isPending && <MetaText>Loading market calendar...</MetaText>}

          {marketCalendarQuery.isError && (
            <MetaText>
              Market calendar is unavailable.{' '}
              <button type="button" onClick={() => void marketCalendarQuery.refetch()}>
                Retry
              </button>
            </MetaText>
          )}

          {!marketCalendarQuery.isPending && !marketCalendarQuery.isError && events.length === 0 && <MetaText>No calendar events.</MetaText>}

          {events.length > 0 && <CalendarEventList events={events} />}

          {meta && (
            <MetaText>
              updated {formatDateTime(meta.updatedAt)} · providers {(meta.providers ?? [meta.provider]).filter(Boolean).join(', ')}
            </MetaText>
          )}
        </ContentWrapper>
      </ScrollArea>
    </PageRoot>
  )
}

function getCalendarRange(period: CalendarPeriod): { from: string; to: string } {
  const from = new Date()
  const to = new Date()
  const daysByPeriod: Record<CalendarPeriod, number> = {
    week: 7,
    month: 30,
    year: 45,
  }

  to.setUTCDate(to.getUTCDate() + daysByPeriod[period])

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

function mapServerCalendarEventToViewEvent(event: ServerMarketCalendarEvent): CalendarEvent {
  return {
    id: event.id,
    time: formatDateTime(event.scheduledAt),
    title: event.title,
    description: [event.country, event.symbol, event.provider].filter(Boolean).join(' · '),
    impact: mapCalendarImpact(event),
  }
}

function mapCalendarImpact(event: ServerMarketCalendarEvent): ImpactLevel {
  if (event.importance === 'HIGH') return 'high'
  if (event.importance === 'LOW' || event.type === 'MARKET_HOLIDAY') return 'low'
  return 'medium'
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}
