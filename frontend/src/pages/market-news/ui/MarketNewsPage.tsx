import { useMarketNews, type ServerMarketNewsItem } from '@/entities/market'

import type { ImpactLevel, MarketNewsItem } from '../model/types'
import { MarketNewsList } from './MarketNewsList'
import { ContentWrapper, HeaderBlock, MetaText, PageRoot, ScrollArea, Subtitle, Title } from './MarketNewsPage.styles'

export default function MarketNewsPage() {
  const marketNewsQuery = useMarketNews({ limit: 20 })
  const items = marketNewsQuery.data?.data.map(mapServerNewsItemToViewItem) ?? []
  const meta = marketNewsQuery.data?.meta

  return (
    <PageRoot>
      <ScrollArea>
        <ContentWrapper>
          <HeaderBlock>
            <Title>Market News</Title>
            <Subtitle>Fresh market headlines normalized through the backend providers.</Subtitle>
          </HeaderBlock>

          {marketNewsQuery.isPending && <MetaText>Loading market news...</MetaText>}

          {marketNewsQuery.isError && (
            <MetaText>
              Market news is unavailable.{' '}
              <button type="button" onClick={() => void marketNewsQuery.refetch()}>
                Retry
              </button>
            </MetaText>
          )}

          {!marketNewsQuery.isPending && !marketNewsQuery.isError && items.length === 0 && <MetaText>No market news.</MetaText>}

          {items.length > 0 && <MarketNewsList items={items} />}

          {meta && (
            <MetaText>
              updated {formatUpdatedAt(meta.updatedAt)} · provider {meta.provider} · delayed {meta.isDelayed ? 'yes' : 'no'}
            </MetaText>
          )}
        </ContentWrapper>
      </ScrollArea>
    </PageRoot>
  )
}

function mapServerNewsItemToViewItem(item: ServerMarketNewsItem): MarketNewsItem {
  return {
    id: item.id,
    title: item.title,
    impact: mapNewsImpact(item.category),
    tags: [item.category, item.source, ...item.symbols].filter((tag): tag is string => Boolean(tag)),
    description: item.summary,
    easyInterpretation: `${item.provider} · ${formatUpdatedAt(item.publishedAt)}`,
  }
}

function mapNewsImpact(category: ServerMarketNewsItem['category']): ImpactLevel {
  if (category === 'MACRO' || category === 'GLOBAL') return 'high'
  if (category === 'COMPANY' || category === 'SECTOR') return 'medium'
  return 'low'
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}
