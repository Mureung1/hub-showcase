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
  it('asks for optional personal context only after the URL is saved', () => {
    render(
      <DesignSystemProvider>
        <SavePage
          {...createContextProps()}
          onSave={vi.fn()}
          onSaveCompleteChange={vi.fn()}
          onUrlChange={vi.fn()}
          saveComplete
          saveUrl="https://example.com/article"
        />
      </DesignSystemProvider>
    );

    expect(screen.getByRole('status').textContent).toContain('저장 완료');
    expect(
      screen.getByRole('heading', {
        name: '언제 다시 쓰고 싶은 자료인가요?',
      })
    ).not.toBeNull();
    expect(screen.getByRole('textbox', { name: '제목 (선택)' })).not.toBeNull();
    expect(
      screen.getByRole('textbox', { name: '한 줄 메모 (선택)' })
    ).not.toBeNull();
    expect(
      screen.getByRole('textbox', { name: '카테고리 (선택)' })
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: '건너뛰기' })).not.toBeNull();
  });

  it('reports URL changes and save submission', () => {
    const onSave = vi.fn();
    const onUrlChange = vi.fn();

    const { container } = render(
      <DesignSystemProvider>
        <SavePage
          {...createContextProps()}
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

  it('lets the user skip the optional personal context step', () => {
    const onContextSkip = vi.fn();

    render(
      <DesignSystemProvider>
        <SavePage
          {...createContextProps()}
          onContextSkip={onContextSkip}
          onSave={vi.fn()}
          onSaveCompleteChange={vi.fn()}
          onUrlChange={vi.fn()}
          saveComplete
          saveUrl="https://example.com/article"
        />
      </DesignSystemProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }));

    expect(onContextSkip).toHaveBeenCalledOnce();
  });

  it('lets the app validation handle malformed URLs', () => {
    const { container } = render(
      <DesignSystemProvider>
        <SavePage
          {...createContextProps()}
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

function createContextProps() {
  return {
    contextDraft: { category: '', memo: '', title: '' },
    contextSaveComplete: false,
    onContextDraftChange: vi.fn(),
    onContextSave: vi.fn(),
    onContextSkip: vi.fn(),
  };
}
