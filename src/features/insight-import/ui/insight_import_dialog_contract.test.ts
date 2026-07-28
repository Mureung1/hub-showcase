import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const UI_DIRECTORY = resolve(process.cwd(), 'src/features/insight-import/ui');

describe('가져오기 대화상자 계약', () => {
  it('외부 UI 구현 대신 shared UI 공개 경계를 사용한다', () => {
    const sources = [
      'insight_import_dialog.tsx',
      'import_preview.tsx',
      'import_history.tsx',
    ].map((fileName) => readFileSync(resolve(UI_DIRECTORY, fileName), 'utf8'));

    expect(sources.join('\n')).not.toContain('@wanteddev/wds');
    expect(sources.join('\n')).toContain("from '@/shared/ui'");
  });

  it('Desktop source rail과 Mobile 전체 화면 계약을 지킨다', () => {
    const css = readFileSync(
      resolve(UI_DIRECTORY, 'insight_import_dialog.css'),
      'utf8'
    );

    expect(css).toMatch(
      /grid-template-columns:\s*calc\(var\(--spacing-20\) \+ var\(--spacing-20\)\)\s*minmax\(0, 1fr\)/iu
    );
    expect(css).toContain('.insight-import-dialog__source-navigation');
    expect(css).toContain('.insight-import-dialog__source-panel');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).toContain('grid-template-columns: 1fr');
    expect(css).toContain('flex-direction: row');
    expect(css).toContain('width: 100vw');
    expect(css).toContain('max-width: 100vw');
    expect(css).toContain('height: 100dvh');
    expect(css).toMatch(
      /div\.ui-modal\.insight-import-dialog\[role='dialog'\]\s*\{[^}]*flex-shrink:\s*0/isu
    );
    expect(css).toContain('env(safe-area-inset-bottom)');
    expect(css).toContain(':has(> div > .ui-modal__footer)');
    expect(css).toMatch(/\.ui-modal__content\s*\{[^}]*height:\s*100%/isu);
    expect(css).toContain('border: 1px solid var(--color-ash)');
    expect(css).toContain('border-radius: var(--radius-card)');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/iu);
    expect(css).not.toMatch(/box-shadow|gradient|animation/iu);
  });
});
