import type { WatchlistItem } from '../model/watchlistData'
import {
  WatchlistChangeRate,
  WatchlistInfo,
  WatchlistName,
  WatchlistRow,
  WatchlistSymbol,
} from './SidebarWidget.styles'

interface SidebarWatchlistRowProps {
  item: WatchlistItem
}

const formatChangeRate = (changeRate: number) => `${changeRate > 0 ? '+' : ''}${changeRate}%`

export const SidebarWatchlistRow = ({ item }: SidebarWatchlistRowProps) => (
  <WatchlistRow to={`/stocks/${item.symbol}`} aria-label={`${item.name} analysis`}>
    <WatchlistInfo>
      <WatchlistName>{item.name}</WatchlistName>
      <WatchlistSymbol>{item.symbol}</WatchlistSymbol>
    </WatchlistInfo>
    <WatchlistChangeRate market={item.market}>
      {formatChangeRate(item.changeRate)}
    </WatchlistChangeRate>
  </WatchlistRow>
)
