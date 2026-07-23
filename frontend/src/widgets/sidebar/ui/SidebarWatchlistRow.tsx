import type { WatchlistItem } from '../model/watchlistMock'
import { WatchlistChangeRate, WatchlistInfo, WatchlistName, WatchlistRow, WatchlistSymbol } from './SidebarWidget.styles'

interface SidebarWatchlistRowProps {
  item: WatchlistItem
}

const formatChangeRate = (changeRate: number) => `${changeRate > 0 ? '+' : ''}${changeRate}%`

export const SidebarWatchlistRow = ({ item }: SidebarWatchlistRowProps) => (
  <WatchlistRow>
    <WatchlistInfo>
      <WatchlistName>{item.name}</WatchlistName>
      <WatchlistSymbol>{item.symbol}</WatchlistSymbol>
    </WatchlistInfo>
    <WatchlistChangeRate market={item.market}>{formatChangeRate(item.changeRate)}</WatchlistChangeRate>
  </WatchlistRow>
)
