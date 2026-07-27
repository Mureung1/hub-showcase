import type { MacroSeries } from '../types/market.types'

export interface FredSeriesMetadataRaw {
  id?: string
  title?: string
  units?: string
  frequency?: string
}

export interface FredObservationRaw {
  date?: string
  value?: string
}

export function mapFredMacroSeries(
  seriesId: string,
  metadata: FredSeriesMetadataRaw | undefined,
  observations: FredObservationRaw[],
): MacroSeries {
  return {
    seriesId,
    title: metadata?.title ?? seriesId,
    unit: metadata?.units ?? '',
    frequency: metadata?.frequency ?? '',
    observations: observations.map((observation) => ({
      date: observation.date ?? '',
      value: mapFredObservationValue(observation.value),
    })),
    provider: 'FRED',
  }
}

export function mapFredObservationValue(value: string | undefined): number | null {
  if (value === undefined || value === '.') return null

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}
