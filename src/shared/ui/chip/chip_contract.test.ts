/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const chipSource = readFileSync(new URL('./chip.tsx', import.meta.url), 'utf8');
const chipStyles = readFileSync(new URL('./chip.css', import.meta.url), 'utf8');

describe('ChoiceChip implementation contract', () => {
  it('uses a named root-ref adapter', () => {
    expect(chipSource).toMatch(
      /export const ChoiceChip = forwardRef<HTMLButtonElement, ChoiceChipProps>\(\s*function ChoiceChip\(/s
    );
  });

  it('places product disabled colors after the selected state', () => {
    const selectedStateIndex = chipStyles.indexOf(
      "button.choice-chip[data-active='true']"
    );
    const disabledStateIndex = chipStyles.indexOf(
      'button.choice-chip:disabled,'
    );
    const disabledState = chipStyles.match(
      /button\.choice-chip:disabled,\s*button\.choice-chip\[aria-disabled='true'\]\s*\{(?<declarations>[^}]*)\}/s
    )?.groups?.declarations;

    expect(disabledStateIndex).toBeGreaterThan(selectedStateIndex);
    expect(disabledState).toMatch(
      /border-color: var\(--color-ash\);[^}]*background: var\(--color-mist\);[^}]*color: var\(--color-smoke\);/s
    );
  });
});
