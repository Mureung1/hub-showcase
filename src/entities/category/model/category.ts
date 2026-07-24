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

export function isValidCategoryName(name: string): boolean {
  const length = Array.from(name).length;

  return name === normalizeCategoryName(name) && length > 0 && length <= 50;
}

export function normalizeCategoryInput(
  input: CategoryInput
): CategoryInput | null {
  const name = normalizeCategoryName(input.name);

  if (!isValidCategoryName(name) || !isCategoryColorKey(input.colorKey)) {
    return null;
  }

  return {
    colorKey: input.colorKey,
    name,
  };
}
