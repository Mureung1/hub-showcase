/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const categoryFilterSource = readFileSync(
  new URL('./category_filter.tsx', import.meta.url),
  'utf8'
);
const categoryFilterStyles = readFileSync(
  new URL('./category_filter.css', import.meta.url),
  'utf8'
);

describe('CategoryFilter architecture contract', () => {
  it('owns native button group semantics without tab adapter coupling', () => {
    expect(categoryFilterSource).not.toMatch(/@wanteddev\/wds/);
    expect(categoryFilterSource).not.toMatch(/aria-selected/);
    expect(categoryFilterSource).not.toMatch(/\bCategory(?:List|ListItem)?\b/);
    expect(categoryFilterStyles).not.toMatch(/wds-component/);
  });

  it('keeps horizontal scrolling without exposing a platform scrollbar', () => {
    expect(categoryFilterStyles).toMatch(/scrollbar-width:\s*none/);
    expect(categoryFilterStyles).toMatch(
      /div\.category-filter::-webkit-scrollbar\s*{[\s\S]*display:\s*none/
    );
  });
});
