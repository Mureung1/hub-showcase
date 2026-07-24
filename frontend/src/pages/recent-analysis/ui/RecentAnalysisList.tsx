import { Tag } from '@/shared/ui/Tag'

import { CATEGORY_FILTERS } from '../model/mockRecentAnalyses'
import type { RecentAnalysisItem } from '../model/types'
import {
  CategoryBadge,
  ItemBody,
  ItemDescription,
  ItemRow,
  ItemTime,
  ItemTitle,
  ListRoot,
  TagRow,
} from './RecentAnalysisList.styles'

interface RecentAnalysisListProps {
  items: RecentAnalysisItem[]
}

const categoryLabel = (category: RecentAnalysisItem['category']) =>
  CATEGORY_FILTERS.find((option) => option.id === category)?.label ?? category

export const RecentAnalysisList = ({ items }: RecentAnalysisListProps) => (
  <ListRoot>
    {items.map((item) => (
      <ItemRow key={item.id}>
        <CategoryBadge category={item.category}>{categoryLabel(item.category)}</CategoryBadge>
        <ItemBody>
          <ItemTitle>{item.title}</ItemTitle>
          <ItemDescription>{item.description}</ItemDescription>
          <TagRow>
            {item.tags.map((tag) => (
              <Tag key={tag}>#{tag}</Tag>
            ))}
          </TagRow>
        </ItemBody>
        <ItemTime>{item.relativeTime}</ItemTime>
      </ItemRow>
    ))}
  </ListRoot>
)
