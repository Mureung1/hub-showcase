/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workspaceStyles = readFileSync(
  new URL('./styles/authenticated_workspace.css', import.meta.url),
  'utf8'
);

describe('authenticated workspace style contract', () => {
  it('sizes the Figma brand logo with the 24px spacing token', () => {
    expect(workspaceStyles).toMatch(
      /\.workspace-brand__mark\s*\{[^}]*display:\s*block;[^}]*width:\s*var\(--spacing-6\);[^}]*height:\s*var\(--spacing-6\);[^}]*\}/s
    );
    expect(workspaceStyles).not.toMatch(
      /\.workspace-brand__mark\s*\{[^}]*background:/s
    );
  });
});
