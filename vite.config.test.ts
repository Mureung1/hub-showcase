import { describe, expect, it } from 'vitest';

import config from './vite.config';

type VitestConfiguration = {
  test?: {
    exclude?: string[];
  };
};

describe('Vitest 설정', () => {
  it('Git worktree 하위 테스트를 탐색에서 제외한다', () => {
    const vitestConfiguration = config as VitestConfiguration;

    expect(vitestConfiguration.test?.exclude).toContain('**/.worktrees/**');
  });
});
