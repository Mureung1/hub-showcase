import type { StockAnalysisResult } from '../model/types'
import { CardHeader, CardRoot, CardTitle, NewsDescription, NewsRow, NewsTitle, SectionLabel } from './RelatedNewsCard.styles'

interface RelatedNewsCardProps {
  relatedNews: StockAnalysisResult['relatedNews']
}

export const RelatedNewsCard = ({ relatedNews }: RelatedNewsCardProps) => (
  <CardRoot>
    <CardHeader>
      <CardTitle>관련 뉴스와 데이터</CardTitle>
      <SectionLabel>{relatedNews.sectionLabel}</SectionLabel>
    </CardHeader>
    {relatedNews.items.map((item) => (
      <NewsRow key={item.id}>
        <NewsTitle>{item.title}</NewsTitle>
        <NewsDescription>{item.description}</NewsDescription>
      </NewsRow>
    ))}
  </CardRoot>
)
