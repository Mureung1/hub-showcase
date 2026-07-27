import type { StockAnalysisMetrics, StockCandle } from '../types/market.types'

export function calculateStockAnalysis(
  symbol: string,
  period: string,
  candles: StockCandle[],
): StockAnalysisMetrics {
  const sortedCandles = [...candles].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  )
  const closes = sortedCandles.map((candle) => candle.close).filter((value) => value > 0)
  const volumes = sortedCandles.map((candle) => candle.volume ?? 0)
  const latestClose = closes.at(-1)
  const generatedAt = new Date().toISOString()

  return {
    symbol,
    asOf: sortedCandles.at(-1)?.timestamp ?? generatedAt,
    return1d: calculateReturn(closes, 1),
    return5d: calculateReturn(closes, 5),
    return20d: calculateReturn(closes, 20),
    movingAverage5: movingAverage(closes, 5),
    movingAverage20: movingAverage(closes, 20),
    movingAverage60: movingAverage(closes, 60),
    rsi14: calculateRsi(closes, 14),
    annualizedVolatility: calculateAnnualizedVolatility(closes),
    volumeChangeRate: calculateVolumeChangeRate(volumes),
    drawdownFromRecentHigh:
      latestClose === undefined ? undefined : calculateDrawdownFromRecentHigh(closes),
    basis: {
      period,
      dataPoints: sortedCandles.length,
      generatedAt,
    },
  }
}

export function movingAverage(values: number[], windowSize: number): number | undefined {
  if (values.length < windowSize) return undefined

  const slice = values.slice(-windowSize)
  return slice.reduce((sum, value) => sum + value, 0) / windowSize
}

export function calculateRsi(values: number[], period: number): number | undefined {
  if (values.length <= period) return undefined

  const changes = values.slice(1).map((value, index) => value - values[index])
  const recentChanges = changes.slice(-period)
  const gains =
    recentChanges.filter((change) => change > 0).reduce((sum, change) => sum + change, 0) / period
  const losses =
    Math.abs(
      recentChanges.filter((change) => change < 0).reduce((sum, change) => sum + change, 0),
    ) / period

  if (losses === 0) return 100

  const relativeStrength = gains / losses
  return 100 - 100 / (1 + relativeStrength)
}

function calculateReturn(values: number[], days: number): number | undefined {
  if (values.length <= days) return undefined

  const current = values.at(-1)
  const previous = values.at(-1 - days)

  if (current === undefined || previous === undefined || previous === 0) return undefined
  return current / previous - 1
}

function calculateAnnualizedVolatility(values: number[]): number | undefined {
  if (values.length < 3) return undefined

  const returns = values
    .slice(1)
    .map((value, index) => {
      const previous = values[index]
      return previous > 0 ? Math.log(value / previous) : undefined
    })
    .filter((value): value is number => value !== undefined)

  if (returns.length < 2) return undefined

  const average = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance =
    returns.reduce((sum, value) => sum + (value - average) ** 2, 0) / (returns.length - 1)

  return Math.sqrt(variance) * Math.sqrt(252)
}

function calculateVolumeChangeRate(volumes: number[]): number | undefined {
  if (volumes.length < 2) return undefined

  const current = volumes.at(-1)
  const previousAverage = movingAverage(volumes.slice(0, -1), Math.min(20, volumes.length - 1))

  if (current === undefined || previousAverage === undefined || previousAverage === 0)
    return undefined
  return current / previousAverage - 1
}

function calculateDrawdownFromRecentHigh(values: number[]): number | undefined {
  const current = values.at(-1)
  if (current === undefined) return undefined

  const recentHigh = Math.max(...values.slice(-60))
  return recentHigh > 0 ? current / recentHigh - 1 : undefined
}
