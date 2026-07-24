import { useRef, type CSSProperties, type KeyboardEvent } from 'react';

import {
  categoryPalette,
  type CategoryColorKey,
} from '@/shared/config/design-system';

import './category_filter.css';

export type CategoryFilterOption = {
  colorKey: CategoryColorKey | null;
  disabled?: boolean;
  label: string;
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
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabledIndices = options.flatMap((option, index) =>
    option.disabled ? [] : [index]
  );
  const selectedIndex = options.findIndex(
    (option) => option.value === value && !option.disabled
  );
  const tabStopIndex =
    selectedIndex >= 0 ? selectedIndex : (enabledIndices[0] ?? -1);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    optionIndex: number
  ) => {
    const enabledPosition = enabledIndices.indexOf(optionIndex);
    let targetIndex: number | undefined;

    if (enabledPosition < 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        targetIndex =
          enabledIndices[
            (enabledPosition - 1 + enabledIndices.length) %
              enabledIndices.length
          ];
        break;
      case 'ArrowRight':
        targetIndex =
          enabledIndices[(enabledPosition + 1) % enabledIndices.length];
        break;
      case 'End':
        targetIndex = enabledIndices.at(-1);
        break;
      case 'Home':
        targetIndex = enabledIndices[0];
        break;
      default:
        return;
    }

    event.preventDefault();
    optionRefs.current[targetIndex ?? -1]?.focus();
  };

  return (
    <div
      aria-label="카테고리 필터"
      className="category-filter category-filter__list"
      role="group"
    >
      {options.map((option, index) => (
        <button
          aria-pressed={option.value === value}
          className="category-filter__item"
          disabled={option.disabled}
          key={option.value}
          onClick={() => onValueChange(option.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          ref={(node) => {
            optionRefs.current[index] = node;
          }}
          tabIndex={index === tabStopIndex ? 0 : -1}
          type="button"
        >
          <span
            aria-hidden="true"
            className="category-filter__mark"
            style={getMarkStyle(option.colorKey)}
          />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function getMarkStyle(colorKey: CategoryColorKey | null) {
  return {
    '--category-color': colorKey
      ? categoryPalette[colorKey].cssVariable
      : 'var(--color-graphite)',
  } as CSSProperties;
}
