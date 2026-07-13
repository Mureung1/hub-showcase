import { Category, CategoryList, CategoryListItem } from '@wanteddev/wds';

import type { CategoryTone } from '@/shared/ui/chip';

import './category_filter.css';

export type CategoryFilterOption = {
  label: string;
  tone: CategoryTone;
  value: string;
};

export type CategoryFilterProps = {
  onValueChange: (value: string) => void;
  options: readonly CategoryFilterOption[];
  value: string;
};

export function CategoryFilter({
  onValueChange,
  options,
  value,
}: CategoryFilterProps) {
  return (
    <Category onValueChange={onValueChange} value={value}>
      <nav aria-label="카테고리 필터" className="category-filter">
        <CategoryList
          className="category-filter__list"
          horizontalPadding={false}
          size="small"
          verticalPadding={false}
        >
          {options.map((option) => (
            <CategoryListItem
              aria-label={`${option.label} 카테고리`}
              aria-labelledby={undefined}
              className="category-filter__item"
              key={option.value}
              value={option.value}
            >
              <span
                aria-hidden="true"
                className={`category-filter__mark category-filter__mark--${option.tone}`}
              />
              <span>{option.label}</span>
            </CategoryListItem>
          ))}
        </CategoryList>
      </nav>
    </Category>
  );
}
