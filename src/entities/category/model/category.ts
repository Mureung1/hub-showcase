import {
  isCategoryColorKey,
  type CategoryColorKey,
} from '@/shared/config/design-system';

export type Category = {
  colorKey: CategoryColorKey;
  createdAt: string;
  id: string;
  name: string;
  sortOrder: number;
  updatedAt: string;
};

export type CategoryInput = {
  colorKey: CategoryColorKey;
  name: string;
};

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ');
}

export function normalizeCategoryInput(
  input: CategoryInput
): CategoryInput | null {
  const name = normalizeCategoryName(input.name);

  if (
    name.length === 0 ||
    name.length > 50 ||
    !isCategoryColorKey(input.colorKey)
  ) {
    return null;
  }

  return {
    colorKey: input.colorKey,
    name,
  };
}
