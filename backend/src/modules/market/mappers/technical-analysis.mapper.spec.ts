import { calculateRsi, calculateStockAnalysis, movingAverage } from './technical-analysis.mapper'

describe('technical-analysis.mapper', () => {
  it('calculates moving average and RSI', () => {
    const values = Array.from({ length: 20 }, (_, index) => 100 + index)

    expect(movingAverage(values, 5)).toBe(117)
    expect(calculateRsi(values, 14)).toBe(100)
  })

  it('calculates stock analysis metrics without investment advice', () => {
    const candles = Array.from({ length: 65 }, (_, index) => ({
      symbol: '005930',
      interval: '1d',
      timestamp: `2026-07-${String((index % 28) + 1).padStart(2, '0')}T09:00:00+09:00`,
      open: 100 + index,
      high: 101 + index,
      low: 99 + index,
      close: 100 + index,
      volume: 1000 + index,
      provider: 'TOSS_SECURITIES' as const,
    }))

    const analysis = calculateStockAnalysis('005930', '6m', candles)

    expect(analysis.movingAverage60).toBeGreaterThan(100)
    expect(analysis.basis.dataPoints).toBe(65)
    expect(JSON.stringify(analysis)).not.toContain('buy')
  })
})
