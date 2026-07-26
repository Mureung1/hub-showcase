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

  it('White Canvas 토큰과 모바일 2열·세로 액션 계약을 지킨다', () => {
    const css = readFileSync(
      resolve(UI_DIRECTORY, 'insight_import_dialog.css'),
      'utf8'
    );

    expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(css).toContain('border: 1px solid var(--color-ash)');
    expect(css).toContain('border-radius: var(--radius-card)');
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).toContain('grid-template-columns: 1fr 1fr');
    expect(css).toContain('flex-direction: column');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/iu);
    expect(css).not.toMatch(/box-shadow|gradient|animation/iu);
  });
});
