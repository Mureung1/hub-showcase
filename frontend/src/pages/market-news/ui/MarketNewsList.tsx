import { EasyInterpretationNote } from '@/shared/ui/EasyInterpretationNote'
import { ImpactBadge } from '@/shared/ui/ImpactBadge'
import { Tag } from '@/shared/ui/Tag'

import type { ImpactLevel, MarketNewsItem } from '../model/types'
import { ItemDescription, ItemRow, ItemTitle, ListRoot, TagRow, TitleRow } from './MarketNewsList.styles'

interface MarketNewsListProps {
  items: MarketNewsItem[]
}

const IMPACT_LABEL: Record<ImpactLevel, string> = {
  high: '영향도 높음',
  medium: '영향도 보통',
  low: '영향도 낮음',
}

export const MarketNewsList = ({ items }: MarketNewsListProps) => (
  <ListRoot>
    {items.map((item) => (
      <ItemRow key={item.id}>
        <TitleRow>
          <ItemTitle>{item.title}</ItemTitle>
          <ImpactBadge impact={item.impact}>{IMPACT_LABEL[item.impact]}</ImpactBadge>
        </TitleRow>
        <TagRow>
          {item.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </TagRow>
        <ItemDescription>{item.description}</ItemDescription>
        <EasyInterpretationNote>{item.easyInterpretation}</EasyInterpretationNote>
      </ItemRow>
    ))}
  </ListRoot>
)
