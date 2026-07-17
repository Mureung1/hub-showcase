/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const savePageStyles = readFileSync(
  new URL('./save_page.css', import.meta.url),
  'utf8'
);

describe('save page interaction contract', () => {
  it('keeps the clipboard action touch-safe and full-width on mobile', () => {
    expect(savePageStyles).toMatch(
      /button\.save-page__clipboard-action\s*\{[^}]*width:\s*fit-content;[^}]*min-height:\s*44px;[^}]*\}/s
    );
    expect(savePageStyles).toMatch(
      /@media \(max-width:\s*767px\)\s*\{[\s\S]*?button\.save-page__clipboard-action\s*\{[^}]*width:\s*100%;[^}]*\}/s
    );
  });
});
