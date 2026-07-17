import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

describe('ESLint 설정', () => {
  it('현재 작업 트리만 검사하고 .worktrees 하위는 제외한다', async () => {
    const eslint = new ESLint({ cwd: process.cwd() });

    await expect(
      eslint.isPathIgnored('.worktrees/example/src/example.ts')
    ).resolves.toBe(true);
    await expect(eslint.isPathIgnored('src/main.tsx')).resolves.toBe(false);
  });
});
