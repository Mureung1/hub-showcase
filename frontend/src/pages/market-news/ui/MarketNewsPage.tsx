import { MOCK_MARKET_NEWS } from '../model/mockMarketNews'
import { MarketNewsList } from './MarketNewsList'
import { ContentWrapper, HeaderBlock, MetaText, PageRoot, ScrollArea, Subtitle, Title } from './MarketNewsPage.styles'

export default function MarketNewsPage() {
  return (
    <PageRoot>
      <ScrollArea>
        <ContentWrapper>
          <HeaderBlock>
            <Title>시장 소식</Title>
            <Subtitle>오늘 시장에 영향을 줄 핵심 이슈만 쉽게 정리했어요.</Subtitle>
          </HeaderBlock>

          <MarketNewsList items={MOCK_MARKET_NEWS} />

          <MetaText>데이터 기준 2026.07.23 16:00 · 해석은 예측이 아닌 참고 정보입니다</MetaText>
        </ContentWrapper>
      </ScrollArea>
    </PageRoot>
  )
}
