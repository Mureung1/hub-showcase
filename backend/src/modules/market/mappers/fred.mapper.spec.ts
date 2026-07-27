import { mapFredMacroSeries, mapFredObservationValue } from './fred.mapper'

describe('fred.mapper', () => {
  it('maps dot values to null', () => {
    expect(mapFredObservationValue('.')).toBeNull()
    expect(mapFredObservationValue('3.25')).toBe(3.25)
  })

  it('normalizes a FRED macro series', () => {
    const series = mapFredMacroSeries(
      'FEDFUNDS',
      { title: 'Federal Funds Effective Rate', units: 'Percent', frequency: 'Monthly' },
      [
        { date: '2026-06-01', value: '4.25' },
        { date: '2026-07-01', value: '.' },
      ],
    )

    expect(series.provider).toBe('FRED')
    expect(series.observations.at(1)?.value).toBeNull()
  })
})
