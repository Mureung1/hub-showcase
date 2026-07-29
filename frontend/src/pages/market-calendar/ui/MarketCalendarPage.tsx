import { useState } from 'react'

import {
  useMarketCalendar,
  type MarketCalendarEvent as ServerMarketCalendarEvent,
} from '@/entities/market'
import { Modal } from '@/shared/ui/Modal'
import { Spinner } from '@/shared/ui/Spinner'
import { FilterChipRow } from '@/shared/ui/FilterChipRow'

import { PERIOD_FILTERS } from '../model/calendarEventsData'
import type { CalendarEvent, CalendarPeriod, ImpactLevel } from '../model/types'
import { CalendarEventList } from './CalendarEventList'
import {
  ContentWrapper,
  DetailBody,
  DetailEyebrow,
  DetailMeta,
  DetailTitle,
  HeaderBlock,
  LoadingState,
  MetaText,
  PageRoot,
  ScrollArea,
  Subtitle,
  Title,
} from './MarketCalendarPage.styles'

export default function MarketCalendarPage() {
  const [activePeriod, setActivePeriod] = useState<CalendarPeriod>('week')
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined)
  const marketCalendarQuery = useMarketCalendar(getCalendarRange(activePeriod))
  const events = marketCalendarQuery.data?.data.map(mapServerCalendarEventToViewEvent) ?? []
  const selectedEvent = events.find((event) => event.id === selectedEventId)
  const meta = marketCalendarQuery.data?.meta

  return (
    <PageRoot>
      <ScrollArea>
        <ContentWrapper>
          <HeaderBlock>
            <Title>Market Calendar</Title>
            <Subtitle>
              Economic releases, disclosures, and market sessions in one timeline.
            </Subtitle>
          </HeaderBlock>

          <FilterChipRow
            options={PERIOD_FILTERS}
            activeFilter={activePeriod}
            onSelectFilter={setActivePeriod}
          />

          {marketCalendarQuery.isPending && (
            <LoadingState>
              <Spinner size="small" label="Market calendar loading" />
              Loading market calendar...
            </LoadingState>
          )}

          {marketCalendarQuery.isError && (
            <MetaText>
              Market calendar is unavailable.{' '}
              <button type="button" onClick={() => void marketCalendarQuery.refetch()}>
                Retry
              </button>
            </MetaText>
          )}

          {!marketCalendarQuery.isPending &&
            !marketCalendarQuery.isError &&
            events.length === 0 && <MetaText>No calendar events.</MetaText>}

          {events.length > 0 && (
            <CalendarEventList
              events={events}
              selectedEventId={selectedEventId}
              onSelectEvent={(event) => setSelectedEventId(event.id)}
            />
          )}

          {selectedEvent && (
            <Modal title="증시 일정 상세" onClose={() => setSelectedEventId(undefined)}>
              <DetailEyebrow>선택한 증시 일정</DetailEyebrow>
              <DetailTitle>{selectedEvent.title}</DetailTitle>
              <DetailBody>{selectedEvent.detail}</DetailBody>
              <DetailMeta>
                {selectedEvent.time} · {selectedEvent.type} · {selectedEvent.provider}
              </DetailMeta>
            </Modal>
          )}

          {meta && (
            <MetaText>
              updated {formatDateTime(meta.updatedAt)} · providers{' '}
              {(meta.providers ?? [meta.provider]).filter(Boolean).join(', ')}
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
    type: event.type,
    detail: createCalendarDetail(event),
    scheduledAt: event.scheduledAt,
    provider: event.provider,
  }
}

function createCalendarDetail(event: ServerMarketCalendarEvent): string {
  if (event.type === 'ECONOMIC') {
    return [
      event.country ? `${event.country} 경제지표입니다.` : '경제지표 이벤트입니다.',
      event.importance ? `중요도는 ${event.importance}로 표시했습니다.` : undefined,
      event.consensus ? `컨센서스는 ${event.consensus}입니다.` : undefined,
      event.previous ? `이전치는 ${event.previous}입니다.` : undefined,
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (event.type === 'DISCLOSURE') {
    return `${event.symbol ?? '관심 종목'} 관련 공시 이벤트입니다. 실적, 가이던스, 주요 경영사항처럼 주가에 바로 반응할 수 있는 재료로 표시했습니다.`
  }

  if (event.type === 'MARKET_HOLIDAY') {
    return '휴장일에는 거래량과 다음 거래일 갭 변동을 같이 확인하는 흐름으로 구성했습니다.'
  }

  return '시장 운영 시간과 수급 변화에 영향을 줄 수 있는 일정입니다.'
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
