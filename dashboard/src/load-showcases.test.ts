import { describe, expect, it } from 'vitest';
import { loadShowcases } from './load-showcases';

describe('수집 자료 불러오기', () => {
  it('showcases.json의 프로젝트 목록을 반환한다', async () => {
    const projects = await loadShowcases(async () =>
      new Response(
        JSON.stringify({
          projectCount: 1,
          projects: [
            {
              id: 'dashboard-showcase-test',
              title: 'GitHub Pages 수집 시험',
            },
          ],
        }),
      ),
    );

    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe('dashboard-showcase-test');
  });
});
