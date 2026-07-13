import { Category, CategoryList, CategoryListItem } from '@wanteddev/wds';

import type { CategoryTone } from '@/shared/ui/chip';

import './category_filter.css';

export type CategoryFilterOption = {
  disabled?: boolean;
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
      <CategoryList
        aria-label="카테고리 필터"
        className="category-filter category-filter__list"
        horizontalPadding={false}
        role="group"
        size="small"
        verticalPadding={false}
      >
        {options.map((option) => (
          <CategoryListItem
            aria-pressed={option.value === value}
            aria-selected={undefined}
            className="category-filter__item"
            disabled={option.disabled}
            key={option.value}
            role="button"
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
    </Category>
  );
}
