export const MarketQueryKeys = {
  all: () => ['MARKET'] as const,
  signals: () => [...MarketQueryKeys.all(), 'SIGNALS'] as const,
}
