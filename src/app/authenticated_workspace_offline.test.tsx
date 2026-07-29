/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { InsightRepository } from '@/entities/insight';
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
  Reflect.deleteProperty(navigator, 'onLine');
});

describe('AuthenticatedWorkspace 원격 실패 수용 기준', () => {
  it('오프라인에서 로컬로 우회 저장하지 않고 입력과 기존 화면을 유지한다', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    const create = vi
      .fn<InsightRepository['create']>()
      .mockResolvedValue({ ok: false, reason: 'write-failed' });
    const repository: InsightRepository = {
      create,
      async delete() {
        return { ok: false, reason: 'write-failed' };
      },
      async deleteMany() {
        return { ok: false, reason: 'write-failed' };
      },
      async list() {
        return { insights: [], warnings: [] };
      },
      async update() {
        return { ok: false, reason: 'write-failed' };
      },
    };
    const user = userEvent.setup();

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace repository={repository} />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    const saveUrl = screen.getByRole('textbox', { name: 'URL' });
    await user.type(saveUrl, 'https://offline.example/article');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    expect(create).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert').textContent).toContain(
      '보관함에 저장하지 못했어요.'
    );
    expect((saveUrl as HTMLInputElement).value).toBe(
      'https://offline.example/article'
    );
    expect(screen.queryByRole('status', { name: '저장 완료' })).toBeNull();
  });
});
