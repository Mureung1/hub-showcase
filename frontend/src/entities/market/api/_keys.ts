export const marketQueryKeys = {
  news: (params: unknown) => ['market', 'news', params] as const,
  economicCalendar: (params: unknown) => ['market', 'calendar', 'economic', params] as const,
  marketCalendar: (params: unknown) => ['market', 'calendar', params] as const,
  disclosures: (params: unknown) => ['market', 'disclosures', params] as const,
  macroIndicators: (params: unknown) => ['market', 'macro', 'indicators', params] as const,
  stockQuote: (symbol: string) => ['market', 'stocks', symbol, 'quote'] as const,
  stockCandles: (symbol: string, params: unknown) => ['market', 'stocks', symbol, 'candles', params] as const,
  stockAnalysis: (symbol: string, params: unknown) => ['market', 'stocks', symbol, 'analysis', params] as const,
}
