/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { SavePage } from './save_page';

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

afterEach(cleanup);

describe('SavePage', () => {
  it('shows only the completed URL save state before metadata editing exists', () => {
    render(
      <DesignSystemProvider>
        <SavePage
          onSave={vi.fn()}
          onSaveCompleteChange={vi.fn()}
          onUrlChange={vi.fn()}
          saveComplete
          saveUrl="https://example.com/article"
        />
      </DesignSystemProvider>
    );

    expect(screen.getByRole('status').textContent).toContain('저장 완료');
    expect(screen.queryByRole('textbox', { name: '메모' })).toBeNull();
    expect(screen.queryByRole('button', { name: '그냥 저장' })).toBeNull();
  });

  it('reports URL changes and save submission', () => {
    const onSave = vi.fn();
    const onUrlChange = vi.fn();

    const { container } = render(
      <DesignSystemProvider>
        <SavePage
          onSave={onSave}
          onSaveCompleteChange={vi.fn()}
          onUrlChange={onUrlChange}
          saveComplete={false}
          saveUrl=""
        />
      </DesignSystemProvider>
    );

    fireEvent.change(screen.getByRole('textbox', { name: '링크 URL' }), {
      target: { value: 'https://example.com/article' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(onUrlChange).toHaveBeenCalledWith('https://example.com/article');
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('lets the app validation handle malformed URLs', () => {
    const { container } = render(
      <DesignSystemProvider>
        <SavePage
          onSave={vi.fn()}
          onSaveCompleteChange={vi.fn()}
          onUrlChange={vi.fn()}
          saveComplete={false}
          saveUrl=""
        />
      </DesignSystemProvider>
    );

    expect(container.querySelector('form')?.noValidate).toBe(true);
  });
});
