import { mapFmpEconomicCalendarEvent, mapFmpImportance } from './fmp.mapper'

describe('fmp.mapper', () => {
  it('maps FMP importance values explicitly', () => {
    expect(mapFmpImportance('High')).toBe('HIGH')
    expect(mapFmpImportance('Medium')).toBe('MEDIUM')
    expect(mapFmpImportance('Low')).toBe('LOW')
  })

  it('marks events as released when actual value exists', () => {
    const event = mapFmpEconomicCalendarEvent({
      event: 'CPI',
      country: 'US',
      currency: 'USD',
      date: '2026-07-27 12:30:00',
      impact: 'High',
      previous: '3.1',
      estimate: '',
      actual: '3.0',
    })

    expect(event.status).toBe('RELEASED')
    expect(event.importance).toBe('HIGH')
    expect(event.previous).toBe(3.1)
    expect(event.consensus).toBeUndefined()
    expect(event.actual).toBe(3)
  })
})
