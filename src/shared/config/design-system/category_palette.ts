import { designTokens, type CategoryColorKey } from './tokens';

export type CategoryPaletteEntry = Readonly<{
  accessibleName: string;
  color: string;
  cssVariable: `var(--category-${CategoryColorKey})`;
  foreground: 'canvas' | 'ink';
}>;

const CATEGORY_ACCESSIBLE_NAMES = {
  'amber-1': '연한 노랑',
  'amber-2': '노랑',
  'amber-3': '진한 노랑',
  'blue-1': '연한 파랑',
  'blue-2': '파랑',
  'blue-3': '진한 파랑',
  'coral-1': '연한 산호',
  'coral-2': '산호',
  'coral-3': '진한 산호',
  'green-1': '연한 초록',
  'green-2': '초록',
  'green-3': '진한 초록',
  'indigo-1': '연한 남색',
  'indigo-2': '남색',
  'indigo-3': '진한 남색',
  'slate-1': '연한 회색',
  'slate-2': '회색',
  'slate-3': '진한 회색',
  'teal-1': '연한 청록',
  'teal-2': '청록',
  'teal-3': '진한 청록',
  'violet-1': '연한 보라',
  'violet-2': '보라',
  'violet-3': '진한 보라',
} as const satisfies Record<CategoryColorKey, string>;

const CANVAS_FOREGROUND_KEYS = new Set<CategoryColorKey>([
  'amber-3',
  'blue-3',
  'coral-3',
  'green-3',
  'indigo-3',
  'slate-2',
  'slate-3',
  'teal-3',
  'violet-3',
]);

export const CATEGORY_COLOR_KEYS = Object.freeze(
  Object.keys(designTokens.category) as CategoryColorKey[]
);

export const categoryPalette = Object.freeze(
  Object.fromEntries(
    CATEGORY_COLOR_KEYS.map((colorKey) => [
      colorKey,
      {
        accessibleName: CATEGORY_ACCESSIBLE_NAMES[colorKey],
        color: designTokens.category[colorKey],
        cssVariable: `var(--category-${colorKey})`,
        foreground: CANVAS_FOREGROUND_KEYS.has(colorKey) ? 'canvas' : 'ink',
      },
    ])
  ) as Record<CategoryColorKey, CategoryPaletteEntry>
);

export function isCategoryColorKey(value: unknown): value is CategoryColorKey {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(categoryPalette, value)
  );
}
