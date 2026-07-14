/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Insight, InsightRepository } from '@/entities/insight';
import { DesignSystemProvider } from '@/shared/ui';

import { AuthenticatedWorkspace } from './authenticated_workspace';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserverMock {
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
    }
  );

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('AuthenticatedWorkspace', () => {
  it('restores insights from the default browser storage after remounting', async () => {
    const user = userEvent.setup();
    const firstRender = render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace />
      </DesignSystemProvider>
    );

    expect(screen.getByText('이 브라우저에 로컬 저장됨')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '저장' }));
    await user.type(
      screen.getByRole('textbox', { name: '링크 URL' }),
      'https://reload.example/article#original'
    );
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    firstRender.unmount();

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace />
      </DesignSystemProvider>
    );
    await user.click(screen.getByRole('button', { name: '보관함' }));

    expect(
      screen.getByRole('link', { name: '원문 열기' }).getAttribute('href')
    ).toBe('https://reload.example/article#original');
  });

  it('restores repository insights and persists a saved URL', async () => {
    const user = userEvent.setup();
    const restoredInsight = createInsight({
      id: 'restored',
      originalUrl: 'https://restored.example/article',
      normalizedUrl: 'https://restored.example/article',
      domain: 'restored.example',
      title: '새로고침 뒤 복원된 링크',
    });
    const save = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repository: InsightRepository = {
      load: () => ({ insights: [restoredInsight], warnings: [] }),
      save,
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    expect(screen.getByText('새로고침 뒤 복원된 링크')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '저장' }));
    await user.type(
      screen.getByRole('textbox', { name: '링크 URL' }),
      'https://Example.com/new-article#details'
    );
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(save).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: '보관함' }));
    const newSourceLink = screen.getAllByRole('link', {
      name: '원문 열기',
    })[0];

    expect(newSourceLink?.getAttribute('href')).toBe(
      'https://Example.com/new-article#details'
    );
    expect(newSourceLink?.getAttribute('target')).toBe('_blank');
    expect(newSourceLink?.getAttribute('rel')).toBe('noreferrer');
  });

  it('distinguishes unsupported protocols from malformed URLs', async () => {
    const user = userEvent.setup();

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={createRepository()} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    const saveUrl = screen.getByRole('textbox', { name: '링크 URL' });

    await user.type(saveUrl, 'ftp://example.com/article');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      'http 또는 https 주소만 저장할 수 있어요.'
    );
    expect((saveUrl as HTMLInputElement).value).toBe(
      'ftp://example.com/article'
    );

    await user.clear(saveUrl);
    await user.type(saveUrl, 'notaurl');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '올바른 URL을 입력해주세요.'
    );
    expect((saveUrl as HTMLInputElement).value).toBe('notaurl');
  });

  it('keeps a duplicate URL and offers to open the library', async () => {
    const user = userEvent.setup();
    const save = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repository: InsightRepository = {
      load: () => ({
        insights: [
          createInsight({
            originalUrl: 'https://example.com/article?utm_source=feed',
            normalizedUrl: 'https://example.com/article',
          }),
        ],
        warnings: [],
      }),
      save,
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    const saveUrl = screen.getByRole('textbox', { name: '링크 URL' });

    await user.type(saveUrl, 'https://EXAMPLE.com/article#details');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '이미 보관함에 저장된 링크예요.'
    );
    expect((saveUrl as HTMLInputElement).value).toBe(
      'https://EXAMPLE.com/article#details'
    );
    expect(save).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '보관함에서 보기' }));

    expect(
      screen.getByRole('heading', { name: '전체 인사이트' })
    ).not.toBeNull();
  });

  it('keeps the URL after a write failure and allows retrying', async () => {
    const user = userEvent.setup();
    const save = vi
      .fn<InsightRepository['save']>()
      .mockReturnValueOnce({ ok: false, reason: 'write-failed' })
      .mockReturnValueOnce({ ok: true });
    const repository: InsightRepository = {
      load: () => ({ insights: [], warnings: [] }),
      save,
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    const saveUrl = screen.getByRole('textbox', { name: '링크 URL' });
    await user.type(saveUrl, 'https://retry.example/article');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '브라우저 저장에 실패했어요.'
    );
    expect(screen.getByRole('alert').textContent).toContain('다시 시도');
    expect((saveUrl as HTMLInputElement).value).toBe(
      'https://retry.example/article'
    );

    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(save).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toContain('저장 완료');
  });

  it('explains load warnings without hiding restored valid insights', async () => {
    const user = userEvent.setup();
    const repository: InsightRepository = {
      load: () => ({
        insights: [createInsight({ title: '정상 복원된 링크' })],
        warnings: ['read-failed', 'corrupted-store', 'corrupted-entry'],
      }),
      save: () => ({ ok: true }),
    };

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    const warningText = screen
      .getAllByRole('alert')
      .map((alert) => alert.textContent)
      .join(' ');

    expect(warningText).toContain('브라우저 저장소를 읽지 못했어요.');
    expect(warningText).toContain('저장 데이터가 손상되어 불러오지 못했어요.');
    expect(warningText).toContain(
      '일부 손상된 링크를 제외하고 나머지를 불러왔어요.'
    );

    await user.click(screen.getByRole('button', { name: '보관함' }));
    expect(screen.getByText('정상 복원된 링크')).not.toBeNull();
  });

  it('moves between the home, library, and save tabs', async () => {
    const user = userEvent.setup();

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('navigation', { name: '주요 화면' })
    ).not.toBeNull();
    expect(screen.getByRole('heading', { name: '홈' })).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '홈' }).getAttribute('aria-current')
    ).toBe('page');

    await user.click(screen.getByRole('button', { name: '보관함' }));
    expect(
      screen.getByRole('heading', { name: '전체 인사이트' })
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '전체' }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: '보관함' })
        .getAttribute('aria-current')
    ).toBe('page');

    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(
      screen.getByRole('heading', { name: 'URL만 넣고 바로 보관해요' })
    ).not.toBeNull();

    const saveUrl = screen.getByLabelText('링크 URL');

    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '올바른 URL을 입력해주세요.'
    );
    expect(saveUrl.getAttribute('aria-invalid')).toBe('true');
    expect(saveUrl.getAttribute('aria-describedby')).toBe('save-url-error');

    await user.type(saveUrl, 'notaurl');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '올바른 URL을 입력해주세요.'
    );

    await user.clear(saveUrl);
    await user.type(saveUrl, 'https://example.com/article');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(screen.getByRole('status').textContent).toContain('저장 완료');
  });
});

function createInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'insight-1',
    originalUrl: 'https://example.com',
    normalizedUrl: 'https://example.com',
    domain: 'example.com',
    title: 'example.com',
    memo: null,
    category: null,
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides,
  };
}

function createRepository(): InsightRepository {
  return {
    load: () => ({ insights: [], warnings: [] }),
    save: () => ({ ok: true }),
  };
}
