/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: vi.fn(() => []),
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
          onUrlChange={vi.fn()}
          saveComplete
          saveTitle=""
          saveUrl="https://example.com/article"
        />
      </DesignSystemProvider>
    );

    expect(screen.getByRole('status').textContent).toContain(
      '인사이트를 저장했어요'
    );
    const contextHeading = screen.getByRole('heading', {
      name: '언제 다시 쓰고 싶은가요?',
    });
    expect(contextHeading.closest('.save-page__body')).not.toBeNull();
    expect(contextHeading.closest('.save-page__stage')).toBeNull();
    expect(screen.getByRole('textbox', { name: '제목 (선택)' })).not.toBeNull();
    expect(
      screen.getByRole('textbox', { name: '한 줄 메모 (선택)' })
    ).not.toBeNull();
    expect(
      screen.getByRole('combobox', { name: '카테고리 (선택)' })
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '지금은 건너뛰기' })
    ).not.toBeNull();
  });

  it('selects a category created from the context selector immediately', async () => {
    const user = userEvent.setup();
    const categoryId = '10000000-0000-4000-8000-000000000001';
    const onContextDraftChange = vi.fn();
    const onRequestCategoryCreation = vi.fn(
      (selectCategory: (createdCategoryId: string) => void) => {
        selectCategory(categoryId);
      }
    );

    render(
      <DesignSystemProvider>
        <SavePage
          {...createContextProps()}
          onContextDraftChange={onContextDraftChange}
          onRequestCategoryCreation={onRequestCategoryCreation}
          onSave={vi.fn()}
          onUrlChange={vi.fn()}
          saveComplete
          saveTitle=""
          saveUrl="https://example.com/article"
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('combobox', { name: '카테고리 (선택)' }));
    await user.click(
      screen.getByRole('option', { name: '새 카테고리 만들기' })
    );

    expect(onRequestCategoryCreation).toHaveBeenCalledOnce();
    expect(onContextDraftChange).toHaveBeenCalledWith({
      categoryId,
      memo: '',
      title: '',
    });
  });

  it('reports URL changes and save submission', () => {
    const onSave = vi.fn();
    const onUrlChange = vi.fn();

    const { container } = render(
      <DesignSystemProvider>
        <SavePage
          {...createContextProps()}
          onSave={onSave}
          onUrlChange={onUrlChange}
          saveComplete={false}
          saveTitle=""
          saveUrl=""
        />
      </DesignSystemProvider>
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'URL' }), {
      target: { value: 'https://example.com/article' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(
      screen.getByRole('textbox', { name: 'URL' }).closest('.save-page__stage')
    ).not.toBeNull();
    expect(onUrlChange).toHaveBeenCalledWith('https://example.com/article');
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('공유 제목을 저장 전에 보이고 수정값을 전달한다', () => {
    const onTitleChange = vi.fn();

    render(
      <DesignSystemProvider>
        <SavePage
          {...createContextProps()}
          isSharedSave
          onSave={vi.fn()}
          onTitleChange={onTitleChange}
          onUrlChange={vi.fn()}
          saveComplete={false}
          saveTitle="공유한 기사"
          saveUrl="https://example.com/article"
        />
      </DesignSystemProvider>
    );

    const titleInput = screen.getByRole('textbox', {
      name: '공유 제목 (선택)',
    });
    expect(screen.queryByText('URL을 입력하면 바로 저장해요')).toBeNull();
    expect((titleInput as HTMLInputElement).value).toBe('공유한 기사');

    fireEvent.change(titleInput, { target: { value: '수정한 공유 기사' } });

    expect(onTitleChange).toHaveBeenCalledWith('수정한 공유 기사');
  });

  it('클립보드 보조 버튼을 제공하면서 URL 직접 입력을 유지한다', () => {
    const onPasteFromClipboard = vi.fn();

    render(
      <DesignSystemProvider>
        <SavePage
          {...createContextProps()}
          onPasteFromClipboard={onPasteFromClipboard}
          onSave={vi.fn()}
          onUrlChange={vi.fn()}
          saveComplete={false}
          saveTitle=""
          saveUrl=""
        />
      </DesignSystemProvider>
    );

    fireEvent.click(
      screen.getByRole('button', { name: '클립보드에서 붙여넣기' })
    );

    expect(onPasteFromClipboard).toHaveBeenCalledOnce();
    expect(screen.getByRole('textbox', { name: 'URL' })).not.toBeNull();
  });

  it('lets the user skip the optional personal context step', () => {
    const onContextSkip = vi.fn();

    render(
      <DesignSystemProvider>
        <SavePage
          {...createContextProps()}
          onContextSkip={onContextSkip}
          onSave={vi.fn()}
          onUrlChange={vi.fn()}
          saveComplete
          saveTitle=""
          saveUrl="https://example.com/article"
        />
      </DesignSystemProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '지금은 건너뛰기' }));

    expect(onContextSkip).toHaveBeenCalledOnce();
  });

  it('lets the app validation handle malformed URLs', () => {
    const { container } = render(
      <DesignSystemProvider>
        <SavePage
          {...createContextProps()}
          onSave={vi.fn()}
          onUrlChange={vi.fn()}
          saveComplete={false}
          saveTitle=""
          saveUrl=""
        />
      </DesignSystemProvider>
    );

    expect(container.querySelector('form')?.noValidate).toBe(true);
  });
});

function createContextProps() {
  return {
    contextDraft: { categoryId: null, memo: '', title: '' },
    contextSaveComplete: false,
    onContextDraftChange: vi.fn(),
    onContextSave: vi.fn(),
    onContextSkip: vi.fn(),
    onTitleChange: vi.fn(),
  };
}
