export type MarketDirection = 'rise' | 'fall' | 'neutral'

export interface StockAnalysisHeader {
  topic: string
  stockName: string
  stockSymbol: string
  price: string
  changeRate: number
  direction: MarketDirection
  updatedAt: string
  source: string
}

export interface JudgmentSummary {
  title: string
  paragraphs: string[]
  positiveFactorCount: number
  riskFactorCount: number
}

export interface NumberedPoint {
  order: string
  text: string
  description?: string
}

export interface PriceScenario {
  id: string
  direction: MarketDirection
  label: string
  title: string
  description: string
}

export interface RelatedNewsItem {
  id: string
  title: string
  description: string
}

export interface StockAnalysisResult {
  header: StockAnalysisHeader
  judgment: JudgmentSummary
  reasons: NumberedPoint[]
  risks: NumberedPoint[]
  scenarios: PriceScenario[]
  easyExplanation: string
  relatedNews: {
    sectionLabel: string
    items: RelatedNewsItem[]
  }
  meta: {
    dataDate: string
    source: string
    note: string
  }
}
