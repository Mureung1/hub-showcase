import type { StockAnalysisHeader as StockAnalysisHeaderData } from '../model/types'
import {
  ChangeRate,
  HeaderRoot,
  MetaText,
  Price,
  PriceColumn,
  PriceGroup,
  StatsRow,
  StockName,
  Topic,
} from './StockAnalysisHeader.styles'

interface StockAnalysisHeaderProps {
  header: StockAnalysisHeaderData
}

const formatChangeRate = (changeRate: number) => `${changeRate > 0 ? '+' : ''}${changeRate}%`

export const StockAnalysisHeader = ({ header }: StockAnalysisHeaderProps) => (
  <HeaderRoot>
    <Topic>{header.topic}</Topic>
    <StatsRow>
      <PriceGroup>
        <PriceColumn>
          <StockName>
            {header.stockName} · {header.stockSymbol}
          </StockName>
          <Price className="numeric">{header.price}</Price>
        </PriceColumn>
        <ChangeRate className="numeric" direction={header.direction}>
          {formatChangeRate(header.changeRate)}
        </ChangeRate>
      </PriceGroup>
      <MetaText>
        {header.updatedAt} · {header.source}
      </MetaText>
    </StatsRow>
  </HeaderRoot>
)
