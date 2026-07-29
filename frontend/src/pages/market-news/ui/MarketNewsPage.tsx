import { useState } from 'react'

import { useMarketNews, type ServerMarketNewsItem } from '@/entities/market'
import { Modal } from '@/shared/ui/Modal'
import { Spinner } from '@/shared/ui/Spinner'

import type { ImpactLevel, MarketNewsItem } from '../model/types'
import { MarketNewsList } from './MarketNewsList'
import {
  ContentWrapper,
  DetailBody,
  DetailEyebrow,
  DetailLink,
  DetailMeta,
  DetailTitle,
  HeaderBlock,
  LoadingState,
  MetaText,
  PageRoot,
  ScrollArea,
  Subtitle,
  Title,
} from './MarketNewsPage.styles'

export default function MarketNewsPage() {
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined)
  const marketNewsQuery = useMarketNews({ limit: 20 })
  const items = marketNewsQuery.data?.data.map(mapServerNewsItemToViewItem) ?? []
  const selectedItem = items.find((item) => item.id === selectedItemId)
  const meta = marketNewsQuery.data?.meta

  return (
    <PageRoot>
      <ScrollArea>
        <ContentWrapper>
          <HeaderBlock>
            <Title>Market News</Title>
            <Subtitle>Fresh market headlines normalized through provider feeds.</Subtitle>
          </HeaderBlock>

          {marketNewsQuery.isPending && (
            <LoadingState>
              <Spinner size="small" label="Market news loading" />
              Loading market news...
            </LoadingState>
          )}

          {marketNewsQuery.isError && (
            <MetaText>
              Market news is unavailable.{' '}
              <button type="button" onClick={() => void marketNewsQuery.refetch()}>
                Retry
              </button>
            </MetaText>
          )}

          {!marketNewsQuery.isPending && !marketNewsQuery.isError && items.length === 0 && (
            <MetaText>No market news.</MetaText>
          )}

          {items.length > 0 && (
            <MarketNewsList
              items={items}
              selectedItemId={selectedItemId}
              onSelectItem={(item) => setSelectedItemId(item.id)}
            />
          )}

          {selectedItem && (
            <Modal title="시장 소식 상세" onClose={() => setSelectedItemId(undefined)}>
              <DetailEyebrow>선택한 시장 소식</DetailEyebrow>
              <DetailTitle>{selectedItem.title}</DetailTitle>
              <DetailBody>{selectedItem.description}</DetailBody>
              <DetailBody>{selectedItem.easyInterpretation}</DetailBody>
              <DetailMeta>
                {selectedItem.source} · {selectedItem.provider} ·{' '}
                {selectedItem.publishedAt ? formatUpdatedAt(selectedItem.publishedAt) : '실시간'}
              </DetailMeta>
              {selectedItem.originalUrl && (
                <DetailLink href={selectedItem.originalUrl} target="_blank" rel="noreferrer">
                  원문 링크 열기
                </DetailLink>
              )}
            </Modal>
          )}

          {meta && (
            <MetaText>
              updated {formatUpdatedAt(meta.updatedAt)} · provider {meta.provider} · delayed{' '}
              {meta.isDelayed ? 'yes' : 'no'}
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
    tags: [item.category, item.source, ...item.symbols].filter((tag): tag is string =>
      Boolean(tag),
    ),
    description: item.summary,
    easyInterpretation: `${item.provider} · ${formatUpdatedAt(item.publishedAt)}`,
    originalUrl: item.originalUrl,
    source: item.source,
    provider: item.provider,
    publishedAt: item.publishedAt,
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
