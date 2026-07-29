import { ImpactBadge } from '@/shared/ui/ImpactBadge'

import type { CalendarEvent, ImpactLevel } from '../model/types'
import {
  ItemBody,
  ItemDescription,
  ItemRow,
  ItemTitle,
  ListRoot,
  TimeLabel,
} from './CalendarEventList.styles'

interface CalendarEventListProps {
  events: CalendarEvent[]
  selectedEventId?: string
  onSelectEvent: (event: CalendarEvent) => void
}

const IMPACT_LABEL: Record<ImpactLevel, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

export const CalendarEventList = ({
  events,
  selectedEventId,
  onSelectEvent,
}: CalendarEventListProps) => (
  <ListRoot>
    {events.map((event) => (
      <ItemRow
        key={event.id}
        type="button"
        isSelected={event.id === selectedEventId}
        onClick={() => onSelectEvent(event)}
      >
        <TimeLabel>{event.time}</TimeLabel>
        <ItemBody>
          <ItemTitle>{event.title}</ItemTitle>
          <ItemDescription>{event.description}</ItemDescription>
        </ItemBody>
        <ImpactBadge impact={event.impact}>{IMPACT_LABEL[event.impact]}</ImpactBadge>
      </ItemRow>
    ))}
  </ListRoot>
)
