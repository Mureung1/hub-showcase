import { mapTossCandles, mapTossQuote } from './toss-securities.mapper'

describe('toss-securities.mapper', () => {
  it('normalizes Toss candles', () => {
    const candles = mapTossCandles('005930', '1d', [
      {
        timestamp: '2026-07-24T09:00:00+09:00',
        openPrice: '70000',
        highPrice: '72000',
        lowPrice: '69000',
        closePrice: '71000',
        volume: '1000',
      },
    ])

    expect(candles[0]).toMatchObject({
      symbol: '005930',
      open: 70000,
      close: 71000,
      provider: 'TOSS_SECURITIES',
    })
  })

  it('calculates quote change from recent daily candles', () => {
    const quote = mapTossQuote(
      {
        symbol: '005930',
        lastPrice: '72000',
        currency: 'KRW',
        timestamp: '2026-07-27T09:00:00+09:00',
      },
      { name: '삼성전자', market: 'KOSPI' },
      [
        {
          symbol: '005930',
          interval: '1d',
          timestamp: '2026-07-24T09:00:00+09:00',
          open: 70000,
          high: 71000,
          low: 69000,
          close: 71000,
          provider: 'TOSS_SECURITIES',
        },
        {
          symbol: '005930',
          interval: '1d',
          timestamp: '2026-07-27T09:00:00+09:00',
          open: 71500,
          high: 72500,
          low: 71000,
          close: 72000,
          provider: 'TOSS_SECURITIES',
        },
      ],
    )

    expect(quote.change).toBe(1000)
    expect(quote.market).toBe('KRX')
  })
})
